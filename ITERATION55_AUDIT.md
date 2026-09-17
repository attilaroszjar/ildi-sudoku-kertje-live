# Iteration 55 — Ripple Effect / Hullámhatás hardening audit

## Scope
Az Iteration 55 nem bővíti a katalógust; a gyűjtemény 106 játékos marad. Kizárólag a Ripple Effect Iteration 53-ban azonosított solver-, generátor-, difficulty- és UI-hiányosságait hardeningeli.

## Bizonyított baseline findingek
- A korábbi `countRippleEffectSolutions()` nem volt általános Ripple Effect solver: soronként nézte a missing értékeket, és több üres mező esetén is képes volt formálisan `1` megoldást adni.
- A generátor minden sort egyetlen N-cellás szobának használt, és egy ciklikus Latin négyzetből indult.
- A runtime nem rajzolta ki a szobahatárokat, és minden cellában 1..táblaméret között léptetett, nem 1..saját szobaméret között.

## Szabályforrás ellenőrzés
A Nikoli hivatalos Ripple Effect szabályaival egyeztetve:
1. a vastag vonalak szobákat határolnak;
2. minden szoba 1-től a szoba méretéig tartalmazza a számokat egyszer-egyszer;
3. két azonos k szám között ugyanabban a sorban/oszlopban legalább k cellának kell lennie.

## Solver
A `countRippleEffectSolutions(puzzle, limit, stats)` kizárólag a látható `rooms` + `givens` adatokból dolgozik.

Kezelt constraint-ek:
- minden szoba ortogonálisan összefüggő;
- N-cellás szobában csak 1..N szerepelhet;
- szobán belül nincs ismétlés, így teljes kitöltéskor pontosan 1..N áll elő;
- azonos k értékek sorban/oszlopban nem lehetnek k vagy kisebb koordinátatávolságra;
- starter/given értékek ugyanazokat a constraint-eket kapják;
- `limit >= 2` esetén 0 / 1 / több megoldás megkülönböztethető.

Instrumentáció: `nodes`, `branches`, `deadEnds`, `solutions`, `propagations`.

## Generátor
Generator family: `procedural-connected-variable-rooms`.

- seedelt, ortogonálisan összefüggő, változó geometriájú szobák;
- 1–4 cellás szobaméretek ténylegesen előfordulnak;
- a solver először érvényes teljes megoldást keres az adott szobatérképhez;
- a givens seedelt sorrendben ritkulnak;
- egy given csak akkor távolítható el, ha a teljes szabálysolver továbbra is pontosan egy megoldást számol;
- `generation.unique === true` csak `solver-verified` esetben áll elő.

## Seed / diversity audit
Focused seed 1–10:
- 10/10 solver-verified unique;
- 10/10 eltérő room-map signature;
- a mintában 1, 2, 3 és 4 cellás szobák is megjelentek;
- független tesztvalidáció ellenőrizte a szobánkénti 1..N tartományt és a ripple-távolságot.

## Difficulty audit
10 seedes solver-search score átlag:
- Gentle: 7.0
- Focused: 12.7
- Expert: 36.6

A difficultyScore a tényleges solver keresési statisztikájából származik. A három szint ugyanazon 5×5 táblaméret mellett is növekvő search complexityt mutat; a különbséget elsősorban a uniqueness-megőrző given-ritkítás adja.

## Runtime / mobil
- vastag szobahatárok a `rooms` mátrixból;
- cellánkénti input maximum = saját szobaméret;
- givens külön vizuális állapotot kapnak;
- magyar súgó explicit leírja a szobahatárt és a k-cellás távolságszabályt;
- Ripple cellák mobilon minimum 44×44 px touch targetet tartanak.

## Regressziós gate
Új: `tests/iteration55-ripple-hardening.test.js`.

Tartalmaz:
- 0 / 1 / több megoldásos kézi mini-puzzle;
- hibás given eset;
- 10 focused seed uniqueness;
- független solution-validáció;
- room-map és room-size diverzitás;
- Gentle < Focused < Expert mért search-complexity trend;
- szobahatár/input/touch-target runtime source gate.

## Release QA
- Iteration 55 + érintett Iteration 51/53 gate: 10/10 PASS.
- Széles regresszió `sudoku-iteration15.test.js` nélkül: 171/171 teszt PASS.
- `sudoku-iteration15.test.js`: a korábbról ismert hosszú futás miatt külön továbbra sem kap release PASS minősítést.
- Katalógus: 106 játék.
- Új játék: 0.
