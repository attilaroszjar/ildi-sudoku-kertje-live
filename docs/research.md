# Research and Curation

## Families considered

The initial survey covered Latin and numeric constraints, code feedback, line-run deduction, loop topology, visibility and ordering, parity toggles, sliding and packing, arithmetic cages, path finding, illumination, and adversarial search.

## Selected catalogue

The release favours five polished mechanics over a larger set of close variants:

| Game | Primary reasoning | Why it belongs |
| --- | --- | --- |
| Latin Grid | Constraint satisfaction | Global row/column consistency and candidate elimination |
| Picture Logic | Spatial deduction | Ordered run clues turn local facts into an image |
| Crosslight | Parity and planning | Moves have overlapping, reversible effects |
| Codebreaker | Hypothesis testing | Each guess produces information for the next |
| The Exit | Search and planning | Sequencing moves under orientation and collision constraints |

Together they cover numeric, visual, combinatorial, inferential, and state-space reasoning. All can be expressed clearly at small board sizes and validated without an online puzzle service.

## Candidates deferred

- **Loop puzzles:** excellent topology, but a polished edge-input interface and a single-loop uniqueness solver would have expanded first-release risk.
- **Skyline visibility:** strong ordering logic, but overlaps Latin Grid's row/column constraints.
- **Arithmetic cages and sums:** add arithmetic load without broadening the collection as much as the selected games.
- **Mines:** random layouts can force guessing unless generation is coupled to a proof solver.
- **Chess positions:** require substantial domain knowledge and responsibly sourced positions.
- **Network and bridge puzzles:** good expansion candidates, but spatial constraint coverage is already strong.

## Rules and conventions consulted

Only concepts and interaction conventions were researched; no third-party code, art, brands, or puzzle databases were copied.

- Simon Tatham, [Guess manual](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/guess.html) — exact-place and right-colour/wrong-place feedback.
- Simon Tatham, [Pattern manual](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/pattern.html) — line-run puzzle conventions.
- Hasbro, [Lights Out instructions](https://www.hasbro.com/common/instruct/LIGHTOUT.PDF) — cross-toggle objective and move behaviour.
- Nikoli, [Slitherlink rules](https://www.nikoli.co.jp/en/puzzles/slitherlink/) — consulted while comparing topology candidates; not selected.
- Simon Tatham, [Towers manual](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/towers.html) — consulted while comparing visibility candidates; not selected.

The Latin Grid is a generic Latin-square mechanic rather than Sudoku: it has row and column constraints only, with no regions.

## Sudoku expansion research — iteration 1

The Sudoku Library is intentionally broader than a small "top variants" sampler. The target is an evolving catalogue that eventually covers materially distinct Sudoku-family rule systems that can be represented reliably in the offline engine.

Public catalogues reviewed for this expansion include SudokuVariants.com (20 named constraint types), Sudoku.by (32 live variants), Logic Wiz (40+ named variants), and SudokuDB (a much wider mixed Sudoku/logic catalogue advertising 100+ modes). These sources show that there is no single canonical finite list: setters freely combine constraints, rename closely related mechanics, and publish novel line/cage systems. The practical completeness rule is therefore **mechanic-complete, not name-complete**: implement every materially distinct, documented rule family we can verify, then add notable named combinations without duplicating identical mechanics.

### Implemented in iteration 1 (21)

Classic Sudoku; Mini 4×4; Diagonal/X; Hyper/Windoku; Killer; Thermo; Arrow; Kropki; XV; Consecutive; Greater Than; Odd/Even; Anti-Knight; Anti-King; Non-Consecutive; Sandwich; Skyscraper; Little Killer; Renban; German Whispers; Between Lines.

### Identified expansion queue

Jigsaw/Irregular, Irregular Diagonal, Samurai/overlapping grids, Alphabet/Word Sudoku, Cube/3D presentations, Outside Sudoku, Sukaku, Clone, Quadruple, Zipper, Equal Sum/Region Sum, Palindrome, Dutch Whispers, Parity Line, Nabner, Entropic Line, Modular Line, Lockout Line, Slow Thermo, X-Sums, Fortress, Rossini, Frame, Anti-Queen, Anti-Kropki, Anti-XV, Miracle, Thermo-Knight, Thermo-King, Knight Whispers, Bishop, Reflection, Slingshot, Running Cells, Ascending Sequences, Couples, Twisted Consecutive, Axia, Disjoint Groups, Asterisk, Center Dot, Argyle, Magic Square, Quad Sums, Mathdoku-style cages, and selected hybrid/composite variants once the underlying primitive constraints are present.

Combination-only names (for example Killer-X or Thermo-X) are treated as compositions of implemented primitives rather than separate engines. They may still be surfaced as curated puzzles later when they add a meaningfully different solving experience.


## Sudoku expansion research — iteration 2

Iteration 2 broadens the engine from 21 to **36 playable Sudoku rule systems**. The added mechanics were selected from several independent catalogues and rule references, including SudokuDB's broad mode index, SudokuVariants.com's constraint list, Logic Masters Deutschland's variant taxonomy, SudokuPad rule pages, and Grandmaster Puzzles examples.

### Added in iteration 2 (15)

Palindrome; Parity Line; Entropic Line; Modular Line; Region Sum Line / Equal Sum; Quadruple; Clone; X-Sums; Rossini; Fortress; Slow Thermo; Zipper Line; Center Dot; Disjoint Groups; Mini Sudoku 6×6.

### Rule notes verified during this iteration

- **Entropic lines:** every consecutive group of three cells contains one digit from 1–3, 4–6, and 7–9.
- **Modular lines:** every consecutive group of three cells contains one digit from each of 147, 258, and 369.
- **Region Sum Lines:** box borders split a line into segments whose sums are equal along that line.
- **Zipper Lines:** cells equally distant from the centre pair to the centre-cell value.
- **X-Sums:** an outside clue is the sum of the first X cells, with X given by the first cell from that side.
- **Rossini:** outside arrows describe monotonic order of the first three cells from that side.
- **Quadruple:** an intersection clue lists the digits that must occur in its four touching cells.

### Sources consulted for iteration 2

- https://sudokudb.com/ — broad catalogue of named Sudoku and adjacent logic modes.
- https://sudokuvariants.com/help/variants/ — named constraint families and standard terminology.
- https://logic-masters.de/Raetselportal/ — community taxonomy containing many classic and modern Sudoku variants.
- https://sudokupad.app/sudokucon/quilt — concise rules for Region Sum, Entropic, Renban, Whispers, parity lines, quadruples, XV/Kropki and other primitives.
- https://www.gmpuzzles.com/blog/2026/07/zipper-lines-sudoku-by-bill-murphy-4/ — Zipper Line rule.
- https://www.gmpuzzles.com/blog/2026/05/x-sums-sudoku-by-philip-newman/ — X-Sums rule.
- https://www.gmpuzzles.com/blog/2024/02/sunday-special-rossini-sudoku-by-ashish-kumar/ — Rossini rule.

### Remaining expansion queue after iteration 2

High-priority structural variants: **Jigsaw/Irregular, Irregular Diagonal, Samurai/Gattai, Flower/Clueless/Sumo overlapping grids, Sukaku, Word/Alphabet Sudoku, 12×12 and 16×16 large-grid Sudoku**.

Additional constraint primitives and named systems still queued include **Anti-Queen, Anti-Kropki, Anti-XV, Miracle, Dutch Whispers, Nabner, Lockout, Outside Sudoku, Frame, Magic Square, Quad Sums, Mathdoku cages, Bishop, Reflection, Slingshot, Running Cells, Ascending Sequences, Couples, Twisted Consecutive, Axia, Asterisk, Argyle, Girandola, Low-High, Snowflake, Vudoku, Difference/Ratio pairs, 159, 10-in-9, Battenburg, and selected composition variants**. Hybrid names such as Killer-X, Thermo-X, Palindrome-X, Killer-Jigsaw, and similar combinations will be surfaced after the underlying primitives are stable.

The catalogue remains intentionally iterative: a named variant is not counted as complete merely because its rule can be composed in theory; it is added when the UI can represent it clearly and deterministic tests can verify the shipped board.


## Sudoku expansion research — iteration 3

Iteration 3 shifts the project from a fixed archive toward a **repeat-playable library** while continuing catalogue expansion. It adds 13 named systems, bringing the total to **49 playable variants**.

### Added in iteration 3 (13)

Dutch Whispers; Nabner Line; Lockout Line; Frame Sudoku; Killer Thermo; Killer Arrow; Killer Palindrome; Killer Zipper; Killer Entropic; Killer Modular; Killer Renban; Killer Dutch Whispers; Killer Lockout.

### Rule notes verified during this iteration

- **Dutch Whispers:** adjacent digits on the line differ by at least 4.
- **Nabner:** digits on the line do not repeat and no pair anywhere on the line may be consecutive.
- **Lockout:** the endpoint diamonds differ; every interior digit lies strictly outside the interval between the endpoints.
- **Frame Sudoku:** each outside clue is the sum of the nearest three digits in that row or column.
- Broad modern catalogues explicitly surface many hybrids as named modes; the library now exposes selected Killer combinations once their underlying primitives are already implemented and testable.

### Sources consulted for iteration 3

- https://sudokustreak.com/en/types/dutch-whispers/ — Dutch Whispers rule.
- https://sudokustreak.com/en/types/nabner/ — Nabner line rule.
- SudokuPad / contemporary variant puzzle rule text — Lockout line convention.
- https://dkmgames.com/FrameSudoku/FrameSudokuHelp.htm and https://krazydad.com/frame/ — Frame Sudoku outside-sum convention.
- https://sudokudb.com/ — current broad catalogue and named combination coverage.

### Repeat-playability decision

The project no longer treats a single curated clue mask as the playable unit. A seeded generator creates new clue layouts and proves standard-Sudoku uniqueness before presenting them. This yields a practically inexhaustible stream while preserving deterministic reproduction and `file://` portability. Variant-aware generation that makes the special constraint necessary is explicitly the next quality layer rather than an unverified claim in this iteration.

### Remaining high-priority frontier

Structural variants remain the largest missing family: **Jigsaw/Irregular, Irregular Diagonal, Samurai/Gattai and other overlapping grids, Sukaku, Word/Alphabet Sudoku, Mega 12×12 and 16×16**. Additional primitives still queued include **Anti-Queen, Anti-Kropki, Anti-XV, Miracle, Magic Square, Quad Sums, Asterisk, Argyle, Outside Sudoku, Mathdoku cages, Knight Whispers, Bishop, Reflection, Slingshot, Running Cells, Ascending Sequences, Couples, Twisted Consecutive, Axia, Girandola, Low-High, Snowflake, Vudoku, Difference/Ratio pairs, 159, 10-in-9, Battenburg**, plus further named combinations after their primitives are stable.


## Iteration 4 research

Added structural and extra-region systems: Jigsaw / Irregular (3×3 boxes replaced by nine connected nine-cell regions), Miracle (anti-knight + anti-king + orthogonal non-consecutive), Magic Square, Asterisk, and Argyle. Jigsaw is treated as a true region replacement rather than a cosmetic overlay. Future structural queue: Samurai/Gattai, Sukaku, 12×12 and 16×16, plus additional region/line variants.


## Iteration 5 research

Structural expansion added Samurai/Gattai-5 (five 9x9 grids with four shared 3x3 overlaps), Sukaku (candidate-set clues), 12x12 Sudoku with 3x4 boxes, and 16x16 Sudoku with 4x4 boxes. These extend the catalogue beyond 9x9 rule overlays into multi-grid, candidate-clue, and giant-grid forms.

## Sudoku expansion research — iteration 10

Iteration 10 adds two distinct constraint systems and raises the catalogue from 58 to **60**.

### Anti-Queen (9)

The name *Anti-Queen* is not perfectly uniform in community usage: some puzzles nominate one digit, while others nominate multiple digits. A full 1–9 anti-bishop/anti-queen restriction is not compatible with an ordinary 9×9 Sudoku solution. This implementation therefore names the rule explicitly as **Anti-Queen (9)**: normal Sudoku rules apply and two 9s may not share any diagonal at any distance.

Sources consulted:
- Logic Masters Deutschland, *Anti-Knight Uprising* — explicitly states that digit 9 is Anti-Queen and cannot see itself by a chess queen move: https://logic-masters.de/Raetselportal/Raetsel/zeigen.php?chlang=en&id=000HK3
- Logic Masters Deutschland, *Bishop's Gatehouse* — notes that a full Anti-Bishop 9×9 standard Sudoku has no solution and discusses weakened forms: https://test.logic-masters.de/Raetselportal/Raetsel/zeigen.php?chlang=en&id=000OVH

### Quad Sums

Normal Sudoku rules apply. A black dot is placed at a grid intersection; among the four cells touching that dot, one digit equals the sum of the other three. The catalogue keeps this distinct from Quadruple Sudoku, where clue digits identify values that must occur around the intersection.

Sources consulted:
- Logic Masters Deutschland, *Distinct Arrangements (Quad Sums)*: https://logic-masters.de/Raetselportal/Raetsel/zeigen.php?chlang=en&id=000RQN&print=true
- Sudoku Theory, GAS Leak 47, December 2024 — states that around each black dot one of the four digits is the sum of the other three: https://sudokutheory.com/gas/leaks/GAS_Leak_47_-_December_2024.pdf

### Generator decision

Both new systems are the first non-structural variants after Jigsaw to receive a dedicated variant-aware solution counter. Clues are removed only while the puzzle remains uniquely solvable under the actual extra rule. Generation then continues until ordinary Classic Sudoku alone has more than one solution. The resulting `variantEssential` guarantee is therefore tested rather than inferred.


## Sudoku expansion research — iteration 11

Iteration 11 adds **Battenburg Sudoku** and raises the catalogue from 60 to **61** systems.

### Battenburg

Normal Sudoku rules apply. Whenever a 2×2 block has odd/even parity in a checkerboard arrangement, a Battenburg mark is present. The convention used here is **complete marking**: if a 2×2 intersection is not marked, that checkerboard parity pattern is forbidden there. This negative constraint is part of the puzzle, not merely decorative metadata.

Sources consulted:
- Logic Masters Deutschland, *Sudoku Variants Series (067) — Battenburg*: https://logic-masters.de/Raetselportal/Raetsel/zeigen.php?chlang=en&id=00027F
- WSC 2025 Instruction Booklet, Battenburg Sudoku: https://www.wspc2025.hu/wsc2025_instruction_booklet_v2/
- World Sudoku Championship 2019 instruction booklet, Battenburg Sudoku.

### Selection decision

Battenburg was chosen ahead of more ambiguous queue names because its positive and negative rule are well documented, its visual primitive is compact, and the constraint can be checked incrementally by the existing offline solver. Names such as Reflection, Slingshot, Couples and Axia remain queued until their exact intended conventions are pinned down before implementation.


## Iteration 12 – Reflection and Slingshot research

### Reflection Sudoku

Primary rule reference: Logic Wiz, “Reflection Sudoku — Rules & Strategy” (`https://logic-wiz.com/variants/reflection/`). Lines with the same starting symbol reproduce the same digit sequence from the symbol onward, for the shared length of the lines. The implementation uses explicit symbol groups, with each group containing two same-sequence lines.

### Slingshot Sudoku

Rule references:
- The Art of Puzzles / GMPuzzles, “Slingshot Sudoku by clover!” (`https://www.gmpuzzles.com/blog/2025/10/slingshot-sudoku-by-clover/`).
- Logic Masters Deutschland, “Trajectory (Slingshot, Numbered Rooms)” (`https://logic-masters.de/Raetselportal/Raetsel/zeigen.php?chlang=en&id=000OVK&print=true`).

The implementation follows the source-cell formulation: the clue identifies a cell adjacent to the slingshot and an arrow direction. If the slingshot cell is N, that source digit repeats N cells away from the slingshot in the arrow direction. Only shown slingshots impose constraints; there is no negative constraint on unmarked cells.

### Selection rationale

Both systems are established, mechanically distinct from the existing 61 systems, visually representable without external assets, and suitable for the project’s variant-aware solver. Ambiguous names were avoided in this iteration.

## Iteration 13 — Axia és Couples

Elsődleges szabályforrás: Logic Wiz, Sudoku Variants katalógus (`https://logic-wiz.com/variants/`, ellenőrizve: 2026-08-25).

- **Axia:** az Axia-jellel megjelölt cellában álló szám nem szerepelhet újra a cellából induló egyik átlón sem. Jelöletlen cellák nem hoznak létre ilyen tiltást.
- **Couples:** `~` két szomszédos cella azonos párosságát jelenti; az áthúzott tilde eltérő párosságot jelent.

A Cat Garden implementáció csak explicit jelölésekre alkalmaz constraintet; nincs rejtett negatív szabály a jelöletlen Couples-éleken vagy Axia-cellákon. A marker densityt generátor/regressziós méréssel csökkentettük: 15 Axia-jel és 36 Couples-kapcsolat mellett a tesztelt seedek továbbra is variant-essential egyediséget adnak, miközben a board olvashatóbb marad.


## Iteration 14 — Running Cells + Ascending Sequences

### Running Cells Sudoku

A Logic Wiz definíciója szerint a sor bal oldalán / oszlop tetején lévő nyom azt mondja meg, hány **cella** vesz részt egymás mellett álló, egymást követő értékű számok futamában. A 0 azt jelenti, hogy az adott vonalban nincs ilyen szomszédos számpár. Egy 4–5–6 futam három running cellnek számít.

Forrás:
- Logic Wiz, *Running Cells Sudoku Strategy — How It Works*: https://logic-wiz.com/strategies/running-cells/ (ellenőrizve: 2026-08-25).

Az implementáció egy cellát egyszer számol akkor is, ha egy hosszabb futamban két egymás melletti consecutive kapcsolatban is részt vesz. Ez megfelel a forrás példáinak, ahol 4–5–6 három cellát ad.

### Ascending Sequences Sudoku

A Logic Wiz definíciója szerint a külső nyom a sorban balról jobbra, illetve oszlopban fentről lefelé található **növekvő sorozatok számát** adja. A sorozat legalább kétcellás, a számoknak szigorúan növekedniük kell, de nem kell egymást követő értékűeknek lenniük. Az implementáció maximális összefüggő növekvő szakaszokat számol.

Forrás:
- Logic Wiz, *Ascending Sequences Sudoku — Rules & Strategy*: https://logic-wiz.com/variants/ascending-sequences/ (ellenőrizve: 2026-08-25).

### Szelekció és generátor

A két rendszer együtt új, koherens családot ad a katalógushoz: mindkettő 18 külső sor/oszlop-nyommal dolgozik, mégis eltérő tulajdonságot mér. Mindkettő bekerült a variant-aware solverbe. A clue-mask eltávolítása addig folytatódik, amíg a saját szabállyal egyedi megoldás marad, majd a generátor ellenőrzi, hogy Classic Sudoku szabályokkal már több megoldás legyen.

## Iteration 15 — Bishopsgate + Min / Max

### Bishopsgate
Forrás: Logic Masters Deutschland, *Bishop's Gatehouse* (2025-08-25). A forrás külön kiemeli, hogy a teljes 9×9 Anti-Bishop standard Sudokuval nem általánosan használható; a **Bishopsgate** definíció ezért csak az egyik sakktáblaszínen érvényesíti az Anti-Bishop szabályt. Ebben az implementációban a `(row + column) % 2 === 0` szín az aktív szín. Azonos számok az aktív színen nem lehetnek ugyanazon futóátlóban.

Forrás URL: https://test.logic-masters.de/Raetselportal/Raetsel/zeigen.php?id=000OVH

### Min / Max
Forrás: Logic Masters Deutschland, *X* (2026-03-23), amely a Minimum/Maximum constraintet így definiálja: a minimumként jelölt cella kisebb minden ortogonális szomszédjánál, a maximumként jelölt cella nagyobb minden ortogonális szomszédjánál. Az Iteration 15 ezt önálló Sudoku-rendszerként használja.

Forrás URL: https://logic-masters.de/Raetselportal/Raetsel/zeigen.php?chlang=en&id=000S0I

Mindkét új variáns constraint-aware solverrel és variant-essential generálással készül: `variant solutions == 1`, miközben a klasszikus Sudoku-szabály önmagában legalább két megoldást enged.

## Iteration 16 — Numbered Rooms + Next to Nine

### Numbered Rooms Sudoku

Implemented definition: standard Sudoku plus outside clues. A clue digit must occur in the Nth cell looking into the corresponding row/column, where N is the first in-grid digit from that side.

Source checked before implementation:
- Logic Masters Deutschland, “Numbered Rooms Sudoku” (Qodec, 2022), puzzle 0008WX.

This project uses all four directional clue sets (left/right/top/bottom), generated directly from the solved grid. No fog/double/unstable extension is included.

### Next to Nine Sudoku

Implemented definition: standard Sudoku plus outside clues listing all direct neighbours of digit 9 in the corresponding row or column. The listed digits are treated as an unordered set; the UI displays them sorted for readability.

Source checked before implementation:
- Logic Masters Deutschland, “Sudoku Variants Series (009) - Next to nine Sudoku” (Richard, 2014), puzzle 0001VG.

The project uses one clue per row and one per column because the neighbour set is independent of viewing direction.


## Iteration 17 — Even Sandwich + Top-Heavy Parity

### Even Sandwich Sudoku
Normal Sudoku rules apply. The clue set for a row/column contains every digit whose immediate neighbours on both sides in that line are even; all such digits are given, so an empty clue is a real negative clue. This follows the competition definition in the Logic Masters India *Classics vs Innovatives* instruction booklet and the German Sudoku Championship 2022 booklet.

Sources checked 2026-08-25:
- Logic Masters India, *Classics vs Innovatives*, I4 Even Sandwich Sudoku: https://logicmastersindia.com/lmitests/dl.asp?attachmentid=257&view=1
- Logic Masters Deutschland, DSM 2022 Runde 1, Even Sandwich Sudoku: https://logic-masters.de/DSM/2022/dokumente/DSM_2022_Runde1.pdf

### Top-Heavy Parity Sudoku
Normal Sudoku rules apply. Wherever two vertically adjacent digits have the same parity, the upper digit must be larger than the lower digit. There is no extra rule for opposite-parity neighbours.

Source checked 2026-08-25:
- Logic Masters Deutschland, DSM 2022 Runde 1, Top-Heavy Parity Sudoku: https://logic-masters.de/DSM/2022/dokumente/DSM_2022_Runde1.pdf

Selection rationale: the pair adds two materially different mechanics. Even Sandwich extends the shared outside-clue engine with a complete positive/negative set constraint, while Top-Heavy Parity is a local global relation with no board markings and supports safe pencil-mark propagation.


## Iteration 18 — Lakótelep / Skyscrapers family

A magyar **Lakótelep** rejtvény a nemzetközi Skyscrapers/Hochhäuser családnak felel meg: a cellák házmagasságok, a peremnyom pedig az adott irányból látható épületekről ad információt. A magyar források külön sorozatként nevezik a *Lakótelepi panoráma*, *Lakótelep – grundokkal* és *Lakótelep összegekkel* változatokat.

Implementált változatok:

- **Skyscraper Sums / Lakótelep összegekkel:** a peremnyom a látható épületek magasságainak összegét adja, nem a darabszámukat. Forrás: World Puzzle Federation, Puzzle GP Round 5 (2014), “Skyscraper Sums”; Logic Masters Hochhäuser championship instructions, “Summen”.
- **Mixed Information Skyscrapers:** minden peremnyom vagy a látható épületek számát, vagy a legközelebbi épület magasságát jelenti; a clue típusa nincs külön jelölve. Forrás: Logic Masters Hochhäuser championship instructions, “Gemischte Information / Mixed information”.
- **Non-touching Skyscrapers:** a láthatósági szabály mellett azonos magasságú épületek nem állhatnak átlósan szomszédos cellákban. Forrás: Logic Masters Hochhäuser championship instructions, “Ohne Berührungen / Non-touching”.

Ellenőrzött források:
- https://gp.worldpuzzle.org/sites/default/files/Puzzle%20Round5_IB_v2.pdf
- https://logic-masters.de/CE/anleitung.php?id=40
- https://logikairejtveny.5mp.eu/web.php?a=logikairejtveny&o=yHfURtAD50
- https://logikairejtveny.5mp.eu/web.php?a=logikairejtveny&o=KGJWZ6AFR4

### Következő Lakótelep-jelölt: grundokkal / Parks

A WPF dokumentált **Skyscrapers (Parks)** változatában egy N×N rács minden sorában és oszlopában pontosan egy üres cella (“park/grund”) van, a többi cellában 1…N−1 szerepel egyszer-egyszer. A peremnyom ugyanúgy a látható épületek számát adja; az üres telek nem épület. Ez nem egyszerű 9×9 Sudoku-overlay, ezért szándékosan nem került félmegoldásként Iteration 18-ba. A következő Lakótelep-központú iterációhoz külön park/üres-telkes input és Latin-square solver szükséges. Forrás: WPC 2022 booklet, Skyscrapers (Parks), example from GP 2019 R6.


## Iteration 19 — Skyscrapers Parks family

- **Skyscrapers Parks / Lakótelep – grundokkal**: an N×N grid contains heights 1…N−1 once per row/column plus exactly one park. The park is empty ground, is not counted as a building and does not block sight. Outside clues give visible-building counts. Verified against current Skyscrapers Parks rule references (GridPuzzle) and the previously identified WPF Parks formulation.
- **Sum Skyscrapers Parks**: same Latin + one-park structure; outside clues give the sum of the heights of visible buildings. Verified against the dedicated Sum Skyscrapers Parks rules reference.
- Implementation choice: 9×9 uses heights 1–8 plus a dedicated park value rendered as `🌿`. This is deliberately **not** treated as a normal Sudoku 9 or as a 3×3-box Sudoku.

## Iteration 20 — Inside + Diagonal Skyscrapers

**Inside Skyscrapers Sudoku**: SudokuCup 12 és UK Puzzle Championship instrukciók szerint a nyilas cella számjegye a cellából a nyíl irányába látható épületek számát adja. A látóvonal a következő cellától indul; a nyilas cella nézőpont. Források: SudokuCup 12 Instruction Booklet; UK Puzzle Championship 2015 Instruction Booklet; Logic Masters India 2014 szabálymagyarázat.

**Diagonal Skyscraper Sudoku**: Logic Masters Deutschland dokumentált változata szerint a külső nyomok kijelölt átlós látóvonalakon adják a látható épületek számát. A diagonálokon nem szükséges az 1–9 egyediség; csak a normál Sudoku-korlátok és a látási szabály érvényes.

Selection rationale: mindkét rendszer megtartja a Lakótelep alaplogikáját, de új nézőpont-geometriát ad. Az Inside belső, cellaértékhez kötött nyomokat használ; a Diagonal pedig sor/oszlop helyett átlós látóvonalakat.


## Iteration 21 — Product + Killer Skyscrapers

### Product Skyscrapers

A Logic Masters Puzzlewiki a Skyscrapers dokumentált változatai között külön felsorolja azt a típust, amelynél a külső nyom a **látható felhőkarcolók magasságainak szorzata**. Az Iteration 21 ezt normál 9×9 Sudokuval kombinálja, ugyanúgy, ahogy a gyűjtemény korábbi Skyscraper Sudoku rendszerei is.

Forrás: https://wiki.logic-masters.de/index.php/Skyscrapers/en (ellenőrizve: 2026-08-25).

### Killer Skyscrapers

A Logic Masters India „Dutch Treat with a German Twist” versenyanyagában a **Killer Skyscrapers** szabály a normál Lakótelep-láthatóságot Killer-ketrecekkel kombinálja: a ketrecben a számok nem ismétlődhetnek és a megadott összegre adódnak. Az Iteration 21 ugyanezt a constraint-kombinációt 9×9 Sudoku alaprácson implementálja.

Forrás: https://logicmastersindia.com/lmitests/dl.asp?attachmentid=360&view=1 (ellenőrizve: 2026-08-25).

A Gappy Skyscrapers külön új néven nem került be, mert a már meglévő Lakótelep – grundokkal / Parks ugyanazt az alapmechanikát fedi le: soronként és oszloponként egy üres hely + a házmagasságok egyszeri előfordulása.

## Iteration 22 — Domino Skyscrapers / Dominó Lakótelep

Elsődleges szabályforrás: Logic Masters India, *Puzzle Jackpot* instruction booklet, A4 **Domino Skyscrapers** (2011):
https://logicmastersindia.com/lmitests/dl.asp?attachmentid=98

Az implementált definíciót az eredeti A4 ábra és szöveg alapján rögzítettük:

- 7×7-es rács, 1–7 számokkal;
- minden szám minden sorban és oszlopban pontosan egyszer szerepel (Latin-rács, nincs Sudoku-doboz);
- a külső szám a megfelelő irányból látható épületek számát adja;
- a kijelölt dominók két számának összege minden dominón ugyanaz;
- az Iteration 22 alapmintája az LMI A4 dokumentált példájának nyom- és dominógeometriáját használja, amelyben az öt dominó közös összege 9.

A solver nem kapja meg külön a 9-es összeget: a már teljessé vált dominók összegeit egymással hasonlítja össze, így maga a publikált "all dominoes have the same sum" szabály az elsődleges constraint.

Generáláskor belső kezdőszámokat seedelten távolítunk el. A kész tábla egyedi a Latin + Lakótelep + dominó szabályok alatt, miközben a puszta Latin sor/oszlop-rendszer legalább két megoldást enged; ez a variáns-esszencialitás automatikusan ellenőrzött.


## Iteration 23 — Skyscrapers Parks 2 / két grund

Ellenőrzött szabályforrás: GridPuzzle, **Skyscrapers parks2**. A dokumentált definíció szerint egy N×N rács minden sorában és oszlopában az 1…N−2 számok pontosan egyszer szerepelnek, valamint pontosan két üres cella/park van. A külső nyomok a klasszikus Lakótelep-láthatóságot használják; a parkok nem épületek.

Források ellenőrizve 2026-08-25:
- https://gridpuzzle.com/skyscrapers-park2/v800k
- https://gridpuzzle.com/skyscrapers-park2/n5myw

Az Iteration 23 8×8-at használ: 1–6 + két park soronként/oszloponként. Ez érdemben különbözik az Iteration 19 egyparkos Parks rendszerétől, ezért nem duplikáció.

## Iteration 24 — Skyscrapers (Even/Odd)

Elsődleges szabályforrás: World Puzzle Federation, **Puzzle GP 2022 Round 8**, 3. *Skyscrapers (Even/Odd)*.

A WPF definíció szerint a klasszikus Skyscrapers Latin-szabályok érvényesek. A cellában vagy a rácson kívül elhelyezett szürke négyzet páros számot, a kör páratlan számot jelöl. A rácson kívüli jel így nem feltétlenül adja meg a pontos láthatósági számot, csak annak paritását.

Forrás ellenőrizve 2026-08-25:
- https://gp.worldpuzzle.org/sites/default/files/Puzzles/2022/2022_PuzzleRound8.pdf

Kiegészítő történeti referencia: GMPuzzles, Thomas Snyder — *Skyscrapers (Even/Odd)*, ahol az even/odd jelölés ugyanezt a paritás-alapelvet használja.

Az Iteration 24 implementáció 6×6 Latin-rácsot használ. Minden belső cella paritása jelölt, továbbá mind a 24 oldalirányú látványnyom helyén a látható épületszám paritása szerepel. Ez érdemben eltér a Mixed Information rendszertől: ott egy numerikus clue kétféle jelentés közül valamelyik, itt pedig maga a megadott információ kizárólag paritás.

### Iteration 25 — Classic Skyscrapers
A Logic Masters Deutschland Puzzlewiki standard definícióját követjük: N×N Latin-rács 1..N értékekkel, minden sorban/oszlopban ismétlés nélkül; a külső szám a látható épületek számát adja. Az implementáció 6×6, Sudoku-doboz nélkül. Ez különbözik a korábbi `skyscraper` rendszertől, amely 9×9 Skyscraper Sudoku.

## Iteration 26 — Toroidal Skyscrapers

Elsődleges forrás: *22nd World Puzzle Championship 2013 Instruction Booklet*, Puzzle 9 — **Toroidal Skyscrapers** (36. oldal).

A dokumentált szabály szerint az N×N rács soraiban és oszlopaiban az 1…N−1 épületmagasságok egyszer szerepelnek, miközben egy belső, nyilas clue-cella nézőpontként szolgál. A sorok és oszlopok tóruszként körbefordulnak: a látóvonal a tábla egyik széléről a szemközti szélre folytatódik. A magasabb épület eltakarja a mögötte álló alacsonyabbat.

Az Iteration 26 6×6-os implementációt használ 1–5 magasságokkal és soronként/oszloponként egy clue-cellával. Ez közvetlenül követi a WPC versenyváltozatának szerkezetét; nem Sudoku-boxos átirat.

## Iteration 27 — Double Skyscrapers
Forrás: World Puzzle Federation, Puzzle GP 2022 Round 5 Instruction Booklet, Puzzle 10, “Skyscrapers (Double)”. A dokumentált szabály szerint X a sor cellaszámának fele; minden 1..X érték pontosan kétszer szerepel soronként és oszloponként. A látásnál az alacsonyabb épületet magasabb **vagy azonos** korábbi épület is eltakarja. Az implementáció 6×6, X=3.

## Iteration 30 – Japanese logic direction
BrainBashers groups Hitori among its Japanese-type puzzles. Cross-check: Nikoli Hitori. Implemented rules: remove duplicates by shading, orthogonally adjacent black cells forbidden, all white cells connected. This is the first game in a new Japanese logic category.

## Iteration 31 – Hashiwokakero / Bridges

Forrásellenőrzés: Nikoli Hashiwokakero és BrainBashers Daily Bridges. Implementált szabály: minden számozott szigethez pontosan a nyom számának megfelelő híd kapcsolódik; egy szigetpár között legfeljebb két híd lehet; hidak csak vízszintesen vagy függőlegesen futnak; nem keresztezhetik egymást; minden sziget egyetlen összefüggő hálózat része. A jelenlegi generátor 7×7-es, 3×3 elrendezésű szigetcsaládot használ több, solverrel igazolt egyedi topológiai sablonnal, seedelt kiválasztással.


## Iteration 32 – Fillomino

Forrás: **BrainBashers – Daily Fillomino**. Implementált definíció: minden cella száma annak az ortogonálisan összefüggő régiónak a mérete, amelyhez tartozik; az azonos értékű, oldalról érintkező cellák ezért ugyanahhoz a régióhoz tartoznak. A BrainBashers azt is rögzíti, hogy egy régióban több kezdeti szám is megadható. A projekt 6×6-os, offline változatot használ.


## Iteration 33 – Futoshiki

A **◉ Japán logikai játékok** kategória negyedik tagja a **Futoshiki**. A BrainBashers szabályleírása alapján a 6×6 Latin-rács minden sorában és oszlopában az 1–6 számok pontosan egyszer szerepelnek, és minden szomszédos cellák közötti `<` / `>` egyenlőtlenségnek teljesülnie kell. Saját seedelt generátor, Latin+inequality solver, egyediség-ellenőrzés, Gentle / Focused / Expert nehézség, külön mobilbarát renderer és HU+EN integráció készült. A BrainBashers csak szabályreferencia; puzzle-t, képet vagy webdesign-elemet nem másoltunk. A katalógus 92 játszható rendszer.

## Iteration 34 – Slitherlink research
A következő japán játék kiválasztásánál Slitherlink, Nurikabe, Akari és Nonogram szerepelt a shortlistben. Slitherlink került kiválasztásra, mert a meglévő Hitori/Bridges/Fillomino/Futoshiki mechanikáktól eltérő, tisztán élalapú loop puzzle, mobilon közvetlenül kezelhető és külön solverrel korrektül validálható. Elsődleges szabályforrás: World Puzzle Federation Puzzle GP 2025 Round 5 és korábbi WPF Slitherlink instruction bookletek: egyetlen nem metsző hurok a rácséleken; a cellaszám a hurokhoz tartozó oldalak számát adja. Internetes feladványt vagy vizuális elemet nem másoltunk.

## Iteration 36 – Akari / Light Up research
Az Akari (Light Up) dokumentált japán logikai játék. Implementált szabály: minden fehér cellát legalább egy, vele azonos sorban vagy oszlopban és fekete fal által nem takart lámpa világít meg; két lámpa nem láthatja egymást; a számozott fekete cella a négy oldalirányú szomszédja között lévő lámpák pontos számát adja. A szám nélküli fekete cella csak fényblokkoló fal. Referencia: Nikoli Akari / Light Up szabálycsalád. Internetes feladványt vagy vizuális elemet nem másolunk.


## Iteration 36 – Nurikabe
Rules verified against World Puzzle Federation Puzzle GP material: one connected black sea, numbered white islands of exact size, exactly one clue per island, and no all-black 2×2 block. The implementation uses an original seeded 5×5 puzzle family; no published puzzle is copied.


## Iteration 37 – Nonogram / Picross
Added an 8×8 seeded Nonogram family with row/column run clues, a dedicated line-pattern solution-counting solver, guaranteed unique bundled pattern families across Gentle/Focused/Expert, mobile fill/X/empty interaction, HU+EN copy, accessibility labels, and offline Cat Garden integration. Puzzle patterns are original project data; no web puzzle instances are copied.

### Nonogram rule verification
Rule semantics were cross-checked against BrainBashers Nonogrids help (https://www.brainbashers.com/nonogridshelp.asp) and the independent Nonograms rules reference (https://www.puzzle-nonograms.com/faq.php): ordered row/column clues are consecutive filled-run lengths, with separate runs requiring at least one empty cell. No published puzzle instance or artwork is included.

## Iteration 38 – Masyu
Masyu was selected after the Iteration 37 catalogue audit because it adds a genuinely new cell-centred loop mechanic rather than duplicating Slitherlink's grid-edge clue system. Rule semantics were cross-checked against World Puzzle Federation Puzzle GP 2023 Round 7 and Puzzle GP 2026 Round 4: one orthogonal non-self-intersecting loop passes all circles; white circles are traversed straight with an adjacent turn on at least one side; black circles are turns with straight continuation on both adjacent sides. No published puzzle instance or artwork is copied.

## Iteration 42 – depth audit findings

The audit used seeds `1,2,3,4,5,6,7,8,13,21` across Gentle, Focused and Expert where generation cost permitted.

- **Akari before hardening:** 10 seeds collapsed to 8 solution structures because generation was one fixed 6×6 wall/bulb family under the eight dihedral symmetries. Focused could vary numbered-wall subsets, but wall topology itself remained fixed-family.
- **Fillomino before hardening:** 10 seeds likewise produced only the eight dihedral transforms of one validated 6×6 solution.
- **Lakótelep family:** source audit of all 16 systems found the same architectural pattern: clue/given masks are seeded, while the completed solution and several variant geometries are fixed. Existing variant-specific counters remain important and are retained; this iteration records the solution-diversity gap instead of attempting an unsafe family-wide geometry rewrite.
- **Large Sudoku before hardening:** 12×12 removed 3/6/12 cells and 16×16 removed 4/8/16 cells for Gentle/Focused/Expert. This made difficulty separation mostly nominal compared with board size.

Iteration 42 therefore prioritizes solution-level diversity for Akari and Fillomino, stronger uniqueness-backed removal for large Sudoku, and explicit documentation of the Lakótelep solution-generation boundary.

## Iteration 43 – Lakótelep solution-diverzitás audit

Az Iteration 42 finding szerint a 16 Lakótelep-rendszer seedjei elsősorban a givens maszkot változtatták, a completed solutiont nem. A jelen körben a Latin-only, biztonságosan újraszámolható clue-rendszereket választottuk első hullámnak. A sor- és oszloppermutáció megőrzi a Latin tulajdonságot; a visibility/sum/parity clue-kat nem visszük át vakon, hanem minden seednél újraszámoljuk az új solutionből. A topológiához kötött rendszerek külön későbbi auditot igényelnek.


## Iteration 44 – Lakótelep solver↔UI parity audit

A mély audit konkrét szabálymodell-hibát talált: a `skyscraper` kind a UI-ban külső visibility clue-kat renderelt, de nem szerepelt a variant solution counter extra constraint-listájában. Emiatt egy generált puzzle klasszikus Sudoku-szempontból lehetett unique akkor is, ha a Lakótelep clue-k nem voltak részei a bizonyításnak. A javítás után a `skyscraperFamilyValid()` a klasszikus visibility-count szabályt is kényszeríti, és a `skyscraper` bekerült a variant-essential generátorútvonalba.

A fennmaradó fix-solution családok közül nyolc biztonságosan diverzifikálható volt szimbólumpermutációval, mert ez megtartja a Sudoku/Latin egyenlőségi és geometriai szerkezetet. A változó numerikus clue-kat nem transzformáljuk vakon: minden seednél a generált solutionből számoljuk újra. Így a solver és a UI ugyanazt a generált `data` objektumot kapja. Az Inside Skyscrapers clue-celláinak saját értéke maga is a visibility count része, a Domino változatnál pedig az azonos dominóösszeg geometria és érték együtt mozog; ezeket külön, topológiatudatos körre hagytuk.


## Iteration 45 – Inside / Domino generátor-audit

Az Iteration 44-ben dokumentált két utolsó fix-topológiás Lakótelep-családot külön vizsgáltuk. Inside esetén az egyszerű szimbólumpermutáció önmagában nem őrzi meg a clue-t, mert maga a source digit a visibility count; a biztonságos megoldás ezért az új solutionből kompatibilis sightline-ok újraderiválása. Domino esetén az equal-sum feltétel konkrét szomszédos cellapárokhoz kötött; ezért a Latin solution permutációja után új, azonos összegű szomszédos párhalmazt kell választani. Mindkét út a constraintet az új solutionből vezeti le, nem a régi geometriát próbálja mechanikusan transzformálni.


## Iteration 46 audit findings

A seed/difficulty audit found that clue count alone can be misleading, but an inverted given-count ordering inside one generator family is a concrete defect. Standard, Sums, Mixed and Diagonal Skyscraper Sudoku could produce Gentle boards with fewer givens than Focused because the variant-essential fallback kept deleting after reaching the nominal target. Toroidal Skyscrapers showed the same underlying issue. The fix restores safe givens while keeping the special rule necessary.

The Japanese family was also sampled. Hitori intentionally differentiates by shaded-cell density rather than givens; Nurikabe differentiates through starter sea marks; Bridges keeps a fixed island count and remains a candidate for a later search-complexity-based difficulty audit.


## Iteration 47 audit findings

- A Bridges / Hashiwokakero három difficulty szintje korábban template-index eltolást használt, amely nem követte a solver tényleges keresési költségét; egyes Expert template-ek kevesebb search node-dal oldódtak, mint Gentle példányok.
- A crossing- és connectivity-aware solution counter instrumentálása 12 validált template-en stabil keresési sávokat mutatott. Az új poolok 10 seed mintán: Gentle 14–15 node, Focused 18–20 node, Expert 28–81 node.
- Hitori 10 seed mintán a medián solver node count 746 → 1074 → 1927, tehát a korábbi 8/9/10 fekete-cellás cél a mintán tényleges search-depth emelkedést is ad.
- Nurikabe alappuzzle ugyanaz a seed három difficulty szintjén; a valós játékos-információt a preShaded sea adja. A solver audit ezért most opcionálisan ezeket a starter cellákat is kezdeti kényszerként modellezi. Nyolc seed mindegyikén Gentle ≤ Focused ≤ Expert effektív search depth adódott.
