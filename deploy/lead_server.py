#!/usr/bin/env python3
"""Приём заявок с сайта Гардарики и пересылка в Telegram.

Только стандартная библиотека Python — ничего устанавливать не нужно.
Слушает 127.0.0.1:8081, снаружи доступен через nginx по адресу /api/lead.

Переменные окружения (задаются в /etc/gardarika-lead.env):
  TELEGRAM_BOT_TOKEN — токен бота от @BotFather
  TELEGRAM_CHAT_ID   — запасной получатель, если нет файла получателей
Получатели заявок — /home/deploy/telegram-chats.txt (копия deploy/telegram-chats.txt из репозитория).
Заявки также дописываются в /var/lib/gardarika/leads.jsonl — на случай, если Telegram недоступен.
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT = os.environ.get("TELEGRAM_CHAT_ID", "")
CHATS_FILE = os.environ.get("CHATS_FILE", "/home/deploy/telegram-chats.txt")
LOG = os.environ.get("LEADS_FILE", "/var/lib/gardarika/leads.jsonl")
PORT = int(os.environ.get("PORT", "8081"))
TG_API = os.environ.get("TELEGRAM_API", "https://api.telegram.org")
MAX_BODY = 8 * 1024
recent = {}  # ip -> [время заявок] — простая защита от повторов


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


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path.rstrip("/") != "/api/lead":
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
    print(f"lead server on 127.0.0.1:{PORT}, telegram {'on' if TOKEN else 'OFF'}, recipients: {len(recipients())}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
