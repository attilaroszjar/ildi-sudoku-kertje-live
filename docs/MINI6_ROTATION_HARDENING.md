# Mini Sudoku 6x6 rotation hardening

## Status

Closed: `MINI6_ROTATION_GATE:PASS` and repository release gate PASS.

## Defect

The Mini 6x6 variant uses standard 2x3 boxes. Generation itself used the correct 2x3 geometry, but the Sudoku library rotates ordinary generated boards by 0, 90, 180, or 270 degrees for visual diversity.

A 90-degree or 270-degree rotation exchanges a 2x3 box partition with a 3x2 partition. The runtime conflict checker still interprets the displayed board as 2x3. Therefore a valid generated Mini Sudoku could become invalid after display transformation and could show conflicting givens immediately.

This was a correctness defect, not a styling defect.

## Fix

`games/iteration5-generator-hardening.js` owns a dedicated Mini 6x6 path.

The generator:

1. starts from a 6x6 solution valid under both 2x3 and transposed 3x2 region partitions;
2. applies deterministic seeded digit permutation;
3. removes clues in seeded order;
4. after every removal checks exact uniqueness for all four rotations using the canonical 2x3 solver;
5. accepts only a puzzle for which 0, 90, 180 and 270 degree display rotations remain valid and exactly unique;
6. uses bounded clue targets: gentle 28, focused 24, expert 20.

Generation metadata marks the result as `rotation-safe-solver-verified` and `rotationSafe:true`.

## Regression gate result

Command:

```bash
node scripts/mini6-rotation-audit.mjs
```

Measured result:

- generated puzzles: 192/192
- rotated states checked: 768
- valid rotations: 768/768
- exact-unique rotations: 768/768
- givens match rotated solution: 768/768
- deterministic replay: 192/192
- failures: 0
- solution diversity: 62
- puzzle diversity: 192
- gentle: 28 clues, p95 2.0 ms, max 3.2 ms
- focused: 24 clues, p95 3.1 ms, max 6.3 ms
- expert: 20 clues, p95 5.3 ms, max 12.5 ms
- correctness: PASS
- difficulty ordering: PASS
- diversity: PASS
- runtime: PASS
- `MINI6_ROTATION_GATE:PASS`

Repository-wide release validation also passed with catalogue 106 and zero external runtime dependencies.

## Related risk

Rectangular-box Sudokus require care whenever a display transformation changes box orientation. The Mini 6x6 defect is closed. The 12x12 3x4 variant remains a separate risk and is audited independently before any production-quality claim under 90-degree display rotation.
