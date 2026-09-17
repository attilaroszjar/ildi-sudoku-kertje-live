# Development status audit

> **CANONICAL DEVELOPMENT STATUS.** This is the single human-readable readiness ledger. `scripts/sudoku-generator-audit-model.mjs` is the matching machine-readable ID model. Historical audit/status files are evidence only and must not override this ledger.

## Strict 9x9 Sudoku generator contract

The canonical denominator is **77 standard 9x9 Sudoku variants**. `CATEGORY A` requires direct evidence for every applicable clause: valid completed solution under exact rules; exact variant uniqueness; Classic ambiguity / variant essentiality where applicable; deterministic replay; bounded generation with no best-effort fallback; completed-solution diversity; symbol-normalized + D4 structural diversity; constraint/topology diversity where applicable; ordered difficulty; bounded production runtime; production wiring; targeted regression/bounded quality audit; standalone build + release gate.

Human 1-9 expansion remains deferred until this generator programme closes.

## Current canonical counts

| State | Count |
|---|---:|
| CATEGORY A | **77 / 77** |
| RECONCILE | **0 / 77** |
| PARTIAL | **0 / 77** |
| LEGACY | **0 / 77** |
| STATIC / GENERIC | **0 / 77** |
| Unnamed pending | **0** |

The five states sum exactly to **77** and are fail-closed in `scripts/sudoku-generator-audit-model.mjs`.

## CATEGORY A — 77

Previously proven baseline: Classic; Diagonal; Hyper; Disjoint Groups; Kropki; XV; Consecutive; Greater Than; Odd / Even; Whispers; Renban; Between; Zipper; Dutch Whispers; Parity Line; Nabner; Palindrome; Lockout; Entropic; Modular; Thermo; Slow Thermo; Region Sum Line; Argyle; Arrow; Killer; Asterisk; Magic Square; Killer Thermo; Killer Arrow; Killer Palindrome; Killer Zipper; Killer Entropic; Killer Modular; Killer Renban; Killer Dutch Whispers; Killer Lockout.

Phase-1 promotions: Little Killer, Clone, Quadruple; Fortress, X-Sums, Rossini; Sandwich, Jigsaw; Anti-King, Anti-Knight, Non-Consecutive.

Phase-2 promotion: Skyscraper, Diagonal Skyscrapers, Inside Skyscrapers, Killer Skyscrapers, Product Skyscrapers, Mixed Skyscraper, Non-Touching Skyscraper, Skyscraper Parks, Skyscraper Sums, Sum Skyscraper Parks.

Phase-3 promotion: Miracle Sudoku.

Phase-4 promotions: Even Sandwich; Next to Nine; Numbered Rooms; Battenburg; MinMax; Quad Sums; Top Heavy; Couples; Reflection; Slingshot; Bishopsgate; Axia; Ascending; Running Cells; Anti-Queen-9.

Phase-5 promotions: Center Dot; Frame; Sukaku.

### Skyscraper family acceptance evidence

The final production family gate passed **10/10**. Every member produced **4/4 completed-solution diversity, 4/4 symbol-normalized D4 structural diversity, 4/4 topology diversity and 4/4 puzzle diversity**, with **0 timeout, 0 failure and 0 exhaustion**. The two Latin-only park variants are audited with their production `countParkSolutions()` contract, and Non-Touching uses a rule-safe seeded full-solution path.

The ordered-difficulty gate then passed all **120/120** production samples across 10 variants x 3 levels x 4 paired seeds. Every member had `pairedClueOrder:true`: Gentle > Focused > Expert by same-seed givens pressure. Raw MRV exact-search `difficultyScore` remains diagnostic only and is intentionally not required to be monotonic. The Skyscraper Parks Expert path was hardened from the earlier 2/4-timeout behavior to a bounded exact 30-given carve; the final difficulty rerun had **0 timeouts** and max Expert runtime **1491 ms** for that member.

Release closure after these changes: development-status regression **3/3 PASS**; `test:release` **PASS**; catalogue **106**; external runtime dependencies **0**; standalone SHA256 `10091e2a13f65d499a4366da23d2f92cdeeae22f560413baf97a34bce7e5a0ea`.

### Miracle Sudoku acceptance evidence

Miracle combines **Anti-Knight + Anti-King + Non-Consecutive**. Its production hardening is wired through the real `index.html` runtime and uses bounded seeded full-solution generation with no best-effort fallback, followed by exact variant uniqueness and Classic-ambiguity verification.

The exhaustive solution-space certificate passed: **72/72** completed Miracle grids, **72 enumerated unique**, **0 canonical rejects**, and exactly **1 symbol-normalized D4 structural orbit**. The optimized dedicated bitmask MRV enumerator required 645198 nodes and completed in **835 ms**, with every completed grid reverified through the canonical exact solver. The single structural orbit is therefore an exact variant property.

The production gate then passed **4/4** real-runtime samples with **0 timeout/failure/exhaustion**, **4/4 distinct completed grids**, **4/4 distinct puzzles**, exact uniqueness, Classic ambiguity, deterministic replay and the dedicated production marker. Maximum observed runtime was **1828 ms**. Generated constraint topology is fixed for Miracle, so topology diversity is not applicable.

The ordered-difficulty gate passed all **12/12** samples across Gentle / Focused / Expert with **0 timeout/failure** and strict paired same-seed givens pressure **40 > 32 > 27**. Raw exact-search `difficultyScore` was 0 at all three levels and remains diagnostic only.

Phase-3 release closure: standalone rebuilt; development-status regression **3/3 PASS**; `test:release` **PASS**; catalogue **106**; external runtime dependencies **0**; standalone SHA256 `6f324cb4c66b902481735538dea5ddedfd358cb658ed8d388343b26f31caa691`.

### Even Sandwich acceptance evidence

The Phase-4 production gate passed **4/4** real-runtime samples with **0 timeout/failure/exhaustion**. After seeded fresh-solution and clue regeneration hardening, the four samples produced **4/4 completed solutions, 4/4 symbol-normalized D4 structural solutions, 4/4 clue topologies and 4/4 puzzles**, while preserving exact variant uniqueness, Classic ambiguity, deterministic replay, `unique=true` and `variantEssential=true`. Maximum observed production-gate runtime was **323 ms**.

The ordered-difficulty gate then passed **12/12** samples across Gentle / Focused / Expert with **0 timeout/failure** and strict paired same-seed givens pressure **40 > 32 > 27**. Median measured difficulty scores were **56 / 140 / 371** and the maximum observed runtime was **463 ms**.

### Next to Nine acceptance evidence

The Phase-4 baseline reproduced the same fixed-family defect as Even Sandwich: **4/4 distinct puzzles** but only **1/4 completed solution, 1/4 structural solution and 1/4 clue topology**. The production path was hardened with seeded fresh completed solutions and clue regeneration derived from each solution, while retaining bounded retries and exact re-verification.

The final production gate passed **4/4** with **4/4 completed solutions, 4/4 symbol-normalized D4 structural solutions, 4/4 clue topologies and 4/4 puzzles**, **0 timeout/failure/exhaustion**, exact variant uniqueness, Classic ambiguity, deterministic replay, `unique=true` and `variantEssential=true`. Maximum observed runtime was **182 ms**.

The ordered-difficulty gate passed **12/12** samples with strict paired same-seed givens pressure **40 > 32 > 27**, **0 timeout/failure**, median measured difficulty scores **42 / 50 / 55**, and maximum runtime **302 ms**.

### Numbered Rooms acceptance evidence

The Phase-4 baseline showed the same legacy fixed-family defect: **4/4 distinct puzzles** but only **1/4 completed solution, 1/4 structural solution and 1/4 clue topology**. The production path was hardened with seeded fresh completed solutions and regenerated Numbered Rooms clues derived from each solution, with bounded retries and exact re-verification.

The final production gate passed **4/4** with **4/4 completed solutions, 4/4 symbol-normalized D4 structural solutions, 4/4 clue topologies and 4/4 puzzles**, **0 timeout/failure/exhaustion**, exact variant uniqueness, Classic ambiguity, deterministic replay, `unique=true` and `variantEssential=true`. Maximum observed runtime was **228 ms**.

The ordered-difficulty gate passed **12/12** samples with strict paired same-seed givens pressure **40 > 32 > 27**, **0 timeout/failure**, median measured difficulty scores **42 / 50 / 55**, and maximum runtime **239 ms**. Release closure then passed development-status regression **3/3**, inventory freshness, standalone rebuild and `test:release`; standalone SHA256 `7312244aff5e5dcf1434b972e7077cef96d851939ffad80422715f15808217e3`.

### Cell / marker family acceptance evidence

Battenburg, MinMax, Quad Sums and Top Heavy all passed the shared production family gate with **4/4 completed-solution diversity, 4/4 symbol-normalized D4 structural diversity, 4/4 semantic topology diversity and 4/4 puzzle diversity**. Top Heavy uses its active vertical same-parity relation pattern as semantic topology rather than empty `data`.

The shared difficulty gate passed **4/4 variants**, all with paired same-seed clue pressure **40 > 32 > 27**. Maximum observed sample runtime across the family was **1347 ms**. Release closure passed development-status regression, inventory freshness, standalone build and release gate; standalone SHA256 `e3c9453e0ad2272dd73862a64877bdc9c1267232818d95f7f18f32ad7d86adac`.

### Relation / geometric family acceptance evidence

The initial shared production baseline showed the same fixed-family legacy defect across Couples, Reflection, Slingshot, Bishopsgate and Axia: **4/4 puzzle diversity** but only **1/4 solution, structural solution and topology**. The family was hardened with seeded fresh completed solutions and regenerated relation/topology data. Bishopsgate uses a dedicated rule-preserving constrained full-solution path because arbitrary Sudoku row/column transforms would not preserve its checkerboard diagonal rule.

Final production evidence: Couples, Reflection, Slingshot and Axia each passed with **4/4 completed solutions, 4/4 symbol-normalized D4 structural solutions, 4/4 semantic topologies and 4/4 puzzles**. Bishopsgate passed with **4/4 completed solutions, 4/4 structural solutions and 4/4 puzzles**; its checkerboard-bishop geometry is definitionally fixed, so the single topology is covered by a fail-closed **fixed-rule certificate PASS** rather than an artificial 4/4 topology requirement. Exact variant uniqueness, Classic ambiguity and deterministic replay passed for every member.

Two Bishopsgate seeds initially exceeded the 15000 ms worker ceiling. The timeout was not raised. Its constrained full-solution search was optimized with maintained row/column/box plus diagonal bitmasks; the previously timing-out seeds then passed in **11314 ms** and **5948 ms**. The final shared production family gate passed all five members, with Bishopsgate max runtime **11539 ms** and no timeout.

The shared ordered-difficulty gate passed **5/5 variants** across all Gentle / Focused / Expert samples, with strict paired same-seed givens pressure **40 > 32 > 27** throughout. Maximum observed difficulty-gate runtimes were Couples **164 ms**, Reflection **197 ms**, Slingshot **120 ms**, Bishopsgate **3814 ms**, and Axia **1251 ms**.

### Ordering family acceptance evidence

Ascending Sequences and Running Cells initially showed the same legacy fixed-family defect: **4/4 puzzle diversity** but only **1/4 completed solution, 1/4 structural solution and 1/4 clue topology**. The production path was hardened with seeded fresh completed solutions and each variant's clues regenerated directly from that solution.

The final shared production gate passed both variants with **4/4 completed-solution diversity, 4/4 symbol-normalized D4 structural diversity, 4/4 clue-topology diversity and 4/4 puzzle diversity**. Maximum observed production runtime was **318 ms** for Ascending Sequences and **395 ms** for Running Cells.

The shared ordered-difficulty gate passed both variants across Gentle / Focused / Expert with strict paired same-seed givens pressure **40 > 32 > 27**, zero reported failure, and maximum observed runtimes **1834 ms** for Ascending Sequences and **4222 ms** for Running Cells. Median measured difficulty scores were **58 / 141 / 1214** and **54 / 99.5 / 1039.5**, respectively.

### Anti-Queen-9 acceptance evidence

The legacy baseline passed fixed-rule validation and puzzle diversity, but exposed a fixed completed-solution family: **1/4 completed solutions and 1/4 symbol-normalized D4 structural solutions**, while producing **4/4 puzzles**. Anti-Queen-9 was therefore moved to seeded constrained completed-solution generation under the actual rule that the digit 9 may not repeat on any chess-queen diagonal.

The first hardened production run reached **3/4** completed-solution, structural and puzzle diversity, with one seed timing out under the existing 15000 ms ceiling. The timeout ceiling was not raised. Full-solution generation was changed to place the nine queen-constrained 9s first, then fill the remaining cells with Sudoku MRV search. The previously timing-out seed then passed in **131 ms**.

The final production gate passed with **4/4 completed solutions, 4/4 symbol-normalized D4 structural solutions and 4/4 puzzles**, exact variant uniqueness, Classic ambiguity and deterministic replay. The Anti-Queen constraint geometry is definitionally fixed, so topology is covered by a fail-closed **fixed-rule certificate PASS** rather than an artificial 4/4 topology requirement. Maximum observed production runtime was **127 ms**.

The ordered-difficulty gate passed all Gentle / Focused / Expert samples with paired same-seed givens pressure **40 > 32 > 27**, median measured difficulty scores **42 / 50 / 254.5**, zero timeout/failure and maximum runtime **226 ms**.

### Final-three acceptance evidence

Center Dot, Frame and Sukaku were the final STATIC / GENERIC entries.

The shared production baseline exposed a fixed completed-solution family in all three. Center Dot and Frame also showed fixed topology/clue topology, while Sukaku already had 4/4 candidate-set topology and puzzle diversity.

Frame was hardened with seeded fresh completed solutions and regenerated 36 outside frame sums. Sukaku was hardened with seeded fresh completed solutions while retaining its candidate-set puzzle representation. Center Dot required dedicated constrained full-solution generation under the additional all-different house formed by the nine 3×3 box-centre cells; simple Sudoku symmetry transforms were insufficient for guaranteed structural-orbit diversity.

The final production gate passed all three. Center Dot achieved **4/4 completed solutions, 4/4 symbol-normalized D4 structural solutions and 4/4 puzzles**, with its definitionally fixed centre-cell region covered by **fixedRule=PASS**; max runtime **212 ms**. Frame achieved **4/4 solution, structural, topology and puzzle diversity**, max **122 ms**. Sukaku achieved **4/4 solution, structural, candidate-topology and puzzle diversity**, max **21 ms**.

The final-three difficulty gate passed all three across Gentle / Focused / Expert with strict paired same-seed givens pressure **40 > 32 > 27** throughout, zero timeout/failure. Median measured difficulty scores were Center Dot **42 / 50 / 74**, Frame **42 / 50 / 55**, Sukaku **42 / 50 / 85**. Maximum observed runtimes were **293 ms**, **146 ms**, and **267 ms** respectively.

This promotes the final three entries and closes the canonical 77-entry programme at **77 / 77 CATEGORY A**.

## RECONCILE — 0

No canonical 77-entry Sudoku generator remains in RECONCILE.

## PARTIAL — 0

No canonical 77-entry Sudoku generator remains in PARTIAL. Miracle Sudoku was promoted after the full Phase-3 strict evidence set passed.

## LEGACY — 0

No canonical 77-entry Sudoku generator remains in LEGACY.

## STATIC / GENERIC — 0

No canonical 77-entry Sudoku generator remains in STATIC / GENERIC.

## Broad catalogue scope

The historical catalogue-quality audit remains **106 / 106** and is separate from the strict 77-entry generator programme. Six additional catalogue-only Skyscraper siblings remain outside the 77 denominator.

## Execution programme

Sequencing and the detailed progress log live in `docs/SUDOKU_GENERATOR_COMPLETION_PLAN.md`, which is subordinate to this ledger for readiness and counts.

**Current phase: generator programme COMPLETE. Canonical state is 77 CATEGORY A / 0 RECONCILE / 0 PARTIAL / 0 LEGACY / 0 STATIC.**

## Public status-page semantics

Ildi's public status page is generated from the same canonical ID model. Internal machine states remain `CATEGORY_A / RECONCILE / PARTIAL / LEGACY / STATIC_GENERIC`; the public UI uses plain Hungarian labels: **Teljesen kész**, **Majdnem kész**, **Fejlesztés alatt**, **Régi generátor**, **Új generátor kell**. The live game links to `status.html?v=<sourceHead>` so each publish gets a versioned status URL.

## Maintenance invariant

Any generator/solver/audit/runtime/difficulty/release status change must update this ledger in the same evidence slice. Historical documents may remain for traceability, but stale completion summaries or next-step lists are non-authoritative.
