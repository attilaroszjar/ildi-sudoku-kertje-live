# Ildi Sudoku Kertje — hard playtest fix program

Canonical tracker for the manual hard-puzzle playtest findings reported by the user. Update this file as items are verified/fixed so future chats can resume without reconstructing status from conversation history.

Last full repository-state audit: 2026-09-15, source HEAD `e4605f195f7f1f954e4804f54304b34c08f6915d`.

## Status legend

- `DONE` — fixed or measured acceptable and production evidence passed.
- `VERIFY` — prior work exists and likely addresses the report, but this hard-playtest item still needs one explicit final targeted verification.
- `TODO` — not yet closed in this hard-playtest program.

## Manual playtest list

| # | Finding | Status | Current evidence / next action |
|---|---|---|---|
| 1 | Paros-paratlan kicsit lassu | DONE | Production benchmark on `evenodd-skyscrapers`, seeds 93000-93009, focused + expert (20 runs): focused 37.079-145.385 ms, median 62.784 ms; expert 21.393-169.674 ms, median 53.089 ms. 20/20 exact unique, variant-essential and locally irreducible. No pathological tail; no production change justified. |
| 2 | Klasszikus neha lassu | DONE | Classic Expert runtime optimized by reducing `entryCandidates` 4 -> 1 and `entryPool` 8 -> 1. Final production v8 benchmark over seeds 93000-93019: 20/20 completed, 0 timeout, 0 error, median 823.565 ms, p95 3443.835 ms, max 3702.894 ms. All exact unique, locally irreducible and human levels 6-8. Previous baseline median ~2964 ms with 2/20 5-second timeouts. |
| 3 | Little Killer nagyon lassu | VERIFY | The original UI freeze was fixed at `fd9093d` by removing repeated `correctLittleKillerLayout()` work from the Region Sum MutationObserver. Current host-realm Expert gate over seeds 93000-93009: generation min/median/p95/max 2260.3/3025.8/3834.9/3834.9 ms, all exact unique, generation-unique, variant-essential and metadata-complete; contract gate PASS. Expert local-irreducibility remains incomplete because the post-essential proof budget was hit on every sample, so keep this item in VERIFY until that distinction is explicitly accepted or the local proof is completed. |
| 4 | Vonalas valtozatoknal ket osszeero vonal nem egyertelmu / vonal takarja a szamot | DONE | Shared line rendering is standardized to light neutral `#b4bab6` and Reflection was separately reduced to `stroke-width:1.25` with its group badge moved away from the digit centre. Targeted line/Reflection gate: 4/4 PASS. Standalone builder now recursively inlines local CSS imports; final release evidence: source `51a9856` CLEAN, live `2d3f4e2` CLEAN, `LIVE_LINE_CSS:PASS`. User visually confirmed the live colours are good. |
| 5 | Nabner vonal nagyon lassu, kifagy | DONE | Closed by the Nabner production hardening and playability work. `docs/NABNER_GENERATOR_PRODUCTION_HARDENING.md`: 192/192 production samples valid, exact unique, variant-essential and deterministic; Expert p50/p95/max 171.6/294.0/869.9 ms under the production gate. Later sparse Expert closure (`docs/NABNER_EXPERT_PLAYABILITY_CLOSURE.md`) retained exactness/local irreducibility with host-realm seed 92003 generation 4701.9 ms and explicitly identifies VM measurements as non-production overhead. No artificial timeout/clue floor was introduced. |
| 6 | 12x12 nagyon lassu | DONE | Exact 12x12 counter optimized with DLX. Hotspot seed 93004 production sample: generation 72.5 ms, verification 0.5 ms; local-irreducibility wrapper about 42 ms vs about 7.6 s before. Exact unique + local-irreducible contract retained. |
| 7 | 16x16 nagyon lassu | DONE | Hybrid box-prefix-64 removal order in production. Five-seed benchmark 93000-93004: 143.567-779.629 ms, median 570.681 ms; 5/5 exact unique and locally irreducible. Previous worst case 8907.842 ms. Closure: `docs/SUDOKU_16X16_EXPERT_RUNTIME_CLOSURE.md`. |
| 8 | Sukaku kezdoszamok tul kicsik; inkabb ceruzas beiras szerint jelenjenek meg | DONE | Implemented at `ce109ed`: starting candidate sets render as a fixed 3x3 pencil-mark grid with larger readable glyphs and legacy 7px inline pseudo-text suppressed. Targeted gate: 3/3 PASS; standalone import regression PASS. Released with source `5d9de13`, live `de8750e`; user visually confirmed Sukaku is OK. |
| 9 | Samurai mellett nem fer ki a kezelo felulet | DONE | Samurai-specific responsive layout moves controls below the 21x21 board, constrains the board to available width and keeps narrow-view overflow on the board itself. Targeted Samurai layout + standalone import gate PASS. Final release after category-mutation-loop hardening: source `3640264` CLEAN, live `a5fe94f` CLEAN; user visually confirmed Samurai, categories and alphabetical navigation all work correctly. |
| 10 | Bishopgate jelolt cellak szine megegyezik a beirt cellakeval | DONE | Bishopgate-marked cells now use a dedicated cool blue/lilac treatment that remains distinct from the Garden UI entered/fixed-cell colours, including a fixed-cell override and dark-mode handling. Targeted Bishopgate legibility + standalone import gate PASS. Released as source `d42fff8`, live `669c8d2`; user visually confirmed both the colour distinction and Bishopgate behaviour. |
| 11 | Felul nehez: paritashibas kezdotabla | DONE | Closed by commit `7582392` (`Harden Top-Heavy Parity with fresh constrained solutions`). Production no longer derives this variant from a transformed generic Sudoku solution: `makeTopHeavy` constructs a fresh solution under the vertical same-parity upper>lower relation and marks it `top-heavy-parity-fresh-constrained-solution`; the current production search validator enforces the same relation. This prior constrained-solution hardening is accepted as the canonical fix for the reported parity-broken starting board. |
| 12 | Lakotelep grundokkal nagyon lassu, nem tolt be / lefagy | DONE | Re-audited on the current production wiring rather than the obsolete ~35 s closure path. Canonical host-realm seed 92001 at `fb4e7a4`: generation 1628.8 ms, exact Parks verification 41.3 ms, `parkSolutions:1`, `parkBaseSolutions:2`, `unique:true`, `variantEssential:true`, ARC runtime loaded. Follow-up 5-seed batch at `d49d59a` over 92001-92005: 5/5 PASS, avg generation 1908.7 ms, max 2234.0 ms, all exact unique and variant-essential. The original freeze / non-loading report is no longer reproducible on the current production path; no production timeout or quality relaxation was introduced. |
| 13 | Domino Lakotelepen a dominok szine legyen eltero a kitoltott cellak szinetol | TODO | No repository evidence found for this specific domino-vs-filled-cell color distinction. UI color change still required. |
| 14 | Lakotelep ket grunddal indulaskor hibat jelez, ha egy sorban ket grund van | TODO | Parks2 received substantial exact-solver/playability investigation, but the available evidence concerns sparse-generation runtime, not this startup false-validation report. Reproduce the initial-state validator with a legal row containing two parks and fix the validation semantics if reproduced. |
| 15 | Klasszikus Lakotelep nagyon lassan tolt be | TODO | `docs/CLASSIC_SKYSCRAPER_EXPERT_PLAYABILITY_CLOSURE.md` explicitly records `CORRECTNESS CLOSED / PERFORMANCE FOLLOW-UP OPEN`: canonical host-realm generation ~13318.5 ms even after exact verification itself was reduced to ~31.1 ms. The remaining cost is repeated exact counter invocation during generation/carving. This hard-playtest runtime item is therefore still open. |

## Audit conclusions (2026-09-15)

The full 15-item audit intentionally separates earlier clue-density/generator-quality closure from the manual hard-playtest complaints. A variant can be exact, locally irreducible and formally closed for playability while still remaining too slow for interactive use.

Repository-state changes from the previous tracker status:

- #3 Little Killer: host-realm runtime evidence is now bounded and contract-complete, but local-irreducibility remains incomplete because the post-essential proof budget is exhausted; retain VERIFY until that remaining proof distinction is resolved.
- #4 line-family visibility: `VERIFY -> DONE`; unified light-grey line rendering is live, Reflection received its own legibility correction, standalone CSS-import packaging was fixed, targeted regression gates pass, and the user visually confirmed the live result.
- #5 Nabner: `VERIFY -> DONE` because retained production and host-realm evidence is already sufficient.
- #8 Sukaku legibility: `VERIFY -> DONE`; released build visually confirmed by the user.
- #9 Samurai responsive layout: `VERIFY -> DONE`; targeted gate PASS and the final `3640264` / `a5fe94f` release was visually confirmed by the user.
- #10 Bishopgate: `TODO -> DONE`; dedicated marked-cell colouring was released as source `d42fff8` / live `669c8d2` and visually confirmed by the user.
- #11 Top-Heavy Parity: `VERIFY -> DONE`; the existing fresh constrained-solution production generator from `7582392` is the canonical fix and is accepted as sufficient closure evidence rather than duplicating the work with another regression programme.
- #12 Skyscraper Parks / Lakotelep grundokkal: `TODO -> DONE`; current production host-realm evidence supersedes the older ~35 s closure measurement. Five seeds 92001-92005 all pass the exact Parks contract with average generation ~1.91 s and max ~2.23 s.
- #13 remains `TODO` as a UI distinction issue.
- #14 remains `TODO`; Parks2 solver work does not prove the startup-validation false positive is fixed.
- #15 Classic Lakotelep remains a separate known runtime hotspot.

## Additional hard-playtest UX fixes

### Category navigation persistence and ordering

The original remount-time category persistence patch was hardened after live feedback. The selected category now survives the full replace-then-append option rebuild used by difficulty changes and equivalent remounts. When a game is chosen from `All categories`, the UI switches to that game's real category and rebuilds the variant list for that category without dispatching a second game selection. Variant lists are alphabetically ordered in every category and in `All categories`.

A later live release exposed a browser-only mutation loop: the alphabetical sorter observed its own `<option>` reorder mutations and could continuously schedule itself. Production was hardened so an already sorted list causes no DOM writes; `tests/category-mutation-quiescence.test.mjs` covers this browser-observer failure mode. Final release evidence: source `3640264` CLEAN, live `a5fe94f` CLEAN, and the user confirmed categories, alphabetical ordering and game selection all work correctly.

### Sukaku candidate legibility

The original Sukaku renderer exposed each cell's allowed candidate set as one tiny 7px pseudo-text string. The hard-playtest fix replaces that presentation with the same positional 3x3 pencil-mark language used by normal Sudoku notes: digits occupy their canonical 1-9 slots, missing candidates leave empty slots, and the glyph size is increased for readability. A scoped/coalesced hydrator avoids repeated global mutation work. Targeted gate at `ce109ed`: 3/3 PASS; standalone nested CSS import regression: 1/1 PASS. Released in source `5d9de13` / live `de8750e`, with user visual confirmation.

### Samurai control layout

The Samurai board is substantially wider than normal Sudoku and previously competed with the fixed 132px side tool rail inside the same play-surface row. The Samurai-specific responsive CSS moves the controls under the board, constrains the board to the available play-column width, and limits horizontal overflow to the board itself on narrow viewports. Targeted layout + standalone import regression gate at `6d57fcb`: PASS. Final release source `3640264`, live `a5fe94f`; user visually confirmed the Samurai layout is usable.

## Closed runtime work

### Even/Odd Skyscrapers

The manual report described the variant as slightly slow. A production-path benchmark covered seeds 93000-93009 at both focused and expert difficulty. Focused generation was 37.079-145.385 ms (median 62.784 ms), expert generation was 21.393-169.674 ms (median 53.089 ms). All 20 samples were exact unique, variant-essential and locally irreducible. No long-tail runtime failure was reproduced, so no solver/generator change was made; the item is closed as acceptable measured runtime.

### Classic Expert

The intermittent slowdown was reproduced on the production Expert path. Initial 20-seed benchmark (93000-93019) had median 2964.102 ms, p95 4724.045 ms and 2/20 diagnostic 5-second timeouts. Phase profiling showed exact uniqueness was cheap (hundreds of milliseconds total) while repeated human-logical solves dominated runtime. Differential probes showed that the generator collected and locally carved more accepted entry candidates than needed. Production was changed in two evidence-backed steps: `entryCandidates` 4 -> 1, then `entryPool` 8 -> 1. The final profile is `classic-human-runtime-expert-sparse-entry-v8`. Final production benchmark: 20/20 completed, 0 timeouts, 0 errors, min 136.609 ms, median 823.565 ms, p95 3443.835 ms, max 3702.894 ms. All samples remained exact unique, locally irreducible and human levels 6-8. No production timeout or quality relaxation was introduced.

### Nabner

Production hardening established a 192-sample gate with zero failures and Expert runtime p50/p95/max 171.6/294.0/869.9 ms. The later Expert playability closure made the puzzle substantially sparser and retained exact uniqueness, variant-essentiality and local irreducibility; its canonical pathological seed completed in 4701.9 ms in host realm. The much larger VM runtime was documented as harness overhead, so host-realm evidence is authoritative for the hard-playtest runtime claim.

### Sudoku 12x12

The original slowdown was isolated to the Expert local-irreducibility exact checks, not base generation. A 12x12 3x4-box exact-cover/DLX counter was differentially validated against the generic solver before production integration. Differential hotspot evidence preserved identical removal decisions and puzzle while showing a very large solver speedup. Production phase evidence then reduced the local wrapper from roughly 7.6 seconds to roughly 42 ms while retaining exact uniqueness and the local-irreducibility contract.

### Sudoku 16x16

The existing exact DLX solver was retained. Solver-order experiments (known-solution search, reversed row order, dynamic/static column tie-breaks) were rejected when they failed to improve runtime robustly. Removal-order experiments identified a stable hybrid: box-balanced prefix for the first 64 attempts, then the existing seeded order. Production five-seed evidence: min 143.567 ms, median 570.681 ms, max 779.629 ms, givens 91-97, all exact unique and all locally irreducible. No production timeout or artificial clue floor was introduced.

### Skyscraper Parks / Lakotelep grundokkal

The older playability closure recorded a ~35 s canonical host-realm generation path, so the hard-playtest runtime issue remained open even though correctness and local irreducibility were already established. A fresh 2026-09-16 audit replayed the current `index.html` production wiring and found that the active ARC-based exact path is substantially faster. Single-seed evidence (92001): generation 1628.8 ms, exact Parks verification 41.3 ms, exact unique, variant-essential. A five-seed batch (92001-92005) then passed 5/5 with average generation 1908.7 ms and max 2234.0 ms. This closes the original "does not load / freezes" complaint on the current production path. The generic Sudoku variant counter is intentionally not used as the Parks gate because Parks has its own exact `countParkSolutions()` contract.

## Resume rule

Continue with the first genuinely unresolved hard-playtest item, distinguishing verification from development:

1. #3 Little Killer remains VERIFY because runtime is bounded but the Expert local-irreducibility proof is incomplete; do not confuse that proof debt with the original UI-freeze/runtime report.
2. #13 Domino Lakotelep colour distinction is the next straightforward unresolved UI item.
3. #14 Parks2 startup false validation follows; reproduce a legal row containing two parks before changing semantics.
4. #15 Classic Lakotelep remains a separate known runtime hotspot.

Use GitHub-first, precision-first work: measure the real production path first, then optimize only a demonstrated hotspot, preserving exact/quality contracts.
