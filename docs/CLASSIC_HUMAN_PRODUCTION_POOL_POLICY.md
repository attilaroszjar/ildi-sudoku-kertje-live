# Classic Human-Rated Production Pool Policy

Status: implementation baseline for `feature/classic-human-production-pools`.

## Purpose

Build the player-facing Classic Sudoku inventory from measured human difficulty, not legacy generator labels. The existing evaluator, batch, checkpoint, generator adapter, Gentle/Focused guided generator, Expert sculptor, and atomic persistence are treated as stable infrastructure.

## Non-goals

- No further generator tuning in this phase.
- No Brutal generation in this phase.
- No UI integration until production-sized pools pass audit.
- No unbounded search or brute-force pool filling.

## Acceptance truth

Every persisted production record must satisfy the existing accepted-record contract:

1. valid candidate;
2. exact unique solution;
3. bounded Classic Human solver returns `SOLVED_LOGICALLY`;
4. measured band equals target band;
5. record identity is bound to generator profile, solver version, and rater version;
6. duplicate puzzle/record identities are rejected by the existing pipeline.

## Pool-size policy

The first production target is deliberately modest and large enough to avoid obvious repetition while keeping the initial audit cheap:

| Band | Initial audited target | Expansion target | Rationale |
| --- | ---: | ---: | --- |
| Gentle | 48 | 96 | Cheap/high acceptance; enough for varied casual play. |
| Focused | 48 | 96 | Cheap/high acceptance; symmetric inventory with Gentle. |
| Expert | 24 | 48 | ~33% seed-level acceptance and materially higher runtime; pregenerate offline. |
| Brutal | 0 | separate research | Must not be inferred or folded into Expert. |

The expansion target is not authorized by reaching the initial count alone. Expansion requires the audit gates below to pass.

## Controlled fill stages

### Stage 0 — smoke slice

Run one bounded persisted chunk per supported band before any production-sized fill:

- Gentle: 12 attempts maximum.
- Focused: 12 attempts maximum.
- Expert: 12 attempts maximum.

This validates current-main reproducibility, persistence, identity, and observed acceptance after the PR #24 merge.

Observed Stage 0 baseline on the initial production branch:

- Gentle: 12/12 accepted, 0 duplicates, score 59..62, clue count 40, max clue-mask similarity 0.6543.
- Focused: 11/12 accepted, 0 duplicates, one `BAND_MISMATCH`, score 70..75, clue count 27..32, max clue-mask similarity 0.6667.
- Expert: 6/12 accepted, 0 duplicates, six `BAND_MISMATCH`, score 131..233, clue count 25..31, max clue-mask similarity 0.6790.

The Stage 0 Gentle sample also demonstrated that technique-signature concentration is not a valid hard diversity gate for low bands: all accepted Gentle puzzles legitimately used the same elementary technique family while their clue masks, hashes, and structural signatures remained distinct. Technique signature therefore remains diagnostic for Gentle/Focused and is a hard concentration gate only for Expert.

### Stage 1 — initial audited pools

Fill toward 48 Gentle / 48 Focused / 24 Expert using resumable chunks. Keep each invocation at or below the existing hard chunk cap. Stop as soon as the target accepted count is reached; do not spend a fixed large seed budget merely because it was allocated.

### Stage 2 — expansion

Only after Stage 1 audit passes, fill toward 96 / 96 / 48. Re-audit the combined pool, not only the newly added records.

## Measurement contract

For every stage and band record at least:

- attempted candidates;
- accepted count and acceptance rate;
- rejection counts by reason;
- duplicate count/rate;
- runtime distribution (minimum, median/p50, p95, maximum where sample size permits);
- human score distribution (minimum, median, p95, maximum);
- maximum-technique / technique-use distribution;
- clue-count distribution;
- puzzle-hash uniqueness;
- record-hash uniqueness.

Do not compare bands using legacy generator labels.

## Diversity audit

A production pool must not merely contain unique hashes. Audit structural variety using deterministic summaries that are cheap to compute:

- clue-count histogram;
- score histogram/buckets;
- highest-technique histogram;
- technique signature frequency;
- starting-clue row/column occupancy signatures;
- pairwise clue-mask duplication (exact mask duplicates must be zero);
- most-common clue-mask similarity, reported rather than solved with an expensive all-pairs search when the pool grows.

For Gentle and Focused, technique-signature frequency is diagnostic rather than a hard gate because elementary human-solving profiles naturally converge on the same small set of techniques. For Expert, technique-signature concentration remains a hard diversity gate because the pool is intended to provide materially varied advanced solving paths.

For the initial pool sizes, exact pairwise mask similarity is acceptable because the bounded pool is small. For future larger pools, replace it with indexed/signature-based candidate comparison before increasing scale.

## Initial audit gates

Stage 1 is acceptable only if all of the following hold:

- accepted records all replay as exact unique and `SOLVED_LOGICALLY` in their target band;
- puzzle hashes and record hashes are unique;
- duplicates observed by the batch remain <= 2% of attempts;
- Gentle and Focused acceptance each remain >= 80%;
- Expert acceptance remains >= 20%;
- no accepted Expert is measured Brutal or Focused;
- for Expert only, no single technique signature occupies more than 60% of the band once at least 12 Expert puzzles are accepted;
- no exact clue mask is repeated;
- runtime remains bounded by the existing generator/evaluator contracts, with regressions called out before expansion.

These are pool-quality gates, not difficulty-boundary definitions. Human band boundaries remain owned by the calibrated rater.

## Seed and checkpoint policy

- Each band owns a stable checkpoint file and non-overlapping seed namespace/range.
- Resume only through the existing checkpoint identity validation.
- Never edit `nextSeed`, counters, hashes, or accepted records by hand.
- Keep checkpoint files as build artifacts during measurement; promote only audited final pool data intended for runtime use.
- A failed/interrupted chunk is resumed from the atomic checkpoint, not restarted under a new identity.

## Runtime/product policy

Gentle and Focused may eventually be generated or replenished cheaply, but the first product integration should still consume audited measured pools for consistent difficulty. Expert is pregenerated by policy. Runtime fallback to the legacy difficulty label is forbidden once measured pools are wired into Classic selection.

## Brutal boundary

Brutal remains a separate research/pregeneration phase. A puzzle enters a future Brutal pool only when the bounded Classic Human solver actually solves it and the calibrated rater measures Brutal. `STALLED`, famous, curated, or reputedly difficult puzzles do not qualify by reputation.

## Next implementation slice

1. Validate the refined band-specific audit gate against the Stage 0 checkpoints.
2. Preserve the Stage 0 checkpoint artifacts until the policy-adjusted audit is confirmed.
3. If all three Stage 0 bands pass, proceed to the bounded Stage 1 fill toward 48 Gentle / 48 Focused / 24 Expert.
4. Re-audit the combined Stage 1 pools before any runtime integration or Stage 2 expansion.
