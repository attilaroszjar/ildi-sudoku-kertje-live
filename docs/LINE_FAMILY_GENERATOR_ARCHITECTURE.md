# Line-family generator architecture

Purpose: LLM-oriented implementation contract for hardening the Sudoku line-family generators. This document is the canonical architecture guide for the line-family work. Read it together with `docs/SUDOKU_VARIANT_GENERATOR_STATUS.md` before changing any line variant.

## Program priority

Do not extend serious human 1-9 rating to a line variant until its generator is Category A / production-quality.

Every production line generator must satisfy:

```
VALID
UNIQUE_UNDER_VARIANT
VARIANT_ESSENTIAL
SEED_DETERMINISTIC
REPLAYABLE
DIVERSITY_ELIGIBLE
TARGET_DIFFICULTY_MATCH
```

Hard condition:

```
variant solver solutions == 1
AND
plain Classic solver solutions > 1
```

No best-effort fallback is allowed. Bounded failure returns/throws `GENERATION_EXHAUSTED`; it must never silently return a Classic-only unique or otherwise contract-violating puzzle.

Any slice that changes generator/solver/audit/runtime/difficulty/release status must update `docs/SUDOKU_VARIANT_GENERATOR_STATUS.md` in the same slice.

## Source-audited line inventory

| Variant | Bank id | Kind | Canonical data | Exact semantic contract |
|---|---|---|---|---|
| Argyle | `argyle` | `uniqueline` | `lines: Cell[][]` | No digit repeats anywhere on a marked Argyle line. Current geometry is a special diagonal lattice/template, not an arbitrary path. |
| Between | `between` | `between` | `lines: [{cells: Cell[]}]` | Interior values are strictly between the two endpoint values. |
| Dutch Whispers | `dutch-whispers` | `dutchwhispers` | `lines: Cell[][]` | Adjacent values differ by at least 4. |
| Entropic | `entropic` | `entropic` | `lines: Cell[][]` | Every consecutive triple contains one value from 1-3, one from 4-6, and one from 7-9. |
| Lockout | `lockout` | `lockout` | `lines: [{cells: Cell[]}]` | Endpoint values differ; every interior value lies strictly outside the open interval between them. |
| Modular | `modular` | `modular` | `lines: Cell[][]` | Every consecutive triple contains one member of each class 147 / 258 / 369. |
| Nabner | `nabner` | `nabner` | `lines: Cell[][]` | No repeats, and no two values anywhere on the line are consecutive. This is stronger than adjacent-only non-consecutive. |
| Palindrome | `palindrome` | `palindrome` | `lines: Cell[][]` | Mirrored positions contain equal values. |
| Parity Line | `parity-line` | `parityline` | `lines: Cell[][]` | Adjacent values alternate parity. |
| Region Sum Line | `region-sum` | `regionsum` | `lines: Cell[][]` | Box borders split a line into contiguous region segments; every segment on the line has equal sum. See semantic warning below. |
| Renban | `renban` | `renban` | `lines: Cell[][]` | Distinct digits form a consecutive set in any order. |
| Slow Thermo | `slow-thermo` | `slowthermo` | `lines: Cell[][]` | From bulb to tip values never decrease; each step increases by at most 1. |
| Thermo | `thermo` | `thermo` | `thermos: Cell[][]` | From bulb to tip values strictly increase. |
| Whispers | `whispers` | `whispers` | `lines: Cell[][]` | Adjacent values differ by at least 5. |
| Zipper | `zipper` | `zipper` | `lines: [{cells: Cell[]}]` | The line has a center; each pair equidistant from the center sums to the center value. |

Do not merge German Whispers (`whispers`, threshold 5) and Dutch Whispers (`dutchwhispers`, threshold 4).

## Current legacy behavior and why it is not Category A

The generic production path in `games/sudoku-generator.js` currently sends line kinds through variant-aware clue removal, but begins from the bank's existing `variant.solution` and retains the bank's existing line topology. This can produce deterministic, exact-unique and variant-essential puzzles while still having no completed-solution diversity and no constraint-topology diversity.

Therefore old `*-post-hardening.test.js` files are useful semantic/regression evidence but are not proof of fresh-family generator quality.

The replacement line architecture must regenerate both:

1. a fresh completed standard Sudoku solution, and
2. valid line topology/constraint data derived from that solution.

## Shared architecture

Do not implement one giant generic line predicate. Share infrastructure, not semantics.

```
shared line generator core
    -> fresh standard completed solution
    -> seeded topology candidate search
    -> variant semantic adapter
    -> completed-solution constraint validation
    -> essentiality-aware clue carving
    -> exact uniqueness + Classic ambiguity
    -> deterministic replay metadata
    -> diversity fingerprints
    -> difficulty/runtime measurement
```

Recommended layers:

### Shared core

Responsibilities:

- fresh standard Sudoku solution generation from seed;
- deterministic RNG/shuffle;
- path geometry validation;
- bounded candidate/topology search;
- essentiality-aware clue carving;
- exact variant uniqueness checks through the canonical variant solver;
- Classic ambiguity checks;
- `GENERATION_EXHAUSTED` on bounded failure;
- replay metadata;
- topology fingerprints;
- structural-solution fingerprints/audit hooks.

### Variant/topology strategy

The line-family splits into seven useful primitives.

1. **Local transition**: Whispers, Dutch Whispers, Parity Line, Thermo, Slow Thermo.
2. **Sliding triple**: Entropic, Modular.
3. **Whole-line set**: Renban, Nabner.
4. **Symmetric pair / center-out**: Palindrome, Zipper.
5. **Endpoint/interior**: Between, Lockout.
6. **Region-aware segment**: Region Sum Line.
7. **Macro/template topology**: Argyle.

Adapters own semantic feasibility. The core owns bounded deterministic search and quality contracts.

## Geometry contract

The existing solver mostly trusts ordered cell arrays and does not generally validate path geometry. Production generators therefore need an explicit geometry contract.

Default simple-path policy:

```
in bounds
unique cells
allowed neighbour relation
no immediate backtrack
no repeated cell
no self-intersection
self-touch configurable, default discouraged/forbidden
```

Adjacency is adapter-configurable:

- `ORTHOGONAL_4`
- `KING_8` only where intentionally supported
- `TEMPLATE` for fixed macro geometry such as Argyle

Do not globally force orthogonal geometry: canonical Argyle is diagonal/template based.

Multiple distinct lines may overlap because existing canonical variants already do so. However near-duplicate overlaps should be rejected or penalized for topology diversity.

## Solution-guided candidate search

Never enumerate the complete path search space.

Use deterministic bounded search guided by the completed solution.

### Local transition

Build a cell graph where a geometric edge exists only when the solution values satisfy the variant transition predicate.

Examples:

```
Whispers: abs(a-b) >= 5
Dutch Whispers: abs(a-b) >= 4
Parity Line: parity(a) != parity(b)
Thermo directed edge: a < b
Slow Thermo directed edge: b == a OR b == a+1
```

Use seeded bounded random walk / DFS over that prefiltered graph.

### Sliding triple

For Entropic/Modular, next-cell feasibility depends on only the previous two values/classes. Search state can therefore be bounded to `(path, lastTwoClasses)` rather than enumerating all paths.

### Renban

Choose line length and a consecutive interval first, then search for a geometric path through cells whose solution values realize exactly that set. Do not generate arbitrary paths and hope they happen to be Renban.

### Nabner

Extend only with a value that is not already present and differs by at least 2 from every existing line value.

### Palindrome

Use paired center-out or end-in construction. When extending symmetric positions, require equal solution values.

### Zipper

Choose an odd-length center cell first. Extend both sides together, requiring each new symmetric pair to sum to the center value.

### Between / Lockout

Choose endpoints first, then search the interior with a derived allowed-value predicate.

Between interior:

```
min(endpoint values) < v < max(endpoint values)
```

Lockout interior:

```
v < min(endpoint values) OR v > max(endpoint values)
```

### Region Sum Line

Use region-segment-aware construction rather than a free random walk. Prefer topologies that do not re-enter a previously left standard box unless solver semantics are explicitly updated and tested for such cases.

### Argyle

Use an Argyle-specific diagonal/template lattice strategy. Do not model it as a generic arbitrary path. D4 transforms alone do not count as genuine topology-family diversity.

## Region Sum semantic warning

There is a source-level ambiguity that must be resolved before free-form Region Sum generation.

The targeted test semantics split a line into **contiguous** box segments. The current runtime conflict logic groups all cells with the same box id together. These differ if a line visits box A, then B, then A again.

Required resolution before Region Sum Category A:

1. canonical semantics = contiguous region segments;
2. solver/runtime and tests must use the same segmentation;
3. until then, generated topology must forbid region re-entry;
4. add a dedicated regression for `A -> B -> A` topology.

## Minimum useful lengths

These are generator defaults, not universal puzzle-law claims:

- Whispers / Dutch Whispers / Parity: >= 2, prefer >= 3 for nontrivial dependency.
- Thermo / Slow Thermo: >= 2, prefer 3-6.
- Entropic / Modular: >= 3.
- Renban: >= 2, prefer 3-6.
- Nabner: >= 2, prefer 3-5.
- Palindrome: prefer odd >= 3 unless an adapter deliberately supports even lines.
- Between / Lockout: >= 3.
- Zipper: odd >= 3.
- Region Sum: must cross at least one region border and contain at least two meaningful segments.
- Argyle: template-defined.

## Essentiality-aware line count

Do not hardcode that one line is enough.

Use bounded accumulation:

```
add deterministic valid line
-> carve / exact variant test
-> Classic ambiguous?
   yes: continue quality/difficulty checks
   no: add another non-redundant line
-> bounded line/attempt cap
-> GENERATION_EXHAUSTED
```

The generated constraint set itself is part of the seed replay contract.

## Topology fingerprint contract

Raw JSON inequality is insufficient.

Canonicalize at least:

- line list ordering;
- reversible line direction when direction is semantically irrelevant;
- D4 board symmetry;
- equivalent wrapper forms (`line` vs `{cells: line}` where applicable).

Direction equivalence:

- Whispers, Dutch Whispers, Renban, Nabner, Between, Lockout, Palindrome, Parity Line, Entropic, Modular, Region Sum, Zipper: reversal is normally equivalent.
- Thermo and Slow Thermo: reversal is **not** equivalent because bulb/tip direction is semantic.

Argyle topology diversity must discount pure D4 transforms of the same macro template.

## Difficulty

The current legacy difficulty score is search-stat based and can be used as an initial generator-ordering signal. Category A still requires measured Gentle < Focused < Expert behavior over a bounded multi-seed audit and acceptable runtime percentiles.

Do not begin human 1-9 variant rating until the variant generator itself is Category A.

## Audit order

Mandatory staged rollout:

```
semantic/source audit
-> architecture
-> 4-seed pilot
-> targeted regression
-> bounded 32-seed x 3-difficulty quality audit
-> production runtime wiring
-> standalone build
-> release gate
```

Do not jump directly to 32x3 while the primitive is still being debugged.

## First pilot order

Use representative primitive classes rather than hardening 15 variants blindly.

1. Whispers - local transition baseline.
2. Renban - whole-set primitive.
3. Between - endpoint/interior primitive.
4. Zipper - center-out symmetric primitive.

After those primitives are proven:

```
Dutch Whispers + Parity
Thermo + Slow Thermo
Entropic + Modular
Nabner
Palindrome
Lockout
Region Sum semantic fix + generator
Argyle template generator
```

## First implementation slice

The first implementation slice should create only the minimum reusable foundation plus a **4-seed Whispers pilot**. It should not claim production completion.

Pilot acceptance:

- fresh standard completed solution is seed-derived, not bank-derived;
- generated Whispers paths are simple valid paths;
- every adjacent solution pair on every path differs by at least 5;
- exact variant solution count == 1;
- Classic solution count > 1;
- same seed replays solution, puzzle and topology exactly;
- different pilot seeds show completed-solution and topology variation;
- no fallback to bank solution/topology;
- bounded failure is explicit `GENERATION_EXHAUSTED`.

Only after the pilot passes should the Whispers path be wired into production runtime and expanded to the 32-seed x 3-difficulty audit.

## Non-goals

- Do not modify `feature/classic-challenge-corpus`.
- Do not extend variant human 1-9 rating here.
- Do not force Jigsaw into this architecture.
- Do not treat Arrow as a normal line variant; it is a later primitive with a circle/sum semantic.
- Do not treat symbol permutation or D4 transform alone as structural solution diversity.
