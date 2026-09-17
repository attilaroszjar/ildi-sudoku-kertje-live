# Classic Sudoku difficulty calibration — empirical findings

Status: provisional calibration evidence, not a production difficulty contract.

## Legacy-generator measurement

Controlled legacy-generator sample: 24 unique Classic Sudoku puzzles, using eight deterministic seeds for each legacy source band (`gentle`, `focused`, `expert`). All 24 were solved logically by the Classic Human Solver.

After provisional score formula v2, observed human-rating distribution:

| Legacy source band | Sample | Human Gentle | Human Focused | Human Expert | Advanced puzzles |
| --- | ---: | ---: | ---: | ---: | ---: |
| gentle | 8 | 8 | 0 | 0 | 0 |
| focused | 8 | 6 | 1 | 1 | 1 |
| expert | 8 | 2 | 5 | 1 | 1 |

Overall: 16/24 rated `gentle`, 6/24 `focused`, 2/24 `expert`. The two Expert examples both required `w-wing`. The legacy labels remain provenance only and are not treated as ground truth.

## Technique-anchor ladder

Synthetic technique anchors are explicitly marked `SYNTHETIC_TECHNIQUE_ANCHOR_NOT_PUZZLE_CORPUS`. They are used only to test formula monotonicity and qualitative tier separation, not as puzzle evidence.

Current v2 qualitative ladder:

- singles → Gentle
- subset / X-Wing → Focused
- W-Wing / AIC / ALS → Expert
- forcing / nested forcing → Brutal

The anchor ladder is monotonic under the current provisional formula.

## Extreme curated benchmarks

Two full, unique, externally published extreme puzzles are retained as curated coverage benchmarks:

- Arto Inkala 2012
- AI Escargot 2006

An earlier AIC soundness bug was exposed by these puzzles: even-length discontinuity loops were incorrectly accepted as single-discontinuity Nice Loops. After hardening AIC to require the correct odd-cycle parity, exact replay no longer finds unsound deductions.

After the fix, both puzzles stall cleanly rather than becoming invalid.

### Coverage probes

At the true stalled states, bounded maximum probes found no deduction from:

- AIC / Grouped AIC
- ALS-XZ / ALS-XY-Wing / ALS-Chain
- cell Forcing Chain / Forcing Net
- Dynamic Forcing Chain
- Nested Forcing Chain
- bounded house/digit forcing over bi-location and tri-location seeds
- bounded classic Death Blossom

Seed inventory showed why simple cell forcing is a poor fit for these states:

- Inkala: 60 unsolved cells, only 1 bivalue cell, but 13 bilocation links and 50 trilocation units.
- AI Escargot: 57 unsolved cells after one Hidden Single, only 2 bivalue cells, but 20 bilocation links and 57 trilocation units.

A bounded contradiction-proof diagnostic (depth <= 4, node budget 512) failed to prove the sampled false candidates on both puzzles before exhausting the node budget. This is evidence that these benchmark openings require materially deeper or more generalized analysis than the normal bounded client solver should perform.

## Product boundary for incomplete solves

A difficulty band is valid only for `SOLVED_LOGICALLY` traces.

`STALLED` and `INVALID` traces are now explicitly unclassified:

- `score = null`
- `band = null`
- `scoreStatus = UNRATED_INCOMPLETE`
- `rawScore` remains available strictly as partial-trace diagnostic data

This prevents an extreme puzzle from appearing as `gentle` merely because the bounded human solver stalls before it can observe the techniques that determine its true difficulty.

## Calibration and generation policy

- Keep completed ratings at `scoreStatus = PROVISIONAL_UNCALIBRATED` until the curated benchmark spans the practical target range sufficiently well.
- Never tune thresholds merely to reproduce legacy clue-count labels.
- Technique ceiling remains the primary qualitative signal; workload/dependency are within-tier modifiers.
- Only logically completed traces may enter a rated difficulty pool.
- Pool acceptance path: generate candidate → exact uniqueness verification → bounded human solve → completed rating → target-band acceptance.
- If bounded human solve stalls, the candidate is rejected from Gentle/Focused/Expert runtime generation and may be routed to offline/server deep analysis.
- Brutal content should preferentially be pregenerated and classified offline/server-side rather than forcing the browser to reproduce deep generalized search.
- The normal client solver remains deterministic, bounded and no-guess. Deep analysis is a separate server/offline concern and must not silently weaken that invariant.

## Performance finding

The priority short-circuit optimization reduced the three-puzzle representative audit from roughly 324 seconds wall time to 153 ms while preserving score/band/trace results. The 24-puzzle distribution audit completed in 243–362 ms wall time in validation runs. This makes bounded empirical calibration practical while keeping deep extreme analysis out of the client path.
