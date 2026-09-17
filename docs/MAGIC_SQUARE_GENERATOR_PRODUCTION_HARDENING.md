# Magic Square Sudoku generator production hardening

## Status

Inventory status: `PRODUCTION_QUALITY`.

Magic Square production hardening is complete. The fresh seeded generator is runtime-wired after the legacy iteration-4 wrapper and owns only the `magic-square` branch.

## Legacy baseline

The legacy bank reused one fixed complete Sudoku solution and one fixed centre 3x3 Lo Shu square. The iteration-4 hardening layer only carved givens from that fixed solution.

96-sample baseline:

- solution diversity: 1
- structural solution diversity: 1
- topology diversity: 1 (expected: the rule is fixed to the centre 3x3)
- puzzle diversity: 96
- valid: 96/96
- exact unique: 96/96
- variant essential: 96/96
- deterministic: 96/96
- failures: 0
- correctness: PASS
- diversity: FAIL
- runtime: PASS
- difficulty ordering: PASS
- `MAGIC_SQUARE_GENERATOR_BASELINE_GATE:FAIL`

The measured defect was generation diversity, not constraint correctness.

## Production design

`games/magic-square-generator-hardening.js`:

1. deterministically chooses a Lo Shu orientation for the centre 3x3 square;
2. seeds the centre box with that valid Lo Shu arrangement;
3. completes a fresh standard 9x9 Sudoku around it with seeded randomized backtracking;
4. uses difficulty-specific deterministic seed salts;
5. carves givens while preserving exact uniqueness under the Magic Square rule;
6. requires Classic Sudoku to remain ambiguous;
7. restores givens deterministically if variant-essential carving goes below the exact target;
8. returns exact clue targets of 40 / 32 / 27 for gentle / focused / expert.

Constraint-topology diversity is intentionally not required because the variant definition fixes the magic square to the centre 3x3 box. Production diversity is therefore proved through fresh solution, structural solution, and puzzle diversity.

## Candidate gate

96 samples, 32 per difficulty:

- solution diversity: 96
- structural solution diversity: 96
- puzzle diversity: 96
- valid / exact unique / variant essential / deterministic: 96/96 each
- failures: 0
- clue bands: exactly 40 / 32 / 27
- gentle runtime p50/p95/max: 49.1 / 130.4 / 190.7 ms
- focused runtime p50/p95/max: 51.3 / 96.5 / 98.7 ms
- expert runtime p50/p95/max: 88.6 / 484.1 / 669.7 ms
- `MAGIC_SQUARE_CANDIDATE_GATE:PASS`

## Production gate

The production audit uses 64 seeds per difficulty, 192 generated puzzles total.

Final wired result:

- solution diversity: 192
- structural solution diversity: 192
- puzzle diversity: 192
- valid: 192/192
- exact unique: 192/192
- variant essential: 192/192
- deterministic: 192/192
- failures: 0
- gentle clues: exactly 40
- focused clues: exactly 32
- expert clues: exactly 27
- gentle runtime p50/p95/max: 38.4 / 124.5 / 202.0 ms
- focused runtime p50/p95/max: 43.9 / 82.3 / 127.6 ms
- expert runtime p50/p95/max: 69.7 / 257.7 / 562.5 ms
- correctness: PASS
- diversity: PASS
- runtime: PASS
- difficulty ordering: PASS
- `MAGIC_SQUARE_PRODUCTION_GATE:PASS`

No runtime threshold was relaxed to obtain the pass.

## Production conclusion

Magic Square now satisfies the project production generator contract: valid puzzle, exact uniqueness under the full variant rule, mandatory special-constraint necessity, seeded determinism, fresh solution and structural diversity, puzzle diversity, exact clue-band ordering, and bounded runtime.
