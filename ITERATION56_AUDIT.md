# Iteration 56 — Shakashaka / Háromszögkert hardening audit

## Scope
Az Iteration 56 nem bővíti a katalógust; a gyűjtemény 106 játékos marad. A cél kizárólag az Iteration 53-ban hardeningre kijelölt Shakashaka solver-, generátor-, difficulty- és UI-rétegének javítása.

## Bizonyított baseline findingek
- A korábbi `countShakashakaSolutions()` csak `puzzle && puzzle.size ? 1 : 0` volt, tehát nem oldotta meg a puzzle-t.
- A korábbi generátor véletlen háromszögmozaikot készített, de a megmaradó fehér területek téglalap/square geometriáját nem ellenőrizte.
- A clue-szám csak azt számolta, hány oldal-szomszédos cellában volt bármilyen háromszög.
- A UI a teljes gombot `clip-path` segítségével háromszöggé vágta, ezért a vizuális állapot és a valós mobil touch target geometria összekeveredett.

## Szabályforrás
A Nikoli hivatalos Shakashaka leírásával egyeztetve:
1. fehér mezőbe négyféle fekete háromszög tehető;
2. fekete mezőbe nem tehető háromszög;
3. a szám a négy oldal-szomszédos háromszöges cella számát jelzi;
4. minden megmaradó fehér összefüggő terület téglalap vagy négyzet.

Forrás: https://www.nikoli.co.jp/en/puzzles/shakashaka/

## Solver
A `countShakashakaSolutions(puzzle, limit, stats)` kizárólag a látható `size + blocks + numbered clues` adatokból dolgozik.

A geometriai modell cellánként pontos fehér poligont használ:
- 0 = teljes fehér négyzet;
- 1..4 = a négy fekete sarokháromszög komplementer fehér háromszöge.

A solver:
- a fekete block-cellákat kizárja a háromszögállapotokból;
- 0..4 állapotot keres minden játszható cellára;
- a számozott fekete mezőknél alsó/felső bounddal metszi a részmegoldásokat;
- a fehér poligonokat közös teljes oldalszakasz alapján komponensekbe rendezi;
- a belső közös éleket törli;
- a komponens külső kontúrját bejárja és kollineáris pontokat egyszerűsít;
- csak pontosan négy csúcsú, derékszögű kontúrt fogad el, így a tengelyirányú és a 45°-ban álló téglalap/négyzet is szabályos;
- `limit >= 2` mellett 0 / 1 / több megoldást különböztet meg.

Instrumentáció:
- `nodes`, `branches`, `deadEnds`, `solutions` a tényleges puzzle-search fázishoz;
- `patternNodes`, `patternBranches`, `patterns` a geometriailag érvényes lokális minták előállításához.

## Generátor
Generator family: `procedural-separated-rectangle-tiling`.

A generátor fekete elválasztó cellákkal kis, független geometriai kamrákat hoz létre. A 2×2 kamrák seed alapján vagy teljes fehér négyzetek, vagy négy fekete sarokháromszögből kialakuló, 45°-os fehér négyzetek. Az elválasztó fekete cellák számai a kész solutionből származnak.

A clue-k seedelt sorrendben ritkulnak. Egy szám csak akkor maradhat rejtve, ha a teljes Shakashaka solver továbbra is pontosan egy megoldást számol. `generation.unique === true` kizárólag `solver-verified` állapotban lehetséges.

A generátor nem állít általános, korlátlan Shakashaka-layout generálást: a jelenlegi család tudatosan egy procedurális, szeparált téglalap-tiling struktúrát használ, amelyet a solver teljes szabályrendszerrel ellenőriz.

## Seed audit
Focused seed 1–10:
- 10/10 solver-verified unique;
- 10/10 eltérő puzzle-signature;
- legalább 7 külön solution-signature (mért érték: 8/10);
- minden számozott fekete cella clue-ját független teszt is visszaszámolja a solutionből.

## Difficulty audit
10 seedes, tényleges search-phase difficultyScore átlag:
- Gentle: 8.4
- Focused: 12.5
- Expert: 17.1

A lokális geometriai pattern-előállítás költsége külön metrika, nem torzítja a difficultyScore-t. Expert kevesebb látható clue-val indul, miközben az uniqueness gate változatlanul kötelező.

## Runtime / mobil
- külön `mountShakashaka()` runtime;
- a cella mindig teljes négyzet marad;
- a fekete háromszög `::after` overlayként jelenik meg;
- négy valódi sarokorientáció;
- számozott és szám nélküli fekete cella támogatott;
- cellánként minimum 44×44 px touch target;
- magyar/angol aria-label jelzi az orientációt;
- a súgó explicit leírja a rectangle/square feltételt.

## Regressziós gate
Új: `tests/iteration56-shakashaka-hardening.test.js`.

Tartalmaz:
- ismert 0 / 1 / több megoldásos mini-puzzle;
- 10 focused seed solver-verified uniqueness;
- független clue-validáció;
- seed/puzzle/solution diverzitás;
- Gentle < Focused < Expert mért search trend;
- valódi triangle-overlay + 44 px touch-target source gate;
- katalógus 106 invariant.

Az Iteration 51 és 53 történeti tesztjei frissültek: Shakashaka többé nem szerepel az „unverified” családok között. A Tentai Show hardening továbbra is nyitott.

## QA állapot
- Shakashaka + érintett Iteration 51/53 gate: 11/11 PASS.
- Recent-family integration gate (catalogue + i18n + Iteration 50–56): 32/32 PASS.
- A teljes történeti suite egyben futtatva ebben a környezetben időkeretbe ütközött; ezért teljes-suite PASS nincs állítva.
- A korábbról ismert `sudoku-iteration15.test.js` továbbra sincs release PASS-ként minősítve.
- Katalógus: 106 játék.
- Új játék: 0.
