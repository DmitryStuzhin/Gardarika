# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Primary users: affluent families considering a custom country house in Moscow and the Moscow region.
- Their job: understand whether Gardarika can translate their habits, family structure, site, and budget into a coherent house before committing to a consultation.
- Inferred from the current Russian-language site and calculator; validate with the owner when customer research becomes available.

## Product Purpose

Gardarika presents a full-cycle architecture, production, and construction bureau and converts qualified interest into a detailed preliminary house calculation. Success means a visitor understands the offer, trusts the bureau's integrated approach, and starts the calculator or contacts the team.

## Positioning

The house is designed from the inside out around a client's life, then architecture, structure, engineering, site conditions, production, and construction are assembled by one accountable team. The step-by-step 3D calculator demonstrates this mechanism instead of merely describing it.

## Operating Context

Visitors compare house scales, materials, architectural approaches, preliminary prices, site constraints, and construction decisions. The principal conversion path is from the marketing page into the 3D calculator and its downloadable estimate.

## Capabilities and Constraints

- The current marketing site lives in `site/` as static HTML/CSS/JavaScript (`index.html`, `assets/`), with no build step and no external requests; it must stay usable when opened as a local file.
- The catalog holds sixteen houses: three new example houses (Birch 132, Lilac 96, Vesper 164) whose names, sizes and indicative prices are illustrative and always marked «Пример», plus thirteen existing bases built from their source materials.
- The house calculator is the site's primary conversion goal. `site/calculator.html` runs on the configurator engine in `site/assets/configurator/` (see its README): three ready models, mixing of parts, per-stage estimate and PDF. The previous eleven-step calculator is kept as an unlinked archive in `site/calculator-legacy.html`. Every major surface of the site links to the calculator; houses without a ready model say «Расчёт в разработке».
- The legacy eleven-step calculator and the previous site remain in `reference/` as an archive and source of facts; they are not linked from the new site.
- The lead form validates input but does not send data yet; its success message says so honestly.
- A four-question quiz on the home page filters the catalog by family size, floors and area and hands the result into the lead form; it makes no price claims.
- Company facts the owner has not provided yet (years, houses built, warranty years, build time, price per m² per package, built houses, reviews, messenger links) live in `COMPANY` in `site/assets/js/data.js` and render as visible «заполнить» placeholders until filled. Never fill them with invented values.
- Brand: gold house-fortress logo with a Forum wordmark (owner-supplied `site/assets/brand/logo-original.png`, vector copy `mark.svg`).
- The contract fixes the estimate; guarantee and deadlines are written into the contract. No specific guarantee years or construction durations have been provided, so none may be stated.
- Existing factual content, Moscow-region service area and contacts must remain truthful and must not be supplemented with invented awards, customer counts, testimonials, or performance claims.

## Brand Commitments

- Name: «Гардарика» / Gardarika Homes.
- Russian-language voice: assured, concise, architectural, specific; premium without ornamental luxury clichés.
- Core promise: «Дом, собранный вокруг вашей жизни».
- The owner wants a modern, conversion-oriented site with a deliberately non-generic, non-AI look. The signature product is the 3D calculator (`site/calculator.html`): an MVP with three ready house models (Lento 100, Lilia 105, Garden 106) whose parts can be mixed, with explained and fixable incompatibilities, a stage-by-stage build view and a PDF estimate. Other catalog houses are marked as «в разработке». Unit rates are demonstration values.

## Evidence on Hand

- Current site: `site/index.html`, project data in `site/assets/js/data.js`.
- Previous site and copy source: `reference/index.src.html` (archive).
- Three user-supplied house visualizations for the new example projects (`site/assets/img/*.webp`); all house imagery is visualization or project reference material and is labeled as such.
- No verified client testimonials, completed-project photography, awards, quantitative conversion data, or third-party endorsements are present; future work must not fabricate them.

## Product Principles

1. Demonstrate the inside-out method instead of relying on generic construction claims.
2. Make the calculator the natural consequence of the story, not an isolated widget.
3. Communicate premium value through precision, restraint, materiality, and editorial confidence.
4. Keep every factual claim auditable and visibly distinguish illustrative pricing.
5. Route every house toward the 3D calculator; every calculator option must visibly change the model or the estimate, and options not shown on the model say so.
6. Keep every size and price traceable: published source figures stay as given, illustrative figures are marked as examples.

## Accessibility & Inclusion

Maintain semantic structure, keyboard-visible focus, readable contrast, reduced-motion behavior, and responsive layouts for both fine and coarse pointers.
