# Source input contract

## Minimum architectural evidence

Require these before declaring the model exact:

- dimensioned plan for every level;
- all four dimensioned facades;
- at least one longitudinal and one transverse section;
- roof plan with pitch, ridge/eave directions, overhangs, dormers, and penetrations;
- floor elevations, total height, knee-wall height, slab thicknesses, and finished floor datum;
- window and exterior-door schedule or dimensioned openings;
- photos or renderings for materials, colors, trim, terraces, rails, and landscape intent.

CAD/BIM (`dwg`, `dxf`, `ifc`, `rvt`, `skp`, `obj`, `fbx`, `glb`) is helpful but does not replace contradictory drawing checks.

## Evidence classes

Record one confidence value for important dimensions:

- `published`: stated in a passport, schedule, or dimension string;
- `measured`: measured from a scale drawing with known scale;
- `traced`: traced from a drawing without an authoritative dimension;
- `inferred`: reconstructed from visual or geometric constraints;
- `illustrative`: intentionally non-production demo data.

Prefer published over measured, measured over traced, and traced over inferred. Record conflicts in `importMeta.notes`.

## Stop conditions

Do not guess when any of these are missing or contradictory:

- footprint topology or a footprint dimension affecting massing;
- floor/roof elevation or pitch affecting the second level;
- ridge direction, valley, hip, or dormer geometry;
- stair position or slab opening;
- structural opening that changes a facade;
- a claimed catalogue price without an approved pricing source.

Create a draft with explicit `null` values and ask one concise batch of questions. A plausible model is not an exact model.

## Coordinate convention

- meters only;
- X is left/right on the front facade;
- Y is elevation;
- Z runs front to back;
- front wall is negative Z;
- room boxes are `[minX, minZ, width, depth]` from the front-left minimum corner;
- partition segments are `[x1, z1, x2, z2]`;
- opening `center` is along its wall from the wall center.
