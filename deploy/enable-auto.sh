#!/usr/bin/env bash
# Один раз на сервере (от root): включает автоматику, после которой заходить на сервер больше не нужно.
#  1) ставит команду gardarika-update и сразу обновляет сайт;
#  2) каждые 15 минут проверяет домен и сам включает HTTPS, когда домен начнёт указывать на сервер;
#  3) печатает ключ для GitHub — после этого сайт обновляется сам при каждом изменении в репозитории.
set -euo pipefail
RAW="https://raw.githubusercontent.com/DmitryStuzhin/Gardarika/claude/web-design-skills-non-ai-hyjlsh/deploy"

echo "== 1/3 Обновление сайта"
curl -fsSL -o /usr/local/bin/gardarika-update "$RAW/update-site.sh"
chmod 755 /usr/local/bin/gardarika-update
/usr/local/bin/gardarika-update

echo "== 2/3 Автоматический HTTPS"
cat > /usr/local/bin/gardarika-https <<'SH'
#!/usr/bin/env bash
# Включает HTTPS, как только домен указывает на этот сервер. Если сертификат уже есть — ничего не делает.
set -uo pipefail
DOMAIN=$(awk '/server_name/{print $2; exit}' /etc/nginx/sites-available/gardarika | tr -d ';')
[ -n "$DOMAIN" ] || exit 0
[ -d "/etc/letsencrypt/live/$DOMAIN" ] && exit 0
IP=$(curl -fsS4 -m 10 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
[ "$(getent ahostsv4 "$DOMAIN" | awk '{print $1; exit}')" = "$IP" ] || { echo "домен $DOMAIN ещё не указывает на $IP"; exit 0; }
DOMS=(-d "$DOMAIN")
[ "$(getent ahostsv4 "www.$DOMAIN" | awk '{print $1; exit}')" = "$IP" ] && DOMS+=(-d "www.$DOMAIN")
certbot --nginx --non-interactive --agree-tos --redirect --register-unsafely-without-email "${DOMS[@]}"
SH
chmod 755 /usr/local/bin/gardarika-https
cat > /etc/systemd/system/gardarika-https.service <<'UNIT'
[Unit]
Description=Gardarika: enable HTTPS when DNS is ready
[Service]
Type=oneshot
ExecStart=/usr/local/bin/gardarika-https
UNIT
cat > /etc/systemd/system/gardarika-https.timer <<'UNIT'
[Unit]
Description=Gardarika: check DNS for HTTPS every 15 minutes
[Timer]
OnBootSec=2min
OnUnitActiveSec=15min
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now gardarika-https.timer >/dev/null
/usr/local/bin/gardarika-https || true

echo "== 3/3 Ключ для GitHub"
cat <<DONE

Добавьте в GitHub: репозиторий → Settings → Secrets and variables → Actions → New repository secret
  1) Name: DEPLOY_HOST   Secret: $(curl -fsS4 -m 10 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
  2) Name: DEPLOY_KEY    Secret: всё между линиями ниже, включая строки BEGIN и END
-----------------------------------------------------------------
$(cat /root/gardarika_deploy_key)
-----------------------------------------------------------------
DONE
