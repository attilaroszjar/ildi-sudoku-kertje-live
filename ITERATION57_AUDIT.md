# Iteration 57 — Tentai Show / Csillaggalaxisok hardening audit

## Scope
Az Iteration 57 nem bővíti a katalógust; a gyűjtemény 106 játékos marad. A cél az Iteration 53 audit utolsó nyitott kiemelt családjának, a Tentai Show / Csillaggalaxisok solver-, generátor-, difficulty- és UI-rétegének hardeningje.

## Bizonyított baseline findingek
- A korábbi `countGalaxiesSolutions()` nem rögzítette kötelezően a csillagközéppont által érintett cellákat a saját galaxishoz.
- A forgatott partner koordinátáját `Math.round()` kerekítette, ezért nem rácskompatibilis forgatott pontot is cellának tekinthetett.
- A generátor csak 1×1, 1×2 és 2×1 szimmetrikus tile-okból épített táblát, és az Iteration 53 óta helyesen `unique:false` státuszt adott.
- A runtime számozott galaxy-ID-kat osztott cellákhoz, nem régióhatárokat rajzoltatott a játékossal.

## Szabálymodell
A puzzle látható információja kizárólag a rács és a csillagközéppontok halmaza. Egy megoldásban:
1. minden cella pontosan egy galaxishoz tartozik;
2. minden galaxis pontosan a saját kijelölt középpontját tartalmazza;
3. minden galaxis oldalirányban összefüggő;
4. minden galaxis 180°-osan szimmetrikus a saját középpontja körül.

A center cellaközépen, cellaélen vagy rácsponton is állhat. Emiatt a center 1, 2 vagy 4 cellát érinthet; ezek mind kötelezően a saját galaxishoz tartoznak.

## Solver
A `countGalaxiesSolutions(puzzle, limit, stats)` kizárólag a `size + centers` adatokból dolgozik.

Hardening:
- exact rotational partner: csak akkor van cellapár, ha a forgatott cellaközép egzakt egész cellaindexre képeződik; nincs `Math.round()`-os elfedés;
- center anchoring: a center által érintett 1/2/4 cella a saját galaxy ID-jára kényszerített;
- idegen center anchor cellája kizárja a másik galaxy assignmentet;
- szimmetrikus assignment mindig párban történik;
- részmegoldásnál potential-connectivity pruning fut;
- teljes megoldásnál minden galaxy tényleges oldalirányú connectivityt kap;
- `limit >= 2` mellett 0 / 1 / több megoldást különböztet meg.

Instrumentáció: `nodes`, `branches`, `deadEnds`, `solutions`, `forced`, valamint `firstSolution` a generátor számára.

## Generátor
Generator family: `procedural-rectangular-galaxy-tiling`.

A generátor seedelt guillotine-split eljárással változó méretű téglalap-galaxisokat épít. A téglalap közepe természetesen lehet cellaközép, élközép vagy rácspont. A center-lista csak akkor kerül kiadásra `unique:true` státusszal, ha a független teljes solver pontosan egy megoldást számol.

Retry budget után determinisztikus, minden cellát külön galaxisként kezelő safe fallback marad, amelyet szintén a solver ellenőriz.

## Seed audit
Focused seed 1–10:
- 10/10 solver-verified unique;
- 10/10 eltérő puzzle-signature;
- legalább 8 eltérő solution-signature;
- a solver minden esetben pontosan 1 megoldást számol.

## Difficulty audit
10 seed átlagos search-phase difficultyScore:
- Gentle: 1.5
- Focused: 3.3
- Expert: 6.5

A score a solver `nodes + 2×branches + 2×deadEnds` metrikájából származik. A board size 4 → 5 → 6, miközben az uniqueness gate minden nehézségen azonos.

## Runtime / mobil
A korábbi számozott cellatulajdonlás megszűnt.

Új interakció:
- a játékos közvetlenül belső régióhatárokat kapcsol be/ki;
- a csillagok a valódi center koordinátán jelennek meg;
- completion nem a tárolt solutionnel hasonlít, hanem a berajzolt határokból újra felépíti a régiókat és ellenőrzi az egy-center + connectivity + 180° symmetry szabályokat;
- külön `Határok törlése / Clear boundaries` gomb;
- mobilon a belső edge interaction lane 44 px széles/magas;
- hover nem szükséges.

## Regressziós gate
Új: `tests/iteration57-tentai-hardening.test.js`.

Tartalmaz:
- ismert 0 / 1 / több megoldásos mini-puzzle;
- center anchoring és nem rácskompatibilis partner regresszió;
- 10 focused seed solver-verified uniqueness;
- seed/puzzle/solution diverzitás;
- Gentle < Focused < Expert search trend;
- boundary-based runtime + 44 px mobil edge source gate;
- katalógus 106 invariant.

Az Iteration 50 és 53 történeti tesztjei frissültek: Tentai Show most már solver-certified család.

## Szabályforrás
A Nikoli aktuális kiadványjegyzékei a `天体ショー` / Tentai Show családot továbbra is aktív puzzle-ként listázzák. A hardening során a projektben már rögzített klasszikus szabálydefiníciót tartottuk meg: egy center / galaxy, connectivity, 180° rotational symmetry.

## QA állapot
- Tentai + érintett Iteration 50/53 gate: 15/15 PASS.
- Széles történeti regresszió fájlonként, a régóta ismert `sudoku-iteration15.test.js` kivételével: 55/55 tesztfájl PASS.
- A számításigényes `iteration56-shakashaka-hardening.test.js` külön 5/5 PASS.
- Frissen kibontott ZIP-en a Tentai + Iteration 50/53 release gate: 15/15 PASS.
- Standalone HTML: 0 külső script, 0 külső stylesheet; az öt `http://www.w3.org/2000/svg` előfordulás kizárólag beágyazott SVG XML namespace, nem hálózati függőség.
- ZIP integrity: PASS.
- Katalógus: 106 játék.
- Új játék: 0.
- Browser/visual PASS nincs állítva, mert ebben a futtatókörnyezetben nem futott megbízható interaktív böngészős ellenőrzés.
