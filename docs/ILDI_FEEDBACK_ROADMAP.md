# Ildi feedback roadmap

Canonical current-work source: `data/ildi-development-backlog.json`

This roadmap is intentionally separate from both:

1. the historical catalogue-quality audit;
2. the completed 77/77 Sudoku generator-quality programme.

A production-ready generator does not imply that the game has no newer
user-requested work.

## Status model

Each game has two independent dimensions.

### Technical baseline

Historical evidence such as:

- Kész
- Auditált
- Ellenőrzött
- Alapállapot

This records what has already been proven.

### Current development work

Derived from the canonical Ildi backlog:

- **Nincs** — no accepted unresolved request;
- **Nyitott** — accepted, not started;
- **Fejlesztés alatt** — implementation active;
- **Ellenőrzésre vár** — implementation done, acceptance/recheck pending;
- **Lezárt** — completed with evidence retained in the backlog record.

A game may therefore be technically **Kész** and simultaneously have a
**Nyitott** current task.

## Catalogue scopes

The 106 catalogue entries remain partitioned into:

- 77 Sudoku entries;
- 14 games in Ildi's current Japanese-development focus;
- 15 remaining catalogue games.

These are catalogue scopes, not readiness states.

## Current programme

### P0 — correctness / global interaction — CLOSED 2026-09-10

All four P0 items are closed with executable evidence retained in the canonical backlog.

- **Masyu generated-puzzle correctness and solvability — CLOSED.** Independent rule audit checks the single connected loop, degree-2 loop geometry, white-circle straight/adjacent-turn semantics, black-circle turn/straight-continuation semantics, exact uniqueness, deterministic replay and structural diversity across difficulty bands.
- **Yajilin generator/rule correctness — CLOSED.** Independent audit checks arrow counts, black-cell non-adjacency, excluded cells, degree-2 loop geometry, single-loop connectivity, exact uniqueness and all difficulty bands.
- **Aquarium solved-state immutability — CLOSED.** The fix is global rather than Aquarium-specific.
- **Global solved-state immutability — CLOSED.** Solved boards reject pointer, context-menu, keyboard/input and tool mutations while outer controls such as New/Restart remain available.

Validation evidence:

- targeted Masyu: 2/2 PASS;
- targeted Yajilin: 6/6 PASS;
- solved-state immutability: 1/1 PASS;
- recent family gate: 28/28 PASS;
- stale generated-topology regressions repaired and targeted legacy gate: 20/20 PASS;
- P0 closure status gate: 8/8 PASS;
- release and live publish PASS at source `fb715d4`.

The five full-suite failures observed during this phase were stale tests that passed the old static variant topology into `countVariantSolutions`; the production generators had already migrated to seed-derived topology. Those assertions were corrected to validate each generated puzzle against its generated variant object. No production generator regression was found in those five cases.

### P1 — UX / rules / verification — CLOSED 2026-09-10

Dedicated closure record: `docs/P1_CLOSURE.md`.

Completed 2026-09-10:

- **Nonogram row stability — CLOSED.** Explicit row tracks and constrained cell content prevent X marks from resizing rows.
- **Masyu circle centring — CLOSED.** Clue nodes were already mathematically centred; the half-cell background-grid offset was removed so visual cells and clue coordinates now agree.
- **Star Battle row stability — CLOSED.** Explicit `newlogic` row tracks prevent marker content from resizing rows.
- **Heyawake explicit X marking — CLOSED.** Player interaction now cycles empty → shaded → X → empty; X remains logically white and has an accessible mixed-state label.
- **Shakashaka rule semantics/explanation — CLOSED.** The help text now states the solver's actual numbered-cell rule: only four orthogonal neighbours count, and any triangle orientation counts as one triangle.
- **LITS rule explanation/gameplay audit — CLOSED.** The rule text now exposes every solver-enforced constraint: one L/I/T/S tetromino per region, global shaded connectivity, no fully shaded 2×2 block, and no orthogonally touching equal tetromino shapes across regions.
- **Double Skyscraper solved-state report — CLOSED / not reproduced.** A dedicated regression proves that Double Skyscraper uses the generic Sudoku completion path, an exactly solved grid triggers completion, and the shared completion callback updates the visible status to Solved.

Validation evidence:

- layout bundle: `P1_LAYOUT_GATE:PASS` at source `6fd7995`;
- Heyawake/Shakashaka/LITS targeted rule bundle: `P1_RULES_HEYAWAKE_GATE:PASS` at source `495e5c0`;
- Double Skyscraper solved-state verification: targeted 3/3 PASS at source `e980c73`;
- solved-state immutability regression remained green during the production-code validation pass.

After P1 closure the active programme was 20 tasks across 18 games: P0=0, P1=0, P2=4, P3=16.

### P2 — difficulty — CLOSED 2026-09-10

Dedicated closure record: `docs/P2_CLOSURE.md`.

Completed 2026-09-10:

- **Classic Skyscraper expert — CLOSED.** Outside clues reduced from 36 to 20 while retaining 27 givens.
- **Double Skyscraper expert — CLOSED.** Outside clues reduced from 24 to 12 while retaining 3 givens.
- **Toroidal Skyscraper expert — CLOSED.** Givens reduced from 20 to 10 while retaining all 6 toroidal clues.
- **Odd/Even Sudoku expert — CLOSED.** Expert now targets 16 givens subject to exact uniqueness; the post-calibration corpus median is 17 givens with 27 parity markers.

Validation evidence:

- baseline census: `ILDI_P2_DIFFICULTY_CENSUS:PASS`;
- candidate sweep: every selected strongest configuration remained `ok=4/4`;
- production recalibration targeted gate: 2/2 PASS at source `32761b5`;
- post-calibration census: all four expert variants `ok=4/4`;
- `P2_EVIDENCE_GATE:PASS`;
- gentle/focused generation policy remained unchanged.

After P2 closure the active programme is 16 tasks: P0=0, P1=0, P2=0, P3=16.

### P3 — sizes — CLOSED 2026-09-14

Ildi's 14-game size programme:

- Hitori — **CLOSED 2026-09-10**: independent 5×5–9×9 size selector and solver-certified multi-size generation.
- Hashiwokakero / Hidak — **CLOSED 2026-09-13**: independent 6×6–10×10 solver-certified multi-size generation.
- Fillomino — **CLOSED 2026-09-10**: independent 5×5–8×8 size support with exact-unique multi-size generation.
- Slitherlink — **CLOSED 2026-09-13**: independent 4×4–8×8 solver-certified, propagation-optimized multi-size generation.
- Akari — **CLOSED 2026-09-10**: independent 5×5–9×9 size support with solver-certified multi-size generation.
- Nurikabe — **CLOSED 2026-09-10**: independent 5×5–8×8 size support with solver-certified, performance-hardened multi-size generation.
- Nonogram — **CLOSED 2026-09-10**: independent 5×5, 6×6, 8×8 and 10×10 size support with solver-certified generation.
- Masyu — **CLOSED 2026-09-13**: independent 4×4–8×8 solver-certified multi-size generation with propagation-first exact solving.
- Star Battle — **CLOSED 2026-09-10**: independent 5×5–9×9 size selector with solver-certified multi-size generation.
- Galaxies — **CLOSED 2026-09-10**: independent 4×4–8×8 size selector and solver-certified multi-size generation.
- Ripple Effect — **CLOSED 2026-09-13**: independent 5×5–8×8 solver-certified, bounded multi-size generation.
- Battleships / Rejtett Flotta — **CLOSED 2026-09-13**: independent 5×5–8×8 solver-certified, bounded multi-size generation.
- Heyawake — **CLOSED 2026-09-10**: independent 5×5–9×9 size support with solver-certified, performance-hardened multi-size generation.
- Futoshiki — **CLOSED 2026-09-10**: independent 4×4–8×8 size selector and solver-certified multi-size generation.

Additional Skyscraper sizes — CLOSED:

- Classic Skyscraper 7×7 and 8×8 — **CLOSED 2026-09-13**.
- Double Skyscraper 8×8 — **CLOSED 2026-09-14**.

## Closed September feedback

Earlier feedback already addressed remains historical evidence and is not
reopened here, including Little Killer, Region Sum Line, Between Lines,
Quadruple, Clone, X-Sums, Fortress, Two-Park note pruning, diagonal clue
spacing, internal Skyscraper arrows, Odd/Even Skyscraper visibility,
decorative Double Skyscraper dividers, mixed-information wording, and
zoom-safe grid rendering.

Ildi explicitly withdrew the earlier Odd/Even Sudoku outside-clue complaint.
The later expert-difficulty request was completed in P2.

## Maintenance rule

Do not encode new Ildi requests by downgrading historical technical evidence.

Instead:

1. add/update an item in `data/ildi-development-backlog.json`;
2. move it through OPEN → IN_PROGRESS → VERIFY → CLOSED;
3. close it only after the corresponding evidence gate passes;
4. retain closure evidence on the backlog item;
5. let the status page derive current-work counts only from unresolved items;
6. at every P-level phase boundary, create a dedicated `docs/P<N>_CLOSURE.md` record before proceeding beyond the phase, containing scope, completed items, executable evidence, exceptions, resulting programme counts, and source commits.

This keeps historical readiness, current work, phase closure evidence and completed feedback independently auditable.

## P3 programme — CLOSED 2026-09-14

The complete size-expansion programme is now closed.

- P3 backlog: **16/16 CLOSED**
- Active backlog: **0**
- Final item: Double Skyscraper 8x8
- Final closure record: `docs/P3_CLOSURE.md`

No P0, P1, P2 or P3 item remains open. Further work starts only from new
Ildi feedback or a separately approved development programme.
