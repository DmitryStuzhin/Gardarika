#!/usr/bin/env bash
# Первичная настройка сервера для сайта Гардарики (Ubuntu 22.04 / 24.04, запускать от root).
# Запускается один раз. Потом сайт обновляется сам через GitHub Actions (.github/workflows/deploy.yml).
#
#   DOMAIN=gardarika.ru EMAIL=info@gardarika.moscow TG_TOKEN=123:ABC TG_CHAT=123456 bash setup-server.sh
#
# Что делает: nginx + HTTPS (Let's Encrypt), пользователь deploy для выкладки, сервис приёма заявок,
# файрвол. В конце печатает ключ, который нужно вставить в GitHub (секрет DEPLOY_KEY).
set -euo pipefail

DOMAIN="${DOMAIN:?укажите DOMAIN, например DOMAIN=gardarika.ru}"
EMAIL="${EMAIL:-}"
TG_TOKEN="${TG_TOKEN:-}"
TG_CHAT="${TG_CHAT:-}"
SITE=/var/www/gardarika

echo "== 1/6 Пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q nginx certbot python3-certbot-nginx python3 rsync ufw

echo "== 2/6 Пользователь deploy и папка сайта"
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
mkdir -p "$SITE" /var/lib/gardarika /home/deploy/.ssh
chown -R deploy:deploy "$SITE" /var/lib/gardarika /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
if [ ! -f /root/gardarika_deploy_key ]; then
  ssh-keygen -q -t ed25519 -N "" -C "github-actions-deploy" -f /root/gardarika_deploy_key
fi
grep -qf /root/gardarika_deploy_key.pub /home/deploy/.ssh/authorized_keys 2>/dev/null || cat /root/gardarika_deploy_key.pub >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys; chmod 600 /home/deploy/.ssh/authorized_keys
# deploy может только перезапустить сервис заявок — больше никаких прав root
echo "deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart gardarika-lead" > /etc/sudoers.d/gardarika-deploy
chmod 440 /etc/sudoers.d/gardarika-deploy
[ -f "$SITE/index.html" ] || echo "<!doctype html><meta charset=utf-8><title>Гардарика</title><p>Сайт скоро появится.</p>" > "$SITE/index.html"

echo "== 3/6 Сервис заявок (lead_server.py приходит с первой выкладкой)"
umask 077
cat > /etc/gardarika-lead.env <<ENV
TELEGRAM_BOT_TOKEN=$TG_TOKEN
TELEGRAM_CHAT_ID=$TG_CHAT
LEADS_FILE=/var/lib/gardarika/leads.jsonl
ENV
umask 022
cat > /etc/systemd/system/gardarika-lead.service <<'UNIT'
[Unit]
Description=Gardarika leads -> Telegram
After=network-online.target
ConditionPathExists=/home/deploy/lead_server.py

[Service]
User=deploy
EnvironmentFile=/etc/gardarika-lead.env
ExecStart=/usr/bin/python3 /home/deploy/lead_server.py
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/gardarika

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable gardarika-lead >/dev/null

echo "== 4/6 nginx"
mkdir -p /etc/nginx/snippets
cat > /etc/nginx/snippets/gardarika-headers.conf <<'HDR'
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Frame-Options "SAMEORIGIN" always;
HDR
cat > /etc/nginx/sites-available/gardarika <<'NGX'
# Гардарика — nginx. setup-server.sh подставляет домен вместо DOMAIN.
limit_req_zone $binary_remote_addr zone=leads:10m rate=6r/m;

server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN www.DOMAIN;

    root /var/www/gardarika;
    index index.html;
    charset utf-8;

    # служебные файлы репозитория на сервер не попадают, но на всякий случай закрываем
    location ~ /\.(?!well-known) { deny all; }
    location = /calculator-legacy.html { return 301 /calculator.html; }

    location / {
        try_files $uri $uri/ =404;
    }

    # HTML всегда свежий, чтобы изменения сайта были видны сразу
    location ~* \.html?$ {
        add_header Cache-Control "no-cache";
        include /etc/nginx/snippets/gardarika-headers.conf;
    }
    # картинки, шрифты, скрипты и стили — кэш на неделю
    location ~* \.(?:css|js|webp|jpg|jpeg|png|svg|woff2?|ttf|ico)$ {
        expires 7d;
        add_header Cache-Control "public";
        access_log off;
    }

    # заявки → lead_server.py
    location = /api/lead {
        limit_req zone=leads burst=3 nodelay;
        limit_req_status 429;
        client_max_body_size 16k;
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header X-Real-IP $remote_addr;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
}
NGX
sed -i "s/DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/gardarika
ln -sf /etc/nginx/sites-available/gardarika /etc/nginx/sites-enabled/gardarika
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "== 5/6 Файрвол"
ufw allow OpenSSH >/dev/null
ufw allow "Nginx Full" >/dev/null
ufw --force enable >/dev/null

echo "== 6/6 HTTPS"
IP=$(curl -fsS4 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
DNS=$(getent ahostsv4 "$DOMAIN" | awk '{print $1; exit}' || true)
if [ -n "$DNS" ] && [ "$DNS" = "$IP" ]; then
  MAILOPT=(--register-unsafely-without-email); [ -n "$EMAIL" ] && MAILOPT=(-m "$EMAIL")
  DOMS=(-d "$DOMAIN"); getent ahostsv4 "www.$DOMAIN" >/dev/null && DOMS+=(-d "www.$DOMAIN")
  certbot --nginx --non-interactive --agree-tos --redirect "${MAILOPT[@]}" "${DOMS[@]}"
else
  echo "Домен $DOMAIN пока не указывает на этот сервер ($IP). Когда A-запись заработает, выполните:"
  echo "  certbot --nginx --redirect -d $DOMAIN -d www.$DOMAIN"
fi

cat <<DONE

Готово. Осталось добавить в GitHub → Settings → Secrets and variables → Actions:
  DEPLOY_HOST = $IP
  DEPLOY_KEY  = всё содержимое между линиями ниже (вместе со строками BEGIN/END)
-----------------------------------------------------------------
$(cat /root/gardarika_deploy_key)
-----------------------------------------------------------------
После этого каждая выкладка в main (или кнопка Run workflow) обновит сайт.
DONE
