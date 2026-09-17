# Iteration 10 post-hardening closure

Games closed at 10/10:

- Running Cells Sudoku
- Ascending Sequences Sudoku

Evidence:

- Dedicated Iteration 10 audit: 9/9 PASS.
- Full regression suite: 472/472 PASS.
- Release gate: PASS.
- Catalogue: 106.
- External runtime dependencies: 0.
- Standalone SHA-256: `c0c4525def731ccbe3071ae2606f04391088499ec78b6dab70e49f30f495e3d8`.
- Production runtime loads `games/iteration10-generator-hardening.js`.
- Both games have deterministic, seed-diverse, solver-certified variant-essential generation.
- Both games expose clue-ordered difficulty with variant-aware `searchStats` and `difficultyScore`.
- Runtime outside-clue enforcement, rotation and visual hooks are covered by dedicated and legacy regression tests.
