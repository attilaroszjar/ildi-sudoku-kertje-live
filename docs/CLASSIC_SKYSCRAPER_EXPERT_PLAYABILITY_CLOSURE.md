# Classic Skyscraper expert playability closure

**Status:** CORRECTNESS CLOSED / PERFORMANCE FOLLOW-UP OPEN
**Date:** 2026-09-15
**Canonical seed:** `92001`
**Difficulty:** `expert`

## Problem

The production `classic-skyscrapers` expert generator stopped at 14 filled cells on the 6x6 board even though all 14 givens were individually removable while preserving exact uniqueness under the Classic Skyscraper rules.

The production structure contains 24 outside visibility clues and no domino constraints. The original expert output was already variant-essential: the full Classic Skyscraper contract had exactly one solution, while the same cell givens without the outside clues had at least two solutions.

The 14-given stop was therefore a generation target, not the natural information frontier.

## Exact production contract

The existing production verifier is reused directly:

```js
SudokuGenerator.countDominoSkyscraperSolutions(grid, variant, 2, false)
```

For `classic-skyscrapers`, `variant.data.dominoes` is empty, so this counter enforces:

- Latin row uniqueness;
- Latin column uniqueness;
- all 24 outside skyscraper visibility clues.

Variant-essentiality is checked with the same counter while ignoring the special outside constraints:

```js
SudokuGenerator.countDominoSkyscraperSolutions(grid, variant, 2, true)
```

The canonical contract is therefore:

```text
variant solutions = 1
base solutions    != 1
```

## Production hardening

Expert generation now continues past the former target and performs a deterministic complete single pass over the remaining cell givens.

Properties:

- expert only;
- no clue floor;
- no target clue count after the exact carve begins;
- no timeout-based acceptance or rejection;
- the existing exact production counter decides every removal;
- gentle/focused behavior is unchanged;
- variant-essentiality is preserved.

The production metadata records:

```text
verification=solver-verified-local-irreducible
policy=contract-driven-local-irreducibility
localIrreducibilityProof=monotone-nonuniqueness-from-single-pass
locallyIrreducibleUnderProductionContract=true
```

## Why a single pass is sufficient

If removing a given makes the puzzle non-unique under the full Classic Skyscraper contract, deleting still more givens cannot reduce the solution set back to one solution. Non-uniqueness is monotone under clue removal.

Therefore every rejected removal remains rejected in all later, sparser states. Once all surviving givens have been tested, the result is locally irreducible under the same exact contract.

For the canonical seed every one of the original 14 givens was accepted, leaving no cell givens at all.

## Safe verifier optimization

The original exact solver checked an outside visibility clue only after its entire row or column was filled. This was exact but caused a large amount of unnecessary search once the cell givens reached zero.

The verifier was hardened with a safe partial visibility bound. During search, a partially filled line is rejected only when the target visibility count is already mathematically impossible to reach. This is exact pruning, not a heuristic cutoff, and cannot discard a valid solution.

The optimization reduced the canonical zero-given baseline exact verification from approximately `4688.6 ms` to `31.1 ms` in host-realm execution.

## Canonical closure evidence

Pre-hardening host-realm frontier:

```text
START givens=14/36 density=0.389
BASELINE variantSolutions=1 baseSolutions=2 variantEssential=true
outsideClues=24
dominoes=0
removable=14
rejected=0
locallyIrreducible=false
```

Final host-realm production closure at HEAD `141956f`:

```text
START givens=0/36 density=0.000 generationMs=13318.5
BASELINE variantSolutions=1 baseSolutions=2 variantEssential=true runtimeMs=31.1
STRUCTURE outsideClues=24 dominoes=0
acceptedRemovals=14
rejectedRemovals=0
FRONTIER_SUMMARY startingGivens=0 removable=0 rejected=0 locallyIrreducible=true
CLASSIC_SKYSCRAPER_EXPERT_FRONTIER:PASS
RC:0
```

The 24 outside clues alone therefore define an exact unique, variant-essential canonical expert puzzle for `seed=92001`.

## Performance follow-up

Correctness is closed, but production generation still took approximately `13.3 s` in the canonical host-realm closure run.

This is not caused by the final exact verifier anymore; the zero-given baseline check is approximately `31 ms`. The remaining cost comes from repeated exact counter invocations during the generation/carving path.

This is recorded as performance debt, not a correctness blocker. Any future optimization must preserve the same exact contract and must not introduce a clue floor, timeout-based pruning, or another cutoff that can discard a valid sparse puzzle.

## Correct scope of the claim

`0` cell givens is the canonical `seed=92001` expert result under the current 24 outside-clue Classic Skyscraper contract.

This does not mean the puzzle contains zero information: its information is carried entirely by the outside visibility clues. It also does not claim that the outside clue set itself is globally minimal or structurally irreducible.

The closure claim is specifically about **cell-given local irreducibility** under the production contract.

## Regression gate

`scripts/classic-skyscraper-expert-playability-frontier.mjs` requires:

- exact variant solution count 1;
- base solution count not equal to 1;
- `generation.unique === true`;
- `generation.variantEssential === true`;
- canonical zero cell givens for seed `92001`;
- hardened verification and local-irreducibility metadata;
- zero individually removable surviving givens.

Any regression to the former 14-given target stop or loss of exact variant-essential uniqueness fails the gate.
