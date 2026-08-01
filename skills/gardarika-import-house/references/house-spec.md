# HouseSpec v1

HouseSpec is the source of truth used to generate a browser project module.

## Required top-level fields

- `schemaVersion`: must be `1`.
- `project`: identity, geometry mode, source folder, and status.
- `source`: published quantities and footprint.
- `structure`: wall, slab, level, roof, and plinth dimensions.
- `site`: default soil and selectable soil records.
- `package`: price status, catalogue price, fixed cost, defaults, and 10 option groups.
- `stairVoid`: center and size of the protected opening.
- `levels`: `ground` and `mansard` for the standard engine.
- `openings`: exterior openings attached to walls.
- `visual`: environment/interior intent.
- `evidence` and `importMeta`: provenance and unresolved notes.

## Geometry modes

### `rect-gable-2level`

Use only when all are true:

- footprint is a single rectangle;
- ground walls are vertical;
- the upper level is a mansard bounded by one symmetric gable roof;
- ridge runs along Z;
- facade openings attach to `front`, `back`, `left`, or `right`.

The standard `geometry-engine.js` builds this mode.

### `custom-adapter`

Use for L/U/T-shaped plans, hips, flat roofs, multiple volumes, setbacks, dormers, atria, garages, cantilevers, or any non-standard topology. Set `project.geometryAdapter` to a unique adapter id, set `project.adapterModule` to the adapter file path, and implement `assets/geometry-adapter.template.js`.

Add `geometry` with explicit `footprintPolygons`, `volumes`, `wallSegments`, `roofFaces`, `ridges`, `valleys`, `penetrations`, and `levelElevations`. Coordinates are metric XYZ arrays; polygons are ordered XZ points. Every custom opening references a `wallSegment` id and records its usable wall length. The adapter must derive all parts from these fields and expose the Calculator layer contract. Do not combine arbitrary roofs and shells with compatibility filters; build a valid assembly for that specific architectural family.

Custom adapters must implement `build(project, config, kit)`, `validate(project, kit)`, `quantities(project, kit)`, and `planSvg(project, levelId, config, kit)`. `quantities` returns `footprint`, `wallGross`, `wallNet`, `glazing`, `roofComputed`, `roofPublished`, `usefulArea`, `costs`, and `total`. `planSvg` returns a complete SVG string using the custom footprint and walls.

## Opening contract

Every exterior opening requires both a semantic `type` and a rendered `visualType`:

- `{type:"window", visualType:"window"}` for a glazed window;
- `{type:"door", visualType:"glazed-door"}` for a terrace or balcony door whose leaf is predominantly glass;
- `{type:"door", visualType:"solid-door"}` for an opaque entrance or service door.

Never derive the material from `type:"door"` alone. Render `window` and `glazed-door` with glass plus frames; render `solid-door` as a complete leaf with frame, threshold, panel or inset, and handle. Attach the visual to the same wall segment and opening dimensions used to cut the shell.

Provide `adaptedPartitions`, `interiorDoors`, `adaptedInteriorDoors`, `furniture`, and `exteriorDetails` in HouseSpec. These prevent coordinates from another project or layout from leaking into the imported house.

- Interior door: `{id, x, z, rotation, width, height}`. Every original and adapted door must lie on a partition segment; cut the partition around its width and height before placing the leaf and frame. When a partition moves, supply the matching `adaptedInteriorDoors` coordinates.
- Staircase: `{steps, rise, run, width, direction}`; `steps × rise` must reach the upper-floor elevation.
- Furniture item types: `bed`, `sofa`, `dining`, `kitchen`, `bath`, `light`, `rug`, `storage`, `coffee`, `bench`, `vanity`, `console`. Every item requires `id`, `roomId`, `x`, `z`, `footprint:[width,depth]`, and `confidence`; add `rotation`, visible dimensions, and accent only when needed. The rotated footprint must fit inside the referenced room. Keep storage depth at or below 0.75 m and height at or below 2.4 m. Rugs and lights may overlap furniture; solid furniture may not overlap another solid footprint.
- Render furniture from `level.furniture`. Do not hardcode a fallback room arrangement inside an adapter, and do not represent cabinets, wardrobes, kitchens, or bathrooms as unlabeled room-sized boxes. Build recognizable assemblies with fronts, worktops, cushions, fixtures, legs, frames, and handles as appropriate.
- Exterior detail primitive: `{size:[w,h,d], position:[x,y,z], rotation:[rx,ry,rz], material}` inside `terraceDeck`, `terracePergola`, `cladding`, `balcony`, or `other`.

Facade details must be aperture-aware. Do not place a solid cladding box across an opening rectangle. Split surrounds and trims into left, right, head, and sill pieces, or derive a skin with the same opening subtraction as the wall. Covered extensions must contain a roof plane, ledger/header, supports, and any required deck; calculate support tops from the roof underside so every contact is within 30 mm.

## Package groups

Require these exact group ids:

`foundation`, `walls`, `slab`, `roofCover`, `facade`, `windows`, `engineering`, `layout`, `interior`, `terrace`.

Each group needs at least two options. Each option needs `id`, `name`, numeric `price`, and `visual` describing what the engine changes. The defaults object must select a real option in each group.

Architectural geometry and commercial packages are separate:

- protected: footprint topology, main elevations, stair void, load-bearing axes, ridge/roof family, opening constraints;
- configurable: technically compatible foundation, wall construction, interlevel system, roof covering, facade finish, window package, engineering scope, non-load-bearing layout, interior readiness, terrace readiness.

Use `compatibility` rules only for real engineering constraints. Provide a reason and a route to engineering review rather than silently disabling an option.

## Pricing status

- `approved`: supplied by an approved price source;
- `illustrative`: demo rates or estimates;
- `missing`: generation can proceed only in non-strict draft mode.

Never infer that a visual catalogue price equals a production estimate.
