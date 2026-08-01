# Detector findings

The detector was run once against `reference/index.src.html` after the redesign.

- `layout-transition` (line 346): pre-existing account/calculator-adjacent UI; outside the marketing-surface redesign boundary.
- `codex-grid-background` (line 431): intentional and semantically grounded in the approved architectural cutting-table / measurement surface.
- `em-dash-overuse`: file-wide count is dominated by the untouched calculator and hidden legacy copy.
- `radial-halo` (line 169): pre-existing calculator viewport lighting; calculator is explicitly out of scope.
- `marquee`: pre-existing hidden legacy section; not part of the rendered redesigned surface.

No detector finding required a change inside the redesigned marketing surface.
