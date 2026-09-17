# Iteration 54 — Yajilin / Nyílösvény hardening audit

## Scope

Iteration 54 nem bővíti a 106 játékos katalógust. Kizárólag a Yajilin / Nyílösvény Iteration 53-ban bizonyított hiányosságait hardeningeli.

## Bizonyított baseline findingek

- Az Iteration 53 `countYajilinSolutions()` implementációja nem volt solver: clue-lista jelenlétére gyakorlatilag `1`-et adott.
- A runtime cellaállapotként modellezte a hurkot (`loopcell`), nem valódi élekkel.
- Emiatt a korábbi implementáció nem bizonyította sem a degree-2 feltételt, sem az egyetlen összefüggő zárt hurkot.

## Iteration 54 solver

A `countYajilinSolutions()` most kizárólag a játékos számára látható puzzle-adatokból dolgozik.

Kezelt constraint-ek:

- a clue-cellák nem fekete és nem loop cellák;
- a nyíl irányában pontosan a clue szerinti számú fekete cella áll;
- fekete cellák nem érintkezhetnek oldalról;
- minden nem clue és nem fekete cella a hurok része;
- minden loop-cella foka pontosan 2;
- a kiválasztott élek egyetlen összefüggő zárt hurkot alkotnak;
- solution counting `limit >= 2` mellett képes 0 / 1 / több megoldás megkülönböztetésére.

Instrumentáció: `nodes`, `branches`, `deadEnds`, `solutions`, `cycleChecks`.

## Generátor

A régi téglalap-perem + belső fekete minta helyett seedelt cycle-ear-growth generátor készült.

- 2×2-es induló ciklust seedelt, lokális „fül” bővítések növesztenek;
- a cikluson kívüli cellákból seedelten, oldalérintkezés nélkül kerülnek ki a fekete cellák;
- a többi cikluson kívüli cella valódi irányos arrow clue;
- mind a négy nyílirány megjelenhet;
- a generátor csak akkor ad `generation.unique === true` státuszt, ha a független solver pontosan 1 megoldást számol;
- generator family: `procedural-cycle-ear-growth`;
- verification: `solver-verified`.

## Difficulty audit

10 seedes audit alapján a solver-search score populációs átlaga növekvő trendet mutatott:

- Gentle: ~79.8
- Focused: ~524.1
- Expert: ~1128.6

A score a solver tényleges kereséséből származik, nem pusztán táblaméretből vagy clue countból.

## Seed / diversity audit

Focused 1–10 seed:

- 10/10 solver-verified unique;
- 10/10 külön puzzle-signature;
- a mintában mind a négy arrow direction előfordult;
- a tárolt solutiontól független solution counter minden esetben pontosan 1-et adott.

## Runtime / UI

A Yajilin saját `mountYajilin()` runtime-ot kapott.

- valódi edge-based loop rajzolás;
- élállapot: vonal → X → üres;
- külön **Hurok rajzolása** és **Fekete mezők** mód, hogy mobilon a nagy edge touch-target ne ütközzön a cellaérintéssel;
- a nyilak tényleges `→ ← ↑ ↓` irányban jelennek meg;
- mobilon az edge touch sáv 44 px, a cellák minimum 44×44 px;
- a solved check külön ellenőrzi a fekete cellákat és a loop edge-eket.

## Regressziós gate

Új teszt: `tests/iteration54-yajilin-hardening.test.js`.

Tartalmaz:

- kézzel ismert 0 megoldásos eset;
- kézzel ismert 1 megoldásos eset;
- többmegoldásos eset;
- lehetetlen arrow clue;
- több seed uniqueness;
- független solution-validáció;
- seed-diverzitás;
- difficulty search-score trend;
- edge-based runtime és mobil touch-target source gate.

## Release státusz

Yajilin az Iteration 54-től solver-certified családnak tekinthető. A következő hardening célpont a terv szerint a Ripple Effect.

## Release QA summary

- Yajilin hardening gate: 5/5 PASS a dedikált Iteration 54 fájlban.
- Iteration 51/53 kompatibilitási blokkal együtt: 11/11 PASS.
- Széles történeti regresszió: 52 tesztfájl PASS.
- `sudoku-iteration15.test.js`: a korábbról ismert hosszú futás miatt ebben a release-ben sem kapott PASS minősítést.
- Katalógus: 106 játék.
- Egyfájlos Iteration 54 HTML: 0 külső script, 0 külső stylesheet.
- Browser/visual PASS: NEM állítva. A rendelkezésre álló Chromium környezet policy-ja a `file://` és a lokális `127.0.0.1` megnyitást is blokkolta.
