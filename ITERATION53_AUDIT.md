# Iteration 53 – New Families Hardening Audit

Scope: the nine families added in Iterations 50–52. No catalogue expansion; catalogue remains 106.

## Findings

| Family | Generator | Rule solver / uniqueness | Runtime UX | Audit status |
|---|---|---|---|---|
| Star Battle / Csillagkert | seeded region growth | real row/column/region/non-touching counter | cell star placement | VERIFIED |
| Aquarium / Akvárium | seeded regions + water levels | real region-level enumeration + row/column clues | fill cells, edge clues | VERIFIED |
| Tentai Show / Csillaggalaxisok | seeded symmetric tiling | counter checks symmetry/connectivity but does not anchor each center to its own galaxy | numeric ownership rather than boundary drawing | HARDENING REQUIRED |
| Shakashaka / Háromszögkert | seeded triangle mosaic | previous counter was a stub returning 1 | triangle-state cycling; geometry is prototype-level | HARDENING REQUIRED |
| Ripple Effect / Hullámhatás | seeded Latin rows | previous counter was not a complete room/distance solver | number cycling | HARDENING REQUIRED |
| Yajilin / Nyílösvény | seeded border-loop template | previous counter was a stub returning 1 | marks loop cells, not actual loop edges | HARDENING REQUIRED |
| LITS / Tetrominókert | curated region families + transforms | real tetromino/network counter; Iteration 53 fixes starter enforcement | shade cells + region borders | VERIFIED AFTER FIX |
| Battleships / Rejtett Flotta | seeded fleet placement | real fleet placement counter with edge clues and givens | ship/water marking | VERIFIED |
| Heyawake / Szobakert | curated room families + transforms | real room/no-touch/connectivity/three-room-line counter | shade cells + room clues | VERIFIED |

## Corrective action in Iteration 53

1. Removed false uniqueness certification from Tentai Show, Shakashaka, Ripple Effect and Yajilin. Their generated metadata now explicitly reports an `unverified...` verification state.
2. Replaced the Iteration 51 self-certifying regression assertions with tests that prevent those families from being accidentally presented as solver-verified before their real solvers exist.
3. Fixed the LITS counter so starter cells are actual constraints rather than UI-only hints.
4. Added an audit regression gate covering catalogue count, verified-family multi-seed uniqueness, explicit unverified states, and LITS starter parity.

## Release policy

A family may only advertise `generation.unique === true` when an independent rule solver counts exactly one solution from the player-visible puzzle data. Template identity or comparison with a stored solution is not sufficient.

## Next hardening order

1. Yajilin: edge-based loop model + arrow/black constraints + true loop solver.
2. Ripple Effect: general room generator + full room and distance solver.
3. Shakashaka: exact triangle geometry + rectangle validation solver.
4. Tentai Show: center anchoring in solver + boundary-based interaction model.

No new family should be added before these four are resolved or intentionally removed from the production catalogue.
