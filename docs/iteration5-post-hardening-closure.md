# Iteration 5 post-hardening closure

Status: **CLOSED / 10/10**

Canonical batch:

- 12×12 Sudoku
- 16×16 Sudoku
- Sukaku

Samurai Sudoku was already independently audited 10/10 and was therefore skipped in this batch.

## Findings resolved

1. **12×12 Sudoku runtime box geometry** was inconsistent with the canonical puzzle topology. Board rendering correctly showed 3×4 boxes, while `classicConflict()` validated 3×3 boxes through the generic square-root fallback. Runtime conflict validation now uses canonical 3×4 boxes.
2. **Large-grid difficulty evidence** was previously clue-count-only. 12×12 and 16×16 generation now records deterministic MRV/backtracking search statistics and a measured `difficultyScore` through `games/iteration5-generator-hardening.js`.
3. **Production loader integration** now loads the large-grid hardening wrapper from its canonical filename.
4. **Sukaku candidate contract** is explicitly regression-protected: candidate sets are deterministic for a seed, seed-diverse across puzzles, non-trivial, candidate-only on the visible board, source-puzzle unique, and always contain the solved value.

## Regression evidence

Targeted Iteration 5 gate on commit `3d9e762`:

- tests: 9
- pass: 9
- fail: 0

Covered properties:

- deterministic and seed-diverse 12×12 / 16×16 generation
- solver-certified uniqueness
- canonical 3×4 and 4×4 box topology
- ordered Gentle > Focused > Expert clue counts
- measured large-grid search effort
- Sukaku candidate determinism, diversity, non-triviality and solution compatibility
- Samurai legacy Iteration 5 regression retained green

Full project regression after production-loader integration:

- tests: 452
- pass: 452
- fail: 0

Release gate on commit `6ab60a0`:

- `RELEASE GATE: PASS`
- catalogue: 106
- external runtime dependencies: 0
- standalone SHA-256: `adc0b3013a22d045643fb353187ebb7b493e14d1434abc9300bd40e06a114763`

## Relevant hardening commits

- `182092a` - add Iteration 5 post-hardening regressions
- `d199922` - add measured difficulty evidence for large Sudoku grids
- `3d9e762` - fix 12×12 runtime box geometry
- `7c3866a` - initial production loader integration
- `6ab60a0` - correct Iteration 5 hardening loader filename

The three games in this batch have no known open source, generation, solver, runtime, or release finding after the above gates.
