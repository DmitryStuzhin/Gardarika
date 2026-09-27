/* Конструктор V3 · движок: раскладка частей и правила совместимости.
   Работает без браузера (node) — на нём же построен автотест всех сочетаний. */
(function(root){
  "use strict";
  var GC = root.GC = root.GC || {};

  /* ---------- каталог опций, собранный из всех зарегистрированных домов ---------- */
  GC.catalog = function(){
    var c = {cores: [], uppers: [], roofs: [], annexes: [], byId: {}};
    GC.houses.forEach(function(h){
      var core = Object.assign({house: h.id, houseName: h.name}, h.core);
      c.cores.push(core); c.byId[core.id] = core;
      if (h.upper){ var u = Object.assign({house: h.id, houseName: h.name}, h.upper); c.uppers.push(u); c.byId[u.id] = u; }
      if (h.roof){ var r = Object.assign({house: h.id, houseName: h.name}, h.roof); c.roofs.push(r); c.byId[r.id] = r; }
      (h.annexes || []).forEach(function(a){ var x = Object.assign({house: h.id, houseName: h.name}, a); c.annexes.push(x); c.byId[x.id] = x; });
    });
    (GC.genericRoofs || []).forEach(function(r){ c.roofs.push(r); c.byId[r.id] = r; });
    return c;
  };

  GC.houseDefaults = function(houseId){
    var h = GC.houses.filter(function(x){ return x.id === houseId; })[0];
    return {
      core: h.core.id,
      upper: h.upper ? h.upper.id : null,
      roof: h.roof.id,
      annexes: (h.annexes || []).map(function(a){ return a.id; }),
      finishes: {foundation: "slab", walls: "aerated", roofCover: "seam", facade: "plaster", windows: "lam"}
    };
  };

  /* ---------- правила совместимости: данные, а не код ----------
     when — условие применения; test(ctx) → true, если сочетание допустимо.
     kind: "rule" — архитектурное ограничение; "pilot" — инженерное допущение пилота, требует проверки. */
  GC.rules = [
    {id: "mansard-roof", kind: "rule",
     when: function(x){ return x.upper && x.upper.type === "mansard"; },
     test: function(x){ return x.roof.family === "gable" && x.roof.pitch >= 35; },
     message: function(x){ return "Жилой мансарде нужна двускатная кровля не положе 35° — под «" + x.roof.label.toLowerCase() + "» не хватит высоты комнат."; }},
    {id: "mansard-span", kind: "rule",
     when: function(x){ return x.upper && x.upper.type === "mansard"; },
     test: function(x){ return Math.min(x.core.w, x.core.d) >= 7; },
     message: function(){ return "Мансарда имеет смысл при ширине дома от 7 м — иначе под скатами не остаётся комнат."; }},
    {id: "frame-floor-span", kind: "pilot",
     when: function(x){ return x.upper && x.upper.type === "floor" && x.finishes.walls === "frame"; },
     test: function(x){ return Math.min(x.core.w, x.core.d) <= 8.5; },
     message: function(x){ return "Каркас со вторым этажом в пилоте ограничен пролётом 8,5 м, а здесь " + fmt(Math.min(x.core.w, x.core.d)) + " м. Нужен расчёт инженера."; }},
    {id: "piles-heavy", kind: "pilot",
     when: function(x){ return x.finishes.foundation === "piles" && x.finishes.facade === "clinker" && x.upper; },
     test: function(){ return false; },
     message: function(){ return "Клинкерный фасад на двухуровневом доме слишком тяжёл для свай в пилоте — выберите плиту или ленту."; }},
    {id: "unique-kind", kind: "rule",
     when: function(x){ return x.annexes.length > 1; },
     test: function(x){ var seen = {}; return x.annexes.every(function(a){ if (seen[a.kind]) return false; seen[a.kind] = true; return true; }); },
     message: function(x){ var seen = {}, dup = null; x.annexes.forEach(function(a){ if (seen[a.kind]) dup = a; seen[a.kind] = true; }); return "Две части одного типа не сочетаются: «" + (dup ? dup.label : "") + "» заменит уже выбранную."; }}
  ];

  function fmt(v){ return (Math.round(v * 100) / 100).toString().replace(".", ","); }
  GC.fmt = fmt;

  /* ---------- раскладка пристроек по стенам основного объёма ----------
     Каждая пристройка пробует свои стороны и выравнивания; итоговые прямоугольники
     не должны пересекаться ни с домом, ни друг с другом. Это и есть «разъёмы». */
  function rectFor(core, a, side, t){
    var hw = core.w / 2, hd = core.d / 2;
    if (side === "S" || side === "N"){
      var x = -hw + t + a.along / 2, z = side === "S" ? -hd - a.depth / 2 : hd + a.depth / 2;
      return {x: x, z: z, w: a.along, d: a.depth, side: side};
    }
    var z2 = -hd + t + a.along / 2, x2 = side === "W" ? -hw - a.depth / 2 : hw + a.depth / 2;
    return {x: x2, z: z2, w: a.depth, d: a.along, side: side};
  }
  function overlap(p, q){
    var e = 0.01;
    return Math.abs(p.x - q.x) * 2 < p.w + q.w - e && Math.abs(p.z - q.z) * 2 < p.d + q.d - e;
  }
  GC.place = function(core, annexes, fixedSides){
    var placed = [], problems = [];
    annexes.forEach(function(a){
      var sides = fixedSides && fixedSides[a.id] ? [fixedSides[a.id]] : a.sides, best = null, reason = null;
      for (var i = 0; i < sides.length && !best; i++){
        var side = sides[i], len = (side === "S" || side === "N") ? core.w : core.d;
        if (a.along > len + 1e-6){ reason = reason || ("нужна стена от " + fmt(a.along) + " м, а у этого дома " + fmt(len) + " м"); continue; }
        var slack = len - a.along, tries = a.align === "end" ? [slack, 0, slack / 2] : a.align === "center" ? [slack / 2, 0, slack] : [0, slack, slack / 2];
        for (var k = 0; k < tries.length && !best; k++){
          var r = rectFor(core, a, side, tries[k]);
          var hit = placed.some(function(p){ return overlap(p.rect, r); });
          if (!hit) best = {annex: a, rect: r, side: side};
          else reason = reason || "свободной стены не осталось — место занято другой пристройкой";
        }
      }
      if (best) placed.push(best);
      else problems.push({annex: a, message: "«" + a.label + "» не помещается: " + (reason || "нет подходящей стены") + "."});
    });
    return {placed: placed, problems: problems};
  };

  /* ---------- сборка композиции и проверка ---------- */
  GC.resolve = function(state, cat){
    cat = cat || GC.catalog();
    var core = cat.byId[state.core], upper = state.upper ? cat.byId[state.upper] : null, roof = cat.byId[state.roof];
    var annexes = (state.annexes || []).map(function(id){ return cat.byId[id]; }).filter(Boolean);
    var ctx = {core: core, upper: upper, roof: roof, annexes: annexes, finishes: state.finishes};
    var issues = [];
    GC.rules.forEach(function(r){ if (r.when(ctx) && !r.test(ctx)) issues.push({rule: r.id, kind: r.kind, message: r.message(ctx)}); });
    var lay = GC.place(core, annexes, state.sides);
    lay.problems.forEach(function(p){ issues.push({rule: "fit", kind: "rule", message: p.message, annex: p.annex.id}); });
    /* высота карниза основного объёма: над ней стыкуются односкатные пристройки */
    var eave = core.plinth + core.wallH + (upper ? (upper.type === "floor" ? 0.2 + upper.wallH : 0.2 + upper.knee) : 0);
    var groundEave = core.plinth + core.wallH;
    lay.placed.forEach(function(p){
      var a = p.annex;
      p.h = a.h === "core" ? core.wallH : a.kind === "terrace" ? 0 : Math.min(a.h, groundEave - 0.3);
      if (a.kind !== "terrace" && a.h !== "core" && p.h < 2.2) issues.push({rule: "clearance", kind: "rule", message: "«" + a.label + "» получится ниже 2,2 м под карнизом этого дома."});
    });
    return {ctx: ctx, core: core, upper: upper, roof: roof, placed: lay.placed, issues: issues, ok: issues.length === 0, eave: eave};
  };

  /* ---------- массинг: единый список объёмов для 3D и для сметы ---------- */
  GC.massing = function(res){
    var core = res.core, up = res.upper, roof = res.roof, V = [];
    var top0 = core.plinth + core.wallH;
    var coreVol = {id: "core", part: core.id, kind: "core", heated: true, x: 0, z: 0, w: core.w, d: core.d, y0: core.plinth, h: core.wallH, windows: core.windows, door: "S"};
    V.push(coreVol);
    var roofBase = top0, roofOn = coreVol;
    if (up && up.type === "floor"){
      var fl = {id: "upper", part: up.id, kind: "floor", heated: true, x: 0, z: 0, w: core.w, d: core.d, y0: top0 + 0.2, h: up.wallH,
        windows: {S: [[.3, 1.4, 1.4], [.72, 1.4, 1.4]], N: [[.3, 1.4, 1.4], [.72, 1.4, 1.4]], W: [[.5, 1.0, 1.3]], E: [[.5, 1.0, 1.3]]}};
      V.push(fl); roofBase = fl.y0 + fl.h; roofOn = fl;
    } else if (up && up.type === "mansard"){
      var mn = {id: "upper", part: up.id, kind: "mansard", heated: true, x: 0, z: 0, w: core.w, d: core.d, y0: top0 + 0.2, h: up.knee, windows: null};
      V.push(mn); roofBase = mn.y0 + mn.h; roofOn = mn;
    }
    /* конёк идёт вдоль длинной стороны — так скат остаётся в разумной высоте */
    var ridgeAlongZ = core.d >= core.w;
    coreVol.roof = roofOn === coreVol ? {family: roof.family, pitch: roof.pitch, alongZ: ridgeAlongZ} : null;
    if (roofOn !== coreVol) roofOn.roof = {family: roof.family, pitch: roof.pitch, alongZ: ridgeAlongZ};
    res.placed.forEach(function(p, i){
      var a = p.annex, r = p.rect;
      var v = {id: "annex" + i, part: a.id, kind: a.kind, heated: !!a.heated, x: r.x, z: r.z, w: r.w, d: r.d, side: p.side,
        y0: a.kind === "carport" || a.kind === "terrace" ? 0 : core.plinth, h: a.kind === "terrace" ? 0.3 : p.h, windows: null};
      if (a.kind === "terrace"){ v.roof = null; v.y0 = 0; }
      else if (a.roof.family === "core"){
        /* крыло наследует систему кровли дома; конёк — поперёк стены примыкания */
        v.roof = {family: roof.family === "flat" ? "flat" : roof.family, pitch: Math.min(roof.pitch, 35), alongZ: (p.side === "N" || p.side === "S")};
        v.windows = p.side === "N" ? {N: [[.3, 1.4, 1.5], [.72, 1.4, 1.5]]} : p.side === "S" ? {S: [[.5, 1.4, 1.5]]} : (p.side === "E" ? {E: [[.3, 1.4, 1.5], [.72, 1.4, 1.5]]} : {W: [[.3, 1.4, 1.5], [.72, 1.4, 1.5]]});
      } else {
        v.roof = {family: "lean", pitch: a.roof.pitch, away: p.side};
        if (a.kind === "vestibule"){ v.door = p.side; v.windows = {}; }
      }
      if (a.kind === "vestibule") coreVol.door = null;
      V.push(v);
    });
    return V;
  };

  /* Что будет, если выбрать опцию: допустимо ли и какое одно изменение это исправит. */
  GC.apply = function(state, slot, value){
    var s = JSON.parse(JSON.stringify(state));
    if (slot === "annex"){
      var i = s.annexes.indexOf(value), cat = GC._cat || (GC._cat = GC.catalog()), kind = cat.byId[value].kind;
      if (i >= 0) s.annexes.splice(i, 1);
      else { s.annexes = s.annexes.filter(function(id){ return cat.byId[id].kind !== kind; }); s.annexes.push(value); }
    }
    else if (slot === "finish"){ s.finishes[value[0]] = value[1]; }
    else s[slot] = value;
    return s;
  };
  GC.check = function(state, slot, value, cat){
    cat = cat || GC.catalog();
    var next = GC.apply(state, slot, value), r = GC.resolve(next, cat);
    if (r.ok) return {ok: true};
    var fix = GC.suggest(next, slot, value, cat);
    return {ok: false, message: r.issues[0].message, kind: r.issues[0].kind, fix: fix};
  };
  /* Ищем одно изменение в другой части, которое делает сочетание допустимым. */
  GC.suggest = function(state, slot, value, cat){
    var tries = [];
    if (slot !== "roof") cat.roofs.forEach(function(r){ tries.push({slot: "roof", value: r.id, label: "поставить кровлю «" + r.label + "»"}); });
    if (slot !== "upper"){ tries.push({slot: "upper", value: null, label: "убрать второй уровень"}); }
    ["slab", "strip"].forEach(function(f){ tries.push({slot: "finish", value: ["foundation", f], label: "фундамент «" + GC.finishLabel("foundation", f) + "»"}); });
    ["aerated", "arbolit"].forEach(function(w){ tries.push({slot: "finish", value: ["walls", w], label: "стены «" + GC.finishLabel("walls", w) + "»"}); });
    state.annexes.forEach(function(id){ if (!(slot === "annex" && id === value)) tries.push({slot: "annex", value: id, label: "убрать «" + cat.byId[id].label + "»"}); });
    if (slot === "annex") cat.annexes.forEach(function(a){ if (a.kind === cat.byId[value].kind && a.id !== value && state.annexes.indexOf(a.id) >= 0) tries.unshift({slot: "annex", value: a.id, label: "заменить «" + a.label + "»"}); });
    for (var i = 0; i < tries.length; i++){
      var s2 = GC.apply(state, tries[i].slot, tries[i].value);
      if (tries[i].slot === "roof" && s2.roof === state.roof) continue;
      if (GC.resolve(s2, cat).ok) return tries[i];
    }
    return null;
  };
  GC.finishLabel = function(group, id){
    var o = GC.finishes[group].options.filter(function(x){ return x.id === id; })[0];
    return o ? o.label : id;
  };
})(typeof window !== "undefined" ? window : globalThis);
