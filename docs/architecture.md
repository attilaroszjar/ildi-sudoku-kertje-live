# Architecture

## Offline contract

`index.html` loads one stylesheet and ordered classic scripts by relative path. There are no ES modules, package imports, fetch calls, remote assets, fonts, service workers, or runtime data files. This avoids cross-origin and module-loading differences when the page is opened through `file://`.

## Shared shell

`assets/core.js` exposes a small `window.LogicRoom` namespace:

- a game registry;
- deterministic seeded random number generation;
- reproducible shuffling;
- a safe DOM helper that assigns visible text through `textContent`.

`assets/app.js` owns launcher filtering, navigation, difficulty, New/Restart semantics, dialogs, live status, counters, and theme preference. Game scripts register metadata and a `mount(api)` function. A mount returns `moves()` and `destroy()` so the shell can cleanly replace game state.

## Game boundaries

Each file keeps pure puzzle operations separate from its DOM mounting code. In a browser it registers with the shell; in Node it exports the pure logic for tests. That shared implementation prevents tests and gameplay from drifting apart.

Generation and validity contracts:

- **Latin Grid:** constructs a Latin solution, removes a clue only if a backtracking solver still counts exactly one solution.
- **Picture Logic:** derives clues from a curated bitmap; the test solver proves each shipped clue set has exactly one solution.
- **Crosslight:** begins solved and applies a nonzero seeded press mask, so replaying that mask always solves it.
- **Codebreaker:** creates a deterministic secret; scoring removes exact matches before multiset-counting misplaced colours.
- **The Exit:** uses immutable curated layouts; the same one-cell move reducer powers the UI and BFS tests.

## Adding a game

Add a classic script before `assets/app.js`, register a unique descriptor, keep pure logic exportable under Node, and add deterministic validity, move, reset, and win-condition tests. The shell does not need restructuring.

## Sudoku Library architecture

The Sudoku expansion is a single catalogue entry backed by a data-driven variant bank. `games/sudoku-bank.js` stores portable puzzle definitions and rule metadata; `games/sudoku-library.js` provides the common grid renderer, keyboard/pointer interaction, rule overlays, conflict checks, and the internal variant index.

This deliberately avoids one JavaScript file per Sudoku variant. New rule systems should be added as constraint/rendering primitives, while new named combinations should compose those primitives. The design keeps `file://` compatibility and lets the catalogue grow without making the main Logic Room launcher unmanageable.


## Sudoku seeded puzzle generation — iteration 3

`games/sudoku-generator.js` turns every shipped Sudoku solution into a large stream of fresh playable boards. It starts from the known-valid completed grid, removes clues in a seeded order, and uses a dependency-free backtracking solver after each removal. A removal is retained only while the remaining givens still have exactly one solution under standard Sudoku row/column/box rules.

This deliberately makes **playability and uniqueness the first contract**. Because standard Sudoku uniqueness is stronger than uniqueness under an added variant constraint, every generated board remains uniquely solvable when the variant rule is also applied. The trade-off is that some generated boards may not require the special constraint logically; variant-essential generation remains a later refinement.

Gentle, Focused, and Expert control target clue density. The generator is deterministic from the shell seed, so failures can be reproduced, while each New Puzzle action advances the seed. The currently selected Sudoku variant is retained across New Puzzle and difficulty remounts.

Iteration 3 also adds composable `kinds` metadata. Named hybrids such as Killer Thermo and Killer Renban share the same renderer and conflict primitives instead of duplicating a new engine for every combination.

## Variant-essential generation — iteration 10

`games/sudoku-generator.js` now contains a small generic variant-aware backtracking path for the new `anti-queen` and `quadsums` kinds. It uses the same row/column/box bit masks as the classic solver, then filters candidate placements through the relevant extra constraint.

For these variants the generator contract is stronger than the legacy `seeded-unique` mode:

1. start from a validated completed variant solution;
2. remove clues in deterministic seeded order;
3. retain a removal only if the variant-aware solver still counts exactly one solution;
4. continue until the ordinary Classic solver counts more than one solution;
5. publish `generation.variantEssential = true` and `mode = seeded-variant-essential`.

This architecture is intentionally incremental. Existing variants keep their previously validated generation path until they receive a dedicated extra-rule solver; no blanket claim is made that all 63 systems are variant-essential.


## Pencil-mark input + Battenburg — iteration 11

`mountBoard()` now maintains a per-cell candidate-note set independently from the committed value grid. Notes are presentation/input state only: they never participate in conflict detection or solved-state checks. A shared note-mode toggle drives both pointer number buttons and keyboard input; final entry clears that cell's notes, while Clear removes both note and final-entry state. The renderer exposes notes as a compact in-cell grid and includes them in the cell ARIA label.

The variant-aware solver now also supports `battenburg`. Every completed 2×2 area is checked against the complete set of Battenburg intersections: checkerboard parity must exist exactly at marked intersections and nowhere else. This lets clue removal continue until the Battenburg rule is required for uniqueness, using the existing `seeded-variant-essential` contract.


## Iteration 12 architecture

`games/sudoku-bank-iteration8.js` adds Reflection and Slingshot metadata without changing earlier banks. `variantExtraValid()` and the interactive `variantConflict()` now understand both constraints, so generation, uniqueness checking, and live conflict feedback share the same rule semantics. Reflection groups store `{symbol, lines}`; Slingshot clues store `{cell, source, dir}` and derive the destination dynamically from the current value of `cell`. Rotation transforms both coordinates and Slingshot direction vectors.

Both new variants use the existing `makeVariantPuzzle()` path and are tagged `seeded-variant-essential`. This continues clue removal under the extra rule until uniqueness is established and verifies that Classic Sudoku alone has more than one solution.

Pencil marks remain non-solution state. Iteration 12 adds safe peer pruning after a committed value: the same note is removed from row, column, and standard box peers. Jigsaw is intentionally excluded from standard-box pruning because its regions are irregular.

## Iteration 13 — lokális constraint motor

Az `axia` és `couples` bekerült a közös variant-aware solverbe és a kliensoldali konfliktusellenőrzésbe. Az Axia ellenőrzés a megjelölt cellából induló diagonális sugarakat vizsgálja; a Couples lokális élconstraintként párosságot hasonlít. Mindkét típus része a közös `variantEssentialKinds` lookupnak, így a generátor nem hoz létre új típuslistát minden `make()` hívásnál.

A forgatási réteg az Axia-koordinátákat és a Couples-élek mindkét végpontját forgatja. A pencil-mark takarítás szintén constraint-aware: Axia végleges szám eltávolítja ugyanazt a note-ot a tiltott diagonális peerekből, Couples végleges szám pedig eltávolítja a partnercellából a biztosan rossz párosságú note-okat.


## Iteration 14 — külső vonalszámláló constraint-ek

`games/sudoku-bank-iteration10.js` két új, teljes 18-clue metaadat-készletet épít a validált 9×9 megoldásból. A `runningcells` és `ascendingsequences` típus ugyanazt a `{axis,index,side,count}` clue-sémát használja, ezért a meglévő forgatási réteg (`rotateAxisIndex`) változtatás nélkül kezeli őket.

A generátorban az `outsideCountValid()` csak azt a sort és/vagy oszlopot ellenőrzi, amelyet az aktuális cellabeírás érint. Teljes vonal esetén a megfelelő mérőfüggvény (`runningCellCount` vagy `ascendingSequenceCount`) összeveti a tényleges értéket a clue-val. Ez a célzott ellenőrzés elkerüli mind a 18 clue újraszámolását minden backtracking lépésnél.

Mindkét kind része a `variantEssentialKinds` táblának, ezért `makeVariantPuzzle()` kezeli őket: a puzzle egyedi a speciális szabállyal, és külön Classic-solver ellenőrzés bizonyítja, hogy az extra clue-k nélkül több megoldás marad.

A renderer a korábbi outside-clue stripet újrahasználja, de ezeknél a rendszereknél mind a 18 sor/oszlop-clue megjelenik egy reszponzív `count-clues` rácsban. A cellakonfliktus-ellenőrzés ugyanazokat a mérőfüggvényeket használja, így a solver és az interaktív UI szabályértelmezése nem válik szét.

## Iteration 15 — diagonális színconstraint + lokális extrema

A `sudoku-bank-iteration11.js` két új rendszert regisztrál.

- `bishopsgate`: `data.parity` jelöli az aktív sakktáblaszínt. A solver csak akkor ellenőrzi a négy átlós sugarat, ha az éppen vizsgált cella az aktív színen van; így a constraint lokális marad.
- `minmax`: `data.extrema` `{cell,type}` rekordokat tartalmaz. A solver csak az éppen módosított cellától Manhattan-távolság 0 vagy 1 helyen lévő extrema-markereket ellenőrzi, tehát nem fut végig szükségtelenül minden reláción.

A note cleanup ugyanezt a lokális szerkezetet használja: Bishopsgate esetén az aktív átlós peerekből törli az azonos jelöltet; Min/Max esetén a már lehetetlenné vált kisebb/nagyobb jelölteket takarítja.

## Iteration 16 outside-clue constraint index

`SudokuGenerator` now builds a lazy per-variant row/column clue index in a `WeakMap`. `affectedOutsideClues()` returns only clues belonging to the cell currently being tested. The shared path is used by Running Cells, Ascending Sequences, Numbered Rooms and Next to Nine.

Numbered Rooms uses partial validation as soon as the first cell from a clue side is known. Next to Nine validates known neighbours immediately once the 9 position is known, and checks the complete unordered neighbour set when both required neighbours are filled.


## Iteration 17 constraint paths

`evensandwich` reuses the WeakMap-backed outside-clue index introduced in Iteration 16. During backtracking only the clue for the modified row and column is inspected. Partial triples are rejected as soon as known neighbour parity makes membership/non-membership impossible.

`topheavyparity` is deliberately local: placement checks inspect only the vertical neighbour above and below the changed cell. The same locality is used by note cleanup, so no full-board scan is needed when a final digit is entered. Both kinds are in the shared `variantEssentialKinds` path.


## Iteration 18 — Lakótelep constraint family

`skyscrapersums`, `skyscrapermixed` és `skyscrapernontouching` közös outside-clue útvonalat használ. A `skyscraperFamilyValid()` az Iteration 16-ban bevezetett `affectedOutsideClues()` indexből csak az aktuálisan módosított sor/oszlop clue-jait kapja meg. A láthatósági mérők (`skyscraperVisibleCount`, `skyscraperVisibleSum`) teljes vonalon futnak, de csak akkor, amikor az adott vonal kitöltött; így a backtracking közben nincs szükség a teljes clue-készlet újraszámolására.

A Mixed Information clue egy diszjunkció: teljes vonalon akkor érvényes, ha `visibleCount === clue.value` **vagy** `firstHeight === clue.value`. A Non-touching változat ezen felül csak a négy diagonális közvetlen szomszédot ellenőrzi, és ugyanilyen lokális peer-listát használ a pencil-note cleanup. Mindhárom kind a `variantEssentialKinds` útvonalon generálódik.


## Iteration 19 — park-aware Latin solver

`skyscraperparks` and `sumskyscraperparks` use a dedicated row/column Latin solver. The ninth internal symbol is a park sentinel, rendered as `🌿`; visibility functions skip it. The solver uses row/column bitmasks, the shared outside-clue index, MRV candidate choice, and validates only clues affected by the current cell. 3×3 box constraints and box candidate cleanup are disabled for these two kinds. `P` is an explicit keyboard shortcut for the park.

## Iteration 20 sightline constraint index

Az `insideskyscrapers` és `diagonalskyscrapers` közös `data.sightClues` modellt használ. Minden clue explicit cellalistát tárol. A `sightClueIndexCache` WeakMap cellánként indexeli az érintett clue-kat, ezért a variant solver egy backtracking lépésnél nem járja végig a teljes látóvonal-készletet.

Inside esetén a `source` cella értékét hasonlítjuk a `cells` látóvonal láthatósági számához; a source nem része a számlált vonalnak. Diagonal esetén a clue fix `count` értéket tárol. A renderer ugyanebből az adatból rajzol belső nyilakat, illetve a board szélére pozicionált átlós clue markereket. A `transformedVariant()` a source/start/cells/dir/arrow adatokat együtt forgatja.


## Iteration 21 architecture

- `sudoku-bank-iteration17.js` adja a két új Lakótelep-rendszert.
- `skyscraperVisibleProduct()` ugyanazt a lokális outside-clue infrastruktúrát használja, mint a count/sum változatok.
- `killerCagesValid()` részleges backtracking állapotban is ellenőrzi a Killer-ketreceket.
- A solver csak az aktuális cella sorának/oszlopának külső nyomait vizsgálja az `outsideClueIndexCache` segítségével; nincs teljes clue-lista újraszkennelés minden próbánál.
- Mindkét új rendszer a standard 9×9 Sudoku row/column/box bitmaszkokat használja, majd erre rétegződik a Product vagy Killer+Skyscraper extra constraint.

## Iteration 22 — 7×7 Domino Skyscrapers motor

A `dominoskyscrapers` nem kerül a normál Sudoku backtrackerbe. Saját `countDominoSkyscraperSolutions()` Latin-solvert kapott, amely csak sor- és oszlopmaszkot használ, 3×3/egyéb box constraint nélkül.

A részleges állapot ellenőrzése két indexelt constraint-családot kezel:

- az érintett sor/oszlop teljes kitöltésekor ellenőrzi a külső Lakótelep-láthatósági nyomot;
- minden teljessé vált kijelölt dominó összegét egy közös, dinamikusan következtetett összeghez hasonlítja.

A generátor három nehézségi célértéket használ 7×7-re, seedelt sorrendben távolít kezdőszámokat, és minden eltávolítás után a saját solverrel bizonyítja az egyediséget. A variant-essential baseline ugyanazt a Latin-solvert futtatja a Lakótelep- és dominóconstraint kikapcsolásával.

A UI ugyanebben a módban elnyomja a Sudoku-dobozhatárokat. A dominócellák külön, Cat Garden-kompatibilis árnyalást és körvonalat kapnak; a jegyzet-cleanup csak sor- és oszlopszomszédokat tisztít, boxot nem.


## Iteration 23 — Parks 2 solver

A `skyscraperparks2` saját 8×8 solver útvonalat használ. A számok 1–6 sor/oszlop bitmaszkokkal egyediek, miközben a közös parkérték külön sor- és oszlopszámlálóval legfeljebb/kész állapotban pontosan kétszer szerepelhet. A solver MRV cellaválasztást használ, és csak az aktuális cellát érintő outside clue-kat ellenőrzi az existing `outsideClueIndexCache` segítségével.

A baseline solver ugyanazt a row/column + two-parks struktúrát futtatja külső látványnyomok nélkül. A generátor csak akkor jelöl `variantEssential` állapotot, ha a teljes variánssal egy megoldás, a baseline-nal pedig legalább kettő van. A UI `inputMax` segítségével 1–6 + egyetlen `🌿` inputot mutat, és park beírásakor nem törli automatikusan a park-jegyzetet a teljes sorból/oszlopból, mert ugyanabban a vonalban még egy második park szabályos.

## Iteration 24 — Even/Odd Skyscrapers + külön Lakótelep kategória

A `evenoddskyscrapers` saját 6×6 Latin-solvert használ (`countEvenOddSkyscraperSolutions`). Sor- és oszlop-bitmaszkokkal dolgozik, Sudoku-box constraint nélkül. Az MRV jelöltválasztás minden próbánál két speciális feltételt ellenőriz:

- a cellához tartozó `parityCells` jelölés páros/páratlan egyezését;
- a teljesen kitöltött érintett sor/oszlop láthatósági számának paritását a közös `outsideClueIndexCache` által indexelt clue-k alapján.

A variant-essential baseline ugyanazt a Latin-solvert futtatja a paritás- és látványnyomok kikapcsolásával. A generátor seedelten távolít belső kezdőszámokat, és csak egyedi variánsmegoldás mellett fogad el eltávolítást.

A navigációban explicit `skyscraperIds` lista definiálja a Lakótelep-családot. A **Lakótelepek / Skyscrapers** display group megelőzi az általános csoportokat, miközben az átfedő Cages/Outside clues/Grid/Combinations csoportok kizárják ugyanezeket az ID-ket. Így minden variáns pontosan egy kategóriába kerül.

### Iteration 25
A Classic Skyscrapers a már validált Latin + visibility solver útvonalat használja (`dominoskyscrapers` üres dominólistával). Ez szándékos újrafelhasználás: pontosan ugyanaz a Latin/látóvonal constraint, extra dominófeltétel nélkül, és nem kerül rá Sudoku box constraint.

## Iteration 26 — Toroidal Skyscrapers motor

A `toroidalskyscrapers` saját 6×6 Latin-solvert használ. A hat rögzített clue-cella sentinelként szerepel a belső gridben, de nem vesz részt az 1–5 bitmaszkban; minden sor és oszlop öt játszható cellájának az 1–5 teljes halmazt kell adnia. A `toroidalClues[].cells` előre indexelt, ötcellás körbeforduló látóvonal, így backtracking közben csak az aktuális cellát érintő clue-k kész állapotát kell ellenőrizni. A baseline uniqueness futás ugyanazt a Latin-struktúrát használja a visibility feltételek nélkül, ebből származik a `variantEssential` bizonyítás.

A UI a clue sentinel belső értékét nem mutatja: a cella a WPC-szerű `szám + nyíl` nézőpontként jelenik meg és rögzített. A board-forgatás a clue cellákat, a körbeforduló sightline cellákat és a nyílvektort együtt transzformálja.

## Iteration 27
A `doubleskyscrapers` külön solver-ágat használ: soronként/oszloponként értékenként legfeljebb két példányt enged, teljes sor/oszlop esetén a látványnyomot ellenőrzi. A generator a teljes megoldásból seedelten ritkít givenseket, miközben a speciális solverrel megtartja az egyediséget; a visibility nélküli double-Latin baseline több megoldása bizonyítja a variant-essential státuszt. A pencil-note cleanup csak a második azonos érték beírásakor törli az adott értéket a sor/oszlop többi jegyzetéből.

Az `Ildi Sudoku Kertje.html` az index, CSS és összes lokális JavaScript inline összefűzésével készül. Futáskor nem igényel mappastruktúrát, hálózatot, szervert vagy telepítést.

## Iteration 29 — language state preservation
Language switching is now an in-place UI event (`sudoku:languagechange`) rather than a page reload. The mounted Sudoku instance stays alive, so the active variant, generated board, entered values, notes, selection and move state are preserved. The library only refreshes translated labels and metadata.

## Iteration 30 – Hitori engine
Added a dedicated binary-state Hitori renderer plus seeded 6×6 generator and solution counter. Generation starts from a Latin value layout, selects a legal black mask, introduces duplicates only on black solution cells, then accepts only puzzles with exactly one Hitori solution.

## Iteration 31 – Bridges motor

A `bridges` kind saját renderert (`mountBridges`) és generátort kapott. A solver a legközelebbi vízszintes/függőleges szigetpárok lehetséges élein 0/1/2 hídszámot keres, fokszám-pruninggal és végső connectivity ellenőrzéssel. A renderer SVG vonalakkal rajzol egyes/dupla hidakat és DOM-gombokként kezeli a szigeteket. A speciális játéktípus kimarad a Sudoku-rács forgatási transzformációjából.


## Iteration 32 – Fillomino motor

- `kind: fillomino` külön rendererrel és 1–6 számbevitellel.
- A solver az azonos értékű ortogonális komponenseket vizsgálja; részállapotban tiltja a túlméretes komponenst és ellenőrzi, hogy a komponens üres cellákon keresztül még elérheti-e a szükséges méretet.
- Teljes állapotban minden komponens méretének pontosan egyeznie kell a cellák értékével.
- A generátor egy valid régiófelosztást forgat seed alapján, majd clue-kat távolít el csak akkor, ha a solver továbbra is pontosan egy megoldást talál.


## Iteration 33 – Futoshiki

A **◉ Japán logikai játékok** kategória negyedik tagja a **Futoshiki**. A BrainBashers szabályleírása alapján a 6×6 Latin-rács minden sorában és oszlopában az 1–6 számok pontosan egyszer szerepelnek, és minden szomszédos cellák közötti `<` / `>` egyenlőtlenségnek teljesülnie kell. Saját seedelt generátor, Latin+inequality solver, egyediség-ellenőrzés, Gentle / Focused / Expert nehézség, külön mobilbarát renderer és HU+EN integráció készült. A BrainBashers csak szabályreferencia; puzzle-t, képet vagy webdesign-elemet nem másoltunk. A katalógus 92 játszható rendszer.

## Iteration 34 – Slitherlink engine
`games/sudoku-bank-iteration34.js` regisztrálja a játékot. A generátor 5×5 rácshoz explicit horizontális/vertikális élgráfot épít, seedből létrehoz egy zárt megoldáshurkot, abból számolja a 0–3 cellanyomokat, majd a nehézség cél-clueszámáig egyenként próbál nyomokat elhagyni. Minden elhagyást a `countSlitherlinkSolutions(...,2)` validál. A solver cellaél-korlátokat, 0/2 csúcsfokot és végső egyetlen összefüggő ciklust ellenőriz. A renderer külön élgombokat használ háromállapotú interakcióval: üres → vonal → X.

## Iteration 36 – Akari engine
`games/sudoku-bank-iteration35.js` regisztrálja az Akarit. A solver bináris lámpaváltozókat használ a fehér cellákon, ellenőrzi a kölcsönös láthatósági tiltást, minden fehér cella megvilágítottságát és a számozott falak pontos szomszédszámát. A generátor saját 6×6-os unique puzzle-familyt seed alapján forgat/tükröz, majd nehézség szerint további, a megoldásból származtatott falnyomokat fed fel. A renderer háromállapotú: üres → lámpa → X.


### Nurikabe engine (Iteration 36)
A dedicated binary-cell solver validates island sizes/clue ownership, 2×2 sea exclusion and final sea connectivity. Seeded transformations and clue-position choices provide reproducible boards; difficulty controls a small number of initial sea marks.


## Iteration 37 – Nonogram / Picross
Added an 8×8 seeded Nonogram family with row/column run clues, a dedicated line-pattern solution-counting solver, guaranteed unique bundled pattern families across Gentle/Focused/Expert, mobile fill/X/empty interaction, HU+EN copy, accessibility labels, and offline Cat Garden integration. Puzzle patterns are original project data; no web puzzle instances are copied.

## Iteration 38 – Masyu
`masyu` uses a dedicated cell-centre graph rather than the Slitherlink grid-vertex graph. `countMasyuSolutions()` enumerates edge states with degree/circle feasibility pruning and validates one connected cycle plus black/white pearl semantics. `makeMasyuPuzzle()` derives valid pearl candidates from an original project loop family, seed-shuffles clue selection, and adds clues until uniqueness is proven. The renderer exposes each possible segment as an accessible button cycling line/X/empty.

## Iteration 40 – generator/mechanics hardening

A japán játékok generátorai továbbra is a közös `SudokuGenerator.make()` kapun mennek át, de az eredményobjektum most a játékspecifikus `preShaded`, `generatorFamily` és `difficultyScore` metaadatot is továbbviszi. Ez különösen a Nurikabe nehézségi starter-jelöléseinél fontos, mert korábban a generátor létrehozta, de a runtime példány elveszítette őket.

A Bridges solution counter keresztezési topológiát is vizsgál. A Masyu ciklus-alapú generátor seedelt self-avoiding loop jelölteket állít elő, majd csak olyan fehér/fekete köröket használ, amelyek az adott megoldási hurokból szabályosan levezethetők; uniqueness után clue-redukció történik. A Nonogram procedurális bitmap-jelölteket készít, a teljes sor/oszlop clue-rendszerre külön solverrel solution-countingot futtat, és csak unique táblát fogad el.


## Iteration 41 – generátormélység

- Slitherlink: seedelt connected-polyomino növesztés → boundary edge set → egyetlen ciklus ellenőrzése → cellaclue-k → solveres uniqueness-megőrző clue removal.
- Futoshiki: a 6×6 Latin alapstruktúra seedelt sor-, oszlop- és szimbólumpermutációt kap az inequality-generálás előtt.
- Fillomino: a validált alapmegoldás nyolc diéder-szimmetriájából választ seed alapján, majd solveres clue removal történik.

## Iteration 42 generator architecture

### Akari
`makeAkariPuzzle()` now creates a seed-specific 6×6 wall mask, finds a legal bulb solution for that topology, derives numbered-wall counts from the solution, proves uniqueness, and then removes numeric wall clues only while `countAkariSolutions()` remains exactly one. The returned `generatorFamily` is `procedural-wall-layout`; a curated symmetry fallback is retained only as a safety boundary.

### Fillomino
`makeFillominoPuzzle()` now constructs a seed-specific Hamiltonian snake path and procedurally partitions it into connected regions of size 1–6. `fillominoFullValid()` rejects accidental orthogonal contacts that would merge same-sized regions. Givens are then removed greedily with `countFillominoSolutions()` uniqueness checks. The returned family is `procedural-region-partition`.

### Large Sudoku
`makeLargePuzzle()` keeps the proven row/column/box-preserving completed-grid permutation, but replaces the old one-blank-per-row/column construction with greedy clue removal guarded by `countSolutions(..., 2) === 1`. Gentle/Focused/Expert target increasingly larger hole counts while remaining fast on 12×12 and 16×16.

### Akari board-state communication
The renderer now computes live bulb line-of-sight conflicts and numbered-wall satisfaction/overflow. Conflicting bulbs expose `aria-invalid=true`; numbered walls report required/current bulb counts through ARIA, and satisfied/conflicting walls have distinct structural outline states in addition to color.

## Iteration 43 – dinamikus Lakótelep-adatmodell

A generátor eredménye opcionálisan már teljes `data` objektumot is visszaadhat, amelyet a runtime a generált `solution` mellett használ. Ez szükséges azokhoz a Lakótelep-rendszerekhez, ahol a seed nemcsak a givens maszkot, hanem a completed Latin-rácsot is változtatja: a perimeter clue-k és az Even/Odd paritásmarkerek ugyanabból a generált solutionből épülnek újra, ezért solver és UI ugyanazt a constraint-példányt kapja.


## Iteration 44 – generált Skyscraper constraint-példányok

A standard Sudoku-alapú Lakótelep-variánsok új `makeSeededSkyscraperSudokuPuzzle()` útvonalat kapnak. A completed grid seedelt szimbólumpermutációja után `recalculateSkyscraperData()` ugyanabból a solutionből újraépíti a releváns visibility count/sum/product/mixed clue-kat, Killer cage sumokat és diagonal sightline countokat. A generált `solution` és `data` együtt kerül a runtime példányba, és ugyanez a példány megy a solution counternek.

A Toroidal Skyscrapers saját solverútvonala ugyanezt az elvet követi az 1–5 building szimbólumokra: a clue-cellák 6-os sentinelje változatlan, a toroidális sightline countok pedig az új solutionből újraszámolódnak.


## Iteration 45 – topológiatudatos Inside és Domino generátorok

Az Inside generátor nem próbál egy régi arrow-geometriát vakon új számokra ráhúzni. A seedelt, Sudoku-valid completed solution után újra deriválja az összes olyan `(source, direction, cells)` sightline-jelöltet, amelyre `source digit == visibleCount(ray)` teljesül, majd ezekből seedelten választ. Emiatt a UI és a `sightlineValid()` ugyanazt a runtime `data.sightClues` objektumot használja.

A Domino generátor a 7×7 Latin solution row/column permutációja után újraszámolja a perimeter clue-kat, majd a horizontális/vertikális szomszédos párokat összeg szerint csoportosítja. Olyan összegcsoportból választ öt nem átfedő dominót, ahol az equal-sum feltétel ténylegesen teljesül. A `countDominoSkyscraperSolutions()` a runtime `data.clues` és `data.dominoes` adatokkal számol.


## Iteration 46 — variant-essential difficulty restoration

Variant-essential Sudoku-family generation now has a restoration phase. If proving that the special rule is essential requires deleting more givens than the requested difficulty target, the generator greedily restores correct givens while repeatedly confirming that the corresponding base rules still admit multiple solutions. Since adding correct givens cannot destroy uniqueness under the stronger variant rule, this safely improves difficulty separation without weakening rule parity.

Large-grid symbol input is normalized through `valueForKey()`, using the same symbol set as rendering, so A–G map to values 10–16 consistently with the on-screen keypad.


## Iteration 47 — instrumented difficulty model

A Hitori, Bridges és Nurikabe solution counter opcionális statisztika-objektumot fogad (`nodes`, `branches`, `deadEnds`, `solutions`). Ez nem változtatja meg a korábbi counting API eredményét. A Bridges generátor a mért keresési mélység alapján előre rangsorolt, diszjunkt template-poolból választ. A Nurikabe counter opcionális `preShaded` listát is fogad, így az effektív játékos-oldali nehézség mérhető a starter sea információval együtt. A generált objektum `generation.difficultyScore` mezője ezeknél a rendszereknél a mért solver node count.
