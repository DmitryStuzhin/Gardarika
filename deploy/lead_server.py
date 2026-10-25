#!/usr/bin/env python3
"""Приём заявок с сайта Гардарики и пересылка в Telegram.

Только стандартная библиотека Python — ничего устанавливать не нужно.
Слушает 127.0.0.1:8081, снаружи доступен через nginx по адресу /api/lead.

Переменные окружения (задаются в /etc/gardarika-lead.env):
  TELEGRAM_BOT_TOKEN — токен бота от @BotFather
  TELEGRAM_CHAT_ID   — запасной получатель, если нет файла получателей
Получатели заявок — /home/deploy/telegram-chats.txt (копия deploy/telegram-chats.txt из репозитория).
Заявки также дописываются в /var/lib/gardarika/leads.jsonl — на случай, если Telegram недоступен.

Админка каталога (admin.html):
  ADMIN_PASSWORD_HASH — хэш пароля, его записывает deploy/enable-admin.sh; без него админка выключена.
  Каталог хранится в /var/lib/gardarika/catalog.json (+ история версий в catalog-history/),
  фото — в /var/lib/gardarika/media/ (nginx отдаёт их по адресу /media/).
  Сайт получает каталог по адресу /api/catalog.js; пока каталог не сохранён — работает data.js из репозитория.
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:  # страницы для поисковиков: /doma/, /doma/<дом>, /sitemap.xml (deploy/seo_pages.py)
    import seo_pages
except ImportError:
    seo_pages = None

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT = os.environ.get("TELEGRAM_CHAT_ID", "")
CHATS_FILE = os.environ.get("CHATS_FILE", "/home/deploy/telegram-chats.txt")
LOG = os.environ.get("LEADS_FILE", "/var/lib/gardarika/leads.jsonl")
PORT = int(os.environ.get("PORT", "8081"))
TG_API = os.environ.get("TELEGRAM_API", "https://api.telegram.org")
MAX_BODY = 8 * 1024
recent = {}  # ip -> [время заявок] — простая защита от повторов

DATA = os.environ.get("DATA_DIR", "/var/lib/gardarika")
CATALOG = os.path.join(DATA, "catalog.json")
HISTORY = os.path.join(DATA, "catalog-history")
MEDIA = os.path.join(DATA, "media")
ADMIN_HASH = os.environ.get("ADMIN_PASSWORD_HASH", "").strip()
SESSION_DAYS = 14
MAX_CATALOG = 4 * 1024 * 1024
MAX_UPLOAD = 25 * 1024 * 1024
KEEP_HISTORY = 60
save_lock = threading.Lock()
login_fails = {}  # ip -> [время неудачных входов]


def clean(v, n):
    return re.sub(r"\s+", " ", str(v or "")).strip()[:n]


def recipients():
    """Получатели из deploy/telegram-chats.txt (приезжает с выкладкой); если файла нет — из TELEGRAM_CHAT_ID.
    Файл читается при каждой заявке, поэтому смена получателей не требует перезапуска."""
    try:
        with open(CHATS_FILE, encoding="utf-8") as f:
            ids = [ln.split("#")[0].strip() for ln in f]
        ids = [i for i in ids if i]
        if ids:
            return ids
    except OSError:
        pass
    return [CHAT] if CHAT else []


def send_telegram(text):
    if not TOKEN:
        return False
    ok = False
    for chat in recipients():
        data = urllib.parse.urlencode({"chat_id": chat, "text": text, "disable_web_page_preview": "true"}).encode()
        req = urllib.request.Request(f"{TG_API}/bot{TOKEN}/sendMessage", data=data)
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                ok = ok or r.status == 200
        except Exception as e:  # noqa: BLE001 — любая сетевая ошибка: заявка останется в файле
            print("telegram error for", chat, ":", e, flush=True)
    return ok


# ---------- админка каталога ----------

def check_password(pw):
    """ADMIN_PASSWORD_HASH = pbkdf2_sha256:<итерации>:<соль hex>:<хэш hex>"""
    try:
        algo, n, salt, want = ADMIN_HASH.split(":")
        if algo != "pbkdf2_sha256":
            return False
        got = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), int(n)).hex()
        return hmac.compare_digest(got, want)
    except (ValueError, TypeError):
        return False


def session_key():
    # ключ подписи выводится из хэша пароля: смена пароля разлогинивает всех
    return hashlib.sha256(("vozdvizhen-session:" + ADMIN_HASH).encode()).digest()


def make_token():
    exp = str(int(time.time()) + SESSION_DAYS * 86400)
    return exp + "." + hmac.new(session_key(), exp.encode(), "sha256").hexdigest()


def token_ok(tok):
    try:
        exp, sig = tok.split(".")
        return int(exp) > time.time() and hmac.compare_digest(sig, hmac.new(session_key(), exp.encode(), "sha256").hexdigest())
    except (ValueError, AttributeError):
        return False


SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{0,59}$")
PATH = re.compile(r"^(?:assets/|/media/|media/)[\w./-]{1,200}$")


def s_(v, n):
    return str(v if v is not None else "").strip()[:n]


def img_path(v):
    v = s_(v, 220)
    return v if PATH.match(v) and ".." not in v else ""


def clean_house(h):
    if not isinstance(h, dict):
        raise ValueError("дом должен быть объектом")
    slug = s_(h.get("slug"), 60)
    if not SLUG.match(slug):
        raise ValueError(f"адрес страницы «{slug}»: только латиница, цифры и дефис")
    out = {"slug": slug}
    for k, n in (("name", 80), ("area", 20), ("type", 160), ("rooms", 80), ("extra", 80), ("price", 20),
                 ("lede", 1000), ("story", 4000), ("tagline", 300), ("forWho", 1000)):
        out[k] = s_(h.get(k), n)
    if not out["name"]:
        raise ValueError(f"у дома {slug} нет названия")
    out["prov"] = "ref" if h.get("prov") == "ref" else "viz"
    for k in ("example", "calc", "hidden", "popular"):
        if h.get(k):
            out[k] = True
    try:
        f = float(h.get("floors") or 1)
    except (TypeError, ValueError):
        f = 1
    out["floors"] = f if f in (1, 1.5, 2, 3) else 1
    if out["floors"] == int(out["floors"]):
        out["floors"] = int(out["floors"])
    d = h.get("dims")
    try:
        out["dims"] = [int(d[0]), int(d[1])] if d and int(d[0]) > 0 and int(d[1]) > 0 else None
    except (TypeError, ValueError, IndexError, KeyError):
        out["dims"] = None
    out["image"] = img_path(h.get("image"))
    gal = []
    for g in (h.get("gallery") or [])[:80]:
        g = {"src": g} if isinstance(g, str) else g if isinstance(g, dict) else {}
        src = img_path(g.get("src"))
        if src:
            gal.append({"src": src, "caption": s_(g.get("caption"), 200)})
    out["gallery"] = gal
    out["about"] = [s_(t, 3000) for t in (h.get("about") or [])[:20] if s_(t, 3000)]
    out["features"] = [s_(t, 200) for t in (h.get("features") or [])[:30] if s_(t, 200)]
    return out


def read_catalog():
    try:
        with open(CATALOG, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def write_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def save_catalog(houses, rev):
    clean = [clean_house(h) for h in houses]
    if len(clean) > 500:
        raise ValueError("слишком много домов")
    slugs = [h["slug"] for h in clean]
    dup = sorted({x for x in slugs if slugs.count(x) > 1})
    if dup:
        raise ValueError("одинаковый адрес страницы у нескольких домов: " + ", ".join(dup))
    with save_lock:
        cur = read_catalog()
        cur_rev = cur.get("rev", 0) if cur else 0
        if rev is not None and int(rev) != cur_rev:
            return None, cur_rev
        os.makedirs(HISTORY, exist_ok=True)
        doc = {"rev": cur_rev + 1, "saved": time.strftime("%Y-%m-%d %H:%M:%S"), "houses": clean}
        write_json(CATALOG, doc)
        write_json(os.path.join(HISTORY, time.strftime("%Y%m%d-%H%M%S") + f"-r{doc['rev']}.json"), doc)
        old = sorted(os.listdir(HISTORY))[:-KEEP_HISTORY]
        for name in old:
            try:
                os.remove(os.path.join(HISTORY, name))
            except OSError:
                pass
        return doc, doc["rev"]


def list_history():
    try:
        names = sorted((n for n in os.listdir(HISTORY) if n.endswith(".json")), reverse=True)[:30]
    except OSError:
        return []
    out = []
    for n in names:
        try:
            with open(os.path.join(HISTORY, n), encoding="utf-8") as f:
                d = json.load(f)
            out.append({"name": n, "saved": d.get("saved"), "rev": d.get("rev"), "count": len(d.get("houses") or [])})
        except (OSError, ValueError):
            pass
    return out


MEDIA_NAME = re.compile(r"^\d{8}-[0-9a-f]{12}\.(?:jpg|png|webp)$")
IMAGE_MAGIC = ((b"\xff\xd8\xff", "jpg"), (b"\x89PNG\r\n\x1a\n", "png"))


def image_ext(head):
    for magic, ext in IMAGE_MAGIC:
        if head.startswith(magic):
            return ext
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    return None


def catalog_js():
    doc = read_catalog()
    if not doc or not doc.get("houses"):
        return "/* каталог не сохранён в админке — сайт берёт data.js */\n"
    data = json.dumps({"rev": doc.get("rev"), "houses": doc["houses"]}, ensure_ascii=False)
    return "window.CATALOG = " + data.replace("</", "<\\/") + ";\n"


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # --- админка ---
    def ip(self):
        return self.headers.get("X-Real-IP") or self.client_address[0]

    def authed(self):
        if not ADMIN_HASH:
            return False
        for part in (self.headers.get("Cookie") or "").split(";"):
            k, _, v = part.strip().partition("=")
            if k == "vz_admin" and token_ok(v):
                return True
        return False

    def cookie(self, value, age):
        self.send_header("Set-Cookie", f"vz_admin={value}; Path=/api/admin; Max-Age={age}; HttpOnly; Secure; SameSite=Strict")

    def read_json(self, limit):
        size = int(self.headers.get("Content-Length") or 0)
        if size <= 0 or size > limit:
            raise ValueError("size")
        return json.loads(self.rfile.read(size).decode("utf-8"))

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/catalog.js":
            body = catalog_js().encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if seo_pages and (path == "/sitemap.xml" or path == "/doma" or path.startswith("/doma/")):
            res = seo_pages.render(path, read_catalog())
            if res:
                code, ctype, text = res
                body = text.encode()
                self.send_response(code)
                self.send_header("Content-Type", ctype)
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                return self.wfile.write(body)
        if path == "/api/admin/session":
            return self.reply(200 if self.authed() else 401, {"ok": self.authed(), "enabled": bool(ADMIN_HASH)})
        if not path.startswith("/api/admin/"):
            return self.reply(404, {"ok": False})
        if not self.authed():
            return self.reply(401, {"ok": False})
        if path == "/api/admin/catalog":
            doc = read_catalog()
            return self.reply(200, {"ok": True, "rev": doc.get("rev", 0) if doc else 0, "saved": doc.get("saved") if doc else None,
                                    "houses": doc.get("houses") if doc else None})
        if path == "/api/admin/history":
            return self.reply(200, {"ok": True, "items": list_history()})
        return self.reply(404, {"ok": False})

    def admin_post(self, path):
        if path == "/api/admin/login":
            if not ADMIN_HASH:
                return self.reply(503, {"ok": False, "error": "Админка ещё не включена на сервере"})
            now, ip = time.time(), self.ip()
            fails = [t for t in login_fails.get(ip, []) if now - t < 900]
            if len(fails) >= 8:
                return self.reply(429, {"ok": False, "error": "Слишком много попыток. Подождите 15 минут."})
            try:
                pw = str(self.read_json(4096).get("password") or "")
            except (ValueError, UnicodeDecodeError, AttributeError):
                return self.reply(400, {"ok": False})
            if not check_password(pw):
                login_fails[ip] = fails + [now]
                time.sleep(1)
                return self.reply(403, {"ok": False, "error": "Неверный пароль"})
            login_fails.pop(ip, None)
            body = json.dumps({"ok": True}).encode()
            self.send_response(200)
            self.cookie(make_token(), SESSION_DAYS * 86400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        # всё остальное — только с входом и со служебным заголовком (защита от подделки запросов с чужих сайтов)
        if not self.authed() or self.headers.get("X-Admin") != "1":
            return self.reply(401, {"ok": False, "error": "Нужно войти заново"})
        if path == "/api/admin/logout":
            body = b'{"ok": true}'
            self.send_response(200)
            self.cookie("", 0)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if path == "/api/admin/catalog":
            try:
                d = self.read_json(MAX_CATALOG)
                if not isinstance(d.get("houses"), list):
                    raise ValueError("нет списка домов")
                doc, rev = save_catalog(d["houses"], None if d.get("force") else d.get("rev"))
            except ValueError as e:
                return self.reply(422, {"ok": False, "error": str(e) if str(e) != "size" else "слишком большой каталог"})
            except (UnicodeDecodeError, AttributeError, TypeError):
                return self.reply(400, {"ok": False, "error": "неверные данные"})
            if doc is None:
                return self.reply(409, {"ok": False, "rev": rev, "error": "Каталог успели изменить в другой вкладке или на другом устройстве"})
            print("catalog saved rev", rev, flush=True)
            return self.reply(200, {"ok": True, "rev": rev, "saved": doc["saved"], "houses": doc["houses"]})
        if path == "/api/admin/restore":
            try:
                name = os.path.basename(str(self.read_json(4096).get("name") or ""))
                with open(os.path.join(HISTORY, name), encoding="utf-8") as f:
                    old = json.load(f)
                doc, rev = save_catalog(old.get("houses") or [], None)
            except (ValueError, OSError, UnicodeDecodeError, AttributeError):
                return self.reply(404, {"ok": False, "error": "версия не найдена"})
            return self.reply(200, {"ok": True, "rev": rev, "saved": doc["saved"], "houses": doc["houses"]})
        if path == "/api/admin/upload":
            size = int(self.headers.get("Content-Length") or 0)
            if size <= 0 or size > MAX_UPLOAD:
                return self.reply(413, {"ok": False, "error": "файл больше 25 МБ"})
            data = self.rfile.read(size)
            ext = image_ext(data[:16])
            if not ext:
                return self.reply(415, {"ok": False, "error": "нужна картинка JPG, PNG или WebP"})
            os.makedirs(MEDIA, exist_ok=True)
            name = time.strftime("%Y%m%d") + "-" + secrets.token_hex(6) + "." + ext
            # лёгкая версия для карточек: X-Variant-Of: <имя уже загруженного фото> → <имя>-sm.webp
            of = self.headers.get("X-Variant-Of") or ""
            if of:
                if ext != "webp" or not MEDIA_NAME.match(of) or not os.path.exists(os.path.join(MEDIA, of)):
                    return self.reply(422, {"ok": False, "error": "неверная лёгкая версия"})
                name = of.rsplit(".", 1)[0] + "-sm.webp"
            path_ = os.path.join(MEDIA, name)
            with open(path_, "wb") as f:
                f.write(data)
            os.chmod(path_, 0o644)
            return self.reply(200, {"ok": True, "url": "/media/" + name})
        return self.reply(404, {"ok": False})

    def do_POST(self):
        path = self.path.split("?")[0].rstrip("/")
        if path.startswith("/api/admin/"):
            return self.admin_post(path)
        if path != "/api/lead":
            return self.reply(404, {"ok": False})
        size = int(self.headers.get("Content-Length") or 0)
        if size <= 0 or size > MAX_BODY:
            return self.reply(413, {"ok": False})
        try:
            d = json.loads(self.rfile.read(size).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self.reply(400, {"ok": False})
        if d.get("website"):  # скрытое поле-ловушка для ботов
            return self.reply(200, {"ok": True})
        name, phone = clean(d.get("name"), 80), re.sub(r"\D", "", str(d.get("phone") or ""))[:11]
        if len(name) < 2 or len(phone) != 11 or not d.get("consent"):
            return self.reply(422, {"ok": False})
        ip = self.headers.get("X-Real-IP") or self.client_address[0]
        now = time.time()
        hits = [t for t in recent.get(ip, []) if now - t < 600]
        if len(hits) >= 5:
            return self.reply(429, {"ok": False})
        recent[ip] = hits + [now]
        lead = {
            "time": time.strftime("%Y-%m-%d %H:%M:%S"),
            "name": name,
            "phone": "+" + phone,
            "project": clean(d.get("project"), 60),
            "note": clean(d.get("note"), 600),
            "topic": clean(d.get("topic"), 200),
            "page": clean(d.get("page"), 200),
        }
        try:
            os.makedirs(os.path.dirname(LOG), exist_ok=True)
            with open(LOG, "a", encoding="utf-8") as f:
                f.write(json.dumps(lead, ensure_ascii=False) + "\n")
        except OSError as e:
            print("log error:", e, flush=True)
        text = "Новая заявка с сайта\n\n" + "\n".join(
            f"{k}: {v}" for k, v in [("Имя", lead["name"]), ("Телефон", lead["phone"]), ("Дом", lead["project"] or "не выбран"),
                                     ("Об участке", lead["note"] or "—"), ("Откуда", lead["topic"] or "форма на сайте")])
        send_telegram(text)
        return self.reply(200, {"ok": True})

    def log_message(self, fmt, *args):  # без персональных данных в системном журнале
        print("%s %s" % (self.command, self.path), flush=True)


if __name__ == "__main__":
    print(f"lead server on 127.0.0.1:{PORT}, telegram {'on' if TOKEN else 'OFF'}, recipients: {len(recipients())}, "
          f"admin {'on' if ADMIN_HASH else 'OFF'}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
