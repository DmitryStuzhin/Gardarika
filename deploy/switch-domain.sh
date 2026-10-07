#!/usr/bin/env bash
# Переключает сайт на новый домен (запуск от root на сервере):
#   NEW=vozdvizhen.ru bash switch-domain.sh
# 1) выпускает сертификат для NEW и www.NEW;
# 2) переводит основной сайт на NEW;
# 3) старый домен (если был) перебрасывает на NEW с сохранением пути — старые ссылки продолжают работать.
set -euo pipefail
NEW="${NEW:?укажите новый домен: NEW=example.ru}"
F=/etc/nginx/sites-available/gardarika
OLD=$(awk '/server_name/{print $2; exit}' "$F" | tr -d ';')
[ "$OLD" = "$NEW" ] && { echo "Сайт уже работает на $NEW"; exit 0; }

IP=$(curl -fsS4 -m 10 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
for h in "$NEW" "www.$NEW"; do
  [ "$(getent ahostsv4 "$h" | awk '{print $1; exit}')" = "$IP" ] || { echo "$h пока не указывает на $IP — проверьте A-запись и повторите позже"; exit 1; }
done

echo "== 1/3 Сертификат для $NEW"
certbot certonly --nginx --non-interactive --agree-tos --register-unsafely-without-email -d "$NEW" -d "www.$NEW"

echo "== 2/3 Основной сайт: $OLD → $NEW"
BAK="/root/gardarika.nginx.$(date +%s).bak"
cp "$F" "$BAK"
sed -i "s/$OLD/$NEW/g" "$F"

echo "== 3/3 Старый домен перебрасывает на новый"
if [ -d "/etc/letsencrypt/live/$OLD" ]; then
cat > /etc/nginx/sites-available/gardarika-old <<NGX
server {
    listen 80;
    listen [::]:80;
    server_name $OLD www.$OLD;
    return 301 https://$NEW\$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $OLD www.$OLD;
    ssl_certificate /etc/letsencrypt/live/$OLD/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$OLD/privkey.pem;
    return 301 https://$NEW\$request_uri;
}
NGX
ln -sf /etc/nginx/sites-available/gardarika-old /etc/nginx/sites-enabled/gardarika-old
fi

if ! nginx -t; then
  echo "Проверка nginx не прошла — возвращаю прежние настройки, сайт продолжает работать на $OLD"
  cp "$BAK" "$F"; rm -f /etc/nginx/sites-enabled/gardarika-old /etc/nginx/sites-available/gardarika-old
  nginx -t && systemctl reload nginx
  exit 1
fi
systemctl reload nginx
echo
echo "Готово: сайт работает на https://$NEW"
[ -d "/etc/letsencrypt/live/$OLD" ] && echo "Старый адрес https://$OLD перебрасывает на новый."
