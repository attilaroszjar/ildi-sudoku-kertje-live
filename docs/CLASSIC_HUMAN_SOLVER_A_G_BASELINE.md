# Classic Human Solver A–G Baseline

Status: canonical implementation baseline
Scope: Classic 9x9 Sudoku human solver
Branch baseline: `feature/classic-human-solver-contracts`
Baseline commit before this document: `23ffaa84340ccab45fa5fa983e6c3aae763f8643`

## 1. Implementation status

The Classic Human Solver recognizer/solver engine is complete through phases A–G.

- Phase A — core/direct logic: complete
- Phase B — subsets + fish: complete
- Phase C — single-digit patterns, wings, coloring, uniqueness: complete
- Phase D — implication graph, X/XY chains, AIC, Nice Loop, Grouped AIC: complete
- Phase E — ALS inventory, ALS-XZ, ALS-XY-Wing, ALS-Chain: complete
- Phase F — bounded Forcing Chain + Forcing Net: complete
- Phase G — bounded Dynamic Forcing Chain + Nested Forcing Chain: complete

Do not redesign or rebuild the solver architecture before the rating/calibration phase.

## 2. Core invariants

- deterministic deduction ordering
- normalized deduction contract
- normal human solve never guesses
- solver terminal statuses: `SOLVED_LOGICALLY`, `STALLED`, `INVALID`
- `guessRequired:false` invariant for human solving
- exact uniqueness verification remains logically separate from human difficulty
- all expensive graph/ALS/forcing searches are bounded and deterministic
- no unbounded DFS/BFS or exhaustive runtime recognizer search

## 3. Execution policies

Three independent opt-in policy layers exist above default techniques.

### Uniqueness

Requires:

`allowUniqueness:true`

Examples:
- Unique Rectangle Type 1
- Unique Loop
- BUG+1

The solve result records `usesUniquenessAssumption` when such a deduction was actually used.

### Server preferred

Requires:

`allowServerPreferred:true`

Includes:
- forcing-chain
- forcing-net

These are excluded from normal/default client solving.

### Server only

Requires:

`allowServerOnly:true`

Includes:
- dynamic-forcing-chain
- nested-forcing-chain

`allowServerPreferred:true` does not enable server-only techniques. Explicit technique selection also must not bypass the policy gate.

## 4. Canonical solver audit

Canonical command:

```bash
npm run test:classic-human
```

Implementation:

`scripts/classic-human-audit.mjs`

The audit dynamically discovers `classic-human-*.test.js` files and separately measures the expensive forcing subset.

Accepted baseline from 2026-09-06 Linux validation:

```text
CLASSIC_HUMAN_AUDIT A_G_FULL PASS tests=34 elapsed_ms=1484.2 limit_ms=10000
CLASSIC_HUMAN_AUDIT EXPENSIVE PASS tests=8 elapsed_ms=278.1 limit_ms=5000
CLASSIC_HUMAN_AUDIT PASS total_files=34 expensive_files=8
```

Observed wall clock: approximately 1.99 s.

The performance headroom is intentionally large. Preserve that property when adding rating/calibration work.

## 5. Known hardening already applied

- Naked subset false positives that would empty a candidate set are rejected.
- Simple Coloring wrap eliminations were corrected.
- BUG+1 validates the BUG structure globally across all 27 houses.
- Unique Loop search is bounded after earlier combinatorial/performance issues.
- ALS fixtures cannot reintroduce candidates already removed from the current mask.
- ALS RCC contracts and near-miss fixtures were hardened against hidden common peers.
- Forcing positive fixtures use actually demonstrated contradiction structures.
- Nested/dynamic forcing uses hard work, propagation, candidate and seed budgets.

## 6. Difficulty architecture boundary

Technique `priority` is solver execution ordering metadata. It is not the final puzzle difficulty score.

The next rating layer must derive puzzle difficulty from the complete deterministic solve trace, including at least:

- hardest technique
- max technique priority
- total deduction count
- placements
- eliminations
- technique distribution
- advanced step count
- chain/path complexity
- workload
- bottlenecks
- dependency depth
- uniqueness usage
- server-preferred usage
- server-only usage
- solve completeness

The scalar score must combine ceiling, workload, diversity, bottlenecks/dependency and chain complexity. Do not fall back to clue count or generator input difficulty.

## 7. Provisional product bands

Initial calibration targets:

- Gentle: 0–69
- Focused: 70–159
- Expert: 160–259
- Brutal: 260+

These thresholds are provisional only and must remain adjustable until corpus calibration demonstrates stable separation.

## 8. Next development sequence

1. merge the A–G solver baseline only after canonical solver and release gates are green;
2. create a new feature branch for the Difficulty Rating Engine;
3. implement deterministic trace-derived raw metrics before tuning a scalar score;
4. build/curate a controlled Classic Sudoku calibration corpus;
5. run uniqueness, human-solve, rating, distribution, runtime, false-difficulty and stalled-puzzle audits;
6. integrate generation/puzzle pools only after calibration;
7. wire the Classic Sudoku game UI/hints to the human solver/rater only after the generation/rating contract is stable.

## 9. Generation / pool strategy

Prefer staged cost escalation and precomputation over client-side brute force.

- Gentle / Focused: runtime generation may remain acceptable if cheap.
- Expert: choose runtime versus pregenerated pool from measured performance.
- Brutal: strongly prefer server-side pregenerated, uniqueness-verified, human-rated pools.

Recommended pool metadata:

- puzzle string
- solution
- uniqueness status
- rating score
- difficulty band
- hardest technique
- technique histogram
- workload metrics
- generation seed
- solver/rater version
- trace hash and/or stored trace metadata

The offline app should select quickly from already classified puzzles instead of recomputing expensive Brutal analysis in the browser.

## 10. Performance rule

All future benchmarks, corpus audits and generation jobs must be designed for runtime and resource efficiency as well as correctness. Prefer deterministic pruning, indexed/cached relations, bounded search, incremental processing, resumable batches and server-side pregeneration when runtime work would otherwise become combinatorial.
