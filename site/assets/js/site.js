(function(){
"use strict";
var root = document.documentElement;
root.classList.add("js");

var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var $ = function(s, c){ return (c || document).querySelector(s); };
var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
var NB = " ", THIN = " ";

function mm(v){ return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, THIN); }
function metres(d){ return (d[0] / 1000).toFixed(1).replace(".", ",") + NB + "×" + NB + (d[1] / 1000).toFixed(1).replace(".", ",") + NB + "м"; }
function floorsLabel(f){ return f === 1 ? "1 этаж" : f === 2 ? "2 этажа" : "Мансарда"; }
function provLabel(h){ return h.prov === "viz" ? "Визуализация" : "Референс из материалов проекта"; }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function bySlug(slug){ for (var i = 0; i < HOUSES.length; i++) if (HOUSES[i].slug === slug) return HOUSES[i]; return null; }
var ARROW = '<svg aria-hidden="true"><use href="#i-arrow"/></svg>';

/* Штамп: ячейки [подпись, значение, классы] по три в ряд */
function cell(label, value, cls){ return {l: label, v: value, c: cls || ""}; }
function stampHTML(cells, cols){
  var html = "", used = 0, total = 0, i;
  for (i = 0; i < cells.length; i++) total += /span2/.test(cells[i].c) ? 2 : 1;
  for (i = 0; i < cells.length; i++){
    var c = cells[i], w = /span2/.test(c.c) ? 2 : 1;
    var last = used >= total - (total % cols || cols);
    html += '<div class="' + (/span2/.test(c.c) ? "span2 " : "") + (last ? "last" : "") + '"><span class="sl">' + c.l + '</span><span class="sv ' + c.c.replace("span2", "") + '">' + c.v + "</span></div>";
    used += w;
  }
  return html;
}

/* Прорисовка размеров со счётом до значения */
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

/* Лист 01: три новых дома */
var heroHouses = HOUSES.filter(function(h){ return h.example; });
var heroFig = $("#heroFig"), heroImgs = $$(".hero-img"), heroTabs = $$(".hero-tabs button"), heroStamp = $("#heroStamp");
var heroIndex = 0, heroTimer = null;
heroFig.classList.add("has-x", "has-y");

function setHero(i, animate){
  heroIndex = i;
  var h = heroHouses[i];
  heroImgs.forEach(function(img, n){ img.classList.toggle("is-on", n === i); });
  heroTabs.forEach(function(b, n){ b.setAttribute("aria-selected", n === i ? "true" : "false"); b.tabIndex = n === i ? 0 : -1; });
  var vals = $$(".dim-val", heroFig);
  vals[0].setAttribute("data-mm", h.dims[0]); vals[1].setAttribute("data-mm", h.dims[1]);
  heroStamp.href = "#/p/" + h.slug;
  heroStamp.setAttribute("aria-label", "Открыть лист проекта " + h.name);
  heroStamp.innerHTML = stampHTML([
    cell("Проект", h.name, "sv-big"), cell("Стадия", "Пример", "sv-red"), cell("Лист", (i + 1) + " из " + heroHouses.length),
    cell("Площадь", h.area + NB + "м²"), cell("Этажность", floorsLabel(h.floors)), cell("Габариты", metres(h.dims)),
    cell("Ориентировочно", "от " + h.price + NB + "млн" + NB + "₽", "span2"), cell("Состав", h.rooms)
  ], 3);
  if (animate) drawDims(heroFig); else vals.forEach(function(v){ v.textContent = mm(v.getAttribute("data-mm")); });
}
function autoHero(){
  clearInterval(heroTimer);
  if (reduce) return;
  heroTimer = setInterval(function(){ if (!document.hidden) setHero((heroIndex + 1) % heroHouses.length, true); }, 7000);
}
heroTabs.forEach(function(b, n){
  b.addEventListener("click", function(){ clearInterval(heroTimer); setHero(n, true); });
  b.addEventListener("keydown", function(e){
    var k = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!k) return;
    e.preventDefault(); clearInterval(heroTimer);
    var j = (n + k + heroTabs.length) % heroTabs.length; setHero(j, true); heroTabs[j].focus();
  });
});
setHero(0, false);
watchDims(heroFig);
autoHero();

/* Лист 02: избранные дома и спецификация */
$("#featured").innerHTML = heroHouses.map(function(h){
  return '<a class="feat" href="#/p/' + h.slug + '">' +
    '<figure class="dimfig has-x">' + dimsMarkup(h.dims, false) +
      '<div class="dimfig-frame"><img src="' + h.image + '" alt="Проект ' + esc(h.name) + ': ' + esc(h.type.toLowerCase()) + '" loading="lazy"><span class="prov">' + provLabel(h) + "</span></div></figure>" +
    '<div class="feat-body"><h3>' + h.name + '</h3><span class="mark mark-red">Пример</span><p class="feat-type">' + h.type + "</p>" +
      '<div class="stamp" style="grid-column:1/-1">' + stampHTML([cell("Площадь", h.area + NB + "м²"), cell("Этажность", floorsLabel(h.floors)), cell("Ориентировочно", "от " + h.price + NB + "млн" + NB + "₽")], 3) + "</div>" +
      '<span class="feat-go"><span>Открыть лист проекта</span>' + ARROW + "</span></div></a>";
}).join("");
$$("#featured .dimfig").forEach(watchDims);

var specBody = $("#specBody");
specBody.innerHTML = HOUSES.map(function(h, i){
  return '<a class="spec-row" role="row" href="#/p/' + h.slug + '" data-floors="' + h.floors + '" data-img="' + h.image + '">' +
    '<span class="spec-pos" role="cell">' + (i + 1) + "</span>" +
    '<span role="cell"><img class="spec-thumb" src="' + h.image + '" alt="" loading="lazy"></span>' +
    '<span class="spec-name" role="cell"><strong>' + h.name + (h.example ? ' <span class="mark mark-red" style="vertical-align:3px;margin-left:6px">Пример</span>' : "") + "</strong><small>" + h.type + "</small></span>" +
    '<span class="spec-meta">' + h.area + NB + "м² · " + floorsLabel(h.floors).toLowerCase() + (h.dims ? " · " + metres(h.dims) : "") + "</span>" +
    '<span class="spec-floor" role="cell">' + floorsLabel(h.floors) + "</span>" +
    '<span class="num" role="cell">' + h.area + "</span>" +
    '<span class="num" role="cell">' + (h.dims ? metres(h.dims).replace(NB + "м", "") : "—") + "</span>" +
    '<span class="spec-go" role="cell" aria-hidden="true">' + ARROW + "</span></a>";
}).join("");

var rows = $$(".spec-row", specBody), specCount = $("#specCount");
function applyFilter(f){
  var shown = 0;
  rows.forEach(function(r){ var on = f === "all" || r.getAttribute("data-floors") === f; r.classList.toggle("is-out", !on); if (on) shown++; });
  specCount.textContent = shown === HOUSES.length ? "Всего " + shown + " проектов" : "Показано " + shown + " из " + HOUSES.length;
}
$$(".filters button").forEach(function(b){
  b.addEventListener("click", function(){
    $$(".filters button").forEach(function(x){ x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    applyFilter(b.getAttribute("data-f"));
  });
});
applyFilter("all");

/* Превью эскиза у курсора */
var peek = $("#peek"), peekImg = $("img", peek), fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (fine){
  rows.forEach(function(r){
    r.addEventListener("mouseenter", function(){ peekImg.src = r.getAttribute("data-img"); peek.classList.add("is-on"); });
    r.addEventListener("mouseleave", function(){ peek.classList.remove("is-on"); });
    r.addEventListener("mousemove", function(e){
      var w = peek.offsetWidth, h = peek.offsetHeight;
      var x = Math.min(e.clientX + 28, window.innerWidth - w - 16), y = Math.max(16, Math.min(e.clientY - h / 2, window.innerHeight - h - 16));
      peek.style.transform = "translate3d(" + x + "px," + y + "px,0)";
    });
  });
}

/* Лист проекта */
var project = $("#project"), main = $("#main");
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
  if (h.example) cells.push(cell("Ориентировочно", "от " + h.price + NB + "млн" + NB + "₽"), cell("Стадия", "Пример", "sv-red"));
  else cells.push(cell("Особенность", h.extra), cell("Стадия", "Основа"));
  $("#pStamp").innerHTML = stampHTML(cells, 2);
  var g = $("#pGallery");
  g.innerHTML = h.gallery.map(function(src){
    return '<figure><div class="frame"><img src="' + src + '" alt="Исходный материал проекта ' + esc(h.name) + '" loading="lazy"></div><figcaption>' +
      (/plan/.test(src) ? "План · исходный материал проекта" : "Исходный материал проекта") + "</figcaption></figure>";
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
  document.title = "Гардарика — дома, собранные вокруг вашей жизни";
  return true;
}
function route(){
  var m = /^#\/p\/([\w-]+)/.exec(location.hash);
  var h = m && bySlug(m[1]);
  if (h){ showProject(h); return; }
  var was = hideProject();
  if (was){
    var t = location.hash && location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (t) t.scrollIntoView(); else window.scrollTo(0, 0);
  }
}
window.addEventListener("hashchange", route);
route();

/* Заявка */
var form = $("#leadForm"), msg = $("#leadMsg"), sel = $("#leadProject"), topic = $("#leadTopic");
HOUSES.forEach(function(h){ var o = document.createElement("option"); o.value = h.slug; o.textContent = h.name + " · " + h.area + " м²"; sel.appendChild(o); });
$("#pDiscuss").addEventListener("click", function(){ sel.value = this.getAttribute("data-project") || ""; });
$$("[data-topic]").forEach(function(a){ a.addEventListener("click", function(){ topic.value = a.getAttribute("data-topic"); }); });

var phone = $("#leadPhone");
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
  var name = $("#leadName"), consent = $("#leadConsent");
  var errs = [];
  var nOk = name.value.trim().length >= 2, pOk = phone.value.replace(/\D/g, "").length === 11, cOk = consent.checked;
  bad(name, !nOk); bad(phone, !pOk); bad(consent, !cOk);
  if (!nOk) errs.push("напишите, как к вам обращаться");
  if (!pOk) errs.push("проверьте номер — нужно 10 цифр после +7");
  if (!cOk) errs.push("отметьте согласие на обработку данных");
  msg.classList.toggle("is-bad", !!errs.length);
  if (errs.length){
    msg.textContent = "Чтобы отправить заявку, " + errs.join(", ") + ".";
    (!nOk ? name : !pOk ? phone : consent).focus();
    return;
  }
  msg.textContent = "Заявка заполнена верно. Это демонстрационная версия сайта: данные пока никуда не отправляются — позвоните нам по номеру +7 977 714-49-69.";
  form.reset();
});
["leadName", "leadPhone", "leadConsent"].forEach(function(id){ $("#" + id).addEventListener("input", function(){ bad(this, false); }); });

/* Шапка: ведомость листов и текущий лист */
var toggle = $("#navToggle"), sheets = $("#sheets");
toggle.addEventListener("click", function(){
  var open = !sheets.classList.contains("is-open");
  sheets.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.innerHTML = '<svg><use href="#i-' + (open ? "close" : "menu") + '"/></svg>';
});
$$("a", sheets).forEach(function(a){ a.addEventListener("click", function(){ if (sheets.classList.contains("is-open")) toggle.click(); }); });
document.addEventListener("keydown", function(e){ if (e.key === "Escape" && sheets.classList.contains("is-open")){ toggle.click(); toggle.focus(); } });

if ("IntersectionObserver" in window){
  var links = {};
  $$("a", sheets).forEach(function(a){ links[a.getAttribute("href").slice(1)] = a; });
  var spy = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (!e.isIntersecting) return;
      $$("a", sheets).forEach(function(a){ a.classList.remove("is-here"); });
      if (links[e.target.id]) links[e.target.id].classList.add("is-here");
    });
  }, {rootMargin: "-45% 0px -50% 0px"});
  $$("main section[id]").forEach(function(s){ spy.observe(s); });
}

/* Лист 05: слои конструктора */
var layerBtns = $$("#layers button"), lyrs = $$("#axo .lyr"), layerI = 0, layerTimer = null, layerTouched = false;
function setLayer(i){
  layerI = i;
  var key = layerBtns[i].getAttribute("data-layer");
  layerBtns.forEach(function(b, n){ b.classList.toggle("is-on", n === i); b.setAttribute("aria-pressed", n === i ? "true" : "false"); });
  lyrs.forEach(function(g){ var k = g.getAttribute("data-layer"); g.classList.toggle("is-on", key === "pdf" || k === key); });
}
layerBtns.forEach(function(b, n){
  b.addEventListener("click", function(){ layerTouched = true; clearInterval(layerTimer); setLayer(n); });
  b.addEventListener("mouseenter", function(){ if (fine){ layerTouched = true; clearInterval(layerTimer); setLayer(n); } });
});
setLayer(0);
if (!reduce && "IntersectionObserver" in window){
  new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      clearInterval(layerTimer);
      if (e.isIntersecting && !layerTouched) layerTimer = setInterval(function(){ setLayer((layerI + 1) % layerBtns.length); }, 2400);
    });
  }, {threshold: .3}).observe($("#constructor"));
}
})();
