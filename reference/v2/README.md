# Calculator V2 — geometry contract

V2 lives beside the legacy calculator and does not call or mutate its state.

The pilot project is `Lilia 105`. Published source values are stored in
`lilia-105.js`; geometry inferred without a section drawing is marked in
`source.confidence` and surfaced in the UI.

One project object drives:

- exterior and level geometry;
- openings and their wall constraints;
- the two floor-plan diagrams;
- quantity take-off and the pricing adapter;
- validation status.

Important invariants:

1. Adding or showing the mansard never changes the 8.20 × 10.50 m ground-floor
   footprint.
2. The mansard is bounded by the 40° roof and is not modelled as a smaller
   rectangular house.
3. Every opening belongs to one wall and level, keeps a minimum 380 mm corner
   pier and a 300 mm pier to neighbouring openings.
4. Original mode is immutable. User edits happen only in Adaptation mode and
   can be reset to the catalogue project.
5. The legacy calculator remains the fallback until the pilot passes an
   engineering review against a section drawing and dimensioned elevations.
