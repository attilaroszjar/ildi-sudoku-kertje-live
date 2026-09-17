# Asterisk Sudoku generator production hardening

## Status

Inventory status: `PRODUCTION_QUALITY`.

Asterisk production hardening is complete. The fresh-solution / fresh-topology generator is runtime-wired in `index.html` after the legacy iteration-4 wrapper so it owns only the `asterisk` generation path.

## Legacy baseline

The legacy Asterisk entry in `sudoku-bank-iteration4.js` reused the Classic bank solution and one fixed set of nine marked cells. The iteration-4 hardening layer only carved givens from that fixed structure.

Measured 96-sample baseline:

- solution diversity: 1
- structural solution diversity: 1
- topology diversity: 1
- puzzle diversity: 96
- valid: 96/96
- exact unique: 96/96
- variant essential: 96/96
- deterministic: 96/96
- failures: 0
- gentle: 40 clues; p95 621.6 ms; max 1035.2 ms
- focused: 32 clues; p95 495.2 ms; max 1039.0 ms
- expert: 27 clues; p95 592.1 ms; max 798.4 ms
- correctness: PASS
- diversity: FAIL
- runtime: FAIL
- difficulty ordering: PASS
- `ASTERISK_GENERATOR_BASELINE_GATE:FAIL`

The old generator was logically sound but structurally narrow and had an unacceptable runtime tail.

## Production design

`games/asterisk-generator-hardening.js` reuses the audited `ExtraHouseGeneratorCore`. For every seeded puzzle it:

1. deterministically generates a fresh nine-cell Asterisk topology;
2. uses a row/column/box transversal: exactly one marked cell in each row, each column, and each standard 3x3 box;
3. generates a fresh solution while treating those nine cells as an extra house, guaranteeing digits 1-9 exactly once there;
4. uses distinct deterministic seed salts for gentle/focused/expert;
5. preserves exact uniqueness under the Asterisk rule;
6. requires Classic Sudoku to remain ambiguous;
7. restores givens deterministically when variant-essential carving goes below the exact difficulty target;
8. produces exact clue targets of 40 / 32 / 27;
9. remains bounded by deterministic solution-generation limits.

This topology contract avoids wasting marked-cell pairs that are already forced different by sharing a Classic row, column, or box.

## Candidate gate

The corrected 96-sample candidate gate passed all dimensions:

- solution / structural / topology / puzzle diversity: 96 / 96 / 96 / 96
- valid / exact unique / variant essential / deterministic: 96 / 96 / 96 / 96
- failures: 0
- exact clue bands: 40 / 32 / 27
- runtime p95: 31.4 / 46.1 / 68.7 ms
- runtime max: 72.9 / 46.1 / 78.6 ms
- correctness: PASS
- diversity: PASS
- runtime: PASS
- difficulty ordering: PASS
- `ASTERISK_CANDIDATE_GATE:PASS`

## Production gate

The runtime-wired production implementation was audited over 96 seeds per difficulty, 288 generated puzzles total:

- solution diversity: 288
- structural solution diversity: 288
- topology diversity: 287
- puzzle diversity: 288
- valid: 288/288
- exact unique: 288/288
- variant essential: 288/288
- deterministic: 288/288
- failures: 0
- gentle: 40 clues; p95 46.0 ms; max 119.5 ms
- focused: 32 clues; p95 29.0 ms; max 43.0 ms
- expert: 27 clues; p95 56.7 ms; max 192.0 ms
- correctness: PASS
- diversity: PASS
- runtime: PASS
- difficulty ordering: PASS
- `ASTERISK_PRODUCTION_GATE:PASS`

## Production contract

The promoted generator therefore proves:

- valid 9x9 Sudoku solutions;
- nine marked Asterisk cells containing 1-9 exactly once;
- exact uniqueness under Asterisk rules;
- non-uniqueness as Classic Sudoku;
- fresh seeded solution and structural diversity;
- fresh marked-cell topology diversity;
- puzzle diversity;
- deterministic same-seed replay;
- bounded production-safe runtime;
- strictly separated exact difficulty clue bands.

Promotion is recorded in `scripts/sudoku-generator-inventory.mjs`.
