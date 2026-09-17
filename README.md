# Ildi Sudoku Kertje / Ildi's Sudoku Garden

## Iteration 57 – Tentai Show / Csillaggalaxisok hardening

A katalógus továbbra is **106 játék**. Az Iteration 53 utolsó nyitott kiemelt hardening célpontja lezárult: a Tentai Show valódi center-anchored, exact-rotation, connectivity-aware solution countert és solver-verified uniqueness gate-et kapott. A generátor procedurális téglalap-galaxis tilinget használ, a difficulty tényleges solver-search alapján nő, a runtime pedig számozott cellatulajdonlás helyett közvetlen régióhatár-rajzolást használ 44 px-es mobil edge targetekkel. Részletek: `ITERATION57_AUDIT.md`.

## Iteration 54 — Yajilin solver + edge-loop hardening

A katalógus továbbra is **106 játék**. Ebben az iterációban nem került be új játék: a Nyílösvény / Yajilin kapott valódi, clue-alapú solution countert, solver-verified uniqueness gate-et, procedurális cycle-ear-growth generátort és edge-based loop UI-t. A mobil loop-élek 44 px-es érintési sávot használnak, a loop és a fekete cellák külön érintési módban szerkeszthetők. Részletek: `ITERATION54_AUDIT.md`.

## Iteration 48 — Futoshiki Search-depth + Touch Audit

A külső nyomokat használó Lakótelep-változatok számai és jelei most közvetlenül a megfelelő sor/oszlop mellett, a tábla felső, jobb, alsó vagy bal szélén jelennek meg. A korábbi alsó clue-lista ezeknél megszűnt. Az Inside, Diagonal és Toroidal változatok saját belső/átlós jelölési rendszere változatlan.


Offline, telepítés nélkül használható Sudoku- és logikaijáték-gyűjtemény. Az `index.html` fájlt kell megnyitni modern böngészőben; Ildinek az egyfájlos `Ildi Sudoku Kertje - Iteration 57.html` kiadás a legegyszerűbb.

- Magyar az alapértelmezett nyelv; a fejlécben `EN` / `Magyar` gombbal váltható.
- **106 játszható logikai rendszer**; a katalógus Iteration 54-ben nem bővült.
- Seedelt generálás; a Hidak, Hitori és Nurikabe korábbi search-depth kalibrációja megmaradt. Iteration 48-ban a Futoshiki solver is nodes/branches/dead-ends/solutions instrumentációt kapott, és a 10-seedes audit növekvő populációs search-depth trendet igazol. A Masyu és Slitherlink mobil él-touch targetjei 44 px-re nőttek.
- Nincs szerver, build, csomagkezelő, fiók vagy internetkapcsolat.
- A Cat Garden design, HU/EN felület és teljes offline működés megmaradt.

## Használat

1. Csomagold ki a ZIP-et.
2. Nyisd meg az `index.html` fájlt.
3. Válassz kategóriát a bal oldali menüből, majd Sudoku-változatot a felső választóból.
4. Válassz nehézséget, majd játssz; az `Új feladvány` új seedelt táblát készít.

## English

The collection defaults to Hungarian. Use the language button in the header to switch the complete interface and all 97 game descriptions to English.


## Iteration 7 — personal design

The collection now uses a warmer, feminine garden-inspired visual system and a personal Hungarian-first identity for Ildi. The previous long left-hand variant index was replaced with a compact two-stage category + variant picker. English remains available from the header language control. No puzzle systems were added or removed in this iteration.

## Iteration 8 — Garden dashboard

The approved floral/pastel design direction is now implemented as the real application UI. The puzzle catalogue remains at 58 variants.

- dedicated category sidebar with counts;
- central puzzle card with a compact number/tool rail;
- variant information and tip panel on the right;
- favourites stored locally in the browser;
- local solved/best-time/streak/total-time statistics;
- Hungarian-first bilingual copy retained throughout;
- responsive layout preserves direct `file://` use and has no remote visual assets.


## Iteration 9 — Ildi macskás Sudoku Kertje

A jóváhagyott macskás-pasztell design került a valódi alkalmazásba. A Sudoku-katalógus továbbra is 58 variáns.

- saját, helyi SVG macska-embléma a fejlécben;
- alvó cica a személyes üdvözlőkártyán és kerti cica-dekoráció a szabálypanel alján;
- hét, könnyebben áttekinthető magas szintű menükategória: Klasszikusok, Vonalak, Ketrecek / összegek, Tiltó szabályok, Különleges minták, Strukturális, Kombinációk;
- a teljes 58-as kínálat továbbra is elérhető és minden variáns pontosan egy menükategóriába tartozik;
- magyar alapnyelv és teljes angol váltás változatlanul működik;
- nincs külső kép, font vagy hálózati függőség: a macskás grafika is beágyazott SVG/CSS.

## Iteration 10 — katalógus + variant-essential generálás

A Cat Garden design változatlan baseline maradt; a középső játékkártyán a Sudoku-változat neve most már csak egyszer jelenik meg.

- katalógus: **60 Sudoku-rendszer**;
- új: **Anti-Queen (9) Sudoku** — a 9-esek nem lehetnek ugyanazon átlóban;
- új: **Quad Sums Sudoku** — minden fekete pont körül az egyik szám a másik három összege;
- mindkét új rendszer constraint-aware generátort kapott;
- az új táblák egyediek a variánsszabállyal, miközben a klasszikus Sudoku-szabály önmagában több megoldást enged, tehát az extra szabály ténylegesen szükséges;
- teljes HU/EN szövegezés és offline `file://` működés megmaradt.


## Iteration 11 — jegyzetmód + Battenburg

- katalógus: **61 Sudoku-rendszer**;
- új közös **Jegyzet / Notes** mód kis pencil mark számokkal;
- a jegyzetmód a számpadról és az `N` billentyűvel kapcsolható, `Shift+szám` ideiglenesen is jegyzetet ír;
- a cellatörlés a végleges számot és a jegyzeteket is törli;
- a jegyzetek bekerülnek a cellák ARIA-leírásába is;
- új: **Battenburg Sudoku**, teljes pozitív + negatív 2×2 páros/páratlan checkerboard jelöléssel;
- Battenburg constraint-aware, seedelt, variant-essential generálást kapott.


## Iteration 12 – Reflection + Slingshot

- Katalógus: **63 Sudoku-rendszer**.
- Új variánsok: Reflection Sudoku és Slingshot Sudoku.
- Mindkettő seedelt, reprodukálható, variant-essential generálást használ: a speciális szabállyal egyedi, Classic Sudoku szabállyal többmegoldásos táblák készülnek.
- Jegyzet-optimalizálás: végleges szám beírásakor ugyanaz a pencil mark automatikusan eltűnik a klasszikus sor/oszlop/doboz peerekből.
- A Cat Garden design és a teljes offline `file://` működés változatlan.


## Iteration 13 — Axia + Couples + constraint-aware notes

- katalógus: **65 Sudoku-rendszer**;
- új: **Axia Sudoku** — a megjelölt cella száma nem ismétlődhet a belőle induló átlókon;
- új: **Couples Sudoku** — `~` azonos, `≁` eltérő párosságot jelöl a szomszédos cellák között;
- mindkét új variáns seedelt, reprodukálható, variant-essential generálást használ;
- a pencil-mark automatikus takarítása most az Axia- és Couples-kényszereket is figyelembe veszi;
- vizuális optimalizálás: 15 Axia- és 36 Couples-jelölés tartja variant-essentialnek a táblákat anélkül, hogy túlzsúfolná a rácsot;
- a variant-essential generátor típuslistája közös konstansból dolgozik, így nincs ismételt tömblétrehozás a `make()` hívásokban.


## Iteration 14 — Running Cells + Ascending Sequences

- katalógus: **67 Sudoku-rendszer**;
- új: **Running Cells Sudoku** — minden sor/oszlop külső nyoma megadja, hány cella része legalább egy szomszédos, egymást követő értékű futamnak;
- új: **Ascending Sequences Sudoku** — minden sor/oszlop külső nyoma megadja a maximális, legalább kétcellás szigorúan növekvő szakaszok számát;
- mindkét rendszer seedelt, reprodukálható és variant-essential generálást használ;
- a solver az új külső nyomoknál csak az éppen érintett sort/oszlopot ellenőrzi, így elkerüli a fölösleges teljes 18-clue újraszámolást minden próbálkozásnál;
- a 18 külső nyom tömör, reszponzív Cat Garden clue-rácsban jelenik meg.


## Iteration 15 — Bishopsgate + Min / Max

- katalógus: **69 Sudoku-rendszer**;
- új: **Bishopsgate Sudoku** — a kijelölt sakktáblaszínen azonos számok nem láthatják egymást futólépésnyi átlóban;
- új: **Min / Max Sudoku** — a jelölt lokális minimumok kisebbek, a maximumok nagyobbak minden oldalszomszédjuknál;
- mindkét új rendszer seedelt, reprodukálható és variant-essential generálást használ;
- a jegyzettakarítás Bishopsgate átlós peer-eket és Min/Max relációkat is figyelembe vesz;
- a Cat Garden design és a teljes offline `file://` működés változatlan.

## Iteration 16 — Numbered Rooms + Next to Nine

- katalógus: **71 Sudoku-rendszer**;
- új: **Numbered Rooms Sudoku** — a külső nyom száma az első cella által meghatározott N-edik pozícióban áll;
- új: **Next to Nine Sudoku** — a külső nyomok a 9 közvetlen sor-/oszlopszomszédait adják meg, sorrendtől függetlenül;
- mindkét új rendszer seedelt, reprodukálható és variant-essential generálást használ;
- a közös outside-clue solver indexeli a nyomokat sor/oszlop szerint, így Running Cells, Ascending Sequences és az új rendszerek csak az éppen érintett nyomokat ellenőrzik;
- a korábbi belső `67 Sudoku systems` runtime metaadat-hiba javítva **71**-re;
- a Cat Garden design és a teljes offline `file://` működés változatlan.


## Iteration 17 — Even Sandwich + Top-Heavy Parity

- katalógus: **73 Sudoku-rendszer**;
- új: **Even Sandwich Sudoku** — a bal/felső nyomok teljes listája azokat a számokat adja, amelyek két közvetlen szomszédja páros;
- új: **Top-Heavy Parity Sudoku** — azonos paritású függőleges szomszédoknál a felső szám nagyobb az alsónál;
- mindkét rendszer seedelt, reprodukálható és variant-essential generálást használ;
- Top-Heavy Parity candidate cleanup eltávolítja a már biztosan hibás azonos paritású függőleges jegyzeteket;
- az Even Sandwich az Iteration 16 közös, cache-elt outside-clue indexét használja, ezért csak az érintett sort/oszlopot ellenőrzi.


## Iteration 18 — Lakótelep / Skyscrapers family

- katalógus: **76 Sudoku-rendszer**;
- új: **Lakótelep összegekkel / Skyscraper Sums Sudoku** — a külső nyom a látható épületek magasságainak összegét adja;
- új: **Vegyes információs Lakótelep / Mixed Information Skyscraper Sudoku** — a külső nyom vagy a látható házak száma, vagy az első ház magassága, és nincs megjelölve, melyik;
- új: **Nem érintkező Lakótelep / Non-touching Skyscraper Sudoku** — a láthatósági szabály mellett azonos magasságú épületek átlósan sem érintkezhetnek;
- mindhárom új rendszer seedelt, reprodukálható, difficulty-aware és variant-essential;
- a három rendszer az Iteration 16 cache-elt outside-clue indexét használja, így csak az érintett sor/oszlop nyomai futnak;
- a Nem érintkező Lakótelep candidate cleanup az átlósan tiltott azonos számjegy-jegyzeteket is automatikusan eltávolítja;
- a **Lakótelep – grundokkal / Skyscrapers (Parks)** kutatása lezárva; külön iterációra marad, mert üres telket és 1…N−1-es beviteli modellt igényel.


## Iteration 19 — Lakótelep grundokkal / Parks

- katalógus: **78 rendszer**;
- új: **Lakótelep – grundokkal / Skyscrapers Parks** — minden sorban/oszlopban 1–8 egyszer, plusz egy valódi park; a park nem takar és nem számít látható épületnek;
- új: **Összeges Lakótelep – grundokkal / Sum Skyscrapers Parks** — ugyanaz a parkos Latin-rács, de a külső nyom a látható épületek magasságösszegét adja;
- a park külön `🌿` beviteli érték, billentyűzetről `P`-vel is beírható; nem ál-9-es a felhasználói felületen;
- a két parkos rendszer nem használ 3×3 Sudoku-dobozokat: saját Latin-square solver és uniqueness ellenőrzés kezeli őket;
- seedelt, reprodukálható, difficulty-aware generálás és variant-essential ellenőrzés.

## Iteration 20 — Belső és átlós Lakótelep

- új: **Belső Lakótelep / Inside Skyscrapers Sudoku** — a nyilas cella értéke adja az onnan, a nyíl irányában látható házak számát; a nyilas cella a nézőpont és nem számít bele;
- új: **Átlós Lakótelep / Diagonal Skyscraper Sudoku** — külső nyomok kijelölt átlós látóvonalakon adják meg a látható épületek számát;
- mindkettő seedelt, difficulty-aware, reprodukálható és variant-essential;
- új `sightClueIndexCache`: a solver csak az aktuális cellát érintő belső/átlós látóvonalakat ellenőrzi;
- új vizuális nyílmarkerek és forgatásbiztos sightline-transzformáció;
- katalógus: **80 Sudoku-rendszer**.


## Iteration 21 — Szorzatos + Killer Lakótelep

- katalógus: **83 rendszer**;
- új: **Szorzatos Lakótelep / Product Skyscrapers Sudoku** — a külső nyom a látható épületmagasságok szorzatát adja;
- új: **Killer Lakótelep / Killer Skyscrapers Sudoku** — a normál Sudoku, Killer-ketrecek és Lakótelep-láthatóság egyszerre érvényes;
- mindkét új rendszer seedelt, reprodukálható, difficulty-aware és variant-essential;
- a Product és Killer Lakótelep a közös, cache-elt outside-clue indexet használja;
- a Killer solver részleges ketreceknél is korán elutasítja az ismétlést, túl nagy összeget és a lezárt hibás összeget.


## Iteration 23 — Lakótelep két grunddal / Skyscrapers Parks 2

- katalógus: **84 rendszer**;
- új: **Lakótelep – két grunddal / Skyscrapers Parks 2**;
- 8×8-as saját Latin/Lakótelep motor: minden sorban és oszlopban 1–6 pontosan egyszer, plusz pontosan két valódi park (`🌿`);
- a parkok nem épületek, nem számítanak bele a láthatóságba és nem takarják a mögöttük álló házakat;
- nincs Sudoku-doboz constraint; a két park ugyanaz a játékérték, nem két mesterséges sentinel;
- `P` billentyű és a `🌿` gomb ugyanazt a parkértéket írja be, amely soronként/oszloponként kétszer engedélyezett;
- seedelt, reprodukálható, difficulty-aware generálás; minden tesztelt tábla egyedi és outside-clue variant-essential.

## Iteration 24 — Lakótelepek alcsoport + Páros–páratlan Lakótelep

- katalógus: **85 rendszer**;
- a Cat Garden kategóriamenü új, önálló **🏙 Lakótelepek / Skyscrapers** alcsoportot kapott;
- a 13 Lakótelep-családtag pontosan egyszer jelenik meg a kategóriarendszerben, és kikerült az átfedő Ketrecek/összegek illetve Strukturális listákból;
- új: **Páros–páratlan Lakótelep / Skyscrapers (Even/Odd)**;
- 6×6-as saját Latin/Lakótelep motor: 1–6 minden sorban/oszlopban egyszer, Sudoku-doboz nélkül;
- `●` = páratlan, `■` = páros jelölés a cellákban és a külső látványnyomoknál; a külső jel a látható házak darabszámának párosságát adja;
- seedelt, reprodukálható, difficulty-aware és variant-essential generálás;
- a jegyzet-cleanup a cellaparitásból biztosan kizárt jelöléseket is eltávolítja;
- szabályforrás: World Puzzle Federation, Puzzle GP 2022 Round 8, **Skyscrapers (Even/Odd)**.

## Iteration 25 — Klasszikus, önálló Lakótelep

- katalógus: **86 rendszer**;
- a **🏙 Lakótelepek / Skyscrapers** alcsoport 14 rendszerre nőtt;
- új: **Klasszikus Lakótelep / Classic Skyscrapers**;
- 6×6-as valódi Latin-rács: 1–6 minden sorban és oszlopban pontosan egyszer, **Sudoku-doboz nélkül**;
- a külső szám a megfelelő irányból látható épületek darabszámát adja;
- seedelt, reprodukálható, difficulty-aware generálás, egyediség- és clue-essential ellenőrzéssel;
- szabályforrás: Logic Masters Deutschland Puzzlewiki — **Skyscrapers**.

## Iteration 26 — Toroidális Lakótelep

- katalógus: **87 rendszer**;
- a **🏙 Lakótelepek / Skyscrapers** alcsoport **15 rendszerre** nőtt;
- új: **Toroidális Lakótelep / Toroidal Skyscrapers**;
- 6×6-os tóruszrács: minden sorban és oszlopban az 1–5 házmagasság pontosan egyszer szerepel, plusz egy rögzített nyilas nézőpontcella;
- a látóvonal a tábla szélén átfordul a szemközti oldalra, és a nézőpontig tart; a nézőpont nem épület;
- a szürke clue-cellák közvetlenül a táblán mutatják a látható házak számát és a nyílirányt;
- seedelt, reprodukálható, difficulty-aware generálás, egyediség- és toroidal-clue-essential ellenőrzéssel;
- szabályforrás: **22nd World Puzzle Championship 2013 Instruction Booklet, Puzzle 9 — Toroidal Skyscrapers**.

## Iteration 27 — Dupla Lakótelep + Ildi egyfájlos kiadás

- új: **Dupla Lakótelep / Double Skyscrapers**;
- 6×6 rács, az 1–3 magasságok minden sorban és oszlopban pontosan kétszer szerepelnek;
- a külső nyomok a látható házak számát adják, az azonos vagy magasabb korábbi épület takar;
- saját solver/generator, seedelt és reprodukálható, uniqueness + variant-essential ellenőrzéssel;
- a Lakótelepek alcsoport 16 játékra, a teljes katalógus 89 rendszerre nőtt;
- új felhasználói átadás: **`Ildi Sudoku Kertje.html`**, egyetlen önálló offline fájl, amely dupla kattintással megnyitható Windows alatt;
- a fejlesztési mappában opcionális `INDITAS - Ildi Sudoku Kertje.cmd` is az egyfájlos kiadást nyitja meg.

Szabályforrás: **World Puzzle Federation, Puzzle GP 2022 Round 5, Puzzle 10 — Skyscrapers (Double)**.

### Iteration 31
A HU/EN language change no longer reloads the application. Ildi stays on the exact puzzle she is playing, including her current entries and notes, while the surrounding interface and current variant text are translated in place.


## Iteration 30 – Japán logikai játékok

Új önálló kategória: **◉ Japán logikai játékok / Japanese logic**. Első játék: **Hitori**, seedelt 6×6 generátorral és egyediség-ellenőrző solverrel. A szabályforrások: BrainBashers Daily Hitori és Nikoli Hitori. A Cat Garden design és a HU/EN nyelvváltás megmarad.

## Iteration 31 – Hidak / Hashiwokakero

A **◉ Japán logikai játékok** kategória második tagja a **Hidak / Hashiwokakero**. A szabályforrások a BrainBashers Daily Bridges és a Nikoli Hashiwokakero leírásai. A 7×7-es játéktér számozott szigeteit vízszintes/függőleges, legfeljebb dupla hidakkal kell összekötni; minden sziget fokszáma egyezzen a nyommal, a hálózat legyen összefüggő. Saját seedelt generátor, saját solver és egyediség-ellenőrzés tartozik hozzá. A kezelés két sziget egymás utáni kattintásával ciklizál 0 → 1 → 2 → 0 híd között. HU + EN és offline Cat Garden integráció készült.


## Iteration 32 – Fillomino

A **◉ Japán logikai játékok** kategória harmadik tagja a **Fillomino**. A szabályforrás a BrainBashers Daily Fillomino: a rácsot oldalirányban összefüggő csoportokra kell felosztani, és minden cella száma a saját csoportjának méretét adja. A 6×6-os változathoz saját seedelt generátor, saját megoldásszámláló solver, Gentle / Focused / Expert clue-sűrűség, HU+EN felület és külön érintésbarát számbeviteli UI készült. A teljes katalógus **91 játszható rendszerre** nőtt.


## Iteration 33 – Futoshiki

A **◉ Japán logikai játékok** kategória negyedik tagja a **Futoshiki**. A BrainBashers szabályleírása alapján a 6×6 Latin-rács minden sorában és oszlopában az 1–6 számok pontosan egyszer szerepelnek, és minden szomszédos cellák közötti `<` / `>` egyenlőtlenségnek teljesülnie kell. Saját seedelt generátor, Latin+inequality solver, egyediség-ellenőrzés, Gentle / Focused / Expert nehézség, külön mobilbarát renderer és HU+EN integráció készült. A BrainBashers csak szabályreferencia; puzzle-t, képet vagy webdesign-elemet nem másoltunk. A katalógus 92 játszható rendszer.

## Iteration 34 – Slitherlink

A **◉ Japán logikai játékok** ötödik tagja a **Slitherlink**. A rácspontok közötti éleken egyetlen, önmagát nem metsző, elágazás nélküli zárt hurkot kell rajzolni; a cellaszám megadja, hogy a cella négy oldalából pontosan hány tartozik a hurokhoz. Szabályreferencia: World Puzzle Federation Puzzle GP (klasszikus Slitherlink). Saját 5×5 seedelt generátor, külön edge-solver és solution counting, Gentle / Focused / Expert clue-sűrűség, mobilbarát élkattintás (`vonal → X → üres`), HU+EN és Cat Garden integráció készült. A katalógus **93 játszható rendszerre** nőtt.

## Iteration 36 – Akari / Light Up

A **◉ Japán logikai játékok** hatodik tagja az **Akari / Light Up**. A 6×6-os táblán lámpákat kell elhelyezni úgy, hogy minden fehér mező meg legyen világítva, miközben két lámpa nem világíthat egymásra; a számozott fekete mezők a közvetlenül szomszédos lámpák számát adják. Saját bináris constraint-solver és solution counting, seedelt forgatás/tükrözéses saját puzzle-family, Gentle / Focused / Expert számozottfal-sűrűség, mobilbarát `lámpa → X → üres` interakció, HU+EN és Cat Garden integráció készült. A katalógus **95 játszható rendszerre** nőtt.


## Iteration 37 – Nonogram / Picross
Added an 8×8 seeded Nonogram family with row/column run clues, a dedicated line-pattern solution-counting solver, guaranteed unique bundled pattern families across Gentle/Focused/Expert, mobile fill/X/empty interaction, HU+EN copy, accessibility labels, and offline Cat Garden integration. Puzzle patterns are original project data; no web puzzle instances are copied.

## Iteration 38 – Masyu

A **◉ Japán logikai játékok** kategória kilencedik tagja a **Masyu**. Egyetlen, önmagát nem metsző ortogonális hurkot kell rajzolni minden körön át. Fehér körön a hurok egyenesen halad és legalább az egyik közvetlen szomszédos cellában fordul; fekete körben fordul, majd mindkét irányban egyenesen folytatódik a következő cellában. Saját cellaközéppont-alapú edge-solver, solution counting, seedelt clue-válogatás, Gentle / Focused / Expert nehézség, mobilbarát `vonal → X → üres`, HU+EN és Cat Garden integráció készült. Szabályforrás: World Puzzle Federation Puzzle GP 2023 Round 7 és WPF Puzzle GP 2026 Round 4. A katalógus **97 játszható rendszerre** nőtt.

## Iteration 39 – minőségi audit és tökéletesítés

Ebben a körben szándékosan **nem került be új játék**. A teljes 97 játékos katalógus regressziós és integritási auditja készült el. Javítva lett két elavult katalógus-smoke teszt, amelyek csak az Iteration 32-ig töltötték be a játékbankot, valamint a statikus kezdőképernyő 94-es és a könyvtári metaadat 93-as elavult darabszáma. Új `catalogue-integrity.test.js` ellenőrzi, hogy az `index.html` által ténylegesen betöltött összes játék pontosan egyszer kategorizált, egyedi ID-val rendelkezik, HU+EN metaadata teljes, a japán és Lakótelep alcsoportok konzisztensen jelennek meg, és a statikus katalógusszám sem marad le a runtime állapottól.

A cél ettől az iterációtól nem a darabszám növelése, hanem a meglévő gyűjtemény megbízhatóságának, konzisztenciájának és karbantarthatóságának erősítése.

## Iteration 40 – játékmechanika, megjelenítés és generátor hardening

Ebben a körben nem került új játék a katalógusba; a gyűjtemény továbbra is 97 rendszert tartalmaz. A fókusz a meglévő motorok helyessége és minősége volt.

- Nurikabe: procedurális, összefüggő tengert növesztő 5×5 generátor, solverrel ellenőrzött egyediség; a difficulty starter-sea jelölései most ténylegesen eljutnak a játékpéldányba.
- Nonogram: a néhány fix képminta helyett seedelt 8×8 procedurális bitmap-generálás, uniqueness-szűréssel és difficulty-aware mintakomplexitással; a kész sor/oszlop clue-k vizuálisan halványulnak és áthúzódnak.
- Masyu: az egyetlen kerethurok helyett seedelt, önmagát nem metsző ciklusokból származó clue-k; a segédrács a cellaközéppontokhoz igazítva.
- Bridges: a solution-counting solver most explicit módon tiltja a keresztező hidakat; a játékfelület sem engedi új keresztező híd létrehozását.
- Akari: a biztonsági X-jelölések többé nem akadályozzák a helyes megoldás felismerését.
- Futoshiki és Fillomino: a helyes teljes tábla automatikusan lezárja a játékot.
- Központi completion API: a nem-Sudoku motorok `complete()` hívása támogatott, és egy puzzle csak egyszer könyvelhető megoldottnak.
- Új `tests/iteration40-mechanics-quality.test.js`: uniqueness + multi-seed solution diversity + difficulty propagation + mechanikai/renderer regressziók.


## Iteration 41 – generátormélység és mechanikai változatosság

Új játék nélkül mélyítettük a meglévő rendszereket. A Slitherlink már nem egyszerű téglalap-hurkokból indul: seedelt összefüggő cellaalakzatok határából készít változatos, egyhurkos megoldásokat, majd uniqueness-megőrző clue-ritkítást végez. A Futoshiki seedelt sor-, oszlop- és szimbólumpermutációval sokkal több Latin-megoldásformát használ. A Fillomino a korábbi négy forgatás helyett a teljes nyolcelemű diéder-transzformációs családot használja. A katalógus változatlanul 97 játék.

## Iteration 43 – Lakótelep solution-diverzitás hardening

Új játék nélkül tovább mélyült a 16 tagú Lakótelep-család. Hat biztonságosan újragenerálható rendszer – Classic Skyscrapers, a két Parks változat, Parks 2, Even/Odd és Double Skyscrapers – már nem ugyanazt a completed solutiont használja minden seedhez. Seedelt sor-/oszlop-permutáció készít új Latin-megoldást, majd a hozzá tartozó külső nyomok és speciális paritásadatok újraszámolódnak; a clue removal után a saját teljes solver újra bizonyítja az egyediséget és a variant-essential állapotot. A többi tíz Lakótelep-rendszer geometriai/topológiai constraintjeit ebben a körben szándékosan nem transzformáltuk kockázatosan.


## Iteration 44 – Skyscraper solver-parity és solution-diverzitás

Új játék nélkül folytatódott a 16 tagú Lakótelep-család hardeningje. A sima **Skyscraper Sudoku** auditja bizonyította, hogy a UI láthatósági clue-kat mutatott, miközben a központi `countVariantSolutions()` korábban nem kényszerítette ki a `skyscraper` kind szabályát. Ez javítva lett: a solution counting most ugyanazt a visibility constraintet használja, mint a szabálypanel és a renderer.

Nyolc további rendszer – Skyscraper Sudoku, Skyscraper Sums, Mixed Information, Non-touching, Product, Killer, Diagonal és Toroidal Skyscrapers – seed-specifikus completed solutiont kap. A seedelt szimbólumpermutáció után a visibility/sum/product/mixed clue-k, Killer cage sumok, diagonal clue-k és toroidális clue-k az új solutionből újraszámolódnak, majd a saját teljes solver bizonyítja az egyediséget és variant-essential állapotot. Az Iteration 43 hat rendszerével együtt így már **14/16 Lakótelep-rendszer** solution-szinten is változatos. Az Inside és Domino változat továbbra is dokumentált fix-topológiájú célpont.


## Iteration 45 – Inside + Domino topológiatudatos diverzitás

Az **Inside Skyscrapers** többé nem fix completed solutionből indul. Seedelt Sudoku-szimbólumpermutáció után a generátor végigkeresi az új solution azon belső nézőpontjait és irányait, ahol a forráscella értéke ténylegesen megegyezik a következő cellától számolt látható épületek számával. Ebből seedelt, elosztott sightline-készletet választ, majd a teljes Inside solverrel bizonyítja az egyediséget és a variáns szükségességét.

A **Domino Skyscrapers** seedelt 7×7 Latin row/column permutációt használ. A perimeter visibility clue-k az új solutionből újraszámolódnak, az egyenlő összegű szomszédos párokból pedig új, nem átfedő ötdominós geometria készül. A saját Latin + visibility + equal-domino-sum solver ezután minden puzzle-nél újra bizonyítja az egyediséget.

Ezzel a Lakótelep-kategória mind a **16/16 rendszere solution-szinten seed-változatos**; a dinamikus constraint-adatok mindig ugyanabból a runtime solutionből származnak, amelyet a solver és a renderer is használ.

## Iteration 49 – Loop Search Difficulty Calibration
- Slitherlink and Masyu solution counters now expose optional solver-search instrumentation (`nodes`, `branches`, `deadEnds`, `solutions`).
- Audit finding: Masyu Gentle and Focused had the same 10-seed median search depth despite different labels/clue targets.
- Focused Masyu now targets 7 clues (previously 8), restoring a measured population-level Gentle < Focused < Expert search-depth progression while retaining uniqueness.
- Added `tests/iteration49-loop-search-difficulty.test.js` as the release regression gate.


## Iteration 50 – Three Researched Japanese Families

A research-led catalogue expansion adds exactly three new systems (100 total): Star Battle / Csillagkert, Aquarium / Akvárium, and Tentai Show / Csillaggalaxisok. Star Battle and Aquarium use seeded generators with exact uniqueness counters; Tentai Show uses seeded symmetric tilings with an exact rotational-symmetry/connectivity solution counter. Difficulty uses calibrated board size (Star Battle/Aquarium 5/6/7; Galaxies 4/5/5), all three have dedicated touch-first renderers and Hungarian/English rules. Regression gate: `tests/iteration50-three-new-families.test.js`.

## Iteration 51 – Háromszögkert, Hullámhatás, Nyílösvény
A kutatási roadmap második bővítési hulláma három új japán logikai családot ad: Shakashaka (Háromszögkert), Ripple Effect (Hullámhatás) és Yajilin (Nyílösvény). A katalógus 103 játékos. Mindhárom seedelt generálást, három difficulty-méretet, mobilbarát legalább 42–44 px-es interakciós cellákat, magyar lokalizációt és Iteration 51 regressziós gate-et kapott.


## Iteration 52 – Tetrominókert, Rejtett Flotta, Szobakert
A kutatási roadmap harmadik bővítési hulláma három új logikai családot ad: LITS (Tetrominókert), Battleships (Rejtett Flotta) és Heyawake (Szobakert). A katalógus 106 játékos. Mindhárom mögött valódi solution-counting constraint solver fut. A LITS négy saját, egyedi régiótérkép-családot és seedelt diéder-transzformációt használ; a Rejtett Flotta seedelt hajóelhelyezést, sor/oszlop clue-kat és uniquenesshez szükséges starter-információt generál; a Heyawake eredeti projektben generált szobatérképeket, érvényes fekete mintákat, teljes szabályellenőrzést és uniqueness startereket használ. Gentle / Focused / Expert esetén a biztos megoldás megtartása mellett eltérő mennyiségű induló segítség jelenik meg.

## Iteration 53 – New Families Hardening Audit

No new games were added; the catalogue remains at 106. See `ITERATION53_AUDIT.md` for the nine-family audit. This release removes unsupported uniqueness claims from Tentai Show, Shakashaka, Ripple Effect and Yajilin, fixes LITS starter enforcement, and makes Aquarium retry generation until its solver verifies uniqueness (or explicitly reports unverified after the retry budget).

## Iteration 54 – Yajilin / Nyílösvény hardening
A Yajilin valódi clue-alapú solution countert, solver-verified uniqueness gate-et, procedurális cycle-ear-growth generátort és edge-based single-loop mobil UI-t kapott. Részletek: `ITERATION54_AUDIT.md`.

## Iteration 55 – Ripple Effect / Hullámhatás hardening
Új játék nélkül a Ripple Effect teljes szabálysolverre és solver-verified uniqueness gate-re váltott. A generátor seedelt, összefüggő, változó méretű 1–4 cellás szobákat készít, valódi megoldást keres hozzájuk, majd csak uniqueness-megőrző given-ritkítást fogad el. A UI vastag szobahatárokat rajzol, cellánként a saját szobaméret 1–N tartományában léptet, és mobilon legalább 44×44 px érintési célpontot tart. A szabály ellenőrzéséhez a Nikoli hivatalos Ripple Effect leírását használtuk. Részletek: `ITERATION55_AUDIT.md`.

## Iteration 56 – Shakashaka / Háromszögkert hardening
Új játék nélkül a Shakashaka valódi, clue-alapú solution countert és pontos fehér-poligon geometriát kapott. A solver a fehér komponensek kontúrját ellenőrzi, így csak tényleges téglalapokat/négyzeteket fogad el, beleértve a 45°-os négyzeteket is. A generátor procedurális szeparált rectangle-tiling családot használ és csak solver-verified uniqueness mellett ad `unique: true` státuszt. A UI külön Shakashaka runtime-ra váltott: a cella teljes 44×44 px-es érintési célpont marad, a fekete háromszög külön overlayként jelenik meg. Részletek: `ITERATION56_AUDIT.md`.
