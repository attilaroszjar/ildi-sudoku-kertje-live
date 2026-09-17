# Brutal search server foundation

Phase A implements persistent search-space control. Phase B adds the bounded Classic candidate pipeline, its compact persistent corpus, and bounded pilot instrumentation. The worker remains fail-closed until explicitly enabled.

## Database

Canonical database: `ildi_sudoku_research` on the host PostgreSQL cluster at `127.0.0.1:5433`.

Use the dedicated `ildi_sudoku_worker` login role. Credentials stay outside the repository in:

`/home/daniel/infra/env/ildi-sudoku-brutal.env`

Apply migrations in lexical order.

The hot-loop invariant is coverage-first: completed seed ranges are represented by shard checkpoints and ordinary rejected puzzles are not stored as full records.

## Phase A operational defaults

- one process/worker;
- transactional shard claims using `FOR UPDATE SKIP LOCKED`;
- stale leases are reclaimable only after expiry;
- checkpoint after every bounded batch;
- no large search until bounded-pilot instrumentation and server resource gates are complete.

## Phase B pipeline

The Classic Brutal pipeline is deliberately ordered from cheapest to most expensive work:

1. deterministic Expert-source generation;
2. cheap structural validation/clue window;
3. stable puzzle fingerprint;
4. persistent duplicate gate;
5. exact uniqueness;
6. bounded 200-step human prescreen;
7. bounded 10,000-step full Classic Human audit;
8. Brutal-band qualification;
9. sparse accepted-record materialization.

The prescreen keeps incomplete/stalled solves eligible for the full audit because a harder solver configuration may still complete them. For solves that already finish within the 200-step prescreen, only scores at or above 220 advance to the full audit. This floor was selected from the bounded near-miss pilot: the Expert-source distribution produced two accepted Brutals in seeds 50..99 and two additional near-misses at scores 239 and 236, while lower Expert survivors were materially farther from the 240 Brutal boundary. The floor is therefore a cost filter, not a change to the canonical rater or Brutal threshold.

`corpus.classic_fingerprints` is the compact dedup index. It stores only domain/fingerprint plus campaign+seed ownership, not puzzle payloads or rejection traces. Ownership is restart-safe: replaying the same campaign+seed claim succeeds, while a different seed claiming the same fingerprint is a duplicate.

`corpus.classic_brutal_records` stores only candidates that pass the full Brutal audit. Materialization is idempotent by campaign+seed and requires the fingerprint claim to belong to the same seed.

The pipeline uses the worker's existing PostgreSQL store rather than opening a second pool, preserving the Phase A maximum of two database connections.

The Phase B SQL gate runs inside a transaction and rolls back. It verifies first claim, same-seed replay, cross-seed duplicate rejection, first accepted materialization, and idempotent materialization replay without leaving test corpus rows behind.

## Bounded pilot

The first pilot remains manually invoked. It does not enable or start the systemd worker.

Default hard caps:

- at most 500 searched seeds total;
- at most 10 batches;
- pilot batch size may not exceed 100 seeds;
- at most 120 seconds total elapsed time;
- stop if a batch exceeds 30 seconds;
- stop if one-minute load per CPU reaches 0.75;
- stop if free memory falls below 1024 MiB;
- stop if estimated fingerprint writes exceed 1.10 per searched seed.

The pilot reports stage-yield funnel, batch and aggregate throughput, batch latency, load/RSS/free-memory samples, estimated fingerprint/materialization/checkpoint writes, and the exact stop reason. Accepted-record materialization and checkpoint writes are measured separately and do not trigger the fingerprint write-rate gate. Instrumentation remains in memory during the run so the measurement layer does not add its own hot-loop database write stream.

The pilot runner also requires each processed batch to advance exactly to the requested bounded end seed. Any non-exact checkpoint fails closed.

## Near-miss evidence

The diagnostic slice stores no rejected full records or rejected traces. It keeps bounded aggregate metrics and a tiny nearest-sample set only.

Observed across seeds 50..99:

- 50 searched total;
- 2 accepted Brutals (~4% per seed);
- 2 additional near-misses at 239 and 236;
- no duplicates or non-unique candidates;
- accepted / near-threshold candidates require advanced techniques rather than server-preferred shortcuts;
- server capacity remained far from the bottleneck.

This evidence supports retaining Expert-source generation. The immediate optimization is prescreen selectivity, not generator replacement, source-band replacement, mutation, parallel workers, or a broad sweep.

## Safety

The installed systemd service must remain `disabled` and `inactive` during Phase B development. No large seed range, parallel worker, CPU quota increase, or automatic worker enablement is authorized until bounded-pilot measurements are reviewed.
