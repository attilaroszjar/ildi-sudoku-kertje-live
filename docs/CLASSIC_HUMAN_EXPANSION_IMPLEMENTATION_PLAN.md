# Classic Human Expansion Implementation Plan

Status: planned, not started
Canonical baseline: main @ 4119113
Current Classic Human coverage: 40 registered / 40 implemented / 40 VERIFIED / 40 wired
Brutal search: HOLD until this expansion is either completed or explicitly deferred

## Goal

Extend the Classic Human solver only where public, documented human-solving techniques add genuine non-redundant logical capability beyond the current 40-technique set. Preserve the existing correctness-first policy: no technique is production trusted until it has explicit scope, bounded deterministic implementation, positive and negative correctness coverage, symmetry/digit relabeling checks where applicable, state-safety checks, and canonical audit integration.

Do not add techniques merely because they have distinct names. Prefer general capability over special-case aliases. When a published technique is provably subsumed by an existing generalized engine, document the redundancy instead of adding a finder.

## Research-derived target set

### Phase H1 — Finned and Sashimi Fish

Implement a generalized finned/sashimi fish engine for sizes 2..4, with public technique labels:
- finned-x-wing
- sashimi-x-wing
- finned-swordfish
- sashimi-swordfish
- finned-jellyfish
- sashimi-jellyfish

Rationale: current fish.js supports only exact basic fish where `size` base lines occupy exactly `size` cover positions. It cannot represent fins or sashimi structures.

Implementation requirements:
- Reuse line/cover enumeration from basic fish where practical.
- Model core covers and fin cells explicitly.
- Eliminate only candidates that are justified by the fish and see the relevant fin region according to the exact pattern rule.
- Distinguish finned vs sashimi structurally; do not infer from naming alone.
- Support row-based and column-based forms.
- Bound combinations deterministically.
- No generalized Franken/Mutant houses in this phase.

Audit requirements:
- canonical positive examples for all six labels or a justified generalized finder with exact metadata proving each subtype;
- row/column symmetry;
- multiple fins where valid, rejected near-misses where fin geometry is invalid;
- sashimi missing-core positive and negative cases;
- no self-elimination from base/fin cells;
- exact elimination-set checks;
- digit relabeling;
- deterministic enumeration;
- source-state immutability.

Wiring policy:
- normal human solver, not serverPreferred, unless runtime measurements show material cost.

Done when:
- dedicated audit slice PASS;
- inventory marks all implemented fish variants VERIFIED;
- canonical Classic Human audit remains inside existing 10 s / 5 s gates.

## Phase H2 — Extended Uniqueness Rectangles

Extend the existing uniqueness engine rather than creating unrelated duplicate finders.

Required scope:
- Unique Rectangle Type 2
- Unique Rectangle Type 3
- Unique Rectangle Type 4
- Unique Rectangle Type 5
- Unique Rectangle Type 6
- Hidden Rectangle

Optional only after core scope passes:
- Avoidable Rectangle
- documented missing-candidate UR subtypes, if they are not already equivalent to the implemented types

Policy:
- keep `requiresUniqueness:true` semantics;
- preserve explicit opt-in through `allowUniqueness`;
- type metadata must identify the exact supported subtype;
- never broaden `unique-rectangle` silently beyond audited geometry.

Audit requirements:
- one canonical positive and multiple near-miss negatives per type;
- invalid rectangle box geometry rejection;
- multi-guardian / wrong guardian rejection where relevant;
- exact strong-link or subset preconditions for Type 3/4/6;
- Hidden Rectangle dedicated tests;
- digit relabeling;
- row/column transpose symmetry;
- state safety and determinism.

Done when:
- each supported type is explicitly documented and VERIFIED;
- default solver behavior remains unchanged when uniqueness is disabled.

## Phase H3 — Sue de Coq

Implement Sue de Coq as a distinct human-explanation technique because documented forms are not completely subsumed by the current two-ALS XZ implementation and can be materially easier to explain to a human.

Scope:
- classical row/box and column/box intersection forms;
- explicit intersection set plus line remainder and box remainder;
- generalized sizes only within a strict bounded candidate/cell budget.

Implementation constraints:
- prefer set/ALS primitives already present;
- require exact digit-count conditions, not heuristic resemblance;
- reject degenerate cases already represented as simpler subsets unless an SdC-specific elimination remains;
- deterministic minimal representation for duplicate logical deductions.

Audit requirements:
- canonical row/box and column/box cases;
- non-SdC near misses caused by digit-count mismatch, overlapping remainder sets, or extra candidate escape;
- equivalence check against direct candidate oracle on crafted fixtures;
- no invalid eliminations in the intersection or component sets;
- digit relabeling and transpose symmetry;
- deterministic enumeration and state immutability.

Wiring policy:
- advanced normal human technique unless runtime profiling requires `serverPreferred`.

## Phase H4 — Junior Exocet

Implement only Junior Exocet first. Do not attempt the entire historical Exocet taxonomy in one change.

Rationale: Exocet is documented as particularly useful in candidate-dense extreme puzzles where bivalue-chain techniques have little structure. This makes it strategically relevant before restarting Brutal search.

Scope requirements:
- exact base cells;
- target cells;
- S-cells / cover-line constraints required by the chosen canonical Junior Exocet definition;
- explicit target-digit restriction deductions only where logically forced;
- no pattern recognition based on weak approximations.

Engineering policy:
- `serverPreferred:true` from the start;
- strict enumeration budgets and early pruning;
- deterministic house/base ordering;
- expose detailed explanationData sufficient to replay proof conditions;
- implementation must be fail-closed on ambiguous structures.

Audit requirements:
- documented canonical positive fixture(s);
- geometry negatives for each necessary condition;
- target/S-cell escape negatives;
- candidate-density stress fixture;
- digit relabeling and rotational/reflection invariance where applicable;
- state safety, determinism, hard budget behavior.

Done when:
- VERIFIED under declared Junior Exocet scope;
- serverPreferred gate regression proves no default activation;
- bounded performance is acceptable in EXPENSIVE slice.

## Phase H5 — Aligned Pair Exclusion

Implement APE only after verifying with targeted fixtures that it adds deductions not already produced by the current wings/AIC/ALS stack under equivalent options.

Required pre-implementation gate:
- add a small differential corpus of known APE examples;
- run current solver with all relevant existing techniques enabled;
- if every APE deduction is already found with equivalent or simpler logic, mark APE REDUNDANT and do not implement;
- otherwise proceed.

If implemented:
- enumerate aligned bivalue pairs with strict peer/intersection constraints;
- prove candidate-pair exclusions against common peers;
- eliminate only candidates impossible in every surviving aligned assignment;
- avoid brute-force across arbitrary cells.

Wiring policy:
- advanced normal human or serverPreferred based on measured cost.

Audit requirements:
- positive case not solved by simpler pre-existing technique in the same state;
- pair-alignment negative cases;
- exact surviving-pair oracle comparison;
- determinism, state safety, digit relabeling.

## Phase H6 — Deferred Extreme Families

Do not implement before H1-H5 unless a Brutal diagnostic proves they are the current frontier.

Candidates:
- Franken Fish
- Mutant Fish
- Multi-Sector Locked Sets / rank-zero set logic

Before implementation, perform a redundancy/capability probe against the then-current solver and the curated Brutal corpus.

Kraken Fish is not a separate priority because existing forcing-chain/net machinery may already express most of its logical power. Pattern Overlay/Templates remain diagnostic/oracle tools rather than human-technique finders unless policy changes.

## Global correctness contract

Every new technique or subtype must satisfy all applicable checks:
1. Logical soundness: every emitted placement/elimination is valid under the exact declared pattern.
2. Positive detection: canonical valid fixtures are found.
3. Negative discrimination: close invalid geometries are rejected.
4. Exactness: expected eliminations/placements are asserted, not merely non-empty output.
5. State safety: finder does not mutate source state.
6. Apply safety: applying deductions never creates an invalid state on valid fixtures.
7. Symmetry: digit relabeling and geometric transforms where the rule is symmetric.
8. Determinism: same state/options produce identical ordered deductions.
9. Boundedness: explicit hard limits for expensive combinatorial techniques.
10. Integration: top-level finder gating, priority, rating, audit inventory and canonical audit all agree.

Never mark a technique VERIFIED before its dedicated Linux audit passes.

## Rating and priority policy

Do not assign ratings by arbitrary interpolation. Before wiring each family:
- compare documented difficulty ordering in public taxonomies;
- place new techniques relative to existing neighbors;
- add calibration notes if the change can affect pool band classification;
- avoid changing existing production pool records unless a separate recalibration gate proves this necessary.

Suggested initial ordering, subject to calibration:
- finned/sashimi fish: around advanced fish / coloring range;
- extended UR: within uniqueness family by subtype complexity;
- Sue de Coq: near advanced ALS / AIC range;
- APE: near advanced wings/ALS;
- Junior Exocet: above ALS/forcing-chain region, serverPreferred.

## Branch and PR strategy

Start from canonical `main` after `4119113`.
Recommended branch:
`feature/classic-human-post40-expansion`

Prefer one coherent PR if the branch remains reviewable, but commit by phase. Each phase must leave the branch green. If one phase becomes architecturally large (especially Junior Exocet), split it into its own PR rather than holding completed verified phases hostage.

Commit pattern:
- implement family
- add dedicated correctness audit
- fix fixture/implementation based on Linux evidence
- mark VERIFIED and wire only after PASS
- update inventory/ratings/gating tests

## Validation cadence

After each family:
- run only the dedicated audit slice first;
- then relevant inventory/gating tests;
- only after those pass, run `npm run test:classic-human`.

Do not run Brutal search yet.
Do not run the entire repository test suite unless a change touches shared runtime outside Classic Human.
Keep terminal output minimal.

Canonical final gate before merge:
`npm run test:classic-human`

Expected invariants at final merge:
- every registered implemented technique VERIFIED;
- zero unaudited implemented techniques;
- all gated techniques remain fail-closed by default;
- A_G_FULL < 10000 ms;
- EXPENSIVE < 5000 ms;
- working tree CLEAN.

## Brutal-search restart condition

Brutal search may resume after one of the following is true:
A. H1-H5 are completed/verified; or
B. a deliberate decision is recorded that remaining phases are redundant or low-value based on differential coverage probes.

Before long Brutal runs, rerun the curated benchmark/coverage diagnostics with max-capability options and compare:
- newly solved puzzles;
- newly crossed exact frontiers;
- technique hit counts;
- first-use depth;
- runtime cost;
- stall census changes.

The purpose of this expansion is capability improvement, not making famous benchmark puzzles pass at any cost.
