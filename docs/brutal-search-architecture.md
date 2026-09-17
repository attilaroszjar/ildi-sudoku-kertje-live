# Brutal Sudoku Search Architecture

Status: canonical implementation plan for the server-side Brutal direction.

This document is intentionally LLM-oriented. It is the source of truth for implementing the first server-side Brutal search pipeline. Do not replace it with an ad-hoc generator loop.

## 1. Goal

Build a persistent, deterministic, low-priority server-side search system that can spend hours or days discovering genuinely hard Sudoku puzzles without affecting the Bridge services that are the primary workload of the Linux server.

The first pilot is Classic Sudoku only.

Pilot success target:

- collect **10 accepted Brutal Classic Sudoku puzzles**;
- every accepted puzzle is exactly unique;
- every accepted puzzle has a reproducible human-solver audit;
- every accepted puzzle passes the Brutal qualification policy;
- the search can stop automatically when the target of 10 is reached;
- the search can resume after reboot or interruption without repeating completed search space;
- the database remains compact and does **not** materialize millions of rejected puzzles;
- Bridge remains operationally dominant at all times.

The server search system is a research/production facility. The offline game must not query PostgreSQL at runtime.

Canonical flow:

`deterministic seed space -> cheap filters -> exact uniqueness -> human prescreen -> full human audit -> Brutal qualification -> diversity filter -> PostgreSQL corpus -> versioned JSON export -> offline game`

## 2. Architectural principles

### 2.1 Bridge-first resource policy

Sudoku search is always background work. Bridge has priority.

The worker must be safe to leave running continuously, but it must operate at low CPU, I/O, and scheduling priority. It must never assume exclusive access to the host.

Required principles:

- low scheduler priority (`nice`);
- best-effort/idle I/O scheduling where supported (`ionice`);
- explicit CPU quota via systemd/cgroup;
- explicit memory ceiling;
- bounded worker concurrency;
- bounded batch size;
- deliberate sleep/yield between batches;
- database connection pool kept very small;
- no full-table scans in the hot loop;
- no uncontrolled parallelism based on detected CPU count;
- automatic backoff or pause under server pressure;
- graceful stop and exact resume.

The initial pilot should prefer slowness over interference. The goal is to make steady progress on "takarékláng", not maximize puzzles per second.

### 2.2 Coverage-first, sparse materialization

Do **not** store every rejected puzzle.

Store:

1. what deterministic search space has already been covered;
2. compact aggregate rejection statistics;
3. compact fingerprints only when they prevent expensive duplicate work;
4. full puzzle/audit records only for candidates that cross a meaningful quality threshold.

This prevents both repeated searching and an unrealistically large database.

### 2.3 Determinism and versioning

For a fixed tuple:

`generator_version + variant + seed_space_version + seed`

the generated candidate must be deterministic.

A material change to generation logic creates a new `generator_version` or `seed_space_version` and therefore a new campaign/search space. Old coverage remains valid historical evidence and is never silently reinterpreted.

Likewise, human-solver/rating changes are versioned. Re-auditing an existing puzzle creates a new audit record; it does not overwrite the old result.

### 2.4 Search target is explicit

Each campaign has a target accepted count. The first pilot target is 10.

A campaign automatically transitions to `TARGET_REACHED` when it has 10 qualified accepted Classic Brutal puzzles. Workers must stop claiming new shards for that campaign after the target is reached.

The target is a database property, not a shell-loop constant.

## 3. PostgreSQL layout

Use a **separate PostgreSQL database** dedicated to this system.

Proposed database name:

`ildi_sudoku_research`

Use a dedicated PostgreSQL role with access only to this database. It must have no privileges on Bridge databases.

Recommended schemas:

- `search` — campaigns, shard coverage, worker leases/runs, aggregate search telemetry;
- `corpus` — materialized puzzle candidates and canonical puzzle identity;
- `audit` — uniqueness and human-solver audits, technique traces, ratings;
- `calibration` — Ildi's real solve feedback;
- `production` — accepted pools and export membership.

The exact migrations may evolve, but schema separation is canonical.

## 4. Search campaign model

A campaign defines one immutable search experiment.

Suggested fields for `search.campaigns`:

- `id` UUID/identity;
- `name`;
- `variant` (pilot: `classic`);
- `target_band` (pilot: `brutal`);
- `target_count` (pilot: `10`);
- `generator_version`;
- `seed_space_version`;
- `solver_version`;
- `rating_model_version`;
- `policy_version`;
- `shard_size`;
- `status` (`READY`, `RUNNING`, `TARGET_REACHED`, `PAUSED`, `FAILED`, `COMPLETE`);
- `accepted_count` or a derived count with a cached value if needed;
- `created_at`, `started_at`, `finished_at`;
- configuration JSON for immutable secondary knobs.

Do not reuse a campaign when generator/solver/policy semantics change materially. Create a new campaign.

## 5. Sharded deterministic search space

The fundamental anti-repeat mechanism is **coverage of deterministic seed ranges**, not rows for rejected puzzles.

Suggested `search.shards` fields:

- `campaign_id`;
- `shard_id`;
- `seed_start` inclusive;
- `seed_end` exclusive;
- `next_seed`;
- `status` (`PENDING`, `LEASED`, `DONE`, `FAILED`);
- `lease_owner`;
- `lease_expires_at`;
- `attempt_count`;
- `searched_count`;
- aggregate reject counters;
- `candidate_count`;
- `accepted_count`;
- timestamps.

A completed 100,000-seed shard therefore consumes one coverage row, not 100,000 reject rows.

The worker advances `next_seed` transactionally in small batches. If the process dies, a later worker resumes from the last committed checkpoint.

Shard claiming should use PostgreSQL row locking, preferably a short transaction around `FOR UPDATE SKIP LOCKED`, so future multiple workers cannot process the same shard concurrently.

A stale lease must be recoverable after timeout.

## 6. Do not materialize ordinary rejects

For candidates rejected by cheap structural checks, clue policy, triviality heuristics, or ordinary non-qualification:

- increment shard/campaign counters;
- do not create a `corpus.puzzles` row;
- do not persist the puzzle grid;
- do not persist a solver trace.

Example aggregate counters:

- `generated_count`;
- `invalid_count`;
- `structural_reject_count`;
- `duplicate_count`;
- `non_unique_count`;
- `prescreen_reject_count`;
- `full_audit_count`;
- `brutal_reject_count`;
- `diversity_reject_count`;
- `accepted_count`.

This preserves search observability without database explosion.

## 7. Duplicate avoidance

Two distinct problems must remain separate.

### 7.1 Have we searched this seed space already?

Answer from `search.shards` coverage.

### 7.2 Have we seen this resulting puzzle before?

Answer from a compact puzzle fingerprint/hash cache.

Use a stable canonical puzzle hash. Store hashes in binary form if convenient (`bytea`) rather than verbose hex text.

A compact `corpus.seen_fingerprints` table may contain:

- search/generator domain identifier;
- canonical puzzle hash;
- first-seen campaign/seed;
- minimal classification code;
- optional canonical structural fingerprint.

Do not attach full puzzle JSON to ordinary fingerprint rows.

Retention can later be tuned if this table becomes large, because shard coverage already prevents exact reprocessing of completed seed ranges. Full accepted/corpus puzzle hashes are permanent.

## 8. Sparse candidate materialization

A full puzzle row should exist only after a candidate reaches a defined quality gate.

Proposed stages:

1. generated;
2. cheap structural filters;
3. dedup fingerprint check;
4. exact uniqueness;
5. cheap human-difficulty prescreen;
6. full human-solver audit;
7. Brutal policy evaluation;
8. structural/trace diversity evaluation;
9. accepted corpus/pool candidate.

Only stages 5/6 onward normally deserve full materialization. Exact threshold is an implementation parameter and should be measured during the pilot.

Suggested `corpus.puzzles` identity data:

- `id`;
- stable `puzzle_hash` unique;
- `variant`;
- compact puzzle representation;
- solution representation;
- clue count;
- canonical structural fingerprint;
- originating campaign/seed;
- generator version;
- created timestamp.

## 9. Versioned audits

Never treat `human_score` as an eternal field on the puzzle itself.

Suggested audit identity includes:

- `puzzle_id`;
- `solver_version`;
- `rating_model_version`;
- `policy_version`;
- status;
- score;
- max technique tier;
- total logical steps;
- total eliminations;
- advanced-technique step count;
- bottleneck metrics;
- candidate-density metrics where useful;
- technique histogram (`jsonb` is acceptable here);
- trace hash;
- optionally compressed trace/details only for promising/accepted puzzles;
- audit timestamp and runtime.

A later solver version can therefore re-audit the same corpus without destroying historical calibration.

## 10. Brutal difficulty semantics

The pilot must **not** define Brutal as merely "few clues" or "large total step count".

Brutal qualification should eventually combine multiple human-facing dimensions:

- exact uniqueness;
- logical solvability under the supported human model;
- presence/necessity of advanced documented techniques;
- meaningful bottleneck(s), not only many easy eliminations;
- sufficiently large candidate-management burden;
- difficulty after removing accidental easy progress;
- diversity from already accepted puzzles;
- no reliance on guessing unless an explicit future "pathological" category allows it.

Internal future bands may be:

- `B1` — Brutal;
- `B2` — Very Brutal;
- `B3` — Extreme/pathological.

The first UI integration may expose only one user-visible `Brutál` level. Internally keep enough data to distinguish B1/B2/B3 later.

The exact thresholds must be calibrated from measured search distributions and Ildi's real solve feedback, not guessed in advance.

## 11. Human-solver direction for Classic pilot

The Classic pilot is the proving ground because it has the richest documented human-technique ecosystem.

Before calling the corpus truly Brutal, extend/validate the human solver beyond the current ordinary Expert ceiling. Candidate techniques to research/implement in bounded deterministic form include, where non-redundant:

- fish families (X-Wing, Swordfish, Jellyfish);
- XY-Wing / XYZ-Wing;
- W-Wing;
- coloring / simple coloring;
- chains and AIC-like logic;
- ALS-based techniques where practical and explainable;
- other documented techniques justified by the research catalogue.

Implementation must remain bounded and deterministic. Do not introduce unbounded recursive "human" search disguised as a technique.

## 12. Low-priority worker execution

The worker is expected to run continuously in the background, but conservatively.

Canonical deployment direction: systemd service/timer or a long-running systemd service with explicit cgroup controls.

Initial pilot defaults should be conservative and measured before increasing them. Suggested starting envelope:

- worker concurrency: `1`;
- CPUQuota: approximately `10-20%` of one CPU initially;
- low CPU scheduling priority (`Nice=15` to `19`);
- idle/best-effort I/O priority where supported;
- explicit memory ceiling, chosen after measuring one worker;
- database pool size: `1-2` connections;
- batch size: small enough to checkpoint frequently (for example 100-500 seeds, to be benchmarked);
- sleep/yield after every batch;
- no Node worker-thread fan-out during pilot unless explicitly enabled later.

These are **starting guardrails, not permanent magic numbers**. Measure real CPU, memory, DB I/O, and Bridge latency before tuning.

### 12.1 Dynamic backoff

The worker should be able to reduce or pause work when the host is busy.

At minimum, implement one deterministic resource-pressure policy using cheap local signals, for example:

- system load / CPU pressure;
- available memory;
- optionally PostgreSQL/Bridge health indicators if available without expensive polling.

Under pressure:

- finish/checkpoint the current small batch;
- release or extend the shard safely;
- sleep with bounded backoff;
- resume automatically later.

Do not kill/restart the worker repeatedly as a normal throttling mechanism.

### 12.2 Bridge priority invariant

Any future optimization must preserve this invariant:

> A faster Sudoku search is never worth measurable degradation of Bridge responsiveness or reliability.

If contention is observed, reduce Sudoku quota/concurrency first.

## 13. Target-driven background loop

Logical worker loop:

1. read campaign status and accepted count;
2. if target count reached, atomically mark/observe `TARGET_REACHED` and stop claiming work;
3. check resource-pressure gate;
4. claim one shard/lease;
5. process a bounded seed batch starting at `next_seed`;
6. update aggregate counters and checkpoint `next_seed` in one short transaction;
7. materialize only promising candidates;
8. if a candidate is accepted, update campaign progress;
9. if target reaches 10, stop campaign cleanly;
10. otherwise sleep/yield and repeat.

The target check must be race-safe so future parallel workers cannot overrun the target by a large amount.

A small bounded overshoot is acceptable only if unavoidable due to in-flight batches; design should minimize it.

## 14. Candidate diversity

Do not fill a 10-puzzle pilot with near-equivalent transformations of one structure.

Before acceptance, compare at least a compact subset of:

- canonical clue mask / symmetry-normalized mask;
- puzzle canonicalization under legal digit/row/column symmetries where practical;
- technique histogram/signature;
- bottleneck signature;
- trace fingerprint.

Diversity rejection should itself be deterministic and versioned as part of the policy.

## 15. Ildi calibration data

Real solve behavior is first-class calibration evidence.

Suggested `calibration.ildi_results` fields:

- `puzzle_id`;
- date/time;
- solve time seconds;
- completed flag;
- used pencil notes flag;
- optional note intensity/count if later available;
- perceived difficulty (small ordinal scale);
- optional comment;
- app/build version.

This table must remain small. It is for accepted/test puzzles only, not generated rejects.

Future threshold calibration should use these observations together with solver metrics.

## 16. Production export

PostgreSQL is the research/canonical corpus, not a runtime dependency of Ildi Sudoku Kertje.

Export selected accepted puzzles into versioned repository files, e.g.:

```text
data/brutal-pools/
  classic.json
  manifest.json
```

Later:

```text
  xv.json
  consecutive.json
  odd-even.json
```

The export must be deterministic and include enough provenance to reproduce/audit each entry:

- puzzle hash;
- source campaign;
- generator/solver/rating/policy versions;
- audit/trace hashes;
- Brutal internal band;
- export version.

Standalone build consumes the exported pool. It never needs network/database access.

## 17. Pilot implementation phases

### Phase A — foundation only

Implement without running a large search:

- PostgreSQL database/schema migrations;
- dedicated DB role documentation/config;
- campaign and shard model;
- deterministic seed-space/shard enumerator;
- shard leasing/checkpointing;
- aggregate counters;
- target-count stop semantics;
- minimal worker skeleton;
- systemd low-priority deployment configuration;
- tests for restart/resume, no-overlap, target stop, and stale-lease recovery.

### Phase B — Classic candidate pipeline

Integrate current generator and solvers:

- cheap filters;
- stable fingerprint;
- exact uniqueness;
- human prescreen;
- full audit;
- sparse materialization;
- initial Brutal qualification contract.

### Phase C — bounded pilot search

Run a controlled pilot over a representative finite seed budget first (order of 10k-50k seeds, adjusted from measured throughput).

Measure:

- candidates/sec at low priority;
- CPU quota utilization;
- memory high-water mark;
- PostgreSQL writes/DB growth;
- rejection funnel;
- uniqueness cost;
- human-solver cost;
- acceptance rate;
- Bridge impact.

Do not increase search scale until these numbers are known.

### Phase D — target-driven background pilot

After the bounded pilot is healthy:

- enable continuous low-priority search;
- target exactly 10 accepted Classic Brutal candidates;
- allow the campaign to run unattended;
- stop automatically at target;
- audit the resulting 10-puzzle pool manually/analytically before export.

### Phase E — calibration and export

- export the 10-puzzle pilot pool;
- let Ildi solve/test a subset/all;
- record solve time, note use, perceived difficulty;
- revise Brutal policy based on real data;
- only then consider larger pools or other variants.

## 18. Database growth guardrails

Track database size as a pilot metric.

The implementation must expose compact counts for:

- number of campaigns;
- shard rows;
- seen fingerprints;
- materialized candidates;
- full audits;
- accepted puzzles;
- approximate DB/table sizes.

If database growth is dominated by rejected candidate materialization or full traces, treat that as an architecture defect and fix it before scaling.

Do not store full solver traces for ordinary rejects. Trace hashes and aggregate metrics are sufficient until a candidate crosses the configured retention threshold.

## 19. Operational observability

Keep terminal/log output minimal. Normal operation should emit concise structured summaries rather than per-seed logs.

Useful periodic summary:

```text
campaign=classic-brutal-pilot
status=RUNNING
target=10
accepted=3
searched=428000
rate=...
current_shard=...
rejects=...
worker_cpu=...
backoff=false
```

Detailed diagnostics belong in bounded logs/DB telemetry only when needed.

No terminal-closing commands are part of this workflow.

## 20. Non-goals for the first pilot

Do not initially:

- search all Sudoku variants;
- run many parallel workers;
- maximize CPU utilization;
- store every generated/rejected puzzle;
- make PostgreSQL a dependency of the offline app;
- expose B1/B2/B3 directly in UI;
- assume Brutal thresholds before measuring distributions;
- use unbounded brute-force human simulation;
- build a large monitoring UI before the search core is validated.

## 21. Canonical first pilot configuration

Until measurement justifies changes:

```text
variant: Classic Sudoku
campaign: classic-brutal-pilot-v1
visible target: Brutal
accepted target: 10
worker concurrency: 1
execution priority: low / Bridge-first
persistence: dedicated PostgreSQL database `ildi_sudoku_research`
search persistence: shard coverage + checkpoints
reject persistence: aggregate counters only
fingerprint persistence: compact hash cache where useful
candidate persistence: sparse
runtime app dependency on DB: none
final delivery: deterministic JSON pool export
```

## 22. Acceptance criteria for infrastructure completion

The Brutal search foundation is not complete until tests demonstrate all of the following:

- deterministic seed reproduction;
- a completed shard is never searched again within the same campaign/version;
- interrupted shard resumes from a committed `next_seed` checkpoint;
- two workers cannot lease/process the same shard concurrently;
- stale lease recovery works;
- ordinary rejects do not create full puzzle rows;
- duplicate fingerprints prevent redundant expensive audit where intended;
- target `10` stops new work automatically;
- restart/reboot preserves campaign progress;
- low-priority systemd/cgroup limits are applied;
- resource-pressure backoff works;
- PostgreSQL role is isolated to the Sudoku database;
- deterministic export can reproduce a production pool from accepted records.

## 23. Immediate next implementation task

Start a new implementation branch from the accepted canonical baseline and implement **Phase A only** first.

Do not start a 10k+ seed pilot until Phase A tests are green and low-priority resource controls have been verified on the Linux server.

After Phase A, measure a tiny smoke workload, then implement Phase B, then run the bounded pilot.
