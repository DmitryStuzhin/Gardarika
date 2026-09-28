# Гардарика — сайт

Статический сайт без сборки: откройте `index.html` в браузере или выложите папку `site/` на любой хостинг.

- `assets/js/data.js` — каталог из 16 домов. У Birch 132, Lilac 96 и Vesper 164 стоит `example: true`: их параметры и цены — пример, замените их на свои.
- `#calculator` в `index.html` — анонс калькулятора.
- Форма заявки проверяет поля, но пока никуда не отправляет данные: подключите обработчик в `assets/js/site.js` (блок «Заявка»).
- Шрифты: Geologica (OFL, fontsource) и Golos Text (OFL) лежат в `assets/fonts/`.
- `assets/js/data.js`, объект `COMPANY` — цифры компании, цены за м² по комплектациям, построенные дома, отзывы и ссылки на Telegram/WhatsApp. Пока поле пустое, на главной видна пунктирная пометка «заполнить».
- Логотип: `assets/brand/mark.svg` (вектор), `assets/brand/logo-original.png` (исходник). Шрифт надписи — Forum (OFL), лежит в `assets/fonts/`.
- `calculator.html` — калькулятор дома (MVP): три готовые модели (Lento 100, Lilia 105, Garden 106), их части смешиваются, смета по этапам и PDF. Устройство и добавление домов — `assets/configurator/README.md`. Проверка всех сочетаний: `node site/tools/test-constructor.js`.
- `calculator-legacy.html` — архив старого 11-шагового калькулятора, с сайта не ссылается. Собирается из `calc-src/calculator.src.html` командой `python3 site/tools/build-calculator.py`.
- `constructor.html` — перенаправление на калькулятор.
