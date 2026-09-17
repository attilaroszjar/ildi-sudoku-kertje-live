# Iteration 11 post-hardening closure

Games closed at 10/10:

- Bishopsgate Sudoku
- Min / Max Sudoku

Evidence:

- Dedicated Iteration 11 audit: 9/9 PASS.
- Full test suite: 476/476 PASS.
- Release gate: PASS.
- Catalogue: 106.
- External runtime dependencies: 0.
- Standalone SHA-256: `5991e3540d1c871c86472fd1c5c8ba828b9b684295798f4efcdb09294ec7b83b`.
- Production runtime loads `games/iteration11-generator-hardening.js`.
- Generator evidence includes deterministic seed diversity, solver-certified variant-essential uniqueness, clue-ordered difficulty, and variant-aware MRV/backtracking `searchStats` plus `difficultyScore`.
- Runtime coverage includes Bishopsgate checkerboard anti-bishop enforcement and Min/Max strict orthogonal extrema markers/enforcement.

Registry target after artifact closure: 87/106.
