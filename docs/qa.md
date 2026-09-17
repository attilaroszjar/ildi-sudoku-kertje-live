# Quality Assurance

## Automated result

Command run from the project directory on 2026-08-24:

```sh
node --test tests/logic.test.js
```

Result: **6 tests passed, 0 failed**.

Coverage exercised:

- 16 seeds at each Latin size (48 generated puzzles), checking clue consistency, Latin validity, and exactly one solution;
- every curated Picture Logic board, checking clue derivation and exactly one solution with a line-domain solver;
- corner, edge, and centre Crosslight masks plus 50 generated seeds at each size (150 boards), replayed to solved state;
- Codebreaker exact/misplaced scoring, including repeated-colour edge cases and deterministic secrets;
- every sliding layout for bounds, overlap, BFS solvability, legal path replay, and victory detection;
- all local HTML asset references, registry script presence, classic-script loading, and absence of remote runtime dependencies or network APIs.

JavaScript syntax was also checked with `node --check` for every shared and game script.

## Static integration review

The assembled `index.html`, stylesheet, registration order, game mount lifecycle, New/Restart flow, difficulty switching, launcher filtering, dialogs, visible status, keyboard handlers, responsive breakpoints, accessible names, and reduced-motion rule were inspected directly.

## Browser boundary

This workspace contains the Playwright library but no installed Chromium, Firefox, or WebKit executable. Browser download is unavailable here, so no real-browser click-through, screenshot, `file://` console capture, or viewport claim is made. The app is designed for direct local opening, and the portability audit verifies every referenced asset is present.

For a final local smoke check, open `index.html`, enter every game, make one legal and one blocked move, use Restart/New/Back, switch difficulties, use the guide and theme buttons, and resize once below 900 px. No network should be requested.

## Sudoku expansion validation

Iteration 1 adds `tests/sudoku.test.js`. It verifies that all 21 shipped Sudoku variants have matching givens/solutions, valid standard Sudoku solutions, and valid variant-specific constraint metadata/solutions across cages, lines, edge relations, anti-constraints, outside clues, parity, diagonals, and Hyper regions.

The original six automated Logic Room test groups continue to pass unchanged. JavaScript syntax checks pass for both new Sudoku files.

Browser automation was attempted in the build environment, but the available headless Chromium process did not complete within the execution window. The package therefore does not claim a completed automated visual/browser interaction pass for this iteration; deterministic code and data checks are the verified baseline.


## Sudoku expansion validation — iteration 2

Iteration 2 adds `tests/sudoku-iteration2.test.js` and extends the library from 21 to 36 rule systems. The full deterministic suite was run together:

```sh
node --test tests/logic.test.js tests/sudoku.test.js tests/sudoku-iteration2.test.js
```

Result: **11 tests passed, 0 failed**. The new checks validate all 15 added solutions and givens plus Palindrome, Parity Line, Entropic, Modular, Region Sum, Quadruple, Clone, X-Sums, Rossini, Fortress, Slow Thermo, Zipper, Center Dot, Disjoint Groups, and 6×6 2×3-box invariants. JavaScript syntax checks also pass for the iteration-2 bank and updated Sudoku renderer.


## Sudoku expansion validation — iteration 3

Iteration 3 adds `tests/sudoku-iteration3.test.js`, expands the catalogue from 36 to **49** rule systems, and introduces the seeded unique-board generator. The full dependency-free suite is run with:

```sh
node --test tests/*.test.js
```

Verified checks include all 13 newly added rule systems/combinations, every generated board matching its completed solution, standard Sudoku uniqueness for generated boards across the complete 49-variant catalogue, 64 consecutive Classic Sudoku seeds producing at least 60 distinct clue layouts, and monotonic clue density across Gentle / Focused / Expert. All JavaScript files also pass `node --check`.

The generator contract is intentionally conservative: generated clue layouts are proved unique under normal Sudoku alone, which guarantees they remain uniquely solvable when the variant constraint is added. It does not yet claim that the variant constraint is logically essential in every generated puzzle.


## Iteration 4 QA

22 automated tests pass. New checks validate Miracle constraints, Lo Shu magic-square sums, Asterisk/Argyle uniqueness groups, Jigsaw region connectivity and digit coverage, and repeated Jigsaw generation with uniqueness proven by an irregular-region solver. All JavaScript files also pass `node --check`.


## Iteration 5 QA

Automated checks validate 58 catalogue entries, 12x12 and 16x16 row/column/box invariants, seeded large-grid generation, Sukaku candidate compatibility, and Samurai's 369 active cells plus all five overlapping 9x9 solutions. Full project regression remains offline and dependency-free.

## Iteration 7 personal-design regression

- Sudoku catalogue remains 58 variants; no gameplay systems changed.
- Hungarian remains the default language and English remains selectable.
- Branding is personalized as **Ildi Sudoku Kertje** / **Ildi's Sudoku Garden**.
- The former long left-hand variant list is removed from runtime markup generation.
- Navigation now uses a compact category selector plus variant selector with localized labels and counts.
- All JavaScript syntax checks and the full existing Sudoku regression suite pass.

## Iteration 8 garden-dashboard regression

- Full existing Sudoku test suite passes after the layout refactor.
- The personal-design test now checks the category sidebar, external category/variant selectors, favourites and local statistics hooks, bilingual Ildi branding, and the event bridge between the catalogue and dashboard.
- Every JavaScript asset passes `node --check`.
- No Sudoku rules, puzzle banks, generators, or catalogue entries were changed in this design-only iteration.
- A real Chromium executable is present in the build environment, but the headless screenshot process did not terminate in the available execution window because the runtime cannot connect to its expected DBus services. No screenshot-based visual claim is made from the build environment; deterministic regression and static integration are verified.


## Iteration 9 cat-garden regression

- The catalogue remains exactly 58 Sudoku variants.
- The new seven-category presentation partitions all 58 variants without duplication or omission.
- Cat branding and decorative illustrations are local inline SVG/CSS, preserving direct `file://` portability.
- The complete existing Sudoku regression suite passes unchanged after the design and navigation grouping refactor.
- Every JavaScript file passes `node --check`; no remote runtime assets were introduced.

## Iteration 10 QA

Automated deterministic suite:

```bash
node --test tests/*.test.js
```

Result: **29 tests passed, 0 failed**.

New `tests/sudoku-iteration6.test.js` coverage verifies:

- catalogue grows from 58 to 60 exactly;
- Anti-Queen (9) completed grid satisfies standard Sudoku plus the nominated-digit diagonal restriction;
- every shipped Quad Sums dot satisfies the one-equals-sum-of-other-three rule;
- HU/EN coverage includes both new systems;
- repeated seeds are reproducible;
- multiple seeds produce diverse clue layouts;
- every tested generated puzzle has exactly one solution under its variant rule;
- the same puzzle has more than one solution under ordinary Sudoku alone, proving the variant rule is essential.

The title de-duplication is covered statically by the Cat Garden regression: the internal renderer no longer appends a second `sudoku-variant-title` heading below the Cat Garden card heading.

All JavaScript assets pass `node --check`. Runtime dependency audit confirms the application scripts/styles referenced by `index.html` are local relative files. A real Chromium `file://` smoke run was attempted, but headless Chromium did not terminate in this environment because its DBus services are unavailable; therefore no successful browser/visual QA claim is made for this iteration.


## Iteration 11 QA

Automated regression: **33/33 tests PASS**. New coverage verifies the 61-item catalogue, exact Battenburg positive/negative marking topology, deterministic seeded generation, variant-aware uniqueness, and variant-essential behavior (Classic Sudoku alone has multiple solutions for tested generated boards). Pencil-mark wiring is checked for note-mode state, pointer/keyboard paths, ARIA state, bilingual labels, and small-number CSS rendering.

Additional checks:
- every project JavaScript file passes `node --check`;
- targeted runtime-network audit finds no remote scripts, styles, images, `fetch`, XHR, WebSocket, EventSource, remote dynamic imports, or remote CSS URLs;
- the `http://www.w3.org/2000/svg` strings in `createElementNS` are XML namespace identifiers, not network dependencies;
- Chromium `file://` smoke execution was attempted but timed out due DBus errors, so no browser-rendering PASS is claimed.


## Iteration 12 QA

Full deterministic regression:

```sh
node --test tests/*.test.js
```

Result: **38/38 tests PASS**. New coverage verifies the 63-item catalogue, Reflection sequence equality, Slingshot source/distance/direction semantics, deterministic generation, variant-aware uniqueness, variant-essential behavior, rendering hooks, and safe pencil-note peer pruning.

Every JavaScript file is syntax-checked with `node --check`. Runtime dependency audit continues to require local scripts/styles and rejects network APIs/remote asset URLs. ZIP integrity is checked after packaging.

## Iteration 13 QA

- katalógus: 65 variáns;
- új solver/regresszió: Axia + Couples;
- Axia marker density: 15; Couples marker density: 36;
- tesztelt seedek és difficulty-k: reprodukálható, variant-unique, variant-essential;
- constraint-aware note cleanup lefedve statikus hook/regressziós teszttel;
- Cat Garden hét kategóriája továbbra is minden variánst pontosan egyszer fed le.

### Iteration 13 final run

- `node --check` minden `assets/`, `games/`, `tests/` JavaScript fájlra: PASS.
- `node --test tests/*.test.js`: **43/43 PASS**.
- runtime network dependency grep (`http(s)` script/link, fetch, XHR, WebSocket, EventSource, sendBeacon): PASS, nincs találat.
- katalógus audit: **65** variáns; Axia 15 marker; Couples 36 marker.
- Chromium `file://` smoke tesztet ténylegesen megkíséreltük, de a headless Chromium a környezet hiányzó DBus socketje miatt 12 másodperces timeouttal leállt. Emiatt vizuális/browser QA PASS nincs állítva.


## Iteration 14 QA

- katalógus: **67** variáns;
- új tesztek: Running Cells pontos running-cell számolás, Ascending Sequences maximális növekvő szakasz számolás, 18+18 outside clue, seed reprodukálhatóság, variant-aware egyediség és variant-essential bizonyítás;
- UI/statikus integráció: új bank betöltés, HU/EN copy, 18-clue renderer, forgatási útvonal, reszponzív clue-stílus;
- teljes regresszió: **48/48 PASS** a fejlesztési futásban.

A végső átadásnál a teljes suite mellett ismét futtatandó minden JavaScriptre `node --check`, runtime hálózati dependency audit és ZIP-integritás. Browser PASS csak sikeresen lezáruló valódi böngészős futás esetén állítható.

### Iteration 14 final browser boundary

A valódi Chromium `file://` smoke futás meg lett kísérelve `--headless --dump-dom` módban. A folyamat 12 másodperces timeouttal (`exit 124`) állt le; stderrben a környezet hiányzó `/run/dbus/system_bus_socket` DBus socketje szerepelt. Emiatt browser/visual PASS nincs állítva, csak a determinisztikus Node, statikus integrációs és csomagszintű ellenőrzések számítanak igazolt PASS-nak.

## Iteration 15 QA

- Új célzott teszt: `tests/sudoku-iteration11.test.js`.
- Katalógus: 69 rendszer.
- Bishopsgate: classic-valid solution + aktív checkerboard-színen teljes anti-bishop ellenőrzés.
- Min/Max: minden marker szigorú ortogonális lokális minimum/maximum ellenőrzése.
- Mindkét új rendszer: 3 nehézség × 3 seed, determinisztikus generálás, variant uniqueness, classic multi-solution / variant-essential ellenőrzés.
- Teljes regresszió fejlesztési futásban: **53/53 PASS**.

### Iteration 15 browser boundary

A Chromium `file://` smoke tesztet újra megkíséreltük `--headless --no-sandbox --disable-dev-shm-usage --dump-dom` módban. A folyamat 15 másodperc után timeouttal (`rc=124`) állt le; stderrben ismét hiányzó `/run/dbus/system_bus_socket` és DBus kapcsolat hibák jelentek meg. Emiatt **nem állítunk browser/visual PASS-t**. A determinisztikus Node-alapú regresszió, syntax és offline audit ettől függetlenül PASS.

## Iteration 16 QA

- Added 5 targeted tests for catalogue growth, exact Numbered Rooms clue semantics, exact Next to Nine neighbour sets, deterministic/unique/variant-essential generation across all difficulties, and runtime/i18n/index wiring.
- Full regression after implementation: 58/58 checks pass (15 test files; historical tests retain their original per-iteration catalogue baselines).
- New systems checked with seeds 11, 71 and 2026 at gentle/focused/expert difficulty: variant solver = 1 and classic solver > 1.
- Shared outside-clue index is covered by source-wiring assertions and by the existing Running Cells / Ascending Sequences regressions.

- Chromium `file://` smoke attempt on 2026-08-25: **not a browser PASS**. Headless Chromium timed out (`124`) after DBus connection errors because `/run/dbus/system_bus_socket` is unavailable in the execution environment.


## Iteration 17 QA

- Added `tests/sudoku-iteration13.test.js` with 5 targeted checks.
- Catalogue growth: 71 → 73 systems.
- Even Sandwich: exact complete clue-set semantics checked for all 18 row/column clues.
- Top-Heavy Parity: every vertical same-parity pair in the completed grid is checked.
- Both variants tested at gentle/focused/expert with seeds 17, 73 and 2026: deterministic output, variant solver = 1, classic solver > 1.
- Full development regression after integration: **63/63 PASS** across 16 test files.
- Chromium `file://` smoke attempt on 2026-08-25: **not a browser PASS**. `chromium --headless --no-sandbox --disable-dev-shm-usage --disable-gpu --dump-dom` timed out after 15 seconds (`rc=124`); stderr again reports unavailable `/run/dbus/system_bus_socket`, and no DOM was produced.


## Iteration 18 QA — Lakótelep family

- Catalogue growth: 73 → **76** systems.
- New targeted tests: **6/6 PASS**.
- Full automated regression after implementation: **69/69 PASS**.
- Skyscraper Sums clues are recomputed from each completed solution and compared with stored sums.
- Mixed Information clues are checked against the documented OR semantics.
- Non-touching solution is checked for all displayed visibility clues and every diagonal neighbour pair.
- All three generators were tested on gentle/focused/expert with seeds 18, 76 and 2026: deterministic, `variant solver == 1`, `classic solver > 1`, `variantEssential == true`.
- Non-touching candidate cleanup wiring is covered by source-level regression.
- Chromium `file://` smoke test attempted with installed `/usr/bin/chromium`; result `rc=124` timeout because `/run/dbus/system_bus_socket` is unavailable. Browser/visual PASS is therefore **not claimed**.
- Runtime network audit ignores the standard SVG XML namespace literal (`http://www.w3.org/2000/svg`); no actual fetch/XHR/WebSocket/import or external runtime URL is present.


## Iteration 19

- Catalogue growth: 76 → **78** systems.
- New targeted tests validate one park + heights 1–8 in every row/column, park-transparent visibility counts/sums, deterministic generation, uniqueness with the variant rules, and outside-clue essentiality.
- UI wiring test covers the `🌿` park symbol, `P` keyboard input, 3×3-box suppression, bilingual copy, and Iteration 15 bank script loading.
- Chromium `file://` smoke attempt on the fresh package: `rc=124` timeout with DBus/UPower bus errors; therefore no browser/visual PASS is claimed.

## Iteration 20 QA

- 2 új variáns, katalógus: 80 rendszer.
- Célzott tesztek: Inside source-value visibility, Diagonal sightline clue correctness, seeded determinism, három difficulty, uniqueness, variant-essential, renderer/rotation/i18n wiring.
- Teljes regresszió: 79/79 PASS a munkakönyvtárban.
- JS syntax audit: PASS.
- Runtime network dependency audit: PASS.
- Chromium `file://` smoke attempt: `rc=124`, DBus connection errors in the runner; browser/visual PASS not claimed.


## Iteration 21 QA

- Katalógus: 80 → **82** rendszer.
- Új célzott teszt: `tests/sudoku-iteration17.test.js`, 5 ellenőrzés.
- Product Skyscrapers: minden tárolt külső product clue újraszámolva a solutionből.
- Killer Skyscrapers: minden visibility clue és minden cage sum/no-repeat szabály ellenőrizve.
- Mindkét új rendszer: gentle/focused/expert × seed 21, 82, 2026; determinisztikus generálás, variant solver = 1, classic solver > 1.
- Teljes regressziót és ZIP-ből friss újrafuttatást az Iteration 21 csomagolási lépése dokumentálja.
- Chromium `file://` smoke attempt for Iteration 21: `rc=124`; the runner still lacks `/run/dbus/system_bus_socket` and emits DBus/UPower errors. Browser/visual PASS is not claimed.

## Iteration 22 — Domino Skyscrapers QA

- Katalógus: 82 → **83 rendszer**.
- Új célzott teszt: `tests/sudoku-iteration18.test.js` — **5/5 PASS**.
- Ellenőrzött szabály: valódi 7×7 Latin-rács, LMI A4 külső nyomok, öt kijelölt dominó azonos összeggel.
- Generátor: gentle/focused/expert × seed 22, 83, 2026; determinisztikus, variant solver = 1, Latin-only solver > 1, `variantEssential == true`.
- A 7×7 mód nem használ Sudoku-box constraintet sem a solverben, sem a UI konfliktus- és jegyzetkezelésében.
- A teljes regresszió, syntax/offline audit, ZIP-integrity és friss kibontásos regresszió az Iteration 22 végső csomagolásakor újrafuttatandó.

### Iteration 22 végső validáció

- Teljes regresszió: **89/89 PASS**.
- Iteration 22 célzott tesztek: **5/5 PASS**.
- Minden `assets/`, `games/`, `tests/` JavaScript fájl `node --check`: **PASS**.
- Runtime offline dependency audit (fetch/XHR/WebSocket/EventSource/külső script/link/import): **PASS**.
- Chromium `file://` smoke megkísérelve: `rc=124` timeout. A környezetből hiányzik `/run/dbus/system_bus_socket`, DBus/UPower hibák jelentkeznek, ezért browser/visual PASS-t nem állítunk.


## Iteration 23 QA — Skyscrapers Parks 2

- Katalógus: 83 → **84 rendszer**.
- Új célzott teszt: `tests/sudoku-iteration19.test.js` — **5/5 PASS**.
- Ellenőrzött struktúra: 8×8, soronként/oszloponként 1–6 egyszer + pontosan két park.
- Mind a 32 külső látványnyom újraszámolva a solutionből, mindkét park figyelmen kívül hagyásával.
- gentle/focused/expert × seed 23, 84, 2026: determinisztikus, variant solver = 1, Parks-2 baseline solver > 1, `variantEssential == true`.
- UI regresszió: `🌿`/`P`, 8×8 boxmentes layout, inputMax, park-aware pencil-note cleanup, HU/EN.
- Teljes regresszió implementáció után: **94/94 PASS**.

### Iteration 23 végső browser boundary

A Chromium `file://` smoke tesztet ténylegesen megkíséreltük. Eredmény: `rc=124` timeout; a futtatókörnyezetben továbbra sincs `/run/dbus/system_bus_socket`, és DBus/UPower hibák jelentkeznek. Emiatt browser/visual PASS **nincs deklarálva**.

## Iteration 24 QA — Lakótelepek alcsoport + Even/Odd

- Katalógus: 84 → **85 rendszer**.
- Kategóriák: 7 → **8**, új **Lakótelepek / Skyscrapers** alcsoport, benne **13** rendszerrel.
- Kategória-partíció teszt: mind a 85 variáns pontosan egy display groupba tartozik.
- Új célzott teszt: `tests/sudoku-iteration20.test.js` — **5/5 PASS**.
- Even/Odd solution: 6×6 Latin 1–6, minden cellaparitás ellenőrizve.
- Mind a 24 külső paritásnyom újraszámolva a solutionből.
- gentle/focused/expert × seed 24, 85, 2026: determinisztikus, variant solver = 1, Latin-only baseline > 1, `variantEssential == true`.
- UI wiring: boxmentes 6×6, `●/■` paritásmarkerek, HU/EN, külön Lakótelep kategória, parity-aware pencil-note cleanup.

### Iteration 24 végső validáció

- Teljes regresszió: **99/99 PASS** (96 TAP subtest + 3 standalone suite).
- Iteration 24 célzott tesztek: **5/5 PASS**.
- Minden `assets/`, `games/`, `tests/` JavaScript fájl `node --check`: **PASS**.
- Runtime network dependency audit: **PASS**; az egyetlen `http://` string a szabványos SVG namespace (`http://www.w3.org/2000/svg`), nem hálózati függőség.
- Chromium `file://` smoke megkísérelve: `rc=124`; `/run/dbus/system_bus_socket` hiányzik és DBus/UPower hibák jelentkeznek. Browser/visual PASS nincs deklarálva.

### Iteration 25 célzott QA
A célzott csomag ellenőrzi a 6×6 Latin-struktúrát, a külső láthatósági nyomokat, a seed-reprodukálhatóságot, az egyediséget, a clue-essential státuszt és a HU/EN + Lakótelepek integrációt.

## Iteration 26 QA — Toroidális Lakótelep

- Katalógus: 86 → **87 rendszer**; Lakótelepek: 14 → **15**.
- Új célzott teszt: `tests/sudoku-iteration26.test.js` — 5 ellenőrzés.
- Ellenőrzés: hat belső clue-nézőpont; minden sor/oszlop játszható celláiban 1–5 pontosan egyszer.
- Minden toroidális sightline öt épületet jár be, a tábla szélén szabályosan körbefordul, majd visszaér a clue-cellához.
- gentle/focused/fiendish seedelt generálás: determinisztikus, unique és visibility-essential.
- UI wiring: rögzített szürke clue-cellák, szám+nyíl jelölés, boxmentes Latin-kezelés, HU/EN, Lakótelepek alcsoport.

### Iteration 26 végső validáció

- Teljes regresszió: **109/109 PASS**.
- Iteration 26 célzott tesztek: **5/5 PASS**.
- Minden `assets/`, `games/`, `tests/` JavaScript `node --check`: **PASS**.
- Runtime network dependency audit: **PASS**.
- Chromium `file://` smoke megkísérelve: `rc=124`; a runner DBus-kapcsolata továbbra sem használható, ezért browser/visual PASS nincs deklarálva.

## Iteration 27 QA
- Iteration 26 baseline: 109/109 PASS.
- Iteration 27 célzott teszt: 5/5 PASS.
- Teljes fejlesztési regresszió: 114/114 PASS.
- Double Skyscrapers: 1–3 kétszer/sor/oszlop, 24 pontos külső nyom, deterministic seed, uniqueness, variant-essential.
- Egyfájlos `Ildi Sudoku Kertje.html`: létrejött és lokális CSS/JS inline.
- Minden shipped JS `node --check`: PASS.
- Offline runtime dependency audit: PASS; csak a szabványos `http://www.w3.org/2000/svg` namespace URI fordul elő, ez nem hálózati kérés.
- Chromium `file://` smoke az egyfájlos kiadáson: megkísérelve, `rc=124`; a környezetből hiányzó `/run/dbus/system_bus_socket` és UPower/DBus hibák miatt browser PASS nincs deklarálva.


## Iteration 28
- Skyscraper perimeter clue renderer targeted QA: 5/5 PASS.
- Full regression test files: PASS.
- JS syntax and offline dependency audit: PASS.

## Iteration 29 — in-place language switching
- Regression requirement: changing HU/EN must not reload the page, remount the Sudoku library, regenerate the puzzle, change the selected variant, or discard entered values/notes.
- Added `tests/sudoku-iteration29.test.js` to assert the no-reload language path and the mounted-library translation listener.
- The library retranslates category/variant controls, current rule, generation metadata and tool labels in place.

## Iteration 30 additions
Targeted QA covers Hitori rule solver, seeded generation, uniqueness, category/i18n integration, and specialized renderer hooks.

## Iteration 31 QA

- Bridges regisztráció és Japán logikai kategória: PASS.
- 7×7 / 9 sziget / 12 lehetséges él szerkezeti ellenőrzés: PASS.
- Gentle / Focused / Expert × seed 1, 17, 20260825: minden esetben pontosan 1 solver-megoldás: PASS.
- Saját renderer, CSS, HU fordítás és bankbetöltés: PASS.
- Teljes regressziós tesztcsomag: PASS.
- Minden JavaScript syntax check: PASS.


## Iteration 32 QA

- Fillomino regisztráció és Japán logikai kategória: PASS.
- 6×6 valid régiómegoldás: PASS.
- Gentle / Focused / Expert × seed 1, 17, 20260825: minden esetben pontosan 1 solver-megoldás: PASS.
- Saját Fillomino renderer, mobil CSS, HU fordítás és bankbetöltés: PASS.
- Teljes katalógusszám: 91, minden játék pontosan egy menücsoportban: PASS.
- Teljes regressziós tesztcsomag és JavaScript syntax check: PASS.


## Iteration 33 – Futoshiki

A **◉ Japán logikai játékok** kategória negyedik tagja a **Futoshiki**. A BrainBashers szabályleírása alapján a 6×6 Latin-rács minden sorában és oszlopában az 1–6 számok pontosan egyszer szerepelnek, és minden szomszédos cellák közötti `<` / `>` egyenlőtlenségnek teljesülnie kell. Saját seedelt generátor, Latin+inequality solver, egyediség-ellenőrzés, Gentle / Focused / Expert nehézség, külön mobilbarát renderer és HU+EN integráció készült. A BrainBashers csak szabályreferencia; puzzle-t, képet vagy webdesign-elemet nem másoltunk. A katalógus 92 játszható rendszer.

## Iteration 34 QA – Slitherlink
- Iteration 33 baseline teljes regresszió módosítás előtt: PASS.
- WPF szabályreferencia ellenőrizve; a klasszikus Slitherlink egyetlen nem metsző hurkot és cellánként pontos él-darabszámot követel.
- Új célzott teszt: `tests/sudoku-iteration34.test.js`.
- Gentle / Focused / Expert × seed 1, 17, 20260825: determinisztikus és solver szerint pontosan 1 megoldás.
- 5×5 edge renderer, mobil CSS, HU fordítás, bankbetöltés és 93-as katalógus ellenőrizve.
- Nyelvváltás továbbra is in-place; a Slitherlink renderer `refreshLanguage()` útvonalon fordul újramountolás nélkül.
- Minden shipped JavaScript `node --check`: PASS.
- Offline dependency audit: PASS; nincs runtime HTTP/HTTPS függőség.
- Egyfájlos Iteration 34 HTML inline audit: PASS.
- Chromium `file://` smoke ténylegesen megkísérelve: `rc=124`, DBus/zygote környezeti hibákkal; browser/visual PASS ezért nincs deklarálva.

## Iteration 36 QA – Akari
- Iteration 34 baseline teljes regresszió módosítás előtt: PASS.
- Új célzott teszt: `tests/sudoku-iteration35.test.js`.
- Gentle / Focused / Expert, több seed: determinisztikus és unique.
- Saját `countAkariSolutions(...,2)` solution counting: PASS.
- HU+EN renderer és in-place `refreshLanguage`: implementálva.
- Offline dependency és JS syntax audit: kötelező release gate.
- Iteration 36 teljes regressziós tesztcsomag: PASS.
- Minden runtime és teszt JavaScript `node -c` syntax audit: PASS.
- Offline audit: nincs hálózati runtime dependency; a `http://www.w3.org/2000/svg` előfordulások SVG namespace URI-k, nem hálózati kérések.
- Egyfájlos Iteration 36 HTML: CSS/JS inline, külső script/stylesheet nélkül: PASS.
- Chromium `file://` smoke megkísérelve: `rc=124`, DBus/UPower környezeti timeout; browser/visual PASS ezért nincs állítva.


Iteration 36 adds targeted Nurikabe tests for catalogue count, deterministic generation, solver uniqueness, all three difficulty levels, bilingual wiring and offline loading.


## Iteration 37 – Nonogram / Picross
Added an 8×8 seeded Nonogram family with row/column run clues, a dedicated line-pattern solution-counting solver, guaranteed unique bundled pattern families across Gentle/Focused/Expert, mobile fill/X/empty interaction, HU+EN copy, accessibility labels, and offline Cat Garden integration. Puzzle patterns are original project data; no web puzzle instances are copied.

## Iteration 38 – Masyu
- Iteration 37 baseline full regression: PASS before modification.
- Catalogue registration/count: PASS (97).
- Dedicated Masyu solution counting: PASS.
- Multi-seed deterministic generation across Gentle/Focused/Expert: PASS.
- Uniqueness across tested seeds/difficulties: PASS.
- HU/EN copy and language-refresh hooks: PASS by static/regression audit.
- Offline dependency and JavaScript syntax audits: PASS.
- Single-file build and fresh-ZIP regression: required in release packaging and recorded by release run.

## Iteration 39 – teljes minőségi audit, új játék nélkül
- Iteration 38 baseline teljes regresszió módosítás előtt: **PASS**.
- Bizonyított audit finding: a `cat-garden.test.js` és `i18n.test.js` csak Iteration 32-ig töltötte a bankot, ezért hamis biztonságot adott 91 játékra; javítva a teljes 97-es runtime katalógusra.
- Bizonyított audit finding: `index.html` statikus összegzés 94 játékot, a `sudoku-library.js` metaadata 93 rendszert jelzett; mindkettő 97-re javítva.
- Új `catalogue-integrity.test.js`: runtime scriptlista, egyedi ID-k, teljes HU+EN metaadat, pontosan egy display-kategória/játék, 9 japán logikai játék, 16 Lakótelep-rendszer, statikus darabszám ellenőrzése.
- Nem került be új játék és nem változott egyetlen játékszabály sem.

## Iteration 40 – mechanika/generátor QA

Új játék nélkül végzett mély audit. Az új célzott teszt több seed × Gentle/Focused/Expert kombinációban ellenőrzi a Nurikabe, Nonogram és Masyu uniqueness-et és megoldás-diverzitást. Ezen felül ellenőrzi a Nurikabe starter-state propagációt, a központi completion API-t és dupla solve-védelmet, a Futoshiki/Fillomino automatikus befejezést, az Akari X-jelölés szemantikáját, a Bridges keresztezés tiltását, a Masyu rácsigazítást és a Nonogram kész clue megjelenítését.

A teljes `tests/*.test.js` regresszió és minden JavaScript `node --check` ellenőrzés PASS az Iteration 40 forráson.

### Browser/file:// smoke

Headless Chromium smoke was attempted against `Ildi Sudoku Kertje - Iteration 40.html`. The process timed out with `rc=124`; stderr again reports unavailable `/run/dbus/system_bus_socket` and UPower/DBus calls. Therefore Iteration 40 does **not** claim browser/visual PASS. Deterministic regression, syntax, generator uniqueness/diversity, single-file offline audit, ZIP integrity and fresh-extraction regression are verified independently.


## Iteration 41 – generator-depth QA

`tests/iteration41-generator-depth.test.js` mindhárom nehézségen, tíz seed mellett ellenőrzi a Slitherlink, Futoshiki és Fillomino egyediségét és megoldásdiverzitását. Minimum küszöbök: Slitherlink 6, Futoshiki 8, Fillomino 6 külön megoldásforma / 10 seed. A teljes regressziót és syntax auditot release előtt és friss ZIP-kibontás után is futtatni kell.

## Iteration 42 QA

Baseline before modification: **128/128 Node tests PASS** and **77/77 JavaScript files PASS `node --check`**.

New release-gate coverage: `tests/iteration42-depth-hardening.test.js`.

Measured on seeds `1,2,3,4,5,6,7,8,13,21`:

- Akari: **10/10 distinct solutions and 10/10 distinct puzzles** on Gentle, Focused and Expert; every generated puzzle counts exactly one solution; generator family `procedural-wall-layout`.
- Fillomino: procedural connected-region layouts, uniqueness checked after clue removal; release gate requires at least 9 distinct solutions per 10 seeds on every difficulty and validates every completed region size.
- 12×12 Sudoku: Gentle 126 clues, Focused 111, Expert 93 in the audit sample; all tested boards unique.
- 16×16 Sudoku: Gentle 232 clues, Focused 212, Expert 188 in the audit sample; all tested boards unique.
- Akari UI: static regression covers bulb conflict state, numbered-wall satisfied/conflict state, `aria-invalid`, and bilingual conflict labels.
- Lakótelep catalogue remains exactly 16 systems. The audit records that their generated given masks are seeded but completed solution structures are currently fixed; this is an explicit limitation, not a procedural-generation claim.

Full-suite, syntax, offline dependency, single-file, ZIP extraction and final package checks are run again at release packaging time. Browser/visual PASS is only recorded if the actual Chromium `file://` smoke terminates successfully.

### Iteration 42 final release run

- full regression in release workspace: **133/133 PASS**;
- JavaScript syntax audit: **78/78 PASS**;
- runtime external dependency audit: **0 external runtime references**;
- single-file audit: CSS and JavaScript fully inline, no external stylesheet/script tags;
- ZIP integrity: PASS;
- fresh extraction full regression: **133/133 PASS**;
- Chromium `file://` smoke: **attempted, rc=124**. The runner again lacks `/run/dbus/system_bus_socket` and emits DBus/UPower errors, so **browser/visual PASS is not claimed**.

## Iteration 43 QA

Új release gate: `tests/iteration43-skyscraper-diversity.test.js`. Három külön seed mellett solverrel ellenőrzi a Classic Skyscrapers, Skyscrapers Parks, Sum Skyscrapers Parks, Parks 2, Even/Odd és Double Skyscrapers seed-specifikus completed solutionjait, dinamikusan újraszámolt clue/metaadatait, uniqueness és variant-essential állapotát. A teljes katalógus továbbra is 97 játék, ebből 16 Lakótelep.

### Iteration 43 final release run

- full regression in release workspace: **135/135 PASS**;
- JavaScript syntax audit: **79/79 PASS**;
- runtime external dependency audit: **0 external runtime references**, **0 network API tokens**;
- single-file audit: CSS and JavaScript fully inline, no external stylesheet/script tags;
- ZIP integrity: PASS;
- fresh extraction full regression: **135/135 PASS**;
- fresh extraction JavaScript syntax audit: **79/79 PASS**;
- Chromium `file://` smoke: **attempted, rc=124** with missing `/run/dbus/system_bus_socket` and UPower/DBus errors, therefore browser/visual PASS is not claimed.


## Iteration 44 QA

Új release gate: `tests/iteration44-skyscraper-parity.test.js`. A gate külön bizonyítja, hogy a sima Skyscraper Sudoku solution counter elutasítja a visibility clue-t sértő completed gridet. Három seed mellett ellenőrzi a Skyscraper, Sums, Mixed, Non-touching, Product, Killer, Diagonal és Toroidal rendszerek solution-diverzitását, uniqueness/variant-essential állapotát és az új solutionből visszaszámolt constraint-adatok helyességét.

A korábbi Iteration 14/16/17 és általános generator-regressziókat frissítettük, hogy dinamikus generált `data` esetén a runtime puzzle-példányt adják a solvernek, ne a statikus bankdefiníciót.

### Iteration 44 final release run

- full regression in release workspace: **138/138 PASS**;
- JavaScript syntax audit: **80/80 PASS**;
- runtime external dependency audit: **0 external HTTP(S) script/stylesheet tags**, **0 network API calls**;
- single-file audit: CSS and JavaScript fully inline, **0 external script/stylesheet tags**;
- ZIP integrity: PASS;
- fresh extraction full regression: **138/138 PASS**;
- fresh extraction JavaScript syntax audit: **80/80 PASS**;
- Chromium `file://` smoke: **attempted, rc=124**. The environment again reports missing `/run/dbus/system_bus_socket`, UPower/DBus failures and zygote shutdown errors, therefore **browser/visual PASS is not claimed**.


## Iteration 45 QA

Új gate: `tests/iteration45-inside-domino-depth.test.js`. Három seed mellett külön bizonyítja az Inside és Domino completed-solution diverzitását, uniqueness/variant-essential állapotát, az Inside solution-derived sightline-ok helyességét, valamint a Domino újraszámolt perimeter clue-jait és az öt nem átfedő, azonos összegű dominó constraintet. A régi Domino regresszió runtime puzzle-adatot ad a solvernek, hogy dinamikus constraint esetén se a statikus bankdefiníciót validálja.

### Iteration 45 final release run

- teljes regresszió: **141/141 PASS**;
- JavaScript syntax audit: **81/81 PASS**;
- katalógus: **97 játék**, ebből **16/16 Lakótelep**;
- Iteration 45 family gate: mind a 16 Lakótelep 3 seedből 3 külön completed solutiont adott, minden minta unique + variant-essential;
- single-file audit: **0 external script**, **0 external stylesheet**, **0 nem-SVG HTTP(S) runtime referencia**;
- ZIP integrity: PASS;
- friss ZIP-kibontás utáni teljes regresszió: **141/141 PASS**;
- Chromium `file://` smoke: megkísérelve, de **rc=124**; stderr DBus/UPower és zygote környezeti hibákat mutat. Browser/visual PASS ezért nincs állítva.


## Iteration 46 — difficulty truthfulness / large-grid UX

- Baseline: Iteration 45, 97 systems.
- Finding: several Skyscraper Sudoku generators could let the variant-essential fallback remove so many givens that Gentle ended up with fewer givens than Focused. Toroidal could even invert the intended clue-depth ordering.
- Fix: after variant-essentiality is reached, correct solution givens are restored only while the base rule set remains ambiguous. This preserves special-rule essentiality but restores the intended Gentle > Focused > Expert given-depth ordering.
- Targeted gate: classic, standard, sums, mixed, diagonal and toroidal Skyscrapers are unique, variant-essential and strictly monotonic across all three difficulties for the audit seed.
- Large-grid UX: 12×12/16×16 keyboard input now accepts symbol keys A–G; large input rails use four columns and >=44px touch targets with `touch-action: manipulation`.
- Japanese difficulty audit confirmed that raw clue count is not a universal metric: Hitori changes shaded-cell density, Nurikabe changes starter sea marks, while Fillomino/Futoshiki/Slitherlink/Akari/Masyu expose explicit clue-count separation.

### Iteration 46 release run

- All 45 JavaScript regression test files: PASS (parallelized only to avoid wall-clock timeout; no test was skipped).
- JavaScript syntax audit: 82/82 PASS.
- Catalogue integrity remains 97 systems and 16 Skyscraper systems.
- Single-file build contains no external stylesheet/script tags.
- Fresh ZIP extraction is revalidated before handoff.


## Iteration 47 — search-depth difficulty QA

Új release gate: `tests/iteration47-search-difficulty.test.js`. Ellenőrzi, hogy a Bridges Gentle/Focused/Expert mért solver-search sávjai diszjunktak és növekvők; a Hitori 10 seed medián search depth-je növekvő; a Nurikabe 8 seed mindegyikén a starter sea-val mért effektív search depth Gentle ≤ Focused ≤ Expert. A teljes történeti regresszió, JS syntax, offline/single-file audit és friss ZIP extraction továbbra is kötelező.

### Iteration 47 release run

- baseline Iteration 46: 45/45 test files PASS;
- Iteration 47 final: 46/46 test files PASS;
- JavaScript syntax: 83/83 PASS;
- fresh ZIP extraction: 46/46 test files PASS and 83/83 syntax PASS;
- single-file: 0 external script, 0 external stylesheet, only inline SVG namespace HTTP strings;
- ZIP integrity: PASS;
- Chromium `file://` smoke attempted with installed `/usr/bin/chromium`; timed out with `rc=124` and DBus/zygote environment errors. Browser/visual PASS is therefore not claimed.
