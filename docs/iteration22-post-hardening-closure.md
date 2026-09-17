# Iteration 22 post-hardening closure

## Scope

Canonical target: **Toroidal Skyscrapers** (`toroidal-skyscrapers`).

## Proven contract

- 6x6 toroidal grid.
- The value `6` is a fixed viewpoint clue, not a building height.
- Every row and column contains exactly one viewpoint and each building height 1-5 exactly once.
- Each toroidal clue looks along five wrapped cells, excluding its own viewpoint cell.
- Wrapped visibility counts are exact and rotation-aware at runtime.
- Seeded generation is deterministic, seed-diverse, solver-certified unique, and toroidal-clue-essential.
- Dedicated solver API is exported as `SudokuGenerator.countToroidalSkyscraperSolutions` for direct verification.
- Difficulty ordering is clue-monotone and carries measured toroidal-aware `searchStats` and `difficultyScore` evidence.

## Regression evidence

Dedicated gate: `tests/iteration22-post-hardening.test.js`

Latest targeted result supplied during the audit: **4/4 PASS**.

Full repository result after production loader integration: **520/520 PASS**.

Release gate: **PASS**.

Catalogue: **106**.

External runtime dependencies: **0**.

## Production integration

`games/iteration22-generator-hardening.js` is loaded by `index.html` after Iteration 21 hardening and augments only the Toroidal Skyscrapers generator result with measured search evidence while exporting the dedicated toroidal solver.

## Closure

Toroidal Skyscrapers is accepted as **10/10 post-hardening**.
