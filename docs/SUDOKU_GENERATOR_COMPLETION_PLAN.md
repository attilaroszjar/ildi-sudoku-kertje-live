# Sudoku generator completion plan

> **Execution plan, not a competing status ledger.** Current readiness/counts are authoritative only in `docs/DEVELOPMENT_STATUS_AUDIT.md` and `scripts/sudoku-generator-audit-model.mjs`. This file defines sequencing, gates and the execution progress log. Historical plans/iteration notes are evidence only.

## Goal

Reach **77 / 77 CATEGORY A** with the least duplicated work while preserving correctness. Optimize for Category A closures per engineering hour: common proof machinery first, then high-yield RECONCILE closures, then family-wide migrations, then genuinely weak/static generators.

Current canonical state: **77 CATEGORY A / 0 RECONCILE / 0 PARTIAL / 0 LEGACY / 0 STATIC**, unnamed pending **0**.

## Phase 0 — common production-audit foundation — COMPLETE

Reusable audit primitives cover deterministic sampling, symbol-normalized + D4 structural fingerprints, solution/topology/puzzle diversity, timeout/runtime accounting and fail-closed summaries. Acceptance evidence: primitive tests **5/5 PASS**; Combined Killer bounded gate **36/36 PASS**, 0 timeout, 0 contract failure, 4/4 diversity dimensions for all nine variants.

## Phase 1 — high-yield RECONCILE closure — COMPLETE

Batch 1 promoted Little Killer, Clone and Quadruple (**37→40 CATEGORY A**). Batch 2 promoted Fortress, X-Sums and Rossini (**40→43**). Batch 3 promoted Sandwich and Jigsaw (**43→45**) after structural-diversity hardening and a Jigsaw exact-audit correction. Batch 4 promoted Anti-King, Anti-Knight and Non-Consecutive (**45→48**) after seeded rule-aware full-solution generation and Non-Consecutive runtime hardening.

Latest Phase-1 release evidence: standalone rebuilt; development-status regression **3/3 PASS**; `test:release` **PASS**; catalogue **106**; external runtime dependencies **0**; standalone SHA256 `7e8c74f7dfe2fe0a81f0d03022e11cb7aea55ea3f9b3995006fae11f4a07d9cb`.

## Phase 2 — in-scope Skyscraper family — COMPLETE / PROMOTED

The canonical 10-entry family was:

`skyscraper`, `diagonal-skyscrapers`, `inside-skyscrapers`, `killer-skyscrapers`, `product-skyscrapers`, `skyscraper-mixed`, `skyscraper-nontouching`, `skyscraper-parks`, `skyscraper-sums`, `sum-skyscraper-parks`.

Six catalogue-only Skyscraper siblings remain outside the canonical 77 denominator.

### Production correctness/diversity gate — PASS

`scripts/skyscraper-family-production-gate.mjs` bootstraps the actual production runtime order from `index.html`. The first run exposed a shared structural-diversity defect in the standard Sudoku-backed members and an audit-contract mismatch for the Latin-only park members. The standard family was moved to bounded structural generation with exact re-verification; park audit dispatch now uses `countParkSolutions()`. Non-Touching ultimately reuses the proven Anti-King seeded full-solution solver, with a dedicated rule-safe marker.

Final family evidence on 2026-09-10: **all 10 variants PASS**, each with **4/4 completed-solution diversity, 4/4 symbol-normalized D4 structural diversity, 4/4 topology diversity and 4/4 puzzle diversity**, with **0 timeout, 0 failure, 0 exhaustion**. Maximum observed focused sample runtime was **1897 ms**.

### Ordered difficulty gate — PASS

The first difficulty run showed that raw MRV exact-search work is not a reliable monotonic human-difficulty metric for every strongly constrained variant. The audit contract was therefore corrected rather than fabricating scores: generator-level ordering is paired same-seed givens pressure, while raw `difficultyScore` remains visible diagnostic evidence.

Final repeated difficulty evidence: **120/120 production samples PASS** across 10 variants x 3 levels x 4 paired seeds, with **0 timeout and 0 failure**. Every variant had `pairedClueOrder:true`, i.e. Gentle > Focused > Expert for the same seed. Most members use **40 > 32 > 27** givens. `skyscraper-parks` uses **40 > 32 > 30** after its Expert path was hardened to a bounded exact carve from an already exact-verified Focused result; final Expert max runtime was **1491 ms**, replacing the earlier 2/4 timeout behavior without raising the 15000 ms ceiling.

### Release closure — PASS

Post-hardening standalone build completed; development-status regression **3/3 PASS**; `test:release` **PASS**; catalogue **106**; external runtime dependencies **0**; standalone SHA256 `10091e2a13f65d499a4366da23d2f92cdeeae22f560413baf97a34bce7e5a0ea`.

Promotion result: **48→58 CATEGORY A**, **10→0 RECONCILE**.

## Phase 3 — Miracle — COMPLETE / PROMOTED

Miracle combines **Anti-Knight + Anti-King + Non-Consecutive**. The first dedicated audit proved correctness/replay/essentiality but exposed a fixed completed-solution family. The production path was therefore hardened with bounded seeded exact full-solution generation and no fallback, then wired into the real `index.html` runtime.

The structural 1/4 result was investigated rather than hidden. `scripts/miracle-solution-space-audit.mjs` exhaustively proved **72 exact completed solutions, 72 unique enumerated grids, exactly 1 symbol-normalized D4 structural orbit and 0 canonical rejects**. The optimized certificate completed in **835 ms**. The single structural orbit is therefore an exact variant property.

Final real-runtime production evidence: **4/4 PASS**, 0 timeout/failure/exhaustion, 4/4 distinct completed grids, 4/4 distinct puzzles, exact uniqueness, Classic ambiguity, deterministic replay and dedicated production marker; max runtime **1828 ms**. Fixed Miracle rules have no generated topology, so topology diversity is N/A.

Final ordered-difficulty evidence: **12/12 PASS**, 0 timeout/failure, paired 40 > 32 > 27 givens for every seed; max observed runtime **2651 ms**. Raw exact-search `difficultyScore=0` across the bands remains diagnostic only.

Release closure: standalone rebuilt; development-status regression **3/3 PASS**; `test:release` **PASS**; catalogue **106**; external runtime dependencies **0**; standalone SHA256 `6f324cb4c66b902481735538dea5ddedfd358cb658ed8d388343b26f31caa691`.

Promotion result: **58→59 CATEGORY A**, **1→0 PARTIAL**. See `docs/MIRACLE_SOLUTION_SPACE.md` for the solution-space rationale.

## Phase 4 — LEGACY migrations — COMPLETE

Outside/clue family is complete. **Even Sandwich, Next to Nine and Numbered Rooms are promoted** after seeded fresh-solution + regenerated-clue hardening and full modern production/difficulty gates.

Cell/marker family is complete. **Battenburg, MinMax, Quad Sums and Top Heavy are promoted** after shared production and difficulty gates with full solution/structural/topology/puzzle diversity.

Relation/geometric family is complete. **Couples, Reflection, Slingshot, Bishopsgate and Axia are promoted** after shared production and difficulty gates. Bishopsgate uses a fail-closed fixed-rule topology certificate and optimized constrained full-solution generation; no timeout ceiling was raised.

Ordering family is complete. **Ascending Sequences and Running Cells are promoted** after seeded fresh-solution + regenerated-clue hardening. Production gate passed both with full 4/4 solution/structural/topology/puzzle diversity; difficulty gate passed both with paired **40 > 32 > 27** givens.

**Anti-Queen-9 is promoted.** Its fixed completed-solution family was replaced by seeded rule-aware generation. A single timeout remained after the first hardening; without raising the timeout ceiling, generation was optimized by placing the nine queen-constrained 9s before filling the remaining Sudoku cells. Final production and difficulty gates passed. **LEGACY is now 0.**

## Phase 5 — STATIC / GENERIC — COMPLETE

Center Dot, Frame and Sukaku are promoted after the shared production and ordered-difficulty gates passed. The canonical generator programme is now **77 / 77 CATEGORY A**.

## Phase 6 — closure — ACTIVE

At 77/77: regenerate canonical inventory, rebuild standalone, run the full release gate, publish the public status, archive stale competing historical summaries, then resume cross-variant human 1–9 difficulty expansion.

## Work-slice discipline

Every slice: read canonical ledger + this plan; identify missing clauses; make the smallest reusable change; run bounded gates; record exact failures/timeouts; update progress immediately; promote only after direct evidence; regenerate inventory; rebuild standalone when modular runtime changed; run release gate; publish Ildi status only from a clean released source tree.

## Progress log

- **2026-09-09** — Plan established at 37/21/1/15/3; Phase 0 completed; Batches 1 and 2 promoted to 43 CATEGORY A.
- **2026-09-10** — Batch 3 promoted Sandwich + Jigsaw → **45/13/1/15/3**.
- **2026-09-10** — Batch 4 promoted Anti-King + Anti-Knight + Non-Consecutive → **48/10/1/15/3**.
- **2026-09-10** — Phase 2 first production run exposed structural 1/4 in standard Skyscrapers and false-negative exact audit for Latin-only parks.
- **2026-09-10** — Park-aware audit + structural hardening added; Non-Touching moved to the proven Anti-King seeded solver after the first bespoke constructor proved brittle.
- **2026-09-10** — Final Skyscraper production family gate **10/10 PASS**: all four diversity dimensions 4/4 for every variant, 0 timeout/failure/exhaustion, max 1897 ms.
- **2026-09-10** — First ordered-difficulty run: all ten had strict clue-pressure ordering; three showed non-monotonic/flat exact-search diagnostics, and `skyscraper-parks` Expert timed out on 2/4 samples.
- **2026-09-10** — Difficulty contract corrected to paired same-seed givens pressure; raw exact-search score retained as diagnostic. Parks Expert hardened to bounded exact 30-given carve, with no timeout increase.
- **2026-09-10** — Final Skyscraper difficulty gate **PASS**: 120/120 samples, all ten `pairedClueOrder:true`, 0 timeout/failure; Parks Expert max 1491 ms.
- **2026-09-10** — Phase 2 release closure **PASS**: status regression 3/3, release gate PASS, standalone SHA256 `10091e2a13f65d499a4366da23d2f92cdeeae22f560413baf97a34bce7e5a0ea`. Entire ten-entry family promoted. Canonical state **58/0/1/15/3**.
- **2026-09-10** — Miracle first dedicated audit: correctness/replay/essentiality clean, but old production marker and fixed solution family exposed.
- **2026-09-10** — Miracle full-solution hardening v1 measured **3/4 PASS, 1 timeout, structural 1/4**, max completed sample 8607 ms. No promotion.
- **2026-09-10** — Miracle hardening v2 measured **4/4 PASS, 0 timeout, 4/4 distinct solutions, 4/4 puzzles, structural 1/4**, max 1761 ms.
- **2026-09-10** — Optimized Miracle solution-space certificate **PASS**: 72 exact solutions, 72 unique enumerated grids, 1 structural orbit, 0 canonical rejects, final rerun 835 ms.
- **2026-09-10** — Final production-runtime Miracle gate **PASS**: 4/4, 0 timeout/failure, 4/4 solutions, 4/4 puzzles, max 1828 ms.
- **2026-09-10** — Final Miracle ordered difficulty **PASS**: 12/12, paired 40 > 32 > 27 givens for every seed, 0 timeout/failure, max 2651 ms.
- **2026-09-10** — Phase 3 release closure **PASS**: status regression 3/3, release gate PASS, standalone SHA256 `6f324cb4c66b902481735538dea5ddedfd358cb658ed8d388343b26f31caa691`. Miracle promoted. Canonical state **59/0/0/15/3**.
- **2026-09-10** — Phase 4 Even Sandwich baseline: legacy generator already satisfied determinism, exact uniqueness, Classic ambiguity and puzzle diversity, but modern gate exposed fixed completed solution and clue topology (`1/4` solution, structure and topology).
- **2026-09-10** — Even Sandwich hardened with seeded fresh completed solutions and regenerated clues. Production gate **4/4 PASS** with **4/4 solution, structural, topology and puzzle diversity**, 0 timeout/failure/exhaustion, max **323 ms**.
- **2026-09-10** — Even Sandwich difficulty gate **12/12 PASS**, paired givens pressure **40 > 32 > 27**, median measured scores **56 / 140 / 371**, 0 timeout/failure, max **463 ms**. Promoted to Category A. Canonical state **60/0/0/14/3**.
- **2026-09-10** — Next to Nine baseline reproduced the fixed-family defect: **4/4 puzzle diversity**, but only **1/4 solution, structural solution and clue topology**.
- **2026-09-10** — Next to Nine hardened with seeded fresh completed solutions and regenerated adjacent-to-9 clues. Production gate **4/4 PASS** with all four diversity dimensions **4/4**, 0 timeout/failure/exhaustion, max **182 ms**.
- **2026-09-10** — Next to Nine difficulty gate **12/12 PASS**, paired givens pressure **40 > 32 > 27**, median measured scores **42 / 50 / 55**, 0 timeout/failure, max **302 ms**. Promoted to Category A. Canonical state **61/0/0/13/3**.
- **2026-09-10** — Numbered Rooms baseline reproduced the fixed-family defect: **4/4 puzzle diversity**, but only **1/4 solution, structural solution and clue topology**.
- **2026-09-10** — Numbered Rooms hardened with seeded fresh completed solutions and regenerated Nth-cell clues. Production gate **4/4 PASS** with all four diversity dimensions **4/4**, 0 timeout/failure/exhaustion, max **228 ms**.
- **2026-09-10** — Numbered Rooms difficulty gate **12/12 PASS**, paired givens pressure **40 > 32 > 27**, median measured scores **42 / 50 / 55**, 0 timeout/failure, max **239 ms**. Release closure PASS: status regression 3/3, inventory fresh, standalone build PASS, release gate PASS, standalone SHA256 `7312244aff5e5dcf1434b972e7077cef96d851939ffad80422715f15808217e3`. Promoted to Category A. Canonical state **62/0/0/12/3**. Outside/clue family complete.
- **2026-09-10** — Cell/marker family hardened and audited together: Battenburg, MinMax, Quad Sums and Top Heavy all passed production with 4/4 solution, structural, semantic-topology and puzzle diversity. Shared difficulty gate **4/4 variants PASS**, paired **40 > 32 > 27**, max sample **1347 ms**. Release closure PASS with standalone SHA256 `e3c9453e0ad2272dd73862a64877bdc9c1267232818d95f7f18f32ad7d86adac`. Canonical state **66/0/0/8/3**.
- **2026-09-10** — Relation/geometric baseline for Couples, Reflection, Slingshot, Bishopsgate and Axia exposed the common fixed-family defect: each had 4/4 puzzle diversity but 1/4 solution, structural solution and topology.
- **2026-09-10** — Relation/geometric hardening added fresh solution/topology generation. Couples, Reflection, Slingshot and Axia reached full 4/4 diversity. Bishopsgate required a dedicated constrained solver and fixed-rule topology certificate.
- **2026-09-10** — Bishopsgate initially timed out on two production seeds. The 15000 ms ceiling was not raised; its solver was optimized with diagonal bitmasks. The previously timing-out seeds passed in **11314 ms** and **5948 ms**.
- **2026-09-10** — Final relation/geometric production family gate **5/5 PASS**. Couples, Reflection, Slingshot and Axia had 4/4 solution/structural/topology/puzzle diversity; Bishopsgate had 4/4 solution/structural/puzzle diversity plus **fixedRule=PASS**, max **11539 ms**.
- **2026-09-10** — Relation/geometric difficulty gate **5/5 PASS**, paired **40 > 32 > 27** for every variant. Max runtimes: Couples 164 ms, Reflection 197 ms, Slingshot 120 ms, Bishopsgate 3814 ms, Axia 1251 ms. Promoted to Category A. Canonical state **71/0/0/3/3**.
- **2026-09-10** — Ordering baseline for Ascending Sequences and Running Cells reproduced the fixed-family defect: each had **4/4 puzzle diversity** but only **1/4 solution, structural solution and clue topology**.
- **2026-09-10** — Ordering family hardened with fresh seeded completed solutions and regenerated clues. Final production gate **2/2 variants PASS** with 4/4 solution/structural/topology/puzzle diversity; max runtimes **318 ms** and **395 ms**.
- **2026-09-10** — Ordering difficulty gate **2/2 PASS**, paired **40 > 32 > 27** for both variants. Ascending scores **58 / 141 / 1214**, max **1834 ms**; Running Cells scores **54 / 99.5 / 1039.5**, max **4222 ms**. Promoted to Category A. Canonical state **73/0/0/1/3**.

- **2026-09-10** — Anti-Queen-9 baseline exposed the final LEGACY fixed-family defect: 4/4 puzzles but only 1/4 completed and structural solutions; fixed-rule certificate PASS.
- **2026-09-10** — First Anti-Queen-9 hardening reached 3/4 with one 15000 ms timeout. The timeout was not increased. Queen-digit-first constrained generation reduced the previously timing-out seed to **131 ms**.
- **2026-09-10** — Final Anti-Queen-9 production gate **PASS**: 4/4 completed solutions, 4/4 structural solutions, 4/4 puzzles, fixed-rule certificate PASS, max **127 ms**. Difficulty gate PASS with paired **40 > 32 > 27**, scores **42 / 50 / 254.5**, max **226 ms**. Promoted to Category A. Canonical state **74/0/0/0/3**; Phase 4 LEGACY migrations complete.

- **2026-09-10** — Final-three baseline: Center Dot 1/4 structural, Frame 1/4 solution/structure/topology, Sukaku 1/4 solution/structure while candidate topology was already 4/4.
- **2026-09-10** — Frame and Sukaku fresh-solution hardening passed immediately. Center Dot first reached 4/4 completed solutions but only 3/4 structural orbit diversity.
- **2026-09-10** — Center Dot moved to dedicated seeded constrained full-solution generation under the nine box-centre all-different house. Final production gate **3/3 variants PASS**: Center Dot 4/4 solution/structural/puzzle with fixed-rule certificate PASS; Frame and Sukaku 4/4 across all applicable diversity dimensions.
- **2026-09-10** — Final-three difficulty gate **PASS**: all three variants paired **40 > 32 > 27**, zero timeout/failure; max runtimes Center Dot 293 ms, Frame 146 ms, Sukaku 267 ms.
- **2026-09-10** — Final three promoted. Canonical generator state reaches **77/0/0/0/0**. The strict 77-entry standard 9×9 Sudoku generator-quality programme is complete.
