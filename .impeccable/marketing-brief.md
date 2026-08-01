# Marketing surface brief

- Scope: every marketing surface in `reference/index.src.html` except the existing `#studio` calculator, its controls, 3D scene, formulas, bill, account behavior, and report generation.
- Mode: Persuade.
- Audience: affluent Moscow-region families evaluating a custom house and a responsible full-cycle bureau.
- Job: understand the inside-out method, trust the integration of architecture/production/construction, and enter the calculator.
- Primary action: «Рассчитать дом» / enter `#studio`.
- Proof available: procedural house visualization, ten project bases, eleven-step calculator, real material choices, 1:1 plan fitting, site checks, one accountable team. No testimonials or awards may be invented.
- Direction: Architectural tailoring atelier — a house taken to the measure of life. Graphite wool cutting table, cold pattern paper, cobalt tailor chalk, restrained brass registration points, narrow authoritative Cyrillic display type, clipped paper tabs, seam lines and registration marks.
- Approved comp: `.impeccable/mocks/atelier-a.png` (selection delegated by the user's direct build instruction).
- Memorable moment: the live house model sits on a dark cutting table while cobalt measurement seams connect the promise, proof rail and projects.
- Constraint: calculator remains visually and behaviorally untouched; the redesign must meet it cleanly at the seam.

## Implementation inventory

| Ingredient | Commitment | Medium |
|---|---|---|
| Navigation | Graphite rail, compact labels, visible account and calculator action | Semantic HTML/CSS |
| Hero typography | Narrow compressed Cyrillic, extreme but legible scale | Embedded local display font + HTML |
| Hero house | Existing procedural Three.js house; no raster substitute | Existing WebGL canvas |
| Cutting-table ground | Dense graphite textile field with faint grid and seam marks | CSS background + authored SVG marks |
| Pattern pieces | Cold paper panels with clipped/notched corners and seam labels | HTML/CSS clip-path |
| Cobalt chalk | One committed blue field and measurement lines, not scattered decoration | CSS/SVG |
| Brass marks | Tiny registration points only | CSS/SVG |
| Primary CTA | Cobalt fabric-tab geometry with clipped end and clear focus state | Semantic link + CSS |
| Proof rail | Four measured facts aligned as a ruler, no invented metrics | HTML/CSS |
| Project grid | Four project cards as elevation sheets; existing procedural diagrams | Existing SVG + HTML/CSS |
| Narrative | Three linked pattern pieces: basis, customisation, full-scale fitting | HTML/CSS |
| Materials | Dark swatch inventory with existing factual material descriptions | HTML/CSS |
| Motion | One orchestrated hero reveal and seam-draw; reduced-motion fallback | CSS + existing observer JS |
| Responsive | Split hero becomes ordered vertical cutting table; controls remain 44px+ | CSS media queries |
