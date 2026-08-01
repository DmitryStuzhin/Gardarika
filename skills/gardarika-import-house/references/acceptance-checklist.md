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
- [ ] Openings match facade position/size and pass collision rules.

## Calculator behavior

- [ ] Build begins from site/soil and advances through all 11 stages.
- [ ] Every selectable option visibly changes the relevant stage.
- [ ] Every choice changes price by the intended delta.
- [ ] Protected architecture cannot be broken by incompatible options.
- [ ] Original and adapted configurations can be reset independently.
- [ ] Generated page is standalone and does not claim catalogue/account integration unless separately implemented.

## Visual and browser QA

- [ ] Exterior resembles references from front, rear, and both sides.
- [ ] Ground and upper cutaways contain partitions, doors, finishes, and furniture as specified.
- [ ] Exploded view preserves component alignment.
- [ ] Labels and dimensions are hydrated from HouseSpec, not hardcoded from another house.
- [ ] Desktop and mobile layouts are usable.
- [ ] Browser console has no errors during all stages and option changes.
