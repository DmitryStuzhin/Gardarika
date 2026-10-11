#!/usr/bin/env bash
# Включает админку каталога (запуск от root на сервере, один раз):
#   curl -fsSL https://raw.githubusercontent.com/DmitryStuzhin/Gardarika/claude/web-design-skills-non-ai-hyjlsh/deploy/enable-admin.sh | bash
# Скрипт печатает пароль для входа на https://<домен>/admin.html.
# Повторный запуск выдаёт новый пароль — старый перестаёт работать (так же меняют забытый пароль).
# Свой пароль вместо случайного:  ... | ADMIN_PASSWORD='ваш-пароль' bash
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Запустите от root"; exit 1; }
F=/etc/nginx/sites-available/gardarika
SNIP=/etc/nginx/snippets/gardarika-admin.conf
ENVF=/etc/gardarika-lead.env
DATA=/var/lib/gardarika

echo "== 1/4 Папки для каталога и фото"
mkdir -p "$DATA/media" "$DATA/catalog-history"
chown -R deploy:deploy "$DATA"
chmod 755 "$DATA" "$DATA/media"
chmod 700 "$DATA/catalog-history"

echo "== 2/4 nginx: адреса админки, каталога и фото"
cat > "$SNIP" <<'NGX'
# админка каталога и загруженные фото — deploy/enable-admin.sh
location ^~ /api/admin/ {
    client_max_body_size 26m;
    proxy_read_timeout 120s;
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header X-Real-IP $remote_addr;
}
location = /api/catalog.js {
    proxy_pass http://127.0.0.1:8081;
}
location ^~ /media/ {
    alias /var/lib/gardarika/media/;
    expires 30d;
    add_header Cache-Control "public";
    add_header X-Content-Type-Options "nosniff" always;
    access_log off;
}
location = /admin.html {
    add_header Cache-Control "no-store";
    add_header X-Robots-Tag "noindex, nofollow" always;
    include /etc/nginx/snippets/gardarika-headers.conf;
}
NGX
BAK="/root/gardarika.nginx.$(date +%s).bak"
cp "$F" "$BAK"
if ! grep -q "gardarika-admin.conf" "$F"; then
  sed -i 's#^\(\s*\)location = /api/lead {#\1include /etc/nginx/snippets/gardarika-admin.conf;\n\n\1location = /api/lead {#' "$F"
fi
if ! nginx -t; then
  echo "Проверка nginx не прошла — возвращаю прежние настройки, сайт работает как раньше"
  cp "$BAK" "$F"; rm -f "$SNIP"; nginx -t && systemctl reload nginx; exit 1
fi

echo "== 3/4 Пароль"
PASS="${ADMIN_PASSWORD:-$(python3 -c 'import secrets; print(secrets.token_urlsafe(12))')}"
HASH=$(python3 - "$PASS" <<'PY'
import hashlib, secrets, sys
salt = secrets.token_bytes(16); n = 300000
print(f"pbkdf2_sha256:{n}:{salt.hex()}:{hashlib.pbkdf2_hmac('sha256', sys.argv[1].encode(), salt, n).hex()}")
PY
)
touch "$ENVF"; chmod 600 "$ENVF"
sed -i '/^ADMIN_PASSWORD_HASH=/d' "$ENVF"
echo "ADMIN_PASSWORD_HASH=$HASH" >> "$ENVF"

echo "== 4/4 Перезапуск"
systemctl restart gardarika-lead
systemctl reload nginx
sleep 1
DOMAIN=$(awk '/server_name/{print $2; exit}' "$F" | tr -d ';')
if journalctl -u gardarika-lead -n 5 --no-pager 2>/dev/null | grep -q "admin on"; then
  echo "Админка включена."
else
  echo "Сервис перезапущен, но новая версия сервера заявок ещё не пришла — дождитесь выкладки сайта из GitHub, админка включится сама."
fi
echo
echo "Адрес:  https://$DOMAIN/admin.html"
echo "Пароль: $PASS"
echo "Сохраните пароль. Чтобы сменить его, запустите этот скрипт ещё раз."
