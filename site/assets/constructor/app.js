/* Конструктор V3 · интерфейс. Состояние — только выбор частей и отделки; всё остальное выводится движком. */
(function(){
  "use strict";
  var GC = window.GC, cat = GC.catalog(), $ = function(s, c){ return (c || document).querySelector(s); };
  var NB = " ";
  var SIDE = {N: "к задней стене", S: "к фасаду", W: "к левой стене", E: "к правой стене"};
  var SRC = {published: "опубликовано", plan: "по плану", inferred: "допущение пилота"};
  var start = (location.hash.slice(1) && GC.houses.some(function(h){ return h.id === location.hash.slice(1); })) ? location.hash.slice(1) : "lilia-105";
  var state = GC.houseDefaults(start), view = null, pending = null;

  function rub(n){ return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB) + NB + "₽"; }
  function m2(n){ return GC.fmt(Math.round(n * 10) / 10) + NB + "м²"; }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }

  /* ---------- опции по разделам ---------- */
  function sections(){
    return [
      {id: "core", title: "Основной объём", hint: "Пятно и высота первого этажа", items: cat.cores.map(function(c){
        return {slot: "core", value: c.id, label: c.houseName, sub: GC.fmt(c.w) + " × " + GC.fmt(c.d) + " м, стены " + GC.fmt(c.wallH) + " м", on: state.core === c.id}; })},
      {id: "upper", title: "Второй уровень", hint: "Что стоит над первым этажом", items: [{slot: "upper", value: null, label: "Без второго уровня", sub: "одноэтажный дом", on: !state.upper}].concat(cat.uppers.map(function(u){
        return {slot: "upper", value: u.id, label: u.label, sub: u.note, on: state.upper === u.id, from: u.houseName}; }))},
      {id: "roof", title: "Кровля", hint: "Форма и уклон", items: cat.roofs.map(function(r){
        return {slot: "roof", value: r.id, label: r.label, sub: r.family === "gable" ? "двускатная, конёк вдоль длинной стороны" : r.family === "hip" ? "четыре ската, без фронтонов" : "эксплуатируемая, с парапетом", on: state.roof === r.id, from: r.houseName}; })},
      {id: "annex", title: "Пристройки", hint: "Стыкуются к свободной стене", multi: true, items: cat.annexes.map(function(a){
        return {slot: "annex", value: a.id, label: a.label, sub: a.note, on: state.annexes.indexOf(a.id) >= 0, from: a.houseName}; })}
    ];
  }

  function renderOptions(res){
    var host = $("#parts"), html = "";
    sections().forEach(function(sec){
      html += '<section class="cx-sec"><header><h3>' + sec.title + '</h3><span>' + sec.hint + "</span></header><div class=\"cx-opts" + (sec.multi ? " is-multi" : "") + '">';
      sec.items.forEach(function(it){
        var chk = it.on ? {ok: true} : GC.check(state, it.slot, it.value, cat);
        var placed = it.slot === "annex" && it.on ? res.placed.filter(function(p){ return p.annex.id === it.value; })[0] : null;
        html += '<button type="button" class="cx-opt' + (it.on ? " is-on" : "") + (chk.ok ? "" : " is-conflict") + '" data-slot="' + it.slot + '" data-value="' + (it.value == null ? "" : esc(it.value)) + '" aria-pressed="' + it.on + '">' +
          '<b>' + esc(it.label) + '</b><small>' + esc(it.sub || "") + (placed ? " · " + SIDE[placed.side] : "") + "</small>" +
          (chk.ok ? "" : '<em>' + (chk.fix ? "потребует изменений" : "не сочетается") + "</em>") + "</button>";
      });
      html += "</div></section>";
    });
    html += '<section class="cx-sec"><header><h3>Конструктив и отделка</h3><span>Подходит к любой части любого дома</span></header>';
    Object.keys(GC.finishes).forEach(function(g){
      html += '<div class="cx-fin"><span>' + GC.finishes[g].label + '</span><div class="cx-chips">' + GC.finishes[g].options.map(function(o){
        var on = state.finishes[g] === o.id, chk = on ? {ok: true} : GC.check(state, "finish", [g, o.id], cat);
        return '<button type="button" class="cx-chip' + (on ? " is-on" : "") + (chk.ok ? "" : " is-conflict") + '" data-slot="finish" data-value="' + g + ":" + o.id + '" aria-pressed="' + on + '">' + esc(o.label) + "</button>";
      }).join("") + "</div></div>";
    });
    host.innerHTML = html + "</section>";
  }

  function renderHouses(){
    $("#houses").innerHTML = GC.houses.map(function(h){
      return '<button type="button" class="cx-house" data-house="' + h.id + '"><img src="' + h.image + '" alt=""><span><b>' + h.name + "</b><small>" + esc(h.summary) + "</small></span></button>";
    }).join("");
  }

  function renderSummary(res, est){
    var from = {}; [res.core, res.upper, res.roof].concat(res.placed.map(function(p){ return p.annex; })).forEach(function(x){ if (x && x.houseName) from[x.houseName] = true; });
    var names = Object.keys(from);
    $("#mix").textContent = names.length > 1 ? "Собрано из: " + names.join(" + ") : "Как в проекте " + names[0];
    $("#total").textContent = rub(est.total);
    $("#area").textContent = m2(est.area) + " по внешнему контуру · " + rub(est.total / est.area) + " за м²";
    var rows = {}, order = [];
    est.lines.forEach(function(l){ if (!rows[l.stage]){ rows[l.stage] = []; order.push(l.stage); } rows[l.stage].push(l); });
    $("#bill").innerHTML = order.map(function(st){
      return '<div class="cx-bill-g"><b>' + st + "</b>" + rows[st].map(function(l){
        return "<div><span>" + esc(l.label) + (l.unit ? '<small>' + GC.fmt(Math.round(l.qty * 10) / 10) + NB + l.unit + "</small>" : "") + "</span><i>" + rub(l.sum) + "</i></div>";
      }).join("") + "</div>";
    }).join("");
    /* какие значения в этой композиции — допущения, а не опубликованные размеры */
    var notes = [];
    [res.core, res.upper, res.roof].concat(res.placed.map(function(p){ return p.annex; })).forEach(function(x){
      if (x && x.src) Object.keys(x.src).forEach(function(k){ if (x.src[k] === "inferred") notes.push((x.label || x.houseName) + ": " + ({w: "ширина", d: "глубина", wallH: "высота стен", pitch: "уклон", knee: "коленная стена", h: "высота"}[k] || k)); });
    });
    $("#assume").innerHTML = notes.length ? "<b>Допущения пилота</b> — проверит инженер: " + notes.map(esc).join("; ") + "." : "";
  }

  function render(){
    var res = GC.resolve(state, cat);
    if (!res.ok){ /* на всякий случай: состояние всегда должно быть допустимым */ console.warn(res.issues); }
    var est = GC.estimate(res, state.finishes);
    renderOptions(res); renderSummary(res, est);
    if (view){ view.build(res, state.finishes); if (!view.framed){ view.frame(est.massing); view.framed = true; } }
    try { history.replaceState(null, "", "#" + GC.catalog().byId[state.core].house); } catch (e) {}
  }

  /* ---------- выбор с проверкой совместимости ---------- */
  function choose(slot, value){
    var chk = GC.check(state, slot, value, cat);
    if (chk.ok){ state = GC.apply(state, slot, value); hideConflict(); render(); return; }
    pending = {slot: slot, value: value, fix: chk.fix};
    $("#conflictText").textContent = chk.message + (chk.kind === "pilot" ? " (инженерное допущение пилота)" : "");
    var fb = $("#conflictFix");
    if (chk.fix){ fb.hidden = false; fb.textContent = "Выбрать и " + chk.fix.label; } else fb.hidden = true;
    $("#conflict").hidden = false;
  }
  function hideConflict(){ $("#conflict").hidden = true; pending = null; }
  $("#conflictFix").addEventListener("click", function(){
    if (!pending || !pending.fix) return;
    var s2 = GC.apply(GC.apply(state, pending.slot, pending.value), pending.fix.slot, pending.fix.value);
    if (GC.resolve(s2, cat).ok){ state = s2; hideConflict(); view && (view.framed = false); render(); }
  });
  $("#conflictCancel").addEventListener("click", hideConflict);

  document.addEventListener("click", function(e){
    var b = e.target.closest("[data-slot]");
    if (b){
      var slot = b.getAttribute("data-slot"), raw = b.getAttribute("data-value"), value = raw === "" ? null : raw;
      if (slot === "finish") value = raw.split(":");
      if (b.classList.contains("is-on") && slot !== "annex") return;
      if (slot === "core" || slot === "annex") view && (view.framed = false);
      choose(slot, value); return;
    }
    var h = e.target.closest("[data-house]");
    if (h){ state = GC.houseDefaults(h.getAttribute("data-house")); hideConflict(); view && (view.framed = false); render(); window.scrollTo({top: 0, behavior: "smooth"}); }
  });

  /* ---------- этапы стройки ---------- */
  $("#stages").innerHTML = GC.stages.map(function(s, i){ return '<button type="button" data-stage="' + i + '" aria-pressed="' + (i === 5) + '">' + s + "</button>"; }).join("");
  $("#stages").addEventListener("click", function(e){
    var b = e.target.closest("[data-stage]"); if (!b || !view) return;
    Array.prototype.forEach.call(this.children, function(x){ x.setAttribute("aria-pressed", String(x === b)); });
    view.setStage(+b.getAttribute("data-stage"));
  });

  renderHouses();
  if (window.THREE){ try { view = new GC.View($("#viewer")); } catch (err) { $("#viewer").innerHTML = '<p class="cx-nogl">3D недоступно в этом браузере — состав и смета работают.</p>'; } }
  render();
  window.GCApp = {state: function(){ return state; }, set: function(s){ state = s; render(); }, view: function(){ return view; }};
})();
