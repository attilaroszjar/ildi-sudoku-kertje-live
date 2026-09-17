# Classic Sudoku Technique Specification

Status: canonical design document
Scope: classic 9x9 Sudoku only
Audience: future LLM implementation work, solver/generator/audit code
Purpose: define a non-redundant human-logic taxonomy, difficulty model, solver architecture, and server-side puzzle-generation contract before implementation.

## 0. Non-negotiable design rules

1. This specification applies only to standard 9x9 Sudoku with 3x3 boxes and digits 1-9.
2. Human difficulty must be measured from human-style logical deductions, not from brute-force search cost.
3. Machine-only methods may verify uniqueness/correctness but must not raise the human difficulty rating.
4. Do not implement every named Sudoku technique as an independent algorithm when it is a special case of a shared logical primitive.
5. Preserve human-recognizable names when they materially improve explanation or difficulty interpretation.
6. Solver output must be deterministic for a fixed puzzle, configuration, and technique-priority policy.
7. Every accepted deduction must carry machine-readable provenance sufficient to explain and replay it.
8. Difficulty is multidimensional. Never reduce it internally to only clue count or only the hardest single technique.
9. Extra-hard server generation must optimize for logical quality, not maximal search hardness.
10. Guessing/backtracking is allowed for verification and generation internals, but a puzzle advertised as human-logical must have a complete accepted human-logic solve path.

## 1. Research baseline and terminology policy

Primary classification references for implementation semantics:

- Sudoku Explainer / Sukaku Explainer rating tradition: useful for ordered technique difficulty and hardest-technique ceiling.
- HoDoKu technique taxonomy: useful for explicit families, pattern definitions, chains, fish, ALS, uniqueness, forcing structures.
- Human-solving difficulty research: use step complexity plus dependency/workload structure rather than one scalar heuristic alone.

Terminology rule:

- `canonical primitive` = the underlying reusable logical engine.
- `recognizer` = a detector that labels a useful human-readable special case of a primitive.
- `technique` = user-facing deduction label returned by the solver.
- `family` = implementation grouping sharing a canonical primitive.
- `alias` = alternate community name that must not create duplicate implementation.

A technique name may remain separately visible even if mathematically reducible to a more general primitive. Example: XY-Wing remains a named recognizer although it can be represented as a short XY-Chain/AIC pattern.

## 2. Canonical technique families

The implementation taxonomy is intentionally smaller than the historical list of named Sudoku techniques.

### F0. Completion / direct placement

Canonical primitives:
- Full House / Last Digit in unit
- Naked Single
- Hidden Single

Implementation notes:
- Treat Full House as a presentation-specialized direct placement, not a separate reasoning engine.
- Hidden Single operates over row/column/box candidate incidence.

Expected human range: beginner.

### F1. Unit intersections

Canonical primitive:
- Locked Candidates

Human recognizers:
- Pointing
- Claiming

Implementation rule:
- one intersection engine over house pairs; recognizer determines label from directionality.

Expected human range: easy-medium.

### F2. Subsets

Canonical primitive:
- exact candidate subset in a house

Parameters:
- visibility mode: naked | hidden
- size: 2..4 for normal human solving

Human recognizers:
- Naked Pair
- Hidden Pair
- Naked Triple
- Hidden Triple
- Naked Quad
- Hidden Quad

Implementation rule:
- one subset engine parameterized by size and visibility mode.
- larger subsets are not planned as normal human techniques for 9x9 because usefulness collapses and complement redundancy grows.

Expected human range: medium-hard.

### F3. Fish

Canonical primitive:
- digit-specific base-set / cover-set fish

Parameters:
- size
- base houses
- cover houses
- fins
- sashimi state
- box participation / generalized house type
- cannibalistic or endo-fin state only if later justified

Human recognizers:
- X-Wing (size 2)
- Swordfish (size 3)
- Jellyfish (size 4)
- Finned variants
- Sashimi variants
- Franken Fish
- Mutant Fish

Implementation rule:
- do not create independent engines for X-Wing/Swordfish/Jellyfish.
- standard fish is phase 1.
- finned/sashimi is phase 2.
- Franken/Mutant is advanced phase and must be separately gated for runtime cost.
- names above size 4 (Squirmbag, Whale, Leviathan) are aliases/presentation names, not architectural primitives. They are out of initial human-rating scope unless empirical evidence justifies them.

Expected human range: hard to extreme depending on generalization.

### F4. Single-digit strong/weak-link patterns

Canonical primitive:
- short single-digit alternating inference structure

Human recognizers:
- Skyscraper
- 2-String Kite
- Turbot Fish
- Empty Rectangle

Implementation rule:
- recognize these before generic chains so human explanations stay compact.
- share conjugate-link graph infrastructure with chain engine.

Expected human range: hard/expert.

### F5. Wings

Canonical primitive:
- short bivalue/trivalue implication motif

Human recognizers:
- XY-Wing
- XYZ-Wing
- W-Wing

Implementation rule:
- recognizers may be implemented on top of candidate/link graph infrastructure.
- do not duplicate generic chain deduction logic.

Expected human range: hard/expert.

### F6. Coloring

Canonical primitive:
- parity coloring over conjugate links for one digit

Human recognizers:
- Simple Colors
- Multi Colors

Implementation note:
- coloring can often be represented through chains, but remains a separate recognizer because human solving experience and explanation differ.

Expected human range: expert.

### F7. Uniqueness-based deductions

Canonical primitive:
- uniqueness-preserving rectangle/loop structures

Human recognizers:
- Unique Rectangle family
- Unique Loop
- BUG / BUG+1

Policy:
- uniqueness techniques are valid only when the puzzle is already externally verified to have exactly one solution.
- solver configuration must allow uniqueness techniques to be disabled.
- difficulty metadata must record whether uniqueness assumptions were used.

Expected human range: expert-master.

### F8. Alternating inference chains

Canonical primitive:
- alternating inference graph over candidate propositions with strong and weak links

Human recognizers / output labels:
- X-Chain
- XY-Chain
- Remote Pair
- AIC
- Nice Loop
- Grouped AIC

Architecture:
- a single reusable implication graph should support candidate nodes and optionally grouped nodes.
- simple named patterns should be recognized before generic AIC output when equivalent.
- chain canonicalization must prevent the same deduction from being emitted repeatedly under aliases.

Deduplication identity recommendation:
`(eliminations, placements, normalized_support_graph)`

Expected human range: expert to very hard.

### F9. Almost Locked Sets

Canonical primitive:
- ALS discovery: N cells in one house/allowed region containing N+1 candidates

Human recognizers:
- ALS-XZ
- ALS-XY-Wing
- ALS Chain
- Death Blossom

Architecture:
- one indexed ALS inventory per board state.
- cache ALS structures and invalidate incrementally when candidates change.
- relationships between ALS objects must be indexed by restricted common candidates rather than recomputed pairwise from scratch.

Expected human range: master/extreme.

### F10. Forcing structures

Canonical primitive:
- hypothetical implication propagation with contradiction or convergence proof

Human labels:
- Forcing X-Chain
- Forcing Chain
- Cell Forcing Chain
- Region Forcing Chain
- Forcing Net

Rule:
- distinguish chain from net: chain is linear dependency; net has branching and/or reconvergence.
- record number of branches, max propagation depth, contradiction count, and proof size.

Expected human range: very hard/extreme.

### F11. Dynamic and nested forcing

Canonical primitive:
- recursively extended forcing implication search

Human labels:
- Dynamic Forcing Chain
- Dynamic Forcing Chain (+)
- Nested Forcing Chain

Policy:
- server-side analysis only by default.
- hard runtime limits mandatory.
- never use this family during normal browser generation.
- accepted puzzle must store its precomputed proof trace if this family determines the rating.

Expected human range: extreme ceiling.

## 3. Explicitly non-canonical / redundant naming policy

Do not add a new engine merely because a source uses another name.

Examples:
- X-Wing, Swordfish, Jellyfish -> Fish(size=N)
- Naked/Hidden Pair/Triple/Quad -> Subset(mode,size)
- Pointing/Claiming -> Locked Candidates intersection engine
- XY-Wing and many short named motifs -> specialized recognizers over common link/implication infrastructure
- X-Chain, XY-Chain, AIC, Nice Loop -> one chain graph family with constrained recognizers
- fish size names above 4 -> parameter labels, not new algorithms

Before introducing any future technique, answer:
1. Does it produce eliminations/placements unavailable to existing primitives?
2. If not, does a separate recognizer materially improve human explanation or rating calibration?
3. Can it reuse existing graph/subset/fish/ALS infrastructure?
4. Is there empirical value for Ildi's difficulty range?

If answers are `no/no`, reject as redundant.

## 4. Technique ordering: deterministic human solver

Default search order should approximately follow human recognizability and cost, not theoretical generality.

Recommended initial order:

1. Full House / direct completion
2. Naked Single
3. Hidden Single
4. Locked Candidates
5. Naked Pair
6. Hidden Pair
7. Naked Triple
8. Hidden Triple
9. X-Wing
10. short single-digit patterns
11. XY-Wing
12. XYZ-Wing
13. W-Wing
14. Swordfish
15. Naked/Hidden Quad
16. Simple/Multi Coloring
17. Uniqueness family
18. Jellyfish
19. finned/sashimi fish
20. short named chains
21. generic AIC / Nice Loop
22. Grouped AIC
23. ALS-XZ / ALS-XY-Wing
24. ALS Chains / Death Blossom
25. generalized fish
26. Forcing Chains
27. Forcing Nets
28. Dynamic Forcing
29. Nested Forcing

This order is a starting policy, not a permanent difficulty truth. Calibration must later use a benchmark corpus and observed solve profiles.

## 5. Difficulty model

### 5.1 Do not use clue count as difficulty

Clue count is metadata only. It must not define the difficulty tier.

### 5.2 Do not use only the hardest technique

Retain a hardest-technique ceiling because it is useful and compatible with Sudoku Explainer-style thinking, but supplement it with workload and dependency metrics.

### 5.3 Required raw metrics

For every deterministic human solve, persist at minimum:

```json
{
  "solvedByHumanLogic": true,
  "usesGuessing": false,
  "usesUniquenessAssumption": false,
  "maxTechniqueId": "aic",
  "maxTechniqueBaseRating": 7.2,
  "stepCount": 0,
  "placementCount": 0,
  "eliminationCount": 0,
  "advancedStepCount": 0,
  "weightedLogicalWork": 0.0,
  "maxChainLength": 0,
  "maxGroupedChainNodes": 0,
  "maxForcingDepth": 0,
  "maxForcingBranches": 0,
  "bottleneckCount": 0,
  "dependencyDepth": 0,
  "candidateRebuilds": 0,
  "techniqueHistogram": {},
  "solveTraceHash": "..."
}
```

### 5.4 Difficulty components

Maintain separate dimensions internally:

- `ceiling`: hardest required technique.
- `workload`: cumulative weighted logical effort.
- `depth`: dependency depth between key deductions.
- `chain_complexity`: length/grouping/branching of graph proofs.
- `bottlenecks`: number and strength of steps for which no materially easier alternative exists.
- `variety`: number of distinct advanced families required.
- `search_visibility`: estimated human discoverability among available candidates/patterns.

Do not collapse these early in the pipeline.

### 5.5 Provisional Ildi score

A later calibrated scalar may use a form such as:

`score = ceiling_component + workload_component + dependency_component + bottleneck_component + chain_component`

Constraints:
- ceiling must dominate broad tier boundaries.
- workload may move a puzzle within a tier or at most one adjacent tier unless calibration proves otherwise.
- one accidental exotic deduction must not automatically make an otherwise trivial puzzle desirable.
- repetitive mechanical steps should contribute less than genuinely hidden bottlenecks.

Exact coefficients are deliberately unspecified until benchmark calibration.

## 6. Proposed human-facing difficulty bands

Working names; labels may change without changing the technical model.

- Easy: singles
- Medium: locked candidates + pairs
- Hard: triples + basic fish
- Expert: wings + short single-digit patterns + swordfish
- Master: coloring + uniqueness + jellyfish + short chains
- Master+: AIC/grouped AIC + ALS + complex fish + longer chains
- Grandmaster: forcing chains/nets
- Extreme: dynamic forcing
- Abyss: nested forcing / top logical ceiling

Rule: the displayed tier must be generated from stored solve metrics, not from generator input difficulty alone.

## 7. Solver data model

### 7.1 Candidate state

Represent each cell candidate set as a 9-bit mask.
Maintain incremental indexes for:
- candidates by cell
- candidate cells by row/digit
- candidate cells by column/digit
- candidate cells by box/digit
- bivalue cells
- conjugate links

### 7.2 Deduction object

Every technique returns a normalized object:

```json
{
  "techniqueId": "xy-wing",
  "familyId": "wing",
  "placements": [],
  "eliminations": [{"cell": 40, "digit": 7}],
  "anchors": [],
  "houses": [],
  "candidateNodes": [],
  "proofEdges": [],
  "baseRating": 4.2,
  "complexity": {},
  "explanationData": {}
}
```

Requirements:
- a deduction must change state.
- identical state changes from multiple equivalent proofs must be canonicalized.
- deterministic tie-breaking: technique priority, then smallest normalized proof key.

### 7.3 Solve trace

Persist the full logical trace for server-generated premium puzzles.
Each step contains:
- board/candidate state hash before
- deduction object
- board/candidate state hash after
- metrics delta

This enables regression replay without rerunning expensive discovery.

## 8. Verification solver separation

Maintain two logically separate systems:

### Human solver
Purpose:
- difficulty classification
- explanation
- acceptance gating

Forbidden:
- blind backtracking as an advertised solve step
- template/exhaustive methods that are not part of accepted human taxonomy

### Exact verifier
Purpose:
- count solutions up to 2
- validate givens
- confirm generator edits preserve uniqueness

Allowed:
- optimized DFS/backtracking
- bit masks
- MRV
- propagation
- cached/transposition-assisted search if useful

Verifier result never raises human difficulty.

## 9. Server-side Master Puzzle Factory

### 9.1 Goal

Generate a curated offline bank of classic Sudoku puzzles selected for human-logical quality.
The server is used because high-quality selection can examine many candidates without making Ildi wait.

### 9.2 Pipeline

Recommended stages:

1. produce or mutate a complete valid solution grid.
2. construct a clue pattern using symmetry policy if requested.
3. after each clue removal batch, run fast uniqueness verifier.
4. reject obviously wrong target ranges using cheap filters.
5. run cheap human techniques first.
6. only escalate to expensive chain/ALS/forcing analysis if the puzzle survives lower-cost gates.
7. compute full human solve trace and metrics.
8. apply target profile constraints.
9. apply quality filters.
10. canonicalize puzzle under allowed Sudoku symmetries for duplicate detection.
11. persist accepted puzzle + solution + metrics + trace + generator provenance.

### 9.3 Mandatory performance policy

Avoid naive exhaustive generation.
Use:
- early rejection
- staged solver escalation
- candidate/house indexes
- incremental candidate updates
- cached ALS/link structures
- uniqueness check capped at 2 solutions
- canonical duplicate hashes
- bounded parallel workers
- deterministic seeds for replay
- resumable batches/checkpoints
- benchmark-guided time budgets

Do not run expensive nested/forcing analysis on every random candidate.

### 9.4 Target-profile generation

Generation request should describe *how* the puzzle is difficult.

Example profile:

```json
{
  "family": "classic",
  "humanLogicOnly": true,
  "tier": "master-plus",
  "maxTechniqueRating": [7.4, 8.2],
  "requiredFamilies": ["chain"],
  "minAdvancedSteps": 3,
  "maxAdvancedSteps": 12,
  "dependencyDepth": [4, 12],
  "maxChainLength": [5, 14],
  "allowUniqueness": false,
  "allowForcing": false,
  "quality": {
    "avoidMechanicalGrind": true,
    "preferDistinctBottleneck": true,
    "minTechniqueVariety": 2
  }
}
```

This is preferable to requesting `difficulty = very hard`.

## 10. Puzzle quality model

Difficulty and quality are separate.

Reject or penalize puzzles with:
- long repetitive runs of the same trivial step after the main bottleneck
- excessive singles cleanup relative to advanced content
- one exotic step surrounded by an otherwise uninteresting solve if the target is a rich challenge
- fragile rating caused by arbitrary solver ordering
- many equivalent deductions that make the advertised bottleneck non-essential
- reliance on uniqueness techniques when profile forbids them
- forcing/dynamic steps when a materially simpler accepted path exists
- duplicate/isomorphic puzzle patterns already in bank

Prefer puzzles with:
- one or more clear logical bottlenecks
- coherent escalation
- moderate technique variety
- compact but meaningful advanced proofs
- deterministic rating stability under allowed tie-breaking variants
- no guessing
- unique solution
- reasonable total solve workload for the intended tier

## 11. Bottleneck analysis

A `bottleneck` is a state where all available accepted deductions are at or above a configured difficulty threshold and solving cannot progress with easier families.

For each bottleneck record:
- minimum available technique rating
- count of deductions at that minimum
- technique families available
- proof complexity
- resulting unlock size

Use this to distinguish:
- one hidden elegant breakthrough
- many interchangeable advanced moves
- accidental high-rating artifact

Future quality score should reward meaningful bottlenecks, not merely high labels.

## 12. Rating stability audit

A puzzle's rating should not depend excessively on arbitrary search order.

For accepted premium puzzles, optionally solve under a small set of deterministic policy variants:
- normal priority
- recognizer-first within same family
- alternate tie ordering among equal-rated deductions

Store:
- minimum observed ceiling
- maximum observed ceiling
- workload variance

Reject/flag if the advertised tier changes materially across reasonable policies.

Do not explore all solve paths; use a bounded stability sample.

## 13. Benchmark and calibration corpus

Before freezing coefficients or tier thresholds, create a curated corpus containing:
- known examples for each technique family
- puzzles with known Sudoku Explainer/HoDoKu-style ratings where licensing/source permits metadata use
- synthetic unit fixtures that force one target deduction
- negative near-miss fixtures
- existing Ildi classic puzzles across current difficulty labels

Calibration goals:
- technique detector correctness
- no duplicate classification of the same deduction
- monotonic broad difficulty ordering
- runtime distributions
- browser-safe cutoff
- server-only cutoff
- rating stability

Do not optimize against a single external rating system; use it as calibration evidence.

## 14. Implementation phases

### Phase A - contracts and fixtures

Implement no generator changes yet.
Deliver:
- technique IDs/family IDs
- deduction schema
- candidate-state primitives
- exact verifier contract
- fixture format
- deterministic trace format

Gate:
- canonical unit tests pass
- no UI behavior change

### Phase B - foundational human solver

Families:
- F0 completion/singles
- F1 intersections
- F2 subsets
- basic F3 fish through Jellyfish

Gate:
- all fixtures correct
- deterministic traces
- current classic puzzles classifiable

### Phase C - human pattern layer

Families:
- F4 single-digit patterns
- F5 wings
- F6 coloring
- F7 uniqueness

Gate:
- recognizers deduplicate against general primitives
- explanation metadata complete

### Phase D - graph engine

Families:
- F8 chains/AIC/grouped AIC

Gate:
- bounded runtime benchmark
- normalized graph proofs
- no alias double-counting

### Phase E - ALS and generalized fish

Families:
- F9 ALS
- advanced F3 fish

Gate:
- indexed/cached search
- server/browser runtime policy established

### Phase F - forcing ceiling

Families:
- F10 forcing
- F11 dynamic/nested forcing

Gate:
- server-only by default
- hard time/node budgets
- proof trace persistence

### Phase G - calibration

Deliver:
- benchmark corpus
- base ratings
- Ildi multidimensional score
- displayed band thresholds
- regression baselines

### Phase H - Master Puzzle Factory

Deliver:
- target-profile schema
- staged generator
- resumable batch runner
- acceptance bank format
- quality/rating stability audit

Only after Phase G should production difficulty labels be trusted for newly generated Master/Extreme classic puzzles.

## 15. Browser vs server responsibility

Browser:
- normal play
- notes/candidates UX
- cheap/medium human analysis if needed for hints
- ordinary puzzle generation if retained
- loading pre-generated premium puzzles

Server/offline build tooling:
- large-scale candidate generation
- expensive chain/ALS/forcing analysis
- full rating stability audit
- benchmark calibration
- premium bank production

The shipped game remains offline-capable. Server generation is a development/build-time facility, not a runtime dependency.

## 16. Acceptance record format

Each premium puzzle bank entry should eventually include at least:

```json
{
  "id": "classic-master-000001",
  "givens": "...81 chars...",
  "solution": "...81 chars...",
  "unique": true,
  "humanLogicOnly": true,
  "difficultyBand": "master-plus",
  "difficultyMetrics": {},
  "techniqueHistogram": {},
  "bottlenecks": [],
  "traceRef": "...",
  "symmetry": "rot180",
  "canonicalPuzzleHash": "...",
  "generatorVersion": "...",
  "solverVersion": "...",
  "seed": "...",
  "acceptedAt": "..."
}
```

## 17. Regression requirements

For every technique family:
- positive fixture
- negative near-miss fixture
- no false elimination test
- replay determinism test
- alias/deduplication test where applicable

For solver:
- every emitted elimination must preserve the known solution in fixture tests
- every emitted placement must equal the known solution
- full trace replay must reach identical final grid
- exact verifier and human solver must remain separate in tests

For generator:
- accepted puzzle unique
- accepted puzzle reproducible from stored provenance when deterministic mode is requested
- duplicate/isomorphic acceptance prevented
- target profile actually satisfied by post-generation solve, not assumed from construction parameters

## 18. Runtime measurement contract

Benchmark per family:
- boards/second
- median and p95 technique search time
- candidate nodes visited
- chain graph expansions
- ALS objects built
- forcing branches/nodes
- cache hit rates where applicable

Use staged escalation thresholds derived from measurements.
Never request a large server run before estimating candidate volume, asymptotic hotspots, I/O, parallelism, and reusable intermediate state.

## 19. Out of scope for this specification

- Sudoku variants (Diagonal, Hyper, Killer, XV, Consecutive, Greater Than, etc.)
- UI redesign
- hint prose wording
- exact final numerical rating coefficients
- cloud/runtime service dependency
- machine-learning difficulty prediction
- clue-count-based rating
- competitive fastest-solving optimization

Variant solvers may later reuse the same inference architecture, but must have separate specifications.

## 20. Decision log

D1. Keep JavaScript/offline client architecture; server generation is complementary, not a migration requirement.

D2. Build a non-redundant family architecture, with human recognizers layered over shared primitives.

D3. Separate exact verification from human-logical solving.

D4. Use multidimensional difficulty metrics; hardest-technique rating is necessary but insufficient.

D5. Server-generated premium puzzles optimize logical quality and target profile, not raw hardness.

D6. Advanced forcing/dynamic/nested methods are server-only by default.

D7. No production implementation should start by adding dozens of independent technique functions. Start with contracts, candidate indexes, reusable subset/fish/link graph primitives, and fixtures.

## 21. Next implementation action

When implementation begins, do **not** start with the Master Puzzle Factory.

Start Phase A on a dedicated branch:

`feature/classic-human-solver-contracts`

First concrete slice:
1. inspect current classic solver/generator code and existing difficulty-v2/expert-ceiling work;
2. define stable technique/family IDs;
3. define `Deduction` and solve-trace schemas;
4. add exact-verifier boundary tests;
5. add candidate-state/index fixtures;
6. add foundational technique fixtures without changing production generation;
7. run canonical repository validation;
8. commit only after the contract layer is green.

This document is the canonical design source for that work until explicitly superseded.
