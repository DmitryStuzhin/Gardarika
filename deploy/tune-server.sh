#!/usr/bin/env bash
# Ускорение сайта на сервере (запуск от root, один раз):
#   curl -fsSL https://raw.githubusercontent.com/DmitryStuzhin/Gardarika/claude/web-design-skills-non-ai-hyjlsh/deploy/tune-server.sh | bash
# Включает HTTP/2 (телефон грузит все файлы страницы параллельно по одному соединению)
# и сжатие ответов сервера заявок/каталога. При ошибке nginx возвращает прежние настройки.
set -euo pipefail
F=/etc/nginx/sites-available/gardarika
[ -f "$F" ] || { echo "Это не сервер сайта: запускайте на сервере Timeweb (ssh root@IP-сервера)."; exit 1; }
[ "$(id -u)" = 0 ] || { echo "Запустите от root: ... | sudo bash"; exit 1; }

BAK="/root/gardarika.nginx.$(date +%s).bak"
cp "$F" "$BAK"

echo "== 1/2 HTTP/2"
# listen 443 ssl;  →  listen 443 ssl http2;   (и то же для IPv6)
sed -i -E '/http2/! s/(listen[[:space:]]+(\[::\]:)?443[[:space:]]+ssl)/\1 http2/' "$F"
grep -nE "listen.*443" "$F" || echo "(строк listen 443 не нашлось — HTTPS ещё не включён?)"

echo "== 2/2 Сжатие"
if ! grep -q "gzip_proxied" "$F"; then
  sed -i 's/^\(\s*\)gzip on;/\1gzip on;\n\1gzip_proxied any;\n\1gzip_vary on;/' "$F"
fi

if ! nginx -t; then
  echo "Проверка nginx не прошла — возвращаю прежние настройки, сайт работает как раньше"
  cp "$BAK" "$F"; nginx -t && systemctl reload nginx; exit 1
fi
systemctl reload nginx
echo
echo "Готово: HTTP/2 и сжатие включены. Резервная копия прежних настроек: $BAK"
