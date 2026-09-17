# Iteration 13 post-hardening closure

Games: Even Sandwich Sudoku, Top-Heavy Parity Sudoku

## Evidence

- Dedicated Iteration 13 regression suite: 9/9 PASS.
- Full project suite: 484/484 PASS.
- Release gate: PASS.
- Catalogue size: 106.
- External runtime dependencies: 0.
- Standalone SHA-256: `8417eaf7d2057fc7fedfef243ac974c94280015f6389efeffcb631102362ec30`.

## Closure rationale

### Even Sandwich Sudoku

The static clue set is exact: every and only digit with two immediate even neighbours in its row/column is exposed. Generation is deterministic, seed-diverse, uniquely solvable under the variant, and variant-essential against classic Sudoku. Difficulty is clue-ordered and backed by measured variant-aware search statistics. Runtime enforcement, rendering, and note cleanup hooks are covered by the dedicated and legacy Iteration 13 regressions.

### Top-Heavy Parity Sudoku

Every vertically adjacent same-parity pair obeys the required top-heavy ordering. Generation is deterministic, seed-diverse, uniquely solvable under the variant, and variant-essential against classic Sudoku. Difficulty is clue-ordered and backed by measured variant-aware search statistics. Runtime enforcement, rendering, and note cleanup hooks are covered by the dedicated and legacy Iteration 13 regressions.

Both games are therefore closed at 10/10 post-hardening quality.
