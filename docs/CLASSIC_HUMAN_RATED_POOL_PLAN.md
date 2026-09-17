# Classic Sudoku human-rated pool pipeline

Status: implementation plan for post-calibration generation/pool phase.

## Current measured baseline

As of the rated-pool implementation branch:

- Gentle uses `classic-human-guided-v2`; 6/6 pilot acceptance, measured score range 59-68.
- Focused uses `classic-human-guided-v2`; 6/6 pilot acceptance, measured score range 70-73.
- Expert uses `classic-expert-sculpt-v4`; 12-seed confirmation accepted 4/12 (33.3%), returned no Brutal fallback, measured accepted ceiling <=238, runtime p50 about 134 ms and p95 about 822 ms on the validation host.
- Expert sculpting is bounded (`MAX_DEPTH=2`, `BEAM_WIDTH=2`, `CHILD_LIMIT=27`) and deterministic. Do not widen these limits merely to improve yield without a new measured audit.
- Filesystem persistence uses the checkpoint schema via atomic temporary-file + rename writes. A persisted chunk must resume from checkpoint `nextSeed`; identity mismatch must fail before overwrite.

The next gate after filesystem persistence validation is a small persisted multi-chunk pilot. Large pool population remains prohibited until the persisted replay/identity/canonical gates are green.

## Goal

Build deterministic, resumable Classic Sudoku generation batches whose outputs are accepted into product pools only after exact uniqueness verification and bounded human-solver rating.

## Acceptance pipeline

1. generate candidate from explicit generator profile + seed;
2. reject malformed/non-unique candidates using capped exact uniqueness verification;
3. solve with the bounded Classic Human Solver under the intended rating policy;
4. rate only `SOLVED_LOGICALLY` traces;
5. reject `STALLED` / `INVALID` candidates as `UNRATED_INCOMPLETE`;
6. accept only if the measured band matches the target pool;
7. persist reproducible metadata and trace identity.

Legacy `gentle/focused/expert` generator labels are provenance only and must never be used as acceptance truth.

## Pool record contract

Each accepted record should include at least:

- schema version
- puzzle string
- solution string
- exact uniqueness status
- target pool band
- measured score and band
- score status
- hardest technique
- technique and family histograms
- total steps, placements, eliminations, advanced steps
- workload and dependency metrics
- uniqueness/server-preferred/server-only usage
- generator profile and deterministic seed
- solver/rater version
- trace hash
- generated/verified timestamps only when reproducibility does not depend on them

## Cost policy

- Gentle / Focused: allow cheap runtime generation only if measured latency remains comfortably bounded.
- Expert: prefer batch pregeneration once advanced-technique acceptance causes high rejection ratios.
- Brutal: use server/offline pregeneration. Do not attempt unbounded client search.
- Never increase runtime search depth merely to force an arbitrary target-band yield.

## Batch execution

Batches must be deterministic, bounded, incremental and resumable.

- explicit seed ranges
- configurable attempt budget per target band
- checkpoint after each accepted/rejected candidate or small bounded chunk
- deduplicate by puzzle string and stable hash
- cache uniqueness/solve/rating results by puzzle + solver/rater version
- emit minimal aggregate audit output rather than per-attempt logs by default

## Required audits before UI integration

- determinism/replay audit
- uniqueness audit
- target-band purity
- rejection-reason distribution
- duplicate rate
- runtime p50/p95/max
- solver/rater version drift
- trace-hash stability
- pool-size coverage
- false-difficulty audit on sampled records

## Brutal boundary

The merged calibration baseline established that Arto Inkala 2012 and AI Escargot remain `STALLED` under bounded A-G solving and therefore correctly return `score:null`, `band:null`, `UNRATED_INCOMPLETE`. The depth<=4 / 512-node diagnostic also found no shallow contradiction proof.

Therefore the initial product Brutal pool must contain only puzzles that the bounded human solver can actually solve and rate as Brutal. Harder external benchmarks belong to a separate server/offline deep-analysis research path and must not be smuggled into product pools under guessed labels.

## Implementation order

1. pool record normalizer + stable hash contract;
2. single-candidate evaluator with uniqueness/solve/rating rejection reasons;
3. deterministic bounded batch runner;
4. incremental persistence/checkpoint format;
5. distribution/performance audit;
6. measured Gentle/Focused/Expert pool generation;
7. bounded Brutal candidate source/pregeneration;
8. only then wire Classic game selection/UI to measured pools.
