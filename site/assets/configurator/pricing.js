/* Конструктор V3 · смета по объёмам модели.
   Все количества берутся из GC.massing — того же списка объёмов, из которого строится 3D.
   Поэтому любое изменение формы меняет цену, а цена не может «жить отдельно» от модели. */
(function(root){
  "use strict";
  var GC = root.GC = root.GC || {};
  var FIXED = 450000;                               /* проект, логистика, управление стройкой */
  var RATES = {slab: 3200, roofFrame: 4100, carport: 9500, terrace: 8500, eng: 6200, gutter: 2600};

  function rate(group, id){ return GC.finishes[group].options.filter(function(o){ return o.id === id; })[0].rate; }
  function winArea(v){
    var s = 0; if (!v.windows) return 0;
    Object.keys(v.windows).forEach(function(k){ v.windows[k].forEach(function(o){ s += o[1] * o[2]; }); });
    return s;
  }
  /* площадь скатов и длина карниза для системы кровли над прямоугольником w×d */
  GC.roofGeom = function(v){
    var r = v.roof; if (!r) return {area: 0, eaves: 0, rise: 0};
    var ov = r.family === "flat" ? 0.25 : 0.5, W = v.w + 2 * ov, D = v.d + 2 * ov, t = Math.tan(r.pitch * Math.PI / 180);
    if (r.family === "flat") return {area: W * D, eaves: 0, rise: 0.4};
    if (r.family === "lean"){ var run = (r.away === "N" || r.away === "S") ? D : W, other = run === D ? W : D; return {area: run / Math.cos(Math.atan(t)) * other, eaves: other, rise: run * t}; }
    var span = r.alongZ ? W : D, len = r.alongZ ? D : W, rise = span / 2 * t;
    var area = W * D / Math.cos(Math.atan(t));      /* и для двускатной, и для вальмовой проекция одна — отличаются уклоном граней */
    if (r.family === "hip") area *= 1.04;
    return {area: area, eaves: r.family === "hip" ? 2 * (W + D) : 2 * len, rise: rise};
  };

  GC.estimate = function(res, finishes){
    var V = GC.massing(res), f = finishes, lines = [];
    var heatedFoot = 0, wallArea = 0, windows = 0, slabArea = 0, roofArea = 0, eaves = 0, carport = 0, terrace = 0, area = 0;
    V.forEach(function(v){
      if (v.kind === "carport"){ carport += v.w * v.d; roofArea += GC.roofGeom(v).area; return; }
      if (v.kind === "terrace"){ terrace += v.w * v.d; return; }
      var per = 2 * (v.w + v.d), wa = per * v.h;
      if (v.kind === "mansard"){
        /* коленные стены по длинным сторонам + два фронтона до конька */
        var rg = GC.roofGeom(v), span = v.roof.alongZ ? v.w : v.d, len = v.roof.alongZ ? v.d : v.w;
        wa = 2 * len * v.h + 2 * (span * v.h + span * rg.rise / 2);
        /* полезная мансарды: внутри стен и только там, где высота не ниже 1,5 м; минус лестница */
        /* площадь мансарды по внешнему контуру — только там, где высота не ниже 1,5 м */
        var free = Math.max(0, span - 2 * Math.max(0, (1.5 - v.h) / Math.tan(v.roof.pitch * Math.PI / 180)));
        area += free * len;
        slabArea += v.w * v.d;
      } else if (v.kind === "floor"){ slabArea += v.w * v.d; area += v.w * v.d; }
      else { heatedFoot += v.w * v.d; area += v.w * v.d; }
      if (v.kind !== "mansard" && v.roof && v.roof.family === "gable") wa += (v.roof.alongZ ? v.w : v.d) * GC.roofGeom(v).rise;   /* фронтоны */
      var win = winArea(v); windows += win; wallArea += Math.max(0, wa - win);
      if (v.roof){ var g = GC.roofGeom(v); roofArea += g.area; eaves += g.eaves; }
    });
    function add(stage, label, qty, unit, price){ lines.push({stage: stage, label: label, qty: qty, unit: unit, sum: Math.round(qty * price)}); }
    add("Фундамент", GC.finishLabel("foundation", f.foundation), heatedFoot, "м²", rate("foundation", f.foundation));
    add("Инженерия в основании", "выпуски воды и канализации", heatedFoot, "м²", RATES.eng * 0.25);
    add("Стены", GC.finishLabel("walls", f.walls), wallArea, "м² стен", rate("walls", f.walls));
    if (slabArea) add("Перекрытие", "между этажами", slabArea, "м²", RATES.slab);
    add("Кровля", "стропильная система и утепление", roofArea, "м² скатов", RATES.roofFrame);
    add("Кровля", GC.finishLabel("roofCover", f.roofCover), roofArea, "м² скатов", rate("roofCover", f.roofCover));
    if (eaves) add("Кровля", "водосточная система", eaves, "м карниза", RATES.gutter);
    add("Окна", GC.finishLabel("windows", f.windows), windows, "м² проёмов", rate("windows", f.windows));
    add("Фасад", GC.finishLabel("facade", f.facade), wallArea, "м²", rate("facade", f.facade));
    if (carport) add("Навес", "навес для машины", carport, "м²", RATES.carport);
    if (terrace) add("Терраса", "настил на опорах", terrace, "м²", RATES.terrace);
    add("Инженерия", "инженерия «" + GC.finishLabel("engineering", f.engineering).toLowerCase() + "»", area, "м² дома", rate("engineering", f.engineering));
    if (rate("interior", f.interior)) add("Отделка", GC.finishLabel("interior", f.interior) + " отделка", area, "м² дома", rate("interior", f.interior));
    lines.push({stage: "Проект", label: "проект, логистика, управление стройкой", qty: 1, unit: "", sum: FIXED});
    var total = lines.reduce(function(s, l){ return s + l.sum; }, 0);
    return {lines: lines, total: total, area: area, heatedFoot: heatedFoot, massing: V};
  };
})(typeof window !== "undefined" ? window : globalThis);
