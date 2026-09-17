# Samurai expert playability closure

**Status:** CLOSED
**Date:** 2026-09-15
**Canonical seed:** `92001`
**Difficulty:** `expert`

## Problem

The production Samurai expert generator returned 132 filled cells on the 21x21 composite board. Although the output metadata reported exact component uniqueness, a corrected frontier audit found that 51 of those 132 clues were individually removable while preserving the Samurai production contract. The generator therefore stopped before the natural information frontier.

The earlier whole-board probe that reported zero solutions was invalid for Samurai: the 21x21 composite grid is not a single ordinary Sudoku. Samurai uniqueness is defined by its five overlapping 9x9 components.

## Exact production contract

Canonical component offsets are:

```text
center       6,6
top-left     0,0
top-right    0,12
bottom-left  12,0
bottom-right 12,12
```

Runtime offset resolution prefers `out.data.grids[].off`, then `variant.data.grids[].off`, with the canonical offsets as fallback.

Each 9x9 component is verified with:

```js
SudokuGenerator.countSolutions(component, 2)
```

The composite Samurai result is:

```text
unique     iff all five component counts are 1
invalid    iff any component count is 0
non-unique iff any component count is at least 2
```

An overlap-cell removal therefore affects both participating components naturally.

## Production hardening

The expert production path now takes the stable seeded Samurai output and applies one deterministic seeded removal pass.

Properties:

- expert only;
- no clue floor;
- no target clue count;
- no timeout-based acceptance or rejection;
- deterministic `mulberry32` removal order derived from the puzzle seed;
- a clue is accepted for removal only when all five component solution counts remain exactly 1;
- gentle/focused behavior is unchanged.

The production metadata records:

```text
verification=component-solver-verified-local-irreducible
generatorFamily=five-overlapping-unique-sudokus-expert-local-irreducible
policy=contract-driven-local-irreducibility
localIrreducibilityProof=monotone-nonuniqueness-from-single-pass
locallyIrreducibleUnderProductionContract=true
```

## Why a single pass proves local irreducibility

If removing a clue causes any component to have at least two solutions, removing still more clues cannot reduce that component back to one solution. Non-uniqueness is monotone under clue removal.

Therefore a clue rejected at some point in the deterministic pass remains non-removable later. Once every surviving clue has been tested, the final state is locally irreducible under the same five-component contract.

The standalone closure probe also performed an explicit final recheck of every surviving clue and found zero removable clues.

## Canonical closure evidence

Standalone closure probe from the original production state:

```text
source givens: 132
accepted removals: 22
final givens: 110 / 441
density: 0.249
rejected removals: 110
final component counts: 1,1,1,1,1
removable after closure: 0
locally irreducible: true
carve runtime: 134.9 ms
slowest removal check: 6.8 ms
```

Final host-realm production closure gate at HEAD `7b6a51b`:

```text
START givens=110/441 density=0.249 generationMs=151.6
BASELINE solutions=1 components=1,1,1,1,1 runtimeMs=1.1
acceptedRemovals=22
rejectedRemovals=110
FRONTIER_SUMMARY startingGivens=110 removable=0 rejected=110 locallyIrreducible=true slowestMs=2.8
SAMURAI_EXPERT_FRONTIER:PASS
RC:0
```

The production output therefore reproduces the deterministic closure result and remains comfortably within runtime expectations.

## Correct scope of the claim

`110` is the canonical `seed=92001` deterministic locally irreducible production result under the five-component Samurai uniqueness contract.

This is **not** a claim that 110 is a global mathematical minimum, nor that no Samurai puzzle with fewer givens exists.

## Regression gate

`scripts/samurai-expert-playability-frontier.mjs` now requires:

- exact composite baseline result 1;
- component counts `1,1,1,1,1`;
- `generation.unique === true`;
- canonical seed metadata;
- hardened verification metadata;
- `policy=contract-driven-local-irreducibility`;
- `locallyIrreducibleUnderProductionContract === true`;
- zero individually removable surviving givens.

Any regression back to the 132-given early stop, generic 21x21 verification, or a non-irreducible expert output fails the gate.
