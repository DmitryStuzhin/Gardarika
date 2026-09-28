#!/usr/bin/env bash
# Обновить сайт на сервере из GitHub. Запуск от root: gardarika-update
# Ветку можно указать: BRANCH=main gardarika-update
set -euo pipefail
REPO="https://github.com/DmitryStuzhin/Gardarika.git"
BRANCH="${BRANCH:-claude/web-design-skills-non-ai-hyjlsh}"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
command -v git >/dev/null || apt-get install -y -q git
git clone -q --depth 1 -b "$BRANCH" "$REPO" "$TMP/g"
rsync -a --delete --chmod=D755,F644 \
  --exclude calc-src/ --exclude tools/ --exclude README.md --exclude calculator-legacy.html \
  "$TMP/g/site/" /var/www/gardarika/
install -m 644 -o deploy -g deploy "$TMP/g/deploy/lead_server.py" /home/deploy/lead_server.py
install -m 755 "$TMP/g/deploy/update-site.sh" /usr/local/bin/gardarika-update
chown -R deploy:deploy /var/www/gardarika
systemctl restart gardarika-lead
echo "Сайт обновлён: $(git -C "$TMP/g" log -1 --format='%h %s')"
echo "Заявки: $(systemctl is-active gardarika-lead)"
