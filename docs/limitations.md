# Limitations and Future Work

## Current boundaries

- Progress is intentionally session-only. Closing or refreshing the page starts a fresh puzzle; only theme preference is stored.
- Picture Logic uses a small curated set rather than claiming infinite generation. Every included board is unique.
- The Exit has one verified layout per difficulty. Its expert route is meaningfully longer, but the bank is intentionally compact.
- Crosslight boards are guaranteed solvable, not guaranteed to have a unique or minimum-length solution. Uniqueness is not part of that mechanic.
- Chromium is installed in the build environment, but headless `file://` runs currently fail to terminate because the environment lacks a working DBus session; browser visual QA is therefore not claimed.

## Focused expansion

1. Add a single-loop edge puzzle to introduce topological reasoning, with a uniqueness solver and keyboard-friendly edge navigation.
2. Expand The Exit with reverse-generated layouts, BFS depth scoring, and duplicate-state rejection.
3. Continue refining pencil-mark ergonomics, including optional peer-candidate cleanup and touch-focused shortcuts.
4. Add an offline progress ledger for solved counts by game and difficulty, keeping storage nonessential.
5. Run automated `file://` browser smoke tests and visual snapshots when a browser runtime is available.

## Sudoku Library iteration 1 limitations

- The first 21 variants prioritize breadth and engine coverage. Several overlay variants currently use a classic uniquely solvable base puzzle with additional variant clues, so the extra rule can be logically redundant in some boards. Later iterations should curate lower-given puzzles whose variant constraint is essential to the solve.
- Global anti-constraint variants use deliberately clue-rich boards in this first pass to guarantee a stable playable baseline; difficulty tuning is a later iteration.
- Outside-clue variants currently summarize clues in a compact strip rather than placing every clue around the exact grid perimeter.
- Jigsaw/overlapping-grid and newer line systems are tracked in the research queue but are not yet implemented.


## Sudoku Library iteration 2 limitations

- Iteration 2 deliberately focuses on adding well-defined constraint primitives before tackling structural grids such as Jigsaw and Samurai.
- Iteration 3 replaces fixed clue layouts with seeded unique-puzzle generation, but many variants still use a fixed valid completed grid underneath. The generated givens are guaranteed unique under normal Sudoku alone, so a special variant constraint can still be logically redundant in some generated boards.
- X-Sums and Rossini clues are displayed in a compact clue strip rather than physically around all four sides of the board.
- Clone, Fortress, Center Dot, and line constraints use clear highlighting, but a dedicated legend and richer constraint-specific onboarding would improve first-time usability.
- Large symbol sets (12×12/16×16), Sukaku candidate-grid input, and overlapping-grid navigation require additional engine/UI work and remain queued.


## Sudoku Library iteration 3 limitations

- The new seeded generator makes the practical board supply enormous, but it varies clue layouts around validated solution grids rather than generating a brand-new completed variant solution for every click. This is intentional: uniqueness and offline reliability are guaranteed before variant-specific generation is generalized.
- Generated puzzles are unique under ordinary Sudoku constraints. That guarantees correctness for every added variant, but it also means the extra constraint is not always essential to reach the solution. A future variant-aware uniqueness solver can remove more givens while proving the special rule is necessary.
- Frame clues are all available, but remain shown in the compact clue strip rather than physically on four grid edges.
- Structural systems such as Jigsaw, Samurai/Gattai, Sukaku, 12×12, and 16×16 still need dedicated grid/input architecture and remain the next major frontier.


## Iteration 4 limitation

The general seeded generator still proves classic-Sudoku uniqueness for most variants; Jigsaw is the first structural variant with a dedicated rule-aware uniqueness solver. A future generator layer should make more variants *constraint-essential*, so their special rule is necessary rather than merely compatible with an already unique classic clue set.


## Iteration 5 limitations

Large 12x12/16x16 boards deliberately use a fast constructive uniqueness guarantee: each generated blank is row-forced, so the current giant-grid difficulty is based on clue density and scale rather than advanced solving depth. Samurai generation guarantees coherence and uniqueness by composing five individually unique Sudoku grids and preserving every constituent grid's givens through the overlaps. Browser automation is still not available in this build environment.

## Iteration 10 limitations

- Variant-essential generation is currently guaranteed only for Jigsaw and the new Anti-Queen (9) / Quad Sums paths. Most earlier overlay variants remain standard-Sudoku-unique first and will be migrated incrementally.
- Anti-Queen terminology varies between setters. The catalogue intentionally avoids an ambiguous generic claim and labels this implementation **Anti-Queen (9)**.
- Quad Sums uses a validated fixed completed solution and fixed dot topology while varying the seeded clue mask. New Puzzle is still practically inexhaustible at the clue-layout level, but does not yet synthesize a new Quad Sums dot pattern each time.
- Headless Chromium remains unreliable in the current build environment because of DBus startup/termination issues, so visual browser regression is not automated here.


## Iteration 11 limitations

- Pencil marks are intentionally manual. Entering a final digit clears notes in that cell, but notes with the same digit are not yet auto-removed from row/column/box peers. This avoids making assumptions for nonstandard constraints and can be added later as an optional convenience layer.
- Keyboard direct entry for 12×12/16×16 symbols above 9 remains limited; all symbols are still available from the on-screen number pad, including in Notes mode.
- Battenburg New Puzzle varies the seeded clue mask around a validated completed grid and fixed complete Battenburg topology; it does not synthesize a new completed parity topology on every click.
- Browser visual QA is not claimed: Chromium was invoked against `file://`, but the process timed out with DBus errors in this environment.


## Iteration 12 limitations

- Reflection currently ships a curated set of same-symbol line pairs derived from the completed grid; line topology itself is not procedurally regenerated per seed.
- Slingshot clue positions/directions are curated against the completed grid; clue topology is fixed while givens vary by seed.
- Pencil-mark auto-pruning covers only universally safe Classic row/column/box peers. It deliberately does not attempt aggressive variant-specific candidate propagation.
- Browser visual QA remains separate from deterministic Node regression when the available Chromium runtime cannot complete a `file://` smoke run.

## Iteration 13

- Az Axia és Couples jelölések a generált alapmegoldáshoz rögzített, determinisztikus részhalmazok; a `New puzzle` a clue layoutot változtatja, nem a constraint geometriát.
- A Couples implementáció nem használ negatív constraintet a jelöletlen szomszédos éleken.
- A difficulty tier továbbra is elsődlegesen clue-density célérték, nem emberi solve-path nehézségbecslés.


## Iteration 14

- Running Cells és Ascending Sequences esetén a `New puzzle` a kezdőszámok seedelt maszkját változtatja; a 18 külső clue a jelenlegi validált completed gridből származik, nem generálódik új clue-topológia minden seedhez.
- A difficulty továbbra is elsősorban clue-density tier. Az új külső nyomok valóban szükségesek az egyediséghez, de nincs még emberi technikákra épülő solve-path nehézségbecslés.
- Az outside clue-k továbbra is a tábla alatti kompakt panelben jelennek meg, nem fizikailag a rács négy peremén. Iteration 14 ezt 18 clue-ra optimalizált reszponzív rácssal teszi áttekinthetőbbé.
- A global line-count constraint-ekhez a pencil-note automatikus törlése nem próbál teljes logikai propagációt végezni; csak a klasszikusan biztos peer-takarítás marad aktív.

## Iteration 15

- A Bishopsgate az erősebb, főátlókat is érintő checkerboard-színt használó definíciót követi; ez szándékosan nem teljes Anti-Bishop Sudoku.
- A Min/Max rendszer a megoldás összes szigorú ortogonális lokális szélsőértékét megjelöli. Ez egy teljes jelölésű, nem negatív-constraintes változat: a jelöletlen cellákról nem állítjuk, hogy nem lehetnek lokális szélsőértékek más puzzle-definíciókban.
- Valódi böngészős vizuális PASS csak akkor állítható, ha a futtatókörnyezet Chromium `file://` smoke tesztje ténylegesen terminál; a korábbi DBus-korlátot továbbra is külön kezeljük.

## Iteration 16 notes

- Numbered Rooms currently shows all 36 directional clues generated from the solution. This is intentionally dense but kept in the compact Cat Garden clue grid rather than drawn around the board itself.
- Next to Nine uses the standard complete neighbour-set rule; there is no negative-clue variant beyond the fact that the displayed set is complete.
- Browser visual smoke testing remains environment-dependent; automated Node QA does not replace a successful real-browser `file://` pass.


## Iteration 17 notes

- Even Sandwich uses a complete clue set generated from a validated completed grid; New Puzzle changes the seeded given mask, not the outside clue topology.
- Empty Even Sandwich clues are semantically meaningful negative clues and are displayed as a dash.
- Top-Heavy Parity has no visual marker because the rule applies globally to every vertical neighbour pair; the right-hand rule text is therefore essential onboarding.
- Difficulty tiers remain clue-density targets rather than human technique-based ratings.


## Iteration 18 notes

- A három új Lakótelep-változat 18, a bal oldali sorokhoz és felső oszlopokhoz tartozó clue-t jelenít meg, hogy a Cat Garden clue panel olvasható maradjon; a solver pontosan ugyanezt a megjelenített clue-készletet használja.
- A Mixed Information variáns szándékosan nem jelöli, hogy egy clue “látható darabszám” vagy “első házmagasság”; ez maga a dokumentált szabály.
- A Parks/Grundokkal változat nincs még implementálva, mert az üres telek külön cellaállapotot és 1…N−1 Latin-square logikát igényel.
- A difficulty továbbra is clue-density célérték, nem emberi megoldási technikák alapján becsült nehézség.
- Chromium visual smoke remains blocked by the runner's missing DBus system socket; Iteration 18 records the attempted `file://` run as timeout rather than browser PASS.


## Iteration 19

The two Parks variants are Latin-square Lakótelep puzzles rather than classical 3×3-box Sudoku. They live in the same offline collection because the project is intentionally expanding toward Ildi's preferred Lakótelep family. The park uses an internal ninth sentinel but is always rendered to the player as `🌿` and is excluded from building visibility calculations.
- Chromium headless `file://` smoke still times out in the current runner because the DBus/UPower bus is unavailable (`rc=124`); browser/visual PASS remains intentionally unclaimed.

## Iteration 20

A Diagonal Skyscraper implementáció a dokumentált átlós láthatósági mechanikát használja, de nem veszi át egy konkrét publikált feladvány opcionális páros/páratlan cellajelöléseit; azok puzzle-specifikus extra clue-k, nem a Lakótelep alapváltozat részei.


## Iteration 21

- A Product Skyscrapers nyomok a completed gridből származó rögzített clue-topológiát használják; a `New puzzle` a kezdőszámok seedelt maszkját változtatja.
- A Killer Skyscrapers a meglévő validált Killer-ketrec geometriát használja, és ehhez ad Lakótelep-nyomokat; a cage-topológia seedenként nem generálódik újra.
- A difficulty továbbra is elsősorban clue-density tier, nem emberi solve-path nehézségbecslés.

## Iteration 22 megjegyzés

A Domino Skyscrapers jelenlegi constraint-geometriája az eredeti Logic Masters India A4 dokumentált példájára épül. Az új feladványok seedelt kezdőszám-elrendezéseket generálnak ugyanazon hitelesített dominó- és külsőnyom-struktúrához; a solver minden generált táblán újra bizonyítja az egyediséget és a variáns szükségességét.

A Chromium `file://` smoke tesztet Iteration 22-ben is megkíséreltük. A futás `rc=124` timeouttal állt meg; a stderr ismét DBus-kapcsolati hibát és a `/run/dbus/system_bus_socket` hiányát mutatta. Ez környezeti korlát, ezért automatizált browser/visual PASS nincs deklarálva.


## Iteration 23 megjegyzés

A Parks 2 `New puzzle` a seedelt kezdőérték-maszkot változtatja; a 32 külső clue a validált 8×8 completed gridből származó rögzített clue-készlet. A difficulty továbbra is clue-density tier, nem emberi solve-path becslés. A park két előfordulása szemantikailag azonos `🌿` érték, ezért nincs „első” és „második” park.

### Iteration 25
A Classic Skyscrapers jelenlegi mérete 6×6; ez tudatos UX-választás, nem a szabály általános korlátja.

### Iteration 26
A Toroidális Lakótelep 6×6 mérete tudatos UX-választás. A WPC általános szabálya nagyobb méretre is kiterjeszthető. A `New puzzle` a kezdő épületértékek seedelt maszkját változtatja; a hitelesített clue-cellák helye és nyíliránya jelenleg rögzített topológia.

## Iteration 27
Az egyfájlos HTML célja a legegyszerűbb Windowsos használat. A fájl az alapértelmezett böngészőben nyílik meg, ezért a böngésző ikonja jelenhet meg saját alkalmazásikon helyett. Nincs telepítő és nincs aláírt `.exe`, így megmarad a projekt dependency-free, offline jellege.

## Iteration 30
Hitori currently ships as 6×6. Larger Hitori sizes and additional Japanese logic families are intentionally deferred to later iterations so each new engine can be validated independently.

## Iteration 31 korlát

A Hashiwokakero első verziójának generátora 7×7-es, 3×3 rácsba rendezett szigetelhelyezéseket használ, több egyedi hídtopológiai sablonnal. A solver architektúrája különálló Bridges-motor, de a későbbi iterációkban érdemes szabálytalanabb szigetpozíciókra és keresztezési lehetőségeket tartalmazó gráfokra bővíteni.


## Iteration 32 korlát

A Fillomino első kiadása 6×6-os rácsot és legfeljebb 6-os régióméretet használ. A generátor seedelt és solverrel egyediség-ellenőrzött, de még nem modellez külön emberi logikai technikákat a nehézség becsléséhez; a három szint jelenleg főként a megadott clue-k számát szabályozza.

## Iteration 34
A Slitherlink első verziója 5×5 rácsot használ. A seedelt megoldáscsalád szándékosan konzervatív, egyszerű zárt hurkokból indul, majd a clue-ritkítást teljes solution-counting solver validálja. Ez korrekt és egyedi feladványokat ad, de a későbbi iterációkban érdemes változatosabb loop-shape generátorra bővíteni. Browser/visual PASS csak sikeres tényleges file:// smoke esetén deklarálható.

## Iteration 36
Az Akari első verziója egy saját, solverrel bizonyított unique 6×6 puzzle-family seedelt geometriai transzformációit használja. Ez reprodukálható és több nehézséget ad, de szerkezeti változatossága kisebb, mint egy teljesen szabad falelrendezés-generátoré. Későbbi iterációban bővíthető több független familyvel.


## Iteration 37 – Nonogram / Picross
Added an 8×8 seeded Nonogram family with row/column run clues, a dedicated line-pattern solution-counting solver, guaranteed unique bundled pattern families across Gentle/Focused/Expert, mobile fill/X/empty interaction, HU+EN copy, accessibility labels, and offline Cat Garden integration. Puzzle patterns are original project data; no web puzzle instances are copied.

## Iteration 38 – Masyu
The current Masyu generator intentionally uses a compact original 4×4 loop family so exhaustive solution counting stays fast in a dependency-free browser. Seeds vary the selected pearl clues and all released difficulty/seed combinations are uniqueness-checked. This is a conservative first Masyu implementation rather than a large-grid procedural loop constructor.

## Iteration 39 audit-megjegyzés
A gyűjtemény immár 97 rendszernél jár, ezért a kézzel karbantartott darabszámok regressziós kockázatot jelentettek. Az új katalógus-integritási teszt ezt release gate-ként kezeli. A korábbi játékok generátorainak ismert, dokumentált szerkezeti korlátai (például a konzervatív Masyu-, Akari- és Slitherlink-familyk) továbbra is fennállnak; ebben a körben tudatosan nem változtattuk meg a puzzle-szemantikát.

## Iteration 40 – fennmaradó generátor-korlátok

A mostani kör a három legszűkebb japán generátort jelentősen kinyitotta, de nem állítja, hogy minden nehézség emberi logikai technikák alapján kalibrált. A Nonogram difficulty jelenleg mintázat/line-domain komplexitásra és generációs paraméterekre épül; a Nurikabe difficulty a puzzle mellett starter-sea információt is használ; a Masyu difficulty a megtartott körök számával csökken. A 12×12/16×16 Sudoku-generátor továbbra is konzervatív, konstrukciós uniqueness-modellt használ, ezért ezen nagy táblák "Expert" szintje inkább méretből, mint mély logikai technikából nehéz. Ez egy későbbi külön hardening célpont.


## Iteration 41 – fennmaradó generátor-korlátok

A Fillomino továbbra is egy validált megoldáscsalád geometriai transzformációiból indul, ezért nem tekinthető teljes procedurális Fillomino-generátornak. Az Akari továbbra is validált alapszerkezet transzformációjára és difficulty-függő számozott falakra épül. Ezek következő mély audit célpontjai lehetnek; az Iteration 41 nem állít róluk mesterségesen teljes procedurális változatosságot.

## Iteration 42 – generator-depth and UX limitations

- **Lakótelep / Skyscrapers:** the deep audit confirmed that all 16 current systems still derive generated puzzles from a validated, fixed completed `variant.solution` (or the corresponding fixed special-grid solution) and vary the removable givens by seed. The seed therefore produces different puzzle masks, but **does not yet produce a new Lakótelep solution structure**. This is now an explicit known limitation rather than being described as full solution-level procedural generation. The variant-specific solution counters do enforce their documented special constraints; replacing the shared fixed solutions safely is deferred because several variants also carry fixed clue/cage/domino/inside/toroidal geometry that must transform consistently with the solution.
- **Fillomino:** Iteration 42 replaces the single transformed template with a procedural connected-region partition. Expert clue removal is intentionally the slowest Japanese generator in this release because every removal is uniqueness-checked by the full Fillomino solution counter. The 6×6 / region-size-1…6 boundary remains deliberate for `file://` responsiveness.
- **Akari:** wall topology is now procedurally generated and numbered-wall clues are removed only while uniqueness survives. A curated symmetry fallback remains in code as a safety boundary for pathological seeds, but the Iteration 42 multi-seed release gate exercises the procedural path exclusively.
- **12×12 / 16×16 Sudoku:** clue removal is now uniqueness-checked rather than restricted to one trivially forced blank per row/column. Difficulty is materially separated by clue count, but still does not claim human-technique grading.
- Real Chromium `file://` visual PASS remains environment-dependent and is not claimed unless the smoke process terminates successfully.

## Iteration 43 – Lakótelep generátor-korlátok

A 16 Lakótelep-rendszerből hat már seed-specifikus completed solutiont generál: Classic Skyscrapers, Skyscrapers Parks, Sum Skyscrapers Parks, Parks 2, Even/Odd és Double Skyscrapers. Ezeknél a solutionnel együtt a külső clue-k és szükséges speciális metaadatok is újraszámolódnak, majd a saját solver igazolja az egyediséget.

A **remaining ten Skyscraper systems still use fixed completed-solution/topology families**. Ennek oka, hogy Domino, Killer, Inside, Diagonal, Toroidal és a többi összetettebb változat constraint-geometriáját a solutionnel együtt kellene transzformálni. Ezeket csak külön parity-audittal szabad mélyíteni; ebben az iterációban nem cseréltünk működő, validált mechanikát széles kockázatú refaktorra. A difficulty ezeknél továbbra is főként clue/given removal alapú, nem emberi solve-path értékelés.


## Iteration 44 – fennmaradó Lakótelep generátor-korlátok

A 16 Lakótelep-rendszerből 14 már seed-specifikus completed solutiont használ. Két szándékos kivétel marad:

- **Inside Skyscrapers:** a clue-forráscellában álló szám maga a következő cellától mért láthatósági darabszám, ezért egyszerű szimbólumpermutáció nem őrzi meg a szabályt. Valódi diverzifikálásához clue-geometriát és clue-kompatibilis solutiont együtt kell generálni.
- **Domino Skyscrapers:** az összes jelölt dominó azonos összegű feltétele konkrét szomszédsági geometriához kötött. Arbitráris sor-/oszlop- vagy szimbólumpermutáció ezt nem őrzi meg, ezért külön topológiatudatos transzformáció/generátor szükséges.

E két játék továbbra is seedelt, solverrel unique és variant-essential puzzle-maszkokat készít a validált solution/topológia körül; nem nevezzük őket solution-szinten procedurálisnak.


## Iteration 45 – Lakótelep generator-depth státusz

Az Iteration 44-ben még **Inside** és **Domino Skyscrapers** volt a két dokumentált fix-topológiás család. Iteration 45-ben ez a korlát megszűnt: mindkettő runtime solutionből derivált constraint-geometriát kap, így a teljes **16/16 Lakótelep-rendszer** seed-specifikus completed solutiont használ.

A fennmaradó korlát nem a solution-diverzitás, hanem a difficulty becslés mélysége: sok Lakótelep-változat továbbra is elsősorban givens/clue removal és uniqueness/variant-essential kritérium alapján különíti el a Gentle/Focused/Expert szinteket, nem teljes emberi logikai solve-path modellel. Ezt későbbi difficulty-auditban érdemes tovább mélyíteni.


## Iteration 46 remaining difficulty limitations

Difficulty is not yet normalized to one cross-game solver score across all 97 systems. Different mechanics expose difficulty through different signals (givens, clue density, starter annotations, shaded-cell density or structural topology). Bridges in particular still uses a fixed island count, so future work should measure branching/search complexity rather than infer difficulty from clue count. Browser/visual PASS must still not be claimed unless a real `file://` Chromium run completes successfully.


## Iteration 47 remaining difficulty limitations

- A search node count solver-specifikus proxy, nem bizonyítja önmagában az emberi logikai nehézséget. A Bridges esetén most lényegesen igazabb, mint a korábbi template-offset, de később emberi technika-szintű mérés tovább javíthatja.
- Hitori difficulty 10 seed mediánján monoton, de az egyedi seedek search-depth tartományai átfedhetnek; ezért nem állítjuk, hogy minden Expert példány nehezebb minden Gentle példánynál.
- Nurikabe search-depth a starter sea információ hatását méri; ez nem azonos a szükséges emberi következtetési technikák mélységével.
