# Ildi feedback implementation plan — 2026-09-16

## Source

Ildi's 2026-09-16 re-test of the first Japanese logic games.

## Canonical findings

| Priority | Game | Finding | Acceptance contract |
| --- | --- | --- | --- |
| P0 | Star Battle / Csillagkert | A correct solution can remain incomplete / report missing stars. | A solver-valid final marking must call the canonical solved completion path exactly when the generated solution is reached. |
| P0 | Futoshiki | Runtime input/rules remain hard-coded to 1–6 although multi-size generation supports 4–8. | Keyboard, number pad, rule copy and accessibility must derive the digit range from generated board size; 7×7 must accept 7 and 8×8 must accept 8. |
| P1 | Futoshiki | Row/cell height and inequality placement can drift. | Explicit square grid tracks/cells and sign coordinates must remain centered for every supported size. |
| P1 | Futoshiki | Notes requested. | Editable cells support a note mode without changing cell geometry; notes are size-aware. |
| P1 | Akari | Row heights differ until a mark is entered. | Explicit square row tracks/cells prevent content-dependent geometry changes. |
| P1 | Fillomino | Row-height regression. | Explicit square row tracks/cells prevent content-dependent geometry changes for all supported sizes. |
| P1 | Aquarium | Zero edge clues are visually undesirable. | Zero row/column clues are rendered as blank while non-zero clues are unchanged; zero remains part of the puzzle/solver contract. |
| P2 | Galaxies / Csillaggalaxis | 8×8 Expert is still too easy. | Expert generation evaluates a materially broader candidate pool and uses both solver search effort and region geometry complexity while preserving exact uniqueness, determinism and size independence. |

## Important non-regression decision

The earlier browser-zoom missing-grid-line report is not reopened by this feedback. It remains recorded as a zoom/rendering observation unless a reproducible defect appears at normal zoom.

## Implementation order

1. Correctness: Star Battle completion and Futoshiki size-aware input/rules.
2. Interaction/layout: Futoshiki notes + geometry, Akari and Fillomino row geometry.
3. Presentation: Aquarium zero-clue blanking.
4. Difficulty: Galaxies 8×8 Expert recalibration.
5. Regression gates for every item, then full repository gate and release gate before live publication.

## Work started

Galaxies Expert recalibration is implemented first as an isolated generator change: Expert now requests a wider candidate pool (32 candidates on 8×8), searches a larger deterministic attempt space, and ranks exact-unique candidates with a composite of exact-solver search effort and region-geometry complexity. The generated metadata records the calibration strategy and pool size so the behavior is testable rather than implicit.

The remaining renderer changes deliberately target the canonical `games/sudoku-library.js` implementation rather than adding DOM-only patches: Futoshiki needs stateful notes and size-aware input, and Akari/Fillomino need content-independent grid geometry at the renderer/CSS contract level.

## Verification plan

Targeted tests:

- `tests/p3-galaxies-complete.test.js`
- `tests/star-battle-renderer-polish.test.js` plus a completion regression
- `tests/futoshiki-renderer-polish.test.js` plus multi-size input/note regression
- `tests/akari-renderer-polish.test.js`
- `tests/fillomino-renderer-polish.test.js`
- `tests/aquarium-renderer-polish.test.js`

Final gate: `node scripts/test-suite.mjs`, followed by the repository's release/standalone gate before updating the live repository.
