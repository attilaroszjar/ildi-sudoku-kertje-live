# Classic Human Runtime Generator Plan

Status: canonical implementation plan for the post-PR #26 correction.

## Intent

Classic Sudoku must remain effectively endless in Ildi's offline/standalone game. Gentle, Focused, and Expert are generated at runtime from the improved Classic generator stack, not selected from a finite promoted pool.

Promoted/audited pools remain build/research artifacts. Their future product role is primarily Brutal curation/pregeneration, where expensive Linux-side search is acceptable.

## Product contract

### Browser / standalone

For `variant.id === "classic"`:

1. every New Puzzle action derives a new deterministic seed;
2. runtime generation creates a solver-verified unique Classic puzzle;
3. a bounded human-aware shaping pass targets the selected `gentle`, `focused`, or `expert` band;
4. generation always terminates within a strict browser-safe budget;
5. the returned board contains runtime provenance (`source`, profile, requested band, measured score/band when available, attempts, bounded/fallback state);
6. no finite production pool is used for normal Gentle/Focused/Expert selection;
7. no network, fetch, worker dependency, CDN, database, or server is required;
8. `file://` and generated single-file standalone remain first-class targets.

### Linux research / Brutal

The existing pool pipeline remains canonical for expensive research:

`candidate generation -> exact uniqueness -> Classic Human solve/rate -> acceptance/rejection -> checkpoint -> audit -> promotion`

Future Brutal harvesting may use server-preferred/server-only techniques, larger search budgets, long-running checkpoints, deduplication, and curated promotion. Brutal is intentionally out of scope for this implementation.

## Existing components and roles

- `games/sudoku-generator.js`: base runtime generator; provides deterministic, solver-verified unique Classic candidates.
- `games/classic-human/generator-adapter.js`: adapts runtime Classic generation into candidate strings/provenance.
- `games/classic-human/human-guided-generator.js`: current bounded human-guided sculptor; canonical logic source, but its pool evaluator dependency is too heavy to wire blindly into UI runtime.
- `games/classic-human/* solver/rating modules`: canonical human difficulty semantics.
- `games/classic-human/pool-*`, `data/classic-human-pools/*`: research/build infrastructure, not Gentle/Focused/Expert runtime data.
- `games/classic-human-runtime.js`: PR #26 finite-pool runtime. This must be replaced by a generator runtime adapter, not retained as normal Classic selection.

## Runtime design

### 1. Dedicated browser runtime adapter

Create `games/classic-human-runtime-generator.js`.

Responsibilities:

- install exactly once around the final `SudokuGenerator.make` chain;
- intercept only `variant.id === "classic"`;
- leave all other Sudoku variants byte-for-byte on the previous generator path;
- call a browser-safe human-guided generator API;
- return the same variant object shape expected by `sudoku-library.js`;
- preserve generated solution and uniqueness metadata;
- expose compact runtime status for tests/debugging.

### 2. Browser-safe human guidance

Do not run the full pool evaluator contract for every trial. In particular, normal runtime generation does not need to build normalized pool records, trace hashes, record hashes, or promotion metadata.

Add a lightweight evaluation path dedicated to runtime shaping:

- exact uniqueness is already guaranteed by the base generator for the initial candidate;
- after clue removal trials, exact uniqueness is checked with the shared Classic contracts solver;
- human solve/rating uses only browser-allowed techniques (`allowServerPreferred:false`, `allowServerOnly:false`);
- early exit as soon as the requested band is reached;
- strict max trial count per band;
- no trace serialization/hashing during selection;
- retain only compact rating/provenance required by product/runtime tests.

The canonical measured human-band thresholds remain the rating module's thresholds. Legacy generator difficulty labels are input heuristics only; they do not become the measured result.

### 3. Bounded profiles

Initial runtime budgets must be conservative and deterministic:

- Gentle: base candidate plus at most a very small shaping pass; expected to finish fastest.
- Focused: bounded clue-removal/evaluation pass.
- Expert: bounded clue-removal/evaluation pass with a somewhat larger but still strict browser budget.

Exact constants are implementation details and may be tuned only from benchmark evidence. Runtime must never perform unbounded retries to force a band.

If the requested band is not reached within the budget, return the best valid solver-verified unique candidate found and mark provenance as bounded/degraded. Do not substitute a finite pool and do not silently relabel measured difficulty.

### 4. UI semantics

The existing UI values remain:

- `gentle`
- `focused`
- `expert`

No UI redesign is required in this slice. `New Puzzle` continues to increment the app seed and therefore creates a new runtime puzzle. `Restart` must reuse the current puzzle.

Generation-note wording should distinguish runtime human-guided Classic generation from curated/pool boards where practical, without exposing noisy technical details.

### 5. Remove normal-pool runtime selection

PR #26 artifacts are treated as follows:

- remove `games/classic-human-runtime.js` from `index.html` runtime loading;
- remove/retire the finite-pool Classic interceptor;
- keep production JSON bundles and pool builders/audits because they are valid server research infrastructure;
- keep the production pool data unless a later cleanup proves it unnecessary; it is not runtime-consumed after this change;
- standalone rebuild must contain the new runtime generator stack and must not contain the finite-pool selector as an active Classic path.

## Dependency/loading order

The browser must load the minimal Classic Human runtime dependencies before the runtime adapter installs, and the adapter must install after all existing generator hardening wrappers but before `sudoku-library.js` mounts.

Avoid adding runtime `fetch()` of local JSON because `file://` compatibility is mandatory.

Do not load server-only technique modules unless required by an already-shared browser human solver entrypoint. Prefer a browser-specific evaluator/solver profile over duplicating algorithm implementations.

## Correctness invariants

For every generated Classic runtime board:

- 9x9 Classic shape;
- givens agree with returned solution;
- exact solution count = 1;
- generation is deterministic for `(seed, requestedBand, runtimeProfileVersion)`;
- different consecutive app seeds should not produce obvious immediate repetition in the tested window;
- non-Classic variants remain behaviorally unchanged;
- `Restart` does not create a new puzzle;
- language switching does not create a new puzzle;
- no normal Classic runtime selection reads `data/classic-human-pools/*.json`.

## Validation gates

### Targeted Node tests

Add a dedicated runtime-generator test covering:

1. Gentle/Focused/Expert deterministic generation.
2. exact uniqueness of a bounded sample per band.
3. returned givens/solution consistency.
4. provenance marks runtime human-guided generation, not production pool selection.
5. non-Classic passthrough.
6. no dependency on production pool runtime bundle.
7. strict attempt/budget bounds.
8. immediate-repeat smoke window.
9. generated source is standalone-safe (no fetch/external dependency).

### Performance gate

Use a small deterministic sample. Measure wall-clock runtime by band with generous regression ceilings rather than large stochastic benchmarks. Gate must remain bounded and cheap enough for canonical audit.

Initial objective: normal desktop browser generation should feel interactive. If Expert exceeds the practical budget, optimize/evidence-tune the bounded profile rather than switching to finite runtime pools.

### Canonical/release

After targeted tests:

- `npm run test:classic-human`
- relevant runtime test script
- `npm run build:standalone`
- `npm run test:release`

Expected release invariants remain catalogue `106`, external runtime dependencies `0`, file:// compatibility, clean working tree.

## Implementation sequence

1. Commit this plan before code changes.
2. Add lightweight runtime human evaluator API reusing canonical solver/rating semantics.
3. Add bounded browser human-guided Classic generator API.
4. Add final Classic-only runtime interceptor after existing hardening wrappers.
5. Remove finite-pool selector from normal runtime loading.
6. Add targeted deterministic correctness/performance tests.
7. Rebuild standalone.
8. Run Classic Human canonical audit and release gate.
9. Audit diff for accidental changes to non-Classic paths.
10. Open PR only after all gates pass.

## Non-goals

- no Brutal runtime implementation in this slice;
- no long-running browser search;
- no expansion of 48/48/24 production pools;
- no replacement of canonical human rating semantics;
- no UI category redesign;
- no network/service-worker/backend dependency.

## Decision record

The finite human-rated Gentle/Focused/Expert pool integration from PR #26 was based on a product-intent misunderstanding. The reusable pool infrastructure remains valid. The product correction is to make Gentle/Focused/Expert runtime-generated using the improved human-aware generator, while reserving expensive pregenerated/curated pool workflows for future Brutal discovery and periodic offline bundle refreshes.
