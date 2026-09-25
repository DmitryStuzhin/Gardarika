# Гардарика — сайт

Статический сайт без сборки: откройте `index.html` в браузере или выложите папку `site/` на любой хостинг.

- `assets/js/data.js` — каталог из 16 домов. У Birch 132, Lilac 96 и Vesper 164 стоит `example: true`: их параметры и цены — пример, замените их на свои.
- `#constructor` в `index.html` — место под будущий 3D-калькулятор. Монтируйте его в `#calculator-root`, схема внутри — временная.
- Форма заявки проверяет поля, но пока никуда не отправляет данные: подключите обработчик в `assets/js/site.js` (блок «Заявка»).
- Шрифты: Geologica (OFL, fontsource) и Golos Text (OFL) лежат в `assets/fonts/`.
- `assets/js/data.js`, объект `COMPANY` — цифры компании, цены за м² по комплектациям, построенные дома, отзывы и ссылки на Telegram/WhatsApp. Пока поле пустое, на главной видна пунктирная пометка «заполнить».
- Логотип: `assets/brand/mark.svg` (вектор), `assets/brand/logo-original.png` (исходник). Шрифт надписи — Forum (OFL), лежит в `assets/fonts/`.
- `calculator.html` — полный калькулятор со старого сайта (11 шагов, 3D, смета в PDF). Не редактируйте его вручную: он собирается из `reference/index.src.html` командой `python3 site/tools/build-calculator.py`. Оформление — `assets/calc/calc-theme.css`, связь с каталогом — `assets/calc/calc-bridge.js`, шапка — `assets/calc/calc-header.html`. Ссылка на конкретный дом: `calculator.html#terra-113`.
