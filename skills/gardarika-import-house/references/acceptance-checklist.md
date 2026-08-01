# Acceptance checklist

## Evidence and data

- [ ] Source inventory exists and every used drawing is listed.
- [ ] Critical dimensions have confidence values.
- [ ] Missing/contradictory inputs are resolved or explicitly marked draft.
- [ ] Pricing status is honest and every default points to a real option.
- [ ] Strict validator returns zero errors.

## Geometry

- [ ] Footprint matches the plan in topology and dimensions.
- [ ] Both levels match floor elevations and section geometry.
- [ ] Upper floor is not a generic box under an unrelated roof.
- [ ] Roof ridges, pitches, overhangs, valleys, hips, dormers, and penetrations match.
- [ ] No holes, z-fighting, floating slabs, roof-wall gaps, or roof intrusions.
- [ ] Stair and protected slab opening align on both levels.
- [ ] Every interior door has a real cut opening in its partition; adapted doors move with adapted partitions.
- [ ] Every furniture item is traceable to HouseSpec, fits inside its referenced room, and uses plausible dimensions.
- [ ] No room-sized cabinet blocks, furniture-wall penetrations, solid-furniture collisions, or floating objects remain.
- [ ] Openings match facade position/size and pass collision rules.
- [ ] Every exterior opening is readable at close range; no facade, cladding, wall, or detail mesh covers its clear rectangle.
- [ ] Glazed doors remain transparent and framed; solid doors have a leaf, frame, threshold, and handle.
- [ ] Every covered terrace/carport has a complete roof, ledger/header, supports, and deck where specified.
- [ ] Support tops meet the actual roof underside within 30 mm; no posts stop short or protrude through the roof.

## Calculator behavior

- [ ] Build begins from site/soil and advances through all 11 stages.
- [ ] Every selectable option visibly changes the relevant stage.
- [ ] Every choice changes price by the intended delta.
- [ ] Protected architecture cannot be broken by incompatible options.
- [ ] Original and adapted configurations can be reset independently.
- [ ] Generated page is standalone and does not claim catalogue/account integration unless separately implemented.

## Visual and browser QA

- [ ] Exterior resembles references from front, rear, and both sides.
- [ ] Front, rear, left, and right facades were inspected at both overview and close-opening distance.
- [ ] Ground and upper cutaways contain partitions, doors, finishes, and furniture as specified.
- [ ] Ground and upper cutaways were inspected from overview and close top-down angles in original and adapted layouts.
- [ ] Exploded view preserves component alignment.
- [ ] Labels and dimensions are hydrated from HouseSpec, not hardcoded from another house.
- [ ] Desktop and mobile layouts are usable.
- [ ] Browser console has no errors during all stages and option changes.
