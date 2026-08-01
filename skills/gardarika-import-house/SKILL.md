---
name: gardarika-import-house
description: Import a new architectural house project into Gardarika Calculator V2 from floor plans, facades, sections, roof plans, photos, renderings, PDFs, or CAD exports. Use when creating a reusable HouseSpec, rebuilding the exact house form in Three.js, generating a project module and calculator page, or checking roofs, floors, openings, interiors, option visualization, compatibility, and pricing behavior for a new catalogue house.
---

# Gardarika House Import

Turn source drawings into a validated, editable Calculator V2 project. Preserve the house identity while making construction packages and finish levels configurable.

Calculator V2 currently assumes a ground level plus an upper/mansard level and an 11-stage flow. If the source is single-storey or has more than two levels, stop before generation and extend the UI/build-stage profile; do not hide the mismatch inside empty geometry.

## Workflow

1. Set `SKILL_DIR` to the absolute directory containing this `SKILL.md`.
2. Read `references/input-contract.md`. Separate published dimensions from measured and inferred values. Never invent a critical dimension.
3. Scaffold a HouseSpec and source inventory:
   `python3 "$SKILL_DIR/scripts/scaffold_house.py" --id HOUSE_ID --name "HOUSE NAME" --source-dir SOURCE_DIR --output WORK_DIR/house.json`
4. Fill `house.json` from plans, four facades, sections, roof plan, and visual references. Follow `references/house-spec.md`.
5. Select geometry mode:
   - Use `rect-gable-2level` only for a rectangular two-level house with a symmetric gable roof.
   - Use `custom-adapter` for every other massing. Copy `assets/geometry-adapter.template.js` and implement the same layer contract.
6. Validate before generating:
   `python3 "$SKILL_DIR/scripts/validate_house_spec.py" WORK_DIR/house.json --strict`
7. Generate the runtime module:
   `python3 "$SKILL_DIR/scripts/generate_project_module.py" WORK_DIR/house.json --output reference/v2/projects/HOUSE_ID.js`
8. Generate its calculator entry:
   For standard geometry: `python3 "$SKILL_DIR/scripts/generate_calculator_entry.py" WORK_DIR/house.json --template reference/calculator-v2.html --project-module v2/projects/HOUSE_ID.js --output reference/calculator-HOUSE_ID.html`
   For custom geometry, first copy the adapter template to `reference/v2/adapters/HOUSE_ID.js`, replace `HOUSE_ADAPTER_ID`, implement `build`, `validate`, and `quantities`, then add `--adapter-module v2/adapters/HOUSE_ID.js` to the command.
10. Test every checklist item in `references/acceptance-checklist.md` in the browser at desktop and mobile widths.

## Non-negotiable rules

- Keep source evidence and confidence alongside every uncertain architectural value.
- Keep catalogue identity dimensions separate from configurable package choices.
- Do not let a roof, slab, wall, opening, or stair exist as an unrelated visual overlay.
- Give every exterior opening both semantic `type` and explicit `visualType`; never render all doors as one opaque slab.
- Subtract openings from every facade skin or build trim around their clear rectangles. Never cover a window or door with a decorative box.
- Derive porch, terrace, and carport support heights from the rotated roof underside and validate every contact within 30 mm.
- Store every furniture item in HouseSpec with a room id, rotated footprint, dimensions, and evidence class; reject hardcoded fallback interiors and room-sized placeholder boxes.
- Cut partitions around both original and adapted interior doors. Move door coordinates with the adapted partition layout instead of overlaying leaves on solid walls.
- Do not expose an option unless its selected state produces a visible 3D change or an explicitly labeled non-geometric system visualization.
- Do not call pricing production-ready unless rates came from an approved source. Mark calculated examples as `illustrative`.
- Stop and ask for the missing section, facade, or dimension when the omission can change massing, roof intersections, floor heights, or openings.
- Preserve the `model.userData` layer contract in `references/calculator-contract.md`.

## Output contract

Deliver:

- a complete `*.house.json` HouseSpec;
- a generated project module;
- a standalone calculator HTML entry;
- a custom geometry adapter when required;
- validation output with zero errors;
- browser evidence for exterior, both levels, exploded view, all build stages, and all package variants.

Catalogue linking, account save/export, and production deployment are separate integration tasks. Do not claim them from this import alone.

Use `references/acceptance-checklist.md` as the definition of done, not visual resemblance from one camera angle.
