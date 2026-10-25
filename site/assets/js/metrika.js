/* Яндекс Метрика: счётчик 113784303 и цели сайта.
   Цели («JavaScript-событие» в настройках счётчика), их отправляет vzGoal():
     lead_sent       — заявка отправлена
     phone_click     — нажали на телефон
     messenger_click — нажали на Telegram или WhatsApp
     project_view    — открыли страницу дома (параметр slug)
     quiz_done       — прошли подбор дома
     calc_open       — открыли калькулятор
     calc_start      — в калькуляторе нажали «Далее» в первый раз
     calc_tour       — нажали «Стройка целиком»
     calc_finish     — дошли до итога калькулятора
     calc_cta        — из итога калькулятора нажали «Обсудить этот дом» */
(function(m, e, t, r, i, k, a){
  m[i] = m[i] || function(){ (m[i].a = m[i].a || []).push(arguments); };
  m[i].l = 1 * new Date();
  for (var j = 0; j < e.scripts.length; j++){ if (e.scripts[j].src === r) return; }
  k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=113784303", "ym");

(function(){
  "use strict";
  var ID = 113784303;
  ym(ID, "init", {ssr: true, webvisor: true, clickmap: true, accurateTrackBounce: true, trackLinks: true});
  /* страницы домов и каталога открываются по адресам с #/… — site.js отмечает их как отдельные просмотры */
  window.vzHit = function(title){ try { ym(ID, "hit", location.href, {title: title || document.title, referer: document.referrer}); } catch (err){} };

  var sent = {};
  window.vzGoal = function(name, params, once){
    if (once){ if (sent[name]) return; sent[name] = true; }
    try { ym(ID, "reachGoal", name, params || undefined); } catch (err){ /* счётчик заблокирован — сайт работает и без него */ }
  };

  document.addEventListener("click", function(ev){
    var a = ev.target.closest && ev.target.closest("a, [data-goal]");
    if (!a) return;
    if (a.hasAttribute("data-goal")) return window.vzGoal(a.getAttribute("data-goal"));
    var href = a.getAttribute("href") || "";
    if (/^tel:/.test(href)) window.vzGoal("phone_click", {place: location.pathname + location.hash});
    else if (/t\.me\/|wa\.me\/|whatsapp/.test(href)) window.vzGoal("messenger_click", {to: /wa\.me|whatsapp/.test(href) ? "whatsapp" : "telegram"});
  }, true);
})();

/* Плашка о cookie: один раз, до нажатия «Понятно» */
(function(){
  "use strict";
  var KEY = "vz-cookie-ok";
  try { if (localStorage.getItem(KEY)) return; } catch (e){ return; }
  function show(){
    var d = document.createElement("div");
    d.className = "cookie-note"; d.setAttribute("role", "region"); d.setAttribute("aria-label", "Файлы cookie");
    d.innerHTML = '<p>Сайт использует cookie и Яндекс Метрику, чтобы понимать, что посетителям удобно. Подробнее — в <a href="privacy.html#cookie">политике</a>.</p><button type="button">Понятно</button>';
    d.querySelector("button").addEventListener("click", function(){ try { localStorage.setItem(KEY, "1"); } catch (e){} d.remove(); });
    document.body.appendChild(d);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show); else show();
})();
