# P3 size expansion plan

Status: **COMPLETE — CLOSED 2026-09-14**

Date started: 2026-09-10

Canonical backlog: `data/ildi-development-backlog.json`

## Scope

P3 contains the remaining 16 accepted size-expansion tasks after P0, P1 and P2 closure.

### Ildi Japanese-logic size programme — 14 games

- Hitori
- Hashiwokakero / Bridges
- Fillomino
- Slitherlink
- Akari
- Nurikabe
- Nonogram
- Masyu
- Star Battle
- Tentaisho / Galaxies
- Ripple Effect
- Battleships
- Heyawake
- Futoshiki

### Deferred Skyscraper size work — 2 tasks

- Classic Skyscraper: add 7x7 and 8x8 support.
- Double Skyscraper: investigate and, if valid, add 8x8 support.

## Working principles

1. Size support is a generator/runtime capability, not a cosmetic board resize.
2. Every newly exposed size must generate valid, solver-certified puzzles under the complete game rules.
3. Seeded generation must remain deterministic.
4. New sizes must preserve useful solution/topology diversity rather than scaling one fixed template.
5. Difficulty bands must remain meaningful within each size; do not assume one clue target scales automatically.
6. Runtime interaction, rendering and touch targets must work at the new dimensions.
7. Existing sizes and existing production contracts must not regress.
8. Do not expose a requested size until its targeted generation and runtime gates pass.

## Execution order

The programme is split into implementation waves so that common infrastructure can be reused.

### Wave A — generic square-grid generators

Start with games whose runtime and solver are already naturally dimension-driven or can be generalized with limited topology work:

- Hitori
- Fillomino
- Nonogram
- Heyawake
- Futoshiki

Goal: establish the reusable size-selection / variant-size contract and a first multi-size production pattern.

### Wave B — region / placement grids

- Akari
- Nurikabe
- Star Battle
- Ripple Effect
- Battleships

Goal: generalize topology generation and calibrate size-specific structural targets.

### Wave C — loop / graph families

- Slitherlink
- Masyu
- Hashiwokakero
- Tentaisho / Galaxies

Goal: scale graph/topology construction without curated single-size fallback dependence.

### Wave D — Skyscraper extensions

- Classic Skyscraper 7x7 and 8x8
- Double Skyscraper 8x8

These remain last because they have special Latin-square / visibility semantics and the Double variant has a nonstandard multiplicity model.

## Baseline census

Before production changes, run `scripts/ildi-p3-size-census.mjs`.

The census records for every P3 game:

- catalogue id and kind;
- current canonical solution size;
- generated solution/puzzle size for gentle, focused and expert;
- whether generation succeeds on a small deterministic seed corpus;
- whether more than one size is currently produced;
- generator-family metadata when available.

This baseline determines which games are truly hard-coded to one size and which already have latent generic support that only needs product exposure.

## Gates

Each game/size is closed only after targeted evidence covers:

- generation succeeds across a deterministic seed corpus;
- exact uniqueness / game-specific solver certificate where available;
- deterministic replay;
- structural diversity;
- no regression of existing supported size(s);
- runtime board dimensions and input model match the generated size.

## Phase closure

P3 is not closed until all 16 backlog items are CLOSED with evidence.

At phase end create `docs/P3_CLOSURE.md` containing:

- final supported sizes for every game;
- implementation commits;
- targeted gates and corpus results;
- any explicitly rejected size with reason (if a requested size proves invalid or impractical);
- final backlog counts;
- release and live-publish evidence.

## Per-game closure log

### Star Battle / Csillagkert — CLOSED 2026-09-10

Supported board sizes: **5x5, 6x6, 7x7, 8x8, 9x9**.

The former implementation coupled board size to difficulty
(gentle=5x5, focused=6x6, expert=7x7). P3 separates these concepts
completely.

Final production contract:

- dedicated player-facing 5x5–9x9 size selector;
- board size independent from gentle/focused/expert difficulty;
- seeded region topology generation;
- uniqueness-guided region synthesis for robust larger boards;
- exactly one star in every row, column and region;
- stars do not touch, including diagonally;
- exact uniqueness certified by `countStarBattleSolutions`;
- deterministic replay;
- seed/topology diversity;
- runtime board dimensions derived from `puzzle.size`;
- existing interaction semantics preserved across every exposed size.

Executable evidence:

- `tests/p3-star-battle-complete.test.js`
- full initial targeted file: all checks except one VM cross-realm
  `deepStrictEqual` assertion were green;
- the assertion was corrected to canonical JSON-content equivalence;
- the previously failing deterministic replay test then passed 1/1;
- no production-code change was required after that final test correction.

After this per-game closure the active P3 programme contains **15 tasks**.

### Tentaisho / Csillaggalaxisok — CLOSED 2026-09-10

Supported board sizes: **4x4, 5x5, 6x6, 7x7, 8x8**.

The previous implementation coupled size to difficulty
(gentle=4x4, focused=5x5, expert=6x6). P3 separates these dimensions.

Final production contract:

- dedicated player-facing board-size selector;
- size independent from gentle/focused/expert difficulty;
- seeded rectangular galaxy topology generation;
- every centre defines rotationally symmetric ownership;
- exact uniqueness certified by `countGalaxiesSolutions`;
- difficulty candidates selected by measured solver search complexity;
- deterministic replay;
- seed/topology diversity;
- runtime dimensions derive directly from `puzzle.size`;
- the same edge-based interaction model is used at every exposed size.

Evidence: `tests/p3-galaxies-complete.test.js`.

After this closure the active P3 programme contains **14 tasks**.

### Hitori — CLOSED 2026-09-10

Supported board sizes: **5x5, 6x6, 7x7, 8x8, 9x9**.

The original Hitori generator was fixed to 6x6. P3 generalizes the
complete generation contract rather than merely resizing the rendered board.

Final production contract:

- dedicated player-facing 5x5–9x9 size selector;
- board size independent from gentle/focused/expert difficulty;
- seeded Latin-base construction;
- seeded non-adjacent black-mask topology;
- strengthened duplicate-witness construction for robust 9x9 generation;
- all unshaded row values unique;
- all unshaded column values unique;
- black cells do not touch orthogonally;
- all white cells remain orthogonally connected;
- exact uniqueness certified by `countHitoriSolutions`;
- measured solver effort used for difficulty ordering;
- deterministic replay and seed/topology diversity;
- runtime dimensions derive from the generated puzzle size.

Evidence:

- `tests/p3-hitori-complete.test.js`
- `HITORI_TARGETED_GATE:PASS`

After this closure the active P3 programme contains **13 tasks**.

### Futoshiki — CLOSED 2026-09-10

Supported board sizes: **4x4, 5x5, 6x6, 7x7, 8x8**.

The previous generator was fixed to 6x6. P3 generalizes the full production
contract rather than only resizing the runtime.

Final production contract:

- dedicated player-facing 4x4–8x8 size selector;
- board size independent from gentle/focused/expert difficulty;
- seeded Latin-square solution generation;
- inequality clues derived from the generated solution;
- clue/given reduction under exact uniqueness;
- exact uniqueness certified by `countFutoshikiSolutions`;
- deterministic replay;
- seed/topology diversity;
- measured solver effort retained for difficulty ordering;
- runtime dimensions derive from generated puzzle length.

Evidence:

- `tests/p3-futoshiki-complete.test.js`
- `FUTOSHIKI_TARGETED_GATE:PASS`

After this closure the active P3 programme contains **12 tasks**.

### Fillomino — CLOSED 2026-09-10

Supported board sizes: **5x5, 6x6, 7x7, 8x8**.

The previous production generator was fixed to 6x6 and relied on random
Hamiltonian-snake segment partitions. That approach became unreliable at 8x8.

P3 replaces the solution synthesis with a deterministic valid row-partition
construction, followed by seeded board symmetries for structural diversity.

Final production contract:

- one shared player-facing P3 size selector;
- board size independent from gentle/focused/expert difficulty;
- guaranteed-valid complete Fillomino partition synthesis;
- seeded structural transformations;
- clue removal under exact uniqueness;
- exact uniqueness certified by `countFillominoSolutions`;
- deterministic replay;
- seed/partition diversity;
- runtime dimensions derive from generated puzzle size.

Evidence:

- `tests/p3-fillomino-complete.test.js`
- `FILLOMINO_TARGETED_GATE:PASS`

After this closure the active P3 programme contains **11 tasks**.

### Nonogram — CLOSED 2026-09-10

Supported board sizes: **5x5, 6x6, 8x8, 10x10**.

The previous production generator was fixed to 8x8. P3 makes board size
an independent player-facing choice while keeping difficulty separate.

Final production contract:

- one shared player-facing P3 size selector;
- board size independent from gentle/focused/expert difficulty;
- size-aware seeded bitmap generation;
- row and column clues derived from the generated solution;
- exact uniqueness certified by `countNonogramSolutions`;
- deterministic replay;
- seed/solution diversity;
- runtime dimensions driven by the generated puzzle size;
- previous row-height stability fix preserved across all supported sizes.

Evidence:

- `tests/p3-nonogram-complete.test.js`
- `NONOGRAM_TARGETED_GATE:PASS`

After this closure the active P3 programme contains **10 tasks**.

### Heyawake / Szobakert — CLOSED 2026-09-10

Supported board sizes: **5x5, 6x6, 7x7, 8x8, 9x9**.

The original generator was fixed to 6x6 and selected from three curated
room/solution families. P3 replaces that product limitation with seeded
multi-size generation.

Final production contract:

- one shared player-facing P3 size selector;
- board size independent from gentle/focused/expert difficulty;
- seeded room-partition generation;
- no orthogonally adjacent black cells;
- all white cells remain orthogonally connected;
- room clue counts match the generated solution;
- white runs satisfy the no-three-room rule;
- exact uniqueness certified by `countHeyawakeSolutions`;
- deterministic replay and seed/topology diversity;
- existing explicit X interaction remains preserved;
- runtime dimensions derive from `puzzle.size`.

Performance hardening:

The first multi-size implementation repeatedly invoked the exact solver after
adding every individual starter, then performed a second reverse-minimization
solver pass. This became prohibitively expensive on 8x8 and 9x9.

The final implementation uses deterministic difficulty-aware starter seeding,
batched refinement only while ambiguity remains, bounded generation attempts,
and one final exact uniqueness certificate.

Targeted production evidence:

- `tests/p3-heyawake-complete.test.js`
- 4/4 PASS
- total targeted runtime approximately 168 ms

After this closure the active P3 programme contains **9 tasks**.

Wave A is now complete:
Hitori, Fillomino, Nonogram, Heyawake and Futoshiki are all closed.

### Akari / Fénykert — CLOSED 2026-09-10

Supported board sizes: **5x5, 6x6, 7x7, 8x8, 9x9**.

The former production generator was fixed to 6x6. P3 generalizes the
complete Akari generation contract while retaining exact solver certification.

Final production contract:

- one shared player-facing P3 size selector;
- board size independent from gentle/focused/expert difficulty;
- seeded wall-layout generation;
- valid complete bulb solution synthesis;
- numbered-wall clues derived from the generated solution;
- no pair of bulbs illuminates each other;
- every white cell is illuminated;
- numbered walls have the exact required adjacent bulb count;
- bounded difficulty-aware clue reduction;
- exact uniqueness certified by `countAkariSolutions`;
- deterministic replay;
- seed/topology diversity;
- runtime dimensions derive from the generated puzzle.

Performance is bounded by design: clue removal does not perform an
unbounded solver-minimization loop.

Targeted production evidence:

- `tests/p3-akari-complete.test.js`
- 4/4 PASS
- total targeted runtime approximately 258 ms

After this closure the active P3 programme contains **8 tasks**.

### Nurikabe — CLOSED 2026-09-10

Supported board sizes: **5x5, 6x6, 7x7, 8x8**.

The original production generator was fixed to 5x5. P3 generalizes the
complete Nurikabe generation contract.

Final production contract:

- one shared player-facing P3 size selector;
- board size independent from gentle/focused/expert difficulty;
- seeded connected sea topology;
- no 2x2 sea block;
- every island contains exactly one clue;
- clue value equals island size;
- all sea cells form one connected component;
- exact uniqueness certified by `countNurikabeSolutions`;
- deterministic replay and seed/topology diversity;
- runtime dimensions derive from the generated puzzle size.

Performance hardening:

The first multi-size implementation left almost every non-clue cell unknown
to the exact solver on larger boards, causing exponential branching.

The final implementation uses deterministic difficulty-aware sea starters,
batched reinforcement only when ambiguity remains and bounded generation
attempts. Exact solver certification remains authoritative.

Targeted production evidence:

- `tests/p3-nurikabe-complete.test.js`
- 4/4 PASS
- targeted runtime approximately 315 ms

After this closure the active P3 programme contains **7 tasks**.

### Ripple Effect — CLOSED 2026-09-13

Supported board sizes: **5x5, 6x6, 7x7, 8x8**.

The original production generator was fixed to 5x5. P3 separates board
size from difficulty and registers Ripple Effect with the shared P3 size
selector.

Final production contract:

- independent 5x5 through 8x8 board sizes;
- one shared player-facing size selector;
- deterministic seeded generation;
- seed-dependent topology/orientation and solution permutation;
- every room contains exactly 1..room-size;
- Ripple Effect distance constraints hold in the completed solution;
- bounded clue carving;
- exact uniqueness certified by `countRippleEffectSolutions`;
- difficulty remains independent from board size;
- deterministic replay and seed diversity.

The first P3 implementation used arbitrary connected room growth. Targeted
testing correctly rejected it because some generated 6x6-8x8 room
topologies admitted no complete Ripple Effect solution.

The final implementation instead constructs a solver-valid cyclic family
by design and only then performs exact-uniqueness-preserving clue removal.
This removes the generation-failure path rather than hiding it with more
attempts or larger timeouts.

Targeted production evidence:

- `tests/p3-ripple-effect-complete.test.js`
- 4/4 PASS
- approximately 249 ms

After this closure the active P3 programme contains **6 tasks**.

### Battleships / Rejtett Flotta — CLOSED 2026-09-13

Supported board sizes: **5x5, 6x6, 7x7, 8x8**.

The previous production implementation was fixed to 6x6. P3 generalizes
the complete Battleships contract while keeping board size independent from
difficulty.

Final production contract:

- one shared player-facing P3 size selector;
- independent 5x5 through 8x8 board sizes;
- size-specific fleets;
- deterministic seeded fleet placement;
- ships may not touch, including diagonally;
- row and column totals exactly match the generated fleet;
- difficulty-aware bounded starter/given exposure;
- exact uniqueness certified by the Battleships solution counter;
- deterministic replay and seed diversity;
- runtime dimensions derive from puzzle size.

Performance hardening:

- givens participate directly in search pruning;
- impossible row/column deficits terminate branches early;
- mandatory ship cells must remain reachable by remaining fleet placements;
- generation is bounded rather than relying on unbounded retries.

Targeted production evidence:

- `tests/p3-battleships-complete.test.js`
- 4/4 PASS
- approximately 577 ms

After this closure the active P3 programme contains **5 tasks**.

### Slitherlink — CLOSED 2026-09-13

Supported board sizes: **4x4, 5x5, 6x6, 7x7, 8x8**.

The previous production implementation was fixed to 5x5. P3 generalizes
both loop synthesis and exact uniqueness verification while keeping size
independent from difficulty.

Final production contract:

- one shared player-facing P3 size selector;
- independent 4x4 through 8x8 board sizes;
- seeded connected polyomino construction;
- puzzle solution is the single closed boundary of that polyomino;
- clues are derived from the generated loop;
- bounded difficulty-aware clue removal;
- exact uniqueness under full Slitherlink rules;
- deterministic replay and loop-topology diversity;
- runtime dimensions derive from puzzle size.

Performance hardening:

The initial multi-size version repeatedly invoked the exact binary edge
solver for many clue-removal candidates. On larger boards this became too
slow.

The final exact solver now performs propagation before branching:

- cell clues force remaining incident edges when counts are saturated;
- vertex degree constraints force remaining incident edges;
- impossible degree/clue states terminate immediately;
- branch choice prioritizes tightly constrained edges;
- final acceptance still requires one single connected closed loop.

The generator itself also uses bounded attempts and only a very small
number of clue-removal checks for large boards.

Targeted production evidence:

- `tests/p3-slitherlink-complete.test.js`
- 4/4 PASS
- approximately 270 ms

After this closure the active P3 programme contains **4 tasks**.

### Masyu — CLOSED 2026-09-13

Supported board sizes: **4x4, 5x5, 6x6, 7x7, 8x8**.

The former production implementation generated only a fixed 4x4 board.
P3 generalizes the loop topology and keeps board size independent from
difficulty.

Final production contract:

- one shared player-facing P3 size selector;
- independent 4x4 through 8x8 board sizes;
- deterministic seeded loop generation;
- generated solutions are one connected closed loop;
- black-circle cells turn and continue straight through both adjacent cells;
- white-circle cells go straight and turn immediately before or after;
- exact uniqueness under the complete Masyu rule set;
- deterministic replay and loop-topology diversity;
- runtime dimensions derive from puzzle size;
- the existing cell-centering UX fix is preserved.

Solver hardening:

The legacy exact solver performed only limited degree pruning and deferred
much of the black/white-circle semantics until complete candidate loops.

The P3 solver is propagation-first:

- vertex degree constraints propagate edge states;
- black-circle direction constraints propagate before branching;
- white-circle straight/adjacent-turn constraints propagate before branching;
- impossible partial loops terminate early;
- final acceptance still requires one connected loop satisfying every clue.

Evidence:

- `tests/p3-masyu-complete.test.js`
- existing `tests/masyu-generator-correctness.test.js`
- targeted gate 4/4 PASS
- approximately 516 ms

After this closure the active P3 programme contains **3 tasks**.
Wave C now has only Hashiwokakero remaining.

### Hashiwokakero / Hidak — CLOSED 2026-09-13

Supported board sizes: **6x6, 7x7, 8x8, 9x9, 10x10**.

The former production implementation used a fixed curated 7x7 family.
P3 generalizes board size while preserving exact bridge-rule verification.

Final production contract:

- one shared player-facing P3 size selector;
- independent 6x6 through 10x10 board sizes;
- deterministic seeded island topology;
- visibility graph is a tree;
- legal bridge multiplicities are 1 or 2;
- island clues equal the exact incident bridge total;
- bridges do not cross;
- the whole island graph is connected;
- exact uniqueness certified by `countBridgesSolutions`;
- deterministic replay and topology/multiplicity diversity;
- difficulty remains independent from board size.

The P3 construction deliberately uses a tree visibility graph. This avoids
generation dead ends while still producing seed-dependent layouts and bridge
multiplicity patterns. Tree structure also makes the clue system strongly
constrained and keeps exact certification fast.

Validation note:

The first targeted run produced two apparent failures where actual and expected
clue arrays printed identically. The cause was JavaScript VM cross-realm array
identity/prototype semantics in `deepStrictEqual`, not a production mismatch.
The test was normalized across realms and both failed cases then passed.

Evidence:

- `tests/p3-hashiwokakero-complete.test.js`
- previously failed tests retry: 2/2 PASS
- exact uniqueness remains checked through `countBridgesSolutions`

After this closure the active P3 programme contains **2 tasks**.

Wave C is now complete:
Slitherlink, Masyu and Hashiwokakero are all closed.


### Classic Skyscraper — CLOSED 2026-09-13

Supported board sizes: **7x7, 8x8, 9x9**.

P3 adds genuine multi-size support without changing the established 9x9
production behaviour.

Final production contract:

- one shared player-facing P3 size selector;
- independent 7x7, 8x8 and 9x9 board sizes;
- board size independent from gentle/focused/expert difficulty;
- deterministic seeded Latin-square solution generation for 7x7 and 8x8;
- exact four-side Skyscraper visibility clues derived from each generated solution;
- exact uniqueness certified by the dedicated P3 Skyscraper solution counter;
- puzzles remain non-unique when the visibility clues are ignored, proving the
  special rule is genuinely required;
- deterministic replay and seed/solution diversity;
- the existing P2-calibrated 9x9 production path remains unchanged;
- runtime dimensions derive from the selected/generated board size.

Targeted production evidence:

- `tests/p3-skyscraper-complete.test.js`
- 5/5 PASS
- approximately 686 ms test runtime
- targeted gate approximately 746 ms
- implementation source `e9de9a1`

After this closure the active P3 programme contains **1 task**:
Double Skyscraper 8x8.

Wave D now has only its final Double Skyscraper item remaining.

### Double Skyscraper — CLOSED 2026-09-14

Supported board sizes: **6x6 and 8x8**.

The established 6x6 production path remains unchanged.

The new 8x8 production model uses:

- digits 1–4;
- exactly two copies of every digit in every row;
- exactly two copies of every digit in every column;
- deterministic seeded repeated-Latin construction;
- exact four-side Skyscraper visibility clues;
- exact variant uniqueness;
- explicit variant-essentiality: the puzzle is not unique when the
  outside clues are ignored;
- the shared P3 board-size selector;
- board size independent from difficulty.

Performance hardening was required for 8x8. The original generic
cell-by-cell Double Skyscraper solver became too expensive. The final
8x8 exact path searches whole valid row patterns instead:

- only permutations of 1,1,2,2,3,3,4,4 are considered;
- rows are bucketed by left/right visibility;
- givens filter row candidates immediately;
- column multiplicities are incrementally bounded;
- top/bottom visibility constraints prune the search;
- solution counting stops immediately at the requested limit.

Final targeted evidence:

- `tests/p3-double-skyscraper-complete.test.js`
- remaining targeted gate: 3/3 PASS
- approximately 365 ms
- source `9ca6ec9`

This closes the final P3 backlog item.

## P3 programme closure — 2026-09-14

**Status: COMPLETE — 16/16 P3 items closed.**

The size-expansion programme is complete. Every requested game now has
its intended multi-size production path, size is kept separate from
difficulty, shared size-selection UX is used, and each completed game has
targeted production evidence.

There are no remaining OPEN P3 items.
