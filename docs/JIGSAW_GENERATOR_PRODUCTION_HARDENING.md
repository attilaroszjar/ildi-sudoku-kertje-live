# Jigsaw Sudoku generator production hardening

## Status

`PRODUCTION_QUALITY`.

The dedicated production gate passed and the hardened generator is activated in runtime after the legacy iteration-4 layer. The canonical generator inventory now treats Jigsaw as production quality.

## Legacy defect confirmed

The legacy Jigsaw path in `games/iteration4-generator-hardening.js` reused the bank-owned `variant.solution` and `variant.data.regions`. Its necessity check also used a Latin row/column baseline rather than the real Classic Sudoku baseline with 3x3 boxes.

Measured legacy baseline, 96 samples:

- solution diversity: 1
- structural solution diversity: 1
- region topology diversity: 1
- puzzle diversity: 96
- exact Jigsaw uniqueness: 96/96
- true Classic-ambiguity / variant necessity: 64/96
- deterministic replay: 96/96
- runtime: PASS

The old generator was therefore structurally narrow and incorrectly permissive about variant necessity.

## Production implementation

`games/jigsaw-generator-hardening.js` uses:

1. fresh seeded 9x9 solutions;
2. seeded irregular-region boundary swaps;
3. exactly nine connected regions of nine cells;
4. 1-9 exactly once per generated irregular region;
5. exact Jigsaw uniqueness during carving;
6. real Classic `countSolutions(...) > 1` necessity;
7. deterministic bounded retries;
8. difficulty-specific clue targets.

## Candidate baseline

The 96-sample candidate audit passed:

- solution diversity: 32
- structural solution diversity: 32
- topology diversity: 32
- puzzle diversity: 96
- valid: 96/96
- exact unique: 96/96
- variant essential: 96/96
- deterministic: 96/96
- failures: 0
- runtime p95: gentle 41.4 ms, focused 32.9 ms, expert 24.7 ms

## Production promotion gate

The independent production gate used 96 seeds across gentle, focused, and expert: 288 generated samples total.

Result:

- solution diversity: 96
- structural solution diversity: 96
- topology diversity: 96
- puzzle diversity: 288
- valid: 288/288
- exact Jigsaw unique: 288/288
- variant essential against real Classic Sudoku: 288/288
- deterministic replay: 288/288
- failures: 0
- gentle clues: 40..40; p95 36.8 ms; max 73.6 ms
- focused clues: 32..32; p95 22.5 ms; max 235.7 ms
- expert clues: 27..27; p95 40.7 ms; max 71.0 ms
- correctness: PASS
- diversity: PASS
- runtime: PASS
- difficulty ordering: PASS
- `JIGSAW_PRODUCTION_GATE:PASS`

## Mandatory production contract

Jigsaw production status requires:

1. valid solution under row, column, and irregular-region rules;
2. exact uniqueness under Jigsaw rules;
3. non-uniqueness under Classic Sudoku rules;
4. deterministic same-seed replay;
5. genuine solution diversity;
6. structural solution diversity beyond digit relabelling / board symmetry;
7. irregular-region topology diversity;
8. puzzle diversity;
9. ordered gentle/focused/expert clue bands;
10. bounded production-safe runtime and retry behaviour.

All ten requirements are satisfied by the promotion gate above.

## Canonical audits

```bash
node scripts/jigsaw-generator-baseline-audit.mjs
node scripts/jigsaw-generator-production-audit.mjs
node scripts/sudoku-generator-inventory.mjs
npm run test:release
```

## Closure

Jigsaw is runtime-wired and promoted to `PRODUCTION_QUALITY`. The remaining release work is repository-wide validation plus standalone regeneration; those artifacts do not alter the Jigsaw production contract.
