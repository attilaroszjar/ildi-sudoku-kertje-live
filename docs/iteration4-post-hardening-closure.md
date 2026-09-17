# Iteration 4 post-hardening closure

Status: **CLOSED / 10/10**

Canonical batch:

- Miracle Sudoku
- Magic Square Sudoku
- Asterisk Sudoku
- Argyle Sudoku
- Jigsaw / Irregular Sudoku

## Findings resolved

1. **Magic Square Sudoku** did not have a dedicated constraint-aware generator path. It now uses an MRV solver that validates the Lo Shu centre-square sums during generation and proves variant-essential uniqueness.
2. **Argyle Sudoku** did not have a dedicated line all-different generator path. It now uses a constraint-aware MRV solver and proves that the Argyle lines are required for uniqueness.
3. **Asterisk Sudoku** originally constructed its extra region from the first occurrence of each digit in the Classic solution, which collapsed to a normal Sudoku row and therefore made the extra rule redundant. The topology is now a genuine nine-cell extra region spanning distinct rows and columns.
4. **Miracle Sudoku** and **Asterisk Sudoku** now use explicit variant-aware essentiality hardening instead of relying only on generic generation metadata.
5. **Jigsaw / Irregular Sudoku** now proves uniqueness under the irregular regions and separately proves that those regions are essential over a row/column Latin baseline.
6. Difficulty generation was stabilized so Gentle / Focused / Expert derive from a common seed-specific essential core and therefore preserve monotonic clue ordering without sacrificing variant essentiality.

## Regression evidence

Targeted Iteration 4 gate on commit `6d7e424`:

- tests: 11
- pass: 11
- fail: 0

Covered properties:

- solver-certified uniqueness
- genuine variant essentiality
- Miracle anti-knight / anti-king / non-consecutive contract
- Magic Square Lo Shu contract
- Asterisk extra-region uniqueness
- Argyle line uniqueness
- Jigsaw connected nine-cell irregular-region contract
- deterministic generation
- seed diversity
- Gentle >= Focused >= Expert clue ordering

Full project regression after the targeted gate:

- tests: 448
- pass: 448
- fail: 0

Release gate:

- `RELEASE GATE: PASS`
- catalogue: 106
- external runtime dependencies: 0
- standalone SHA-256: `d59f521124144a405e52fa968fab744ef62e6ff0884f01f53554696b48d1f618`

## Relevant hardening commits

- `94b2cf6` - Iteration 4 post-hardening regressions
- `7864170` - initial Magic Square / Argyle / Jigsaw hardening
- `0e2120a` - runtime hardening loader integration
- `93bfd5c` - repair Asterisk extra-region topology
- `7df2fc0` - explicit Iteration 4 variant-essential generation
- `6d7e424` - stabilize difficulty clue ordering

The five games in this batch have no known open source, generation, solver, or release finding after the above gates.
