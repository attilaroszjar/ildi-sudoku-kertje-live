# 12x12 Sudoku rotation hardening

## Status

Rotation correctness: **CLOSED / PASS**.

Standalone release artifacts still need regeneration after the modular-source change; that artifact refresh does not alter the correctness result below.

## Defect

The 12x12 Sudoku uses 3x4 boxes. The Sudoku library visually rotates ordinary generated boards by 0, 90, 180, or 270 degrees.

A 90-degree or 270-degree rotation transposes the 3x4 box partition to 4x3 while the runtime still validates the displayed puzzle as 3x4. The original generator therefore produced correct 12x12 Sudokus that became invalid after quarter-turn display transformation.

Measured baseline:

- generated samples: 48
- rotation checks: 192
- valid rotations: 96/192
- exact unique rotations: 96/192
- givens matched rotated solution: 192/192
- deterministic generation: 48/48
- failures: 192
- runtime: PASS
- `SUDOKU12_ROTATION_BASELINE_GATE:FAIL`

The exact 50% split confirms that 0/180-degree states were valid while 90/270-degree states broke rectangular-box geometry.

## Fix

`games/iteration5-generator-hardening.js` now owns a dedicated rotation-safe 12x12 path.

The generator:

1. starts from a 12x12 complete solution valid under both 3x4 and transposed 4x3 box partitions;
2. applies deterministic seeded digit permutation;
3. preserves the existing difficulty-specific clue target by reading the canonical large-grid generator result;
4. removes clues in seeded order;
5. after every removal requires exact uniqueness for all four display rotations under the canonical 3x4 solver;
6. emits `rotationSafe:true` and `rotation-safe-solver-verified` metadata;
7. retains large-grid MRV search statistics and difficulty score metadata.

The display layer therefore does not need a special-case restriction: 0, 90, 180 and 270 degree visual rotations remain available without changing Sudoku rules.

## Regression audit

Canonical command:

```bash
node scripts/sudoku12-rotation-baseline-audit.mjs
```

Post-fix result, same 48 generated samples / 192 rotation checks:

- solution diversity: 16
- puzzle diversity: 48
- valid rotations: 192/192
- exact unique rotations: 192/192
- givens matched rotated solution: 192/192
- deterministic generation: 48/48
- failures: 0
- gentle runtime p50 14.9 ms, p95/max 25.7 ms
- focused runtime p50 35.4 ms, p95/max 54.9 ms
- expert runtime p50 65.5 ms, p95/max 88.5 ms
- `SUDOKU12_ROTATION_CORRECTNESS:PASS`
- `SUDOKU12_ROTATION_RUNTIME:PASS`
- `SUDOKU12_ROTATION_BASELINE_GATE:PASS`

## Closure

The rectangular-box rotation correctness defect is fixed for both affected standard Sudoku sizes:

- Mini 6x6 / 2x3: rotation-safe generator and 768/768 rotated states PASS;
- Sudoku 12x12 / 3x4: rotation-safe generator and 192/192 rotated states PASS.

The remaining repository release failure observed immediately after the 12x12 fix was only:

`FAIL: standalone HTML is stale relative to modular source`

Therefore the final repository closure step is to regenerate the standalone HTML artifacts and rerun `npm run test:release`.
