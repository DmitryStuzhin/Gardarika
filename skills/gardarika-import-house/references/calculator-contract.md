# Calculator V2 runtime contract

## Project module

The generated JavaScript module must set:

- `window.GardarikaV2.projects[project.id]`;
- `window.GardarikaV2.originalProject`;
- `window.GardarikaV2.cloneProject()` returning a deep clone.

Load order: Three.js, OrbitControls, project module, optional custom adapter, geometry engine, calculator UI.

## 3D layer contract

Every engine or adapter build returns one `THREE.Group`. Its `userData` must expose:

`foundation`, `ground`, `groundShell`, `groundStructure`, `groundInterior`, `groundPartitions`, `groundFinish`, `groundDoors`, `groundFurniture`, `mansard`, `mansardShell`, `mansardStructure`, `mansardInterior`, `mansardPartitions`, `mansardFinish`, `mansardDoors`, `mansardFurniture`, `roof`, `details`, `facadeSkin`, `engineering`, `openings`, `groundOpenings`, `mansardOpenings`, `terraceDeck`, `terracePergola`, `cladding`.

Use empty groups when a feature is absent. The UI relies on stable layers for build stages and cutaway views.

## Visual option contract

Every package selection must change a named layer/material/object:

- foundation: slab, strip, or piles/grade beam geometry;
- walls: core color/texture and construction cue;
- slab: concrete plate or beam system;
- roofCover: roof material;
- facade: finish skin/cladding visibility or material;
- windows: frames/glass/door package;
- engineering: visible routing scope in its stage;
- layout: partitions/doors and room arrangement;
- interior: shell, white-box, or finished/furnished state;
- terrace: none, deck, or full terrace/pergola.

Opening visuals use `visualType`, not semantic `type`: `window` and `glazed-door` remain transparent glazing, while `solid-door` receives a complete opaque door assembly. Facade skins and decorative overlays must reuse the wall's opening rectangles or be split around them; no finish mesh may cover a window or door.

For a covered terrace, porch, or carport, the visible option is complete only when its roof, edge/ledger/header, supports, and deck are present. Compute each support top from the actual rotated roof underside and validate the contact within 30 mm rather than assigning a visually guessed height.

If a system is normally hidden, reveal it during its build stage and label the visualization as schematic.

## Compatibility

Filter assemblies, not standalone decorative parts. A roof family belongs to a massing/upper-level family; it is never placed over an unrelated shell. Validate openings against wall ends, neighboring openings, and roof clearances before rendering.
