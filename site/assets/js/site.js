(function(){
"use strict";
document.documentElement.classList.add("js");

var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var $ = function(s, c){ return (c || document).querySelector(s); };
var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
var NB = " ", THIN = " ";

function mm(v){ return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, THIN); }
function metres(d){ return (d[0] / 1000).toFixed(1).replace(".", ",") + NB + "×" + NB + (d[1] / 1000).toFixed(1).replace(".", ",") + NB + "м"; }
function floorsLabel(f){ return f === 1 ? "1 этаж" : f === 2 ? "2 этажа" : "С мансардой"; }
function provLabel(h){ return h.prov === "viz" ? "Визуализация" : "Референс из материалов проекта"; }
function areaNum(h){ return parseFloat(String(h.area).replace(",", ".")); }
function price(h){ return "от " + h.price + NB + "млн" + NB + "₽"; }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function bySlug(slug){ for (var i = 0; i < HOUSES.length; i++) if (HOUSES[i].slug === slug) return HOUSES[i]; return null; }
function icon(id){ return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; }

/* Штамп: ячейки [подпись, значение, классы] */
function cell(label, value, cls){ return {l: label, v: value, c: cls || ""}; }
function stampHTML(cells){
  return cells.map(function(c){
    return '<div' + (/span2/.test(c.c) ? ' class="span2"' : "") + '><span class="sl">' + c.l + '</span><span class="sv ' + c.c.replace("span2", "") + '">' + c.v + "</span></div>";
  }).join("");
}

/* Размерные линии: прорисовка и счёт до значения */
function countTo(el, target){
  if (reduce || !target){ el.textContent = mm(target); return; }
  var t0 = null, dur = 900;
  function step(t){
    if (!t0) t0 = t;
    var k = Math.min(1, (t - t0) / dur), e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
    el.textContent = mm(Math.round(target * e / 10) * 10);
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function drawDims(fig){
  fig.classList.remove("dims-in");
  void fig.offsetWidth;
  fig.classList.add("dims-in");
  $$(".dim-val", fig).forEach(function(v){ countTo(v, +v.getAttribute("data-mm") || 0); });
}
function dimsMarkup(d, withY){
  return '<div class="dim dim-x" aria-hidden="true"><span class="dim-val" data-mm="' + d[0] + '">' + mm(d[0]) + "</span></div>" +
    (withY ? '<div class="dim dim-y" aria-hidden="true"><span class="dim-val" data-mm="' + d[1] + '">' + mm(d[1]) + "</span></div>" : "");
}
var io = "IntersectionObserver" in window ? new IntersectionObserver(function(entries){
  entries.forEach(function(e){ if (e.isIntersecting){ drawDims(e.target); io.unobserve(e.target); } });
}, {threshold: .35}) : null;
function watchDims(fig){ if (io) io.observe(fig); else fig.classList.add("dims-in"); }

/* Первый экран: три новых дома */
var heroHouses = HOUSES.filter(function(h){ return h.example; });
var heroFig = $("#heroFig"), heroImgs = $$(".hero-img"), heroTabs = $$(".hero-tabs button"), heroStamp = $("#heroStamp");
var heroIndex = 0, heroTimer = null;
function setHero(i, animate){
  heroIndex = i;
  var h = heroHouses[i];
  heroImgs.forEach(function(img, n){ img.classList.toggle("is-on", n === i); });
  heroTabs.forEach(function(b, n){ b.setAttribute("aria-selected", n === i ? "true" : "false"); b.tabIndex = n === i ? 0 : -1; });
  var v = $(".dim-val", heroFig);
  v.setAttribute("data-mm", h.dims[0]);
  heroStamp.href = "#/p/" + h.slug;
  heroStamp.setAttribute("aria-label", "Открыть проект " + h.name);
  heroStamp.innerHTML = stampHTML([
    cell("Проект", h.name, "sv-big span2"), cell("Цена, пример", price(h)),
    cell("Площадь", h.area + NB + "м²"), cell("Этажность", floorsLabel(h.floors)), cell("Габариты", metres(h.dims))
  ]);
  if (animate) drawDims(heroFig); else v.textContent = mm(h.dims[0]);
}
var heroTabList = $(".hero-tabs");
function autoHero(){
  clearTimeout(heroTimer);
  if (reduce){ heroTabList.classList.add("is-paused"); return; }
  heroTimer = setTimeout(function next(){
    if (!document.hidden) setHero((heroIndex + 1) % heroHouses.length, true);
    heroTimer = setTimeout(next, 7000);
  }, 7000);
}
function restartProgress(){
  var bar = $('.hero-tabs button[aria-selected="true"] i');
  if (!bar) return;
  bar.style.display = "none"; void bar.offsetWidth; bar.style.display = "";
}
heroTabs.forEach(function(b, n){
  b.addEventListener("click", function(){ setHero(n, true); restartProgress(); autoHero(); });
  b.addEventListener("keydown", function(e){
    var k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!k) return;
    e.preventDefault();
    var j = (n + k + heroTabs.length) % heroTabs.length; setHero(j, true); restartProgress(); autoHero(); heroTabs[j].focus();
  });
});
setHero(0, false);
watchDims(heroFig);
autoHero();

/* Карточки домов */
function cardHTML(h){
  var a = areaNum(h);
  return '<a class="card" href="#/p/' + h.slug + '" data-floors="' + h.floors + '" data-size="' + (a < 110 ? "s" : a < 130 ? "m" : "l") + '">' +
    '<div class="card-media"><img src="' + h.image + '" alt="Проект ' + esc(h.name) + ': ' + esc(h.type.toLowerCase()) + '" loading="lazy">' +
      (h.example ? '<span class="tag tag-new">Новый проект</span>' : "") + '<span class="prov">' + provLabel(h) + "</span></div>" +
    '<div class="card-body"><h3>' + h.name + '</h3><p class="card-type">' + h.type + "</p>" +
      '<ul class="card-meta"><li>' + icon("i-area") + h.area + NB + "м²</li><li>" + icon("i-floors") + floorsLabel(h.floors) + "</li>" + (/комнат|спальн/.test(h.rooms) ? "<li>" + icon("i-rooms") + h.rooms + "</li>" : "") + "</ul>" +
      '<div class="card-foot"><div class="card-price">' +
        (h.example ? "<b>" + price(h) + '</b><small>ориентировочно, пример</small>' : "<b>Узнать цену</b><small>рассчитаем под ваш участок</small>") +
      '</div><span class="card-go" aria-hidden="true">' + icon("i-arrow") + "</span></div></div></a>";
}
var POPULAR = ["birch-132", "lilac-96", "vesper-164", "lento-100", "garden-106", "bgl-124", "alto-130", "pine-141"];
$("#popular").innerHTML = POPULAR.map(function(slug){ return cardHTML(bySlug(slug)); }).join("");

var grid = $("#grid");
grid.innerHTML = HOUSES.map(cardHTML).join("");
var cards = $$(".card", grid), count = $("#count"), empty = $("#empty");
var filter = {floors: "all", area: "all"};
function plural(n){ var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? "проект" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "проекта" : "проектов"; }
function applyFilter(){
  var shown = 0;
  cards.forEach(function(c){
    var on = (filter.floors === "all" || c.getAttribute("data-floors") === filter.floors) && (filter.area === "all" || c.getAttribute("data-size") === filter.area);
    c.classList.toggle("is-out", !on); if (on) shown++;
  });
  count.textContent = shown === HOUSES.length ? "Все " + shown + " проектов" : "Нашлось " + shown + " " + plural(shown) + " из " + HOUSES.length;
  empty.hidden = shown > 0;
}
$$(".chip").forEach(function(b){
  b.addEventListener("click", function(){
    var k = b.getAttribute("data-k");
    filter[k] = b.getAttribute("data-v");
    $$('.chip[data-k="' + k + '"]').forEach(function(x){ x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    applyFilter();
  });
});
$("#resetFilters").addEventListener("click", function(){ $$('.chip[data-v="all"]').forEach(function(b){ b.click(); }); });
applyFilter();

/* Данные компании: цифры, цены, построенные дома, отзывы, мессенджеры */
var C = window.COMPANY || {};
function todo(text){ return '<span class="todo-mark">заполнить</span> ' + text; }
var years = C.since ? new Date().getFullYear() - C.since : null;
$("#stats").innerHTML = [
  {v: "16", l: "проектов в каталоге, от 96 до 164 м²"},
  {v: years, l: "лет строим дома", hint: "год основания — COMPANY.since"},
  {v: C.housesBuilt, l: "домов построено", hint: "COMPANY.housesBuilt"},
  {v: C.warrantyYears, l: "лет гарантии на конструктив", hint: "COMPANY.warrantyYears"}
].map(function(x){
  return x.v ? "<li><b>" + x.v + "</b><span>" + x.l + "</span></li>" : '<li class="todo"><b>—</b><span>' + x.l + "</span><span>" + todo(x.hint) + "</span></li>";
}).join("");
$$("#packs .pack").forEach(function(el){
  var v = C.packages && C.packages[el.getAttribute("data-pack")], pp = $(".pack-price", el);
  if (v){ pp.textContent = "от " + v + NB + "₽ за м²"; }
  else { pp.classList.add("todo"); pp.innerHTML = todo("цена за м² — COMPANY.packages"); }
});
$("#builtList").innerHTML = (C.builtHouses && C.builtHouses.length) ? C.builtHouses.map(function(b){
  return '<figure class="built-card"><img src="' + b.image + '" alt="' + esc(b.title) + '" loading="lazy"><div><b>' + esc(b.title) + "</b><small>" + esc(b.note || "") + "</small></div></figure>";
}).join("") : [1, 2, 3].map(function(){
  return '<div class="slot todo"><span class="todo-mark">заполнить</span><p>Фото построенного дома, где он стоит, срок и комплектация. Добавьте в COMPANY.builtHouses.</p></div>';
}).join("");
$("#reviewList").innerHTML = (C.reviews && C.reviews.length) ? C.reviews.map(function(r){
  return '<blockquote class="review"><p>' + esc(r.text) + "</p><b>" + esc(r.name) + "</b><small>" + esc(r.place || "") + "</small></blockquote>";
}).join("") : [1, 2, 3].map(function(){
  return '<div class="slot todo"><span class="todo-mark">заполнить</span><p>Настоящий отзыв клиента: имя, где построен дом, пара предложений. Добавьте в COMPANY.reviews.</p></div>';
}).join("");
if (C.buildMonths) $('[data-term="months"]').textContent = "Типичный срок стройки — " + C.buildMonths + " мес. Этапы прописываются в договоре.";
if (C.warrantyYears) $('[data-term="warranty"]').textContent = C.warrantyYears + " лет на конструкцию, гарантия оформляется в договоре.";
var msgrs = [];
if (C.telegram) msgrs.push({href: C.telegram, icon: "i-tg", label: "Telegram"});
if (C.whatsapp) msgrs.push({href: C.whatsapp, icon: "i-wa", label: "WhatsApp"});
$("[data-msgr]").innerHTML = msgrs.map(function(m){ return '<a href="' + m.href + '" target="_blank" rel="noopener" aria-label="Написать в ' + m.label + '">' + icon(m.icon) + "</a>"; }).join("");
$("[data-msgr-big]").innerHTML = msgrs.length ? msgrs.map(function(m){ return '<a href="' + m.href + '" target="_blank" rel="noopener">' + icon(m.icon) + "Написать в " + m.label + "</a>"; }).join("")
  : '<span class="todo">' + todo("ссылки на Telegram и WhatsApp — COMPANY.telegram, COMPANY.whatsapp") + "</span>";

/* Квиз */
var qForm = $("#quiz-form"), qs = $$(".q", qForm), qStep = $("#quizStep"), qBar = $("#quizBar"), qBack = $("#quizBack"), qi = 0, answers = {};
function showQ(i){
  qi = i;
  qs.forEach(function(q, n){ q.classList.toggle("is-on", n === i); });
  var last = i === qs.length - 1;
  qStep.textContent = last ? "Ваша подборка" : "Вопрос " + (i + 1) + " из " + (qs.length - 1);
  qBar.style.width = (last ? 100 : (i + 1) / (qs.length - 1) * 100) + "%";
  qBack.hidden = i === 0;
}
function quizResult(){
  var size = answers.area && answers.area !== "any" ? answers.area : answers.family === "2" ? "s" : answers.family === "5" ? "l" : "m";
  var list = HOUSES.filter(function(h){
    var a = areaNum(h), sz = a < 110 ? "s" : a < 130 ? "m" : "l";
    var fl = answers.floors === "any" || (answers.floors === "1" ? h.floors === 1 : h.floors > 1);
    return fl && sz === size;
  });
  if (!list.length) list = HOUSES.filter(function(h){ return answers.floors === "any" || (answers.floors === "1" ? h.floors === 1 : h.floors > 1); });
  list = list.slice(0, 3);
  $("#quizResultTitle").textContent = (list.length === 1 ? "Вам подойдёт " : "Вам подойдут ") + list.length + " " + plural(list.length);
  $("#quizMatches").innerHTML = list.map(function(h){
    return '<a class="q-match" href="#/p/' + h.slug + '"><img src="' + h.image + '" alt=""><span><b>' + h.name + "</b><small>" + h.area + NB + "м² · " + floorsLabel(h.floors).toLowerCase() + "</small></span>" + icon("i-arrow") + "</a>";
  }).join("");
  $("#quizToForm").setAttribute("data-topic", "Квиз: " + list.map(function(h){ return h.name; }).join(", ") + (answers.when ? " · " + answers.when : ""));
}
qs.forEach(function(q, n){
  $$("input", q).forEach(function(inp){
    inp.addEventListener("change", function(){
      answers[inp.name] = inp.value;
      setTimeout(function(){
        if (n + 1 === qs.length - 1) quizResult();
        showQ(n + 1);
      }, 220);
    });
  });
});
qBack.addEventListener("click", function(){ showQ(Math.max(0, qi - 1)); });
$("#quizToForm").addEventListener("click", function(){ topic.value = this.getAttribute("data-topic") || ""; });
showQ(0);

/* Страница проекта */
var project = $("#project");
function showProject(h){
  var fig = $("#pFigure");
  fig.className = "dimfig p-figure" + (h.dims ? " has-x has-y" : "");
  $$(".dim", fig).forEach(function(d){ d.remove(); });
  if (h.dims) fig.insertAdjacentHTML("afterbegin", dimsMarkup(h.dims, true));
  var img = $("#pImage"); img.src = h.image; img.alt = "Проект " + h.name + ": " + h.type.toLowerCase();
  $("#pProv").textContent = provLabel(h);
  $("#pTitle").textContent = h.name;
  $("#pType").textContent = h.type;
  $("#pLede").textContent = h.lede;
  $("#pStory").textContent = h.story;
  var cells = [cell("Площадь", h.area + NB + "м²"), cell("Этажность", floorsLabel(h.floors)),
    cell("Габариты в плане", h.dims ? metres(h.dims) : "уточняются"), cell("Состав", h.rooms)];
  cells.push(h.example ? cell("Цена, пример", price(h), "span2") : cell("Цена", "под ваш участок", "span2"));
  $("#pStamp").innerHTML = stampHTML(cells);
  var g = $("#pGallery");
  g.innerHTML = h.gallery.map(function(src){
    return '<figure><div class="frame"><img src="' + src + '" alt="Исходный материал проекта ' + esc(h.name) + '" loading="lazy"></div><figcaption>' +
      (/plan/.test(src) ? "Планировка · исходный материал проекта" : "Исходный материал проекта") + "</figcaption></figure>";
  }).join("");
  g.hidden = !h.gallery.length;
  $("#pDiscuss").setAttribute("data-project", h.slug);
  document.title = h.name + " — Гардарика";
  document.body.classList.add("is-project");
  project.hidden = false;
  window.scrollTo(0, 0);
  $("#pTitle").focus({preventScroll: true});
  if (h.dims) watchDims(fig);
}
function hideProject(){
  if (project.hidden) return false;
  project.hidden = true;
  document.body.classList.remove("is-project");
  document.title = "Гардарика — дома под ключ для жизни за городом";
  return true;
}
var catPage = $("#catalogPage");
function showCatalog(){
  hideProject();
  catPage.hidden = false;
  document.body.classList.add("is-catalog");
  document.title = "Каталог домов — Гардарика";
  window.scrollTo(0, 0);
  $("#catTitle").focus({preventScroll: true});
}
function hideCatalog(){
  if (catPage.hidden) return false;
  catPage.hidden = true;
  document.body.classList.remove("is-catalog");
  document.title = "Гардарика — дома под ключ для жизни за городом";
  return true;
}
function route(){
  if (/^#\/catalog/.test(location.hash)){ showCatalog(); return; }
  var m = /^#\/p\/([\w-]+)/.exec(location.hash);
  var h = m && bySlug(m[1]);
  if (h){ hideCatalog(); showProject(h); return; }
  var was = hideProject() | hideCatalog();
  if (was){
    var t = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (t) t.scrollIntoView(); else window.scrollTo(0, 0);
  }
}
window.addEventListener("hashchange", route);
route();

/* Заявка */
var form = $("#leadForm"), msg = $("#leadMsg"), sel = $("#leadProject"), topic = $("#leadTopic"), phone = $("#leadPhone");
HOUSES.forEach(function(h){ var o = document.createElement("option"); o.value = h.slug; o.textContent = h.name + " · " + h.area + " м²"; sel.appendChild(o); });
$("#pDiscuss").addEventListener("click", function(){ sel.value = this.getAttribute("data-project") || ""; });
$$("[data-topic]").forEach(function(a){ a.addEventListener("click", function(){ topic.value = a.getAttribute("data-topic"); }); });
phone.addEventListener("input", function(){
  var d = phone.value.replace(/\D/g, "");
  if (d[0] === "8") d = "7" + d.slice(1);
  if (d && d[0] !== "7") d = "7" + d;
  d = d.slice(0, 11);
  var o = d ? "+7" : "";
  if (d.length > 1) o += " " + d.slice(1, 4);
  if (d.length > 4) o += " " + d.slice(4, 7);
  if (d.length > 7) o += "-" + d.slice(7, 9);
  if (d.length > 9) o += "-" + d.slice(9, 11);
  phone.value = o;
});
function bad(el, on){ (el.closest(".field") || el.closest(".check")).classList.toggle("is-bad", on); }
form.addEventListener("submit", function(e){
  e.preventDefault();
  var name = $("#leadName"), consent = $("#leadConsent"), errs = [];
  var nOk = name.value.trim().length >= 2, pOk = phone.value.replace(/\D/g, "").length === 11, cOk = consent.checked;
  bad(name, !nOk); bad(phone, !pOk); bad(consent, !cOk);
  if (!nOk) errs.push("напишите, как к вам обращаться");
  if (!pOk) errs.push("проверьте номер: нужно 10 цифр после +7");
  if (!cOk) errs.push("отметьте согласие на обработку данных");
  msg.classList.toggle("is-bad", !!errs.length);
  if (errs.length){
    msg.textContent = "Чтобы отправить заявку, " + errs.join(", ") + ".";
    (!nOk ? name : !pOk ? phone : consent).focus();
    return;
  }
  msg.textContent = "Заявка заполнена верно. Это демонстрационная версия сайта, данные пока никуда не отправляются. Позвоните нам: +7 977 714-49-69.";
  form.reset();
});
["leadName", "leadPhone", "leadConsent"].forEach(function(id){ $("#" + id).addEventListener("input", function(){ bad(this, false); }); });

/* Шапка */
var nav = $("#nav"), toggle = $("#navToggle"), links = $("#links");
function onScroll(){ nav.classList.toggle("is-scrolled", window.scrollY > 8); }
window.addEventListener("scroll", onScroll, {passive: true}); onScroll();
toggle.addEventListener("click", function(){
  var open = !links.classList.contains("is-open");
  links.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  toggle.innerHTML = '<svg><use href="#i-' + (open ? "close" : "menu") + '"/></svg>';
});
$$("a", links).forEach(function(a){ a.addEventListener("click", function(){ if (links.classList.contains("is-open")) toggle.click(); }); });
document.addEventListener("keydown", function(e){ if (e.key === "Escape" && links.classList.contains("is-open")){ toggle.click(); toggle.focus(); } });
if ("IntersectionObserver" in window){
  var map = Object.create(null);
  $$("a", links).forEach(function(a){ map[a.getAttribute("href").slice(1)] = a; });
  var spy = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (!e.isIntersecting) return;
      $$("a", links).forEach(function(a){ a.classList.remove("is-here"); });
      if (map[e.target.id]) map[e.target.id].classList.add("is-here");
    });
  }, {rootMargin: "-45% 0px -50% 0px"});
  $$("main section[id]").forEach(function(s){ spy.observe(s); });
}

})();
