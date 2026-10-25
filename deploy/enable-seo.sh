#!/usr/bin/env bash
# Страницы для поисковиков и ускорение (запуск от root на сервере, один раз; повторный запуск безопасен):
#   curl -fsSL https://raw.githubusercontent.com/DmitryStuzhin/Gardarika/claude/web-design-skills-non-ai-hyjlsh/deploy/enable-seo.sh | bash
# 1) адреса /doma/ (каталог и страницы домов) и /sitemap.xml — их собирает сервер заявок (deploy/seo_pages.py);
# 2) www.<домен> → <домен>: у поисковика один сайт, а не два одинаковых;
# 3) HTTP/2 и сжатие (то же, что deploy/tune-server.sh).
# При ошибке nginx возвращает прежние настройки.
set -euo pipefail
F=/etc/nginx/sites-available/gardarika
SNIP=/etc/nginx/snippets/gardarika-seo.conf
[ -f "$F" ] || { echo "Это не сервер сайта: запускайте на сервере Timeweb (ssh root@IP-сервера)."; exit 1; }
[ "$(id -u)" = 0 ] || { echo "Запустите от root: ... | sudo bash"; exit 1; }
DOMAIN=$(awk '/server_name/{print $2; exit}' "$F" | tr -d ';')

BAK="/root/gardarika.nginx.$(date +%s).bak"
cp "$F" "$BAK"

echo "== 1/3 Страницы /doma/ и карта сайта, переадресация с www.$DOMAIN"
cat > "$SNIP" <<NGX
# страницы для поисковиков — deploy/enable-seo.sh
if (\$host = www.$DOMAIN) { return 301 https://$DOMAIN\$request_uri; }
location = /doma { return 301 /doma/; }
location ^~ /doma/ {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header X-Real-IP \$remote_addr;
    include /etc/nginx/snippets/gardarika-headers.conf;
}
location = /sitemap.xml {
    proxy_pass http://127.0.0.1:8081;
}
NGX
if ! grep -q "gardarika-seo.conf" "$F"; then
  sed -i 's#^\(\s*\)location = /api/lead {#\1include /etc/nginx/snippets/gardarika-seo.conf;\n\n\1location = /api/lead {#' "$F"
fi

echo "== 2/3 HTTP/2"
sed -i -E '/http2/! s/(listen[[:space:]]+(\[::\]:)?443[[:space:]]+ssl)/\1 http2/' "$F"

echo "== 3/3 Сжатие"
if ! grep -q "gzip_proxied" "$F"; then
  sed -i 's/^\(\s*\)gzip on;/\1gzip on;\n\1gzip_proxied any;\n\1gzip_vary on;/' "$F"
fi
sed -i 's#gzip_types text/css application/javascript application/json image/svg+xml;#gzip_types text/css application/javascript application/json application/xml image/svg+xml;#' "$F"

if ! nginx -t; then
  echo "Проверка nginx не прошла — возвращаю прежние настройки, сайт работает как раньше"
  cp "$BAK" "$F"; rm -f "$SNIP"; nginx -t && systemctl reload nginx; exit 1
fi
systemctl reload nginx
sleep 1
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $DOMAIN" -k "https://127.0.0.1/doma/" || true)
echo
if [ "$code" = "200" ]; then
  echo "Готово: https://$DOMAIN/doma/ и https://$DOMAIN/sitemap.xml работают, www → $DOMAIN, HTTP/2 включён."
else
  echo "nginx настроен (ответ $code). Если /doma/ пока не открывается — дождитесь выкладки сайта из GitHub, она обновит сервер заявок."
fi
echo "Резервная копия прежних настроек: $BAK"
