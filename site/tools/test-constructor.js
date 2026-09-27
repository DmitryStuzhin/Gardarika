#!/usr/bin/env node
/* Автотест конструктора V3: перебирает все сочетания частей и отделки.
   Проверяет, что
   1) движок не падает и у каждого запрета есть понятная причина;
   2) в допустимых сочетаниях объёмы первого уровня не пересекаются;
   3) предложенное исправление конфликта действительно даёт допустимый дом;
   4) нет «мёртвых» вариантов: каждая опция меняет форму модели или смету.
   Запуск: node site/tools/test-constructor.js */
"use strict";
const path = require("path");
const dir = path.join(__dirname, "..", "assets", "constructor");
["houses.js", "engine.js", "pricing.js"].forEach(f => require(path.join(dir, f)));
const GC = globalThis.GC, cat = GC.catalog();

const F = GC.finishes, fails = [];
let total = 0, valid = 0, suggestChecked = 0;
const uppers = [null].concat(cat.uppers.map(u => u.id));
const annexSets = [[]];
cat.annexes.forEach(a => { const n = annexSets.length; for (let i = 0; i < n; i++){ const s = annexSets[i]; if (!s.some(id => cat.byId[id].kind === a.kind)) annexSets.push(s.concat(a.id)); } });

function overlap(p, q){ return Math.abs(p.x - q.x) * 2 < p.w + q.w - 0.02 && Math.abs(p.z - q.z) * 2 < p.d + q.d - 0.02; }
function signature(state){
  const r = GC.resolve(state, cat); if (!r.ok) return null;
  const e = GC.estimate(r, state.finishes);
  return JSON.stringify(e.massing.map(v => [v.kind, v.x, v.z, v.w, v.d, v.y0, v.h, v.roof])) + "|" + e.total;
}

for (const core of cat.cores) for (const up of uppers) for (const roof of cat.roofs) for (const ax of annexSets)
for (const walls of F.walls.options) for (const fnd of F.foundation.options) for (const fac of F.facade.options){
  total++;
  const st = {core: core.id, upper: up, roof: roof.id, annexes: ax, finishes: {foundation: fnd.id, walls: walls.id, roofCover: "seam", facade: fac.id, windows: "lam"}};
  let r;
  try { r = GC.resolve(st, cat); } catch (e){ fails.push("исключение: " + e.message + " " + JSON.stringify(st)); continue; }
  if (!r.ok){ r.issues.forEach(i => { if (!i.message || i.message.length < 10) fails.push("пустая причина запрета: " + JSON.stringify(st)); }); continue; }
  valid++;
  const V = GC.estimate(r, st.finishes).massing.filter(v => v.kind !== "floor" && v.kind !== "mansard");
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++)
    if (overlap(V[i], V[j])) fails.push("пересечение " + V[i].kind + " и " + V[j].kind + ": " + JSON.stringify(st));
  /* выборочно проверяем исправления конфликтов для каждого допустимого дома */
  if (walls.id === "aerated" && fnd.id === "slab" && fac.id === "plaster"){
    const tries = cat.roofs.map(x => ["roof", x.id]).concat(uppers.map(x => ["upper", x])).concat(cat.annexes.map(x => ["annex", x.id]))
      .concat([["finish", ["walls", "frame"]], ["finish", ["foundation", "piles"]], ["finish", ["facade", "clinker"]]]);
    tries.forEach(([slot, value]) => {
      const chk = GC.check(st, slot, value, cat);
      if (chk.ok || !chk.fix) return;
      suggestChecked++;
      const s2 = GC.apply(GC.apply(st, slot, value), chk.fix.slot, chk.fix.value);
      if (!GC.resolve(s2, cat).ok) fails.push("исправление не работает: " + slot + "=" + JSON.stringify(value) + " → " + chk.fix.label);
    });
  }
}

/* «мёртвые» опции: от базового дома каждая допустимая замена должна менять форму или цену */
let dead = 0;
GC.houses.forEach(h => {
  const base = GC.houseDefaults(h.id), sig0 = signature(base);
  const opts = cat.cores.map(x => ["core", x.id]).concat(uppers.map(x => ["upper", x])).concat(cat.roofs.map(x => ["roof", x.id])).concat(cat.annexes.map(x => ["annex", x.id]));
  Object.keys(F).forEach(g => F[g].options.forEach(o => opts.push(["finish", [g, o.id]])));
  opts.forEach(([slot, value]) => {
    const s2 = GC.apply(base, slot, value), sig = signature(s2);
    const same = JSON.stringify(s2) === JSON.stringify(base);
    if (sig && !same && sig === sig0){ dead++; fails.push("опция ничего не меняет: " + h.id + " " + slot + "=" + JSON.stringify(value)); }
  });
});

console.log("сочетаний: " + total + ", допустимых: " + valid + ", запрещено с объяснением: " + (total - valid) + ", проверено исправлений: " + suggestChecked + ", «мёртвых» опций: " + dead);
if (fails.length){ console.log("ОШИБКИ (" + fails.length + "):\n" + fails.slice(0, 25).join("\n")); process.exit(1); }
console.log("OK");
