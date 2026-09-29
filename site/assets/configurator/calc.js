/* Калькулятор дома (MVP) · пошаговый интерфейс поверх движка конструктора.
   Состояние — выбор частей и конструктива; модель, смета и PDF выводятся из него движком. */
(function(){
  "use strict";
  var GC = window.GC, cat = GC.catalog(), $ = function(s, c){ return (c || document).querySelector(s); };
  var NB = " ";
  var SIDE = {N: "к задней стене", S: "к фасаду", W: "к левой стене", E: "к правой стене"};
  var HOUSES = window.HOUSES || [];

  /* шаги: stage — какой этап стройки показывает модель */
  /* Дом строится с нуля: после выбора проекта модель растёт вместе с шагами — от плиты до готового дома.
     parts — части формы, которые выбираются на шаге; groups — конструктив и отделка. */
  var STEPS = [
    {id: "house", title: "Проект", hint: "Выберите дом, с которого начнём. Дальше построим его с нуля — и на каждом этапе можно взять решение из другого проекта.", stage: 5},
    {id: "foundation", title: "Пятно и фундамент", hint: "Размер первого этажа, пристройки и основание под них", stage: 0, parts: ["core", "annex"], groups: ["foundation"]},
    {id: "walls", title: "Стены", hint: "Коробка первого этажа", stage: 1, groups: ["walls"]},
    {id: "upper", title: "Второй уровень", hint: "Мансарда, этаж или одноэтажный дом", stage: 2, parts: ["upper"]},
    {id: "roof", title: "Кровля", hint: "Форма и покрытие", stage: 3, parts: ["roof"], groups: ["roofCover"]},
    {id: "facade", title: "Окна и фасад", hint: "Как дом выглядит снаружи", stage: 4, groups: ["windows", "facade"]},
    {id: "inside", title: "Инженерия и отделка", hint: "Дом готов снаружи — осталось то, что внутри", stage: 5, groups: ["engineering", "interior"]},
    {id: "estimate", title: "Смета", hint: "Ваш дом целиком, итог по этапам и PDF", stage: 5}
  ];


  var hash = decodeURIComponent(location.hash.slice(1));
  var isPilot = function(id){ return GC.houses.some(function(h){ return h.id === id; }); };
  var missing = hash && !isPilot(hash) ? HOUSES.filter(function(h){ return h.slug === hash; })[0] : null;
  var state = GC.houseDefaults(isPilot(hash) ? hash : "lilia-105");
  var step = 0, reached = 0, view = null, pending = null, shownStep = -1, shownTotal = null;
  var REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* итог меняется плавно: видно, насколько выбор сдвинул цену */
  var tween = null;
  function showTotal(v){
    var el = $("#total"), from = shownTotal; shownTotal = v;
    if (REDUCE || from == null || from === v){ el.textContent = rub(v); return; }
    var t0 = performance.now(); cancelAnimationFrame(tween);
    el.parentNode.classList.remove("is-bump"); void el.offsetWidth; el.parentNode.classList.add("is-bump");
    (function tick(){
      var k = Math.min(1, (performance.now() - t0) / 600), e = 1 - Math.pow(1 - k, 3);
      el.textContent = rub(from + (v - from) * e);
      if (k < 1) tween = requestAnimationFrame(tick);
    })();
  }

  function rub(n){ return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB) + NB + "₽"; }
  function delta(n){ if (Math.abs(n) < 500) return "без изменения цены"; return (n > 0 ? "+" : "−") + NB + rub(Math.abs(n)); }
  function m2(n){ return GC.fmt(Math.round(n * 10) / 10) + NB + "м²"; }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function houseOf(id){ return GC.houses.filter(function(h){ return h.id === id; })[0]; }
  function priceOf(s){ var r = GC.resolve(s, cat); return r.ok ? GC.estimate(r, s.finishes).total : null; }

  /* ---------- карточка опции: название, пояснение, изменение цены или конфликт ---------- */
  function optHTML(it, base){
    var chk = it.on ? {ok: true} : GC.check(state, it.slot, it.value, cat), note = "";
    if (!it.on && chk.ok){ var p = priceOf(GC.apply(state, it.slot, it.value)); if (p != null) note = '<i class="kc-delta">' + delta(p - base) + "</i>"; }
    if (!chk.ok) note = "<em>" + (chk.fix ? "потребует изменений" : "не сочетается") + "</em>";
    var val = it.value == null ? "" : Array.isArray(it.value) ? it.value.join(":") : it.value;
    return '<button type="button" class="cx-opt' + (it.on ? " is-on" : "") + (chk.ok ? "" : " is-conflict") + '" data-slot="' + it.slot + '" data-value="' + esc(val) + '" aria-pressed="' + it.on + '">' +
      "<b>" + esc(it.label) + "</b>" + (it.sub ? "<small>" + esc(it.sub) + "</small>" : "") + note + "</button>";
  }
  function group(title, hint, items, base, multi){
    return '<div class="kc-group"><header><h3>' + title + "</h3>" + (hint ? "<span>" + hint + "</span>" : "") + '</header><div class="cx-opts' + (multi ? " is-multi" : "") + '">' +
      items.map(function(it){ return optHTML(it, base); }).join("") + "</div></div>";
  }
  function finishItems(g){
    return GC.finishes[g].options.map(function(o){ return {slot: "finish", value: [g, o.id], label: o.label, sub: o.note, on: state.finishes[g] === o.id}; });
  }

  /* ---------- панели шагов ---------- */
  function panelHouse(){
    var html = "";
    if (missing) html += '<p class="kc-note">«' + esc(missing.name) + "» пока в разработке: в калькуляторе готовы три модели. Выберите близкую основу — или <a href=\"index.html#contact\">обсудите " + esc(missing.name) + " с инженером</a>.</p>";
    var coreHouse = cat.byId[state.core].house;
    html += '<div class="kc-houses">' + GC.houses.map(function(h){
      var d = HOUSES.filter(function(x){ return x.slug === h.id; })[0] || {};
      return '<button type="button" class="kc-house' + (h.id === coreHouse ? " is-on" : "") + '" data-house="' + h.id + '" aria-pressed="' + (h.id === coreHouse) + '">' +
        '<img src="' + h.image + '" alt="" loading="lazy"><span><b>' + esc(h.name) + "</b><small>" + esc(h.summary) + "</small></span></button>";
    }).join("") + "</div>";
    var soon = HOUSES.filter(function(h){ return !h.calc; });
    if (soon.length) html += '<div class="kc-soon"><h3>В разработке</h3><p>Эти проекты появятся в калькуляторе позже. Их можно обсудить с инженером уже сейчас.</p><ul>' +
      soon.map(function(h){ return '<li><img src="' + h.image + '" alt="" loading="lazy"><span>' + esc(h.name) + "<small>" + esc(h.area) + NB + "м²</small></span></li>"; }).join("") + "</ul></div>";
    return html;
  }
  var PART = {
    core: function(base){ return group("Основной объём", "пятно и высота первого этажа", cat.cores.map(function(c){
      return {slot: "core", value: c.id, label: "Как у " + c.houseName, sub: GC.fmt(c.w) + " × " + GC.fmt(c.d) + " м, стены " + GC.fmt(c.wallH) + " м", on: state.core === c.id}; }), base); },
    annex: function(base, res){ return group("Пристройки", "можно несколько, встают к свободной стене", cat.annexes.map(function(a){
      var pl = res.placed.filter(function(p){ return p.annex.id === a.id; })[0];
      return {slot: "annex", value: a.id, label: a.label, sub: a.note + (pl ? " · " + SIDE[pl.side] : ""), on: state.annexes.indexOf(a.id) >= 0}; }), base, true); },
    upper: function(base){ return group("Что над первым этажом", "", [{slot: "upper", value: null, label: "Без второго уровня", sub: "одноэтажный дом", on: !state.upper}].concat(cat.uppers.map(function(u){
      return {slot: "upper", value: u.id, label: u.label, sub: u.note, on: state.upper === u.id}; })), base); },
    roof: function(base){ return group("Форма кровли", "", cat.roofs.map(function(r){
      return {slot: "roof", value: r.id, label: r.label, sub: r.family === "gable" ? "два ската, фронтоны на торцах" : r.family === "hip" ? "четыре ската, без фронтонов" : "эксплуатируемая, с парапетом", on: state.roof === r.id}; }), base); }
  };
  function panelOptions(s, base, res){
    var html = "";
    (s.parts || []).forEach(function(p){ html += PART[p](base, res); });
    (s.groups || []).forEach(function(g){ html += group(GC.finishes[g].label, GC.finishes[g].inside ? "внутри дома — на модели не показывается" : "", finishItems(g), base); });
    return html;
  }
  function assumptions(res){
    var notes = [];
    [res.core, res.upper, res.roof].concat(res.placed.map(function(p){ return p.annex; })).forEach(function(x){
      if (x && x.src) Object.keys(x.src).forEach(function(k){ if (x.src[k] === "inferred") notes.push((x.label || x.houseName) + ": " + ({w: "ширина", d: "глубина", wallH: "высота стен", pitch: "уклон", knee: "коленная стена", h: "высота"}[k] || k)); });
    });
    return notes;
  }
  function panelEstimate(res, est){
    var rows = {}, order = [];
    est.lines.forEach(function(l){ if (!rows[l.stage]){ rows[l.stage] = []; order.push(l.stage); } rows[l.stage].push(l); });
    var notes = assumptions(res);
    return '<div class="kc-bill">' + order.map(function(st){
      return '<div class="kc-bill-g"><b>' + st + "</b>" + rows[st].map(function(l){
        return "<div><span>" + esc(l.label) + (l.unit ? "<small>" + GC.fmt(Math.round(l.qty * 10) / 10) + NB + l.unit + "</small>" : "") + "</span><i>" + rub(l.sum) + "</i></div>";
      }).join("") + "</div>";
    }).join("") + '<div class="kc-bill-total"><span>Итого</span><b>' + rub(est.total) + "</b></div></div>" +
    (notes.length ? '<p class="kc-assume"><b>Допущения</b> — проверит инженер: ' + notes.map(esc).join("; ") + ".</p>" : "") +
    '<p class="kc-assume">Ставки демонстрационные: количества берутся из модели, цены за единицу утверждает сметчик. Точный расчёт — после геологии и проекта.</p>' +
    '<div class="kc-final"><button type="button" class="btn btn-honey" id="pdfBtn"><svg><use href="#i-pdf"/></svg>Скачать смету в PDF</button>' +
    '<a class="btn btn-line" href="index.html#contact">Обсудить дом с инженером</a></div>';
  }

  /* ---------- отрисовка ---------- */
  function mixNames(res){
    var from = {};
    [res.core, res.upper, res.roof].concat(res.placed.map(function(p){ return p.annex; })).forEach(function(x){ if (x && x.houseName) from[x.houseName] = true; });
    return Object.keys(from);
  }
  function render(reframe){
    var res = GC.resolve(state, cat);
    if (!res.ok) console.warn(res.issues);
    var est = GC.estimate(res, state.finishes), s = STEPS[step], base = est.total;
    $("#steps").innerHTML = STEPS.map(function(x, i){
      return '<li><button type="button" data-step="' + i + '"' + (i === step ? ' aria-current="step"' : "") + (i > reached ? " disabled" : "") + '><span>' + (i + 1) + "</span>" + x.title + "</button></li>";
    }).join("");
    var body = s.id === "house" ? panelHouse() : s.id === "estimate" ? panelEstimate(res, est) : panelOptions(s, base, res);
    $("#panel").innerHTML = '<header class="kc-panel-h"><span>Шаг ' + (step + 1) + " из " + STEPS.length + "</span><h2>" + s.title + "</h2><p>" + s.hint + "</p></header>" + body;
    if (shownStep !== step && !REDUCE){
      var pn = $("#panel"); pn.classList.remove("is-fwd", "is-back"); void pn.offsetWidth;
      pn.classList.add(step > shownStep ? "is-fwd" : "is-back");
      clearTimeout(pn._t); pn._t = setTimeout(function(){ pn.classList.remove("is-fwd", "is-back"); }, 700);
    }
    shownStep = step;
    $("#prev").hidden = step === 0;
    $("#next").hidden = step === STEPS.length - 1;
    $("#sum").hidden = step === STEPS.length - 1;
    $("#next").innerHTML = (step === STEPS.length - 2 ? "К смете" : "Далее") + '<svg><use href="#i-arrow"/></svg>';
    var names = mixNames(res);
    $("#mix").textContent = names.length > 1 ? "Собрано из: " + names.join(" + ") : "Как в проекте " + names[0];
    showTotal(est.total);
    $("#area").textContent = m2(est.area) + " по внешнему контуру";
    $("#stageBadge").textContent = houseOf(cat.byId[state.core].house).name + (names.length > 1 ? " + ещё " + (names.length - 1) : "") + " · " + (s.id === "house" ? "проект" : s.id === "estimate" ? "ваш дом" : GC.stages[stageFor(s)]);
    if (view){
      view.build(res, state.finishes);
      view.setStage(stageFor(s));
      if (reframe || !view.framed){ view.frame(est.massing); view.framed = true; }
    }
    try { history.replaceState(null, "", "#" + cat.byId[state.core].house); } catch (e) {}
    var pb = $("#pdfBtn"); if (pb) pb.addEventListener("click", function(){ makePDF(res, est); });
  }
  function stageFor(s){ return s.stage; }

  function go(i){
    step = Math.max(0, Math.min(STEPS.length - 1, i)); reached = Math.max(reached, step);
    hideConflict(); render(false);
    /* новый шаг начинаем с заголовка, если он ушёл за верх экрана */
    var top = $("#panel").getBoundingClientRect().top;
    if (top < 90 || window.innerWidth <= 900) window.scrollTo({top: Math.max(0, scrollY + top - 96), behavior: REDUCE ? "auto" : "smooth"});
  }

  /* ---------- выбор с проверкой совместимости ---------- */
  function choose(slot, value){
    var chk = GC.check(state, slot, value, cat), shape = slot === "core" || slot === "annex" || slot === "upper";
    if (chk.ok){ state = GC.apply(state, slot, value); hideConflict(); render(shape); return; }
    pending = {slot: slot, value: value, fix: chk.fix};
    $("#conflictText").textContent = chk.message + (chk.kind === "pilot" ? " (инженерное допущение, проверит инженер)" : "");
    var fb = $("#conflictFix");
    if (chk.fix){ fb.hidden = false; fb.textContent = "Выбрать и " + chk.fix.label; } else fb.hidden = true;
    $("#conflict").hidden = false;
  }
  function hideConflict(){ $("#conflict").hidden = true; pending = null; }
  $("#conflictFix").addEventListener("click", function(){
    if (!pending || !pending.fix) return;
    var s2 = GC.apply(GC.apply(state, pending.slot, pending.value), pending.fix.slot, pending.fix.value);
    if (GC.resolve(s2, cat).ok){ state = s2; hideConflict(); render(true); }
  });
  $("#conflictCancel").addEventListener("click", hideConflict);

  document.addEventListener("click", function(e){
    var b = e.target.closest("[data-slot]");
    if (b){
      var slot = b.getAttribute("data-slot"), raw = b.getAttribute("data-value"), value = raw === "" ? null : raw;
      if (slot === "finish") value = raw.split(":");
      if (b.classList.contains("is-on") && slot !== "annex") return;
      choose(slot, value); return;
    }
    var h = e.target.closest("[data-house]");
    if (h){ var keep = state.finishes; state = GC.houseDefaults(h.getAttribute("data-house")); state.finishes = keep; missing = null; hideConflict(); render(true); return; }
    var st = e.target.closest("[data-step]");
    if (st && !st.disabled) go(+st.getAttribute("data-step"));
  });
  $("#prev").addEventListener("click", function(){ go(step - 1); });
  $("#next").addEventListener("click", function(){ go(step + 1); });

  /* ---------- PDF ---------- */
  function makePDF(res, est){
    var btn = $("#pdfBtn"); btn.disabled = true; var label = btn.innerHTML; btn.textContent = "Готовим PDF…";
    var shot = null;
    if (view){ var st = view.stage; view.setStage(5); view.renderer.render(view.scene, view.camera); shot = {url: view.renderer.domElement.toDataURL("image/jpeg", .9), w: view.renderer.domElement.width, h: view.renderer.domElement.height}; view.setStage(st); }
    var comp = [["Основа", res.core.label], ["Второй уровень", res.upper ? res.upper.label : "нет, одноэтажный дом"], ["Кровля", res.roof.label]]
      .concat(res.placed.map(function(p){ return ["Пристройка", p.annex.label + ", " + SIDE[p.side]]; }));
    var spec = Object.keys(GC.finishes).map(function(g){ return [GC.finishes[g].label, GC.finishLabel(g, state.finishes[g])]; });
    GC.pdf({title: "Дом на основе " + houseOf(cat.byId[state.core].house).name, mix: mixNames(res), area: est.area, shot: shot, composition: comp, spec: spec,
      lines: est.lines, total: est.total, assumptions: assumptions(res)})
      .catch(function(err){ console.error(err); alert("Не получилось собрать PDF. Попробуйте ещё раз или обсудите смету с инженером."); })
      .then(function(){ btn.disabled = false; btn.innerHTML = label; });
  }

  if (window.THREE){ try { view = new GC.View($("#viewer")); } catch (err) { $("#viewer").insertAdjacentHTML("beforeend", '<p class="cx-nogl">3D недоступно в этом браузере — состав и смета работают.</p>'); } }
  render(true);
  window.GCApp = {state: function(){ return state; }, set: function(s){ state = s; render(true); }, go: go, view: function(){ return view; }};
})();
