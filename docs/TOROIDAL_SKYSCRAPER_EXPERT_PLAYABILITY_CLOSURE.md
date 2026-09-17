# Toroidal Skyscraper expert playability closure

**Status:** CLOSED
**Date:** 2026-09-15
**Canonical seed:** `92001`
**Difficulty:** `expert`

## Problem

The calibrated production Toroidal Skyscraper expert output still contained redundant player givens after the P2 recalibration wrapper had finished. The host-realm frontier audit found 8 actual player givens (excluding the 6 toroidal clue cells), of which 6 were individually removable while preserving the full variant contract.

The hardening therefore had to run after P2 recalibration, otherwise a later wrapper could have reintroduced givens after the local-irreducibility carve.

## Exact production contract

The production verifier is:

```js
SudokuGenerator.countToroidalSkyscraperSolutions(grid, variant, 2, ignoreSpecial)
```

For expert local irreducibility:

- full variant uniqueness requires exactly one solution with `ignoreSpecial=false`;
- variant essentiality requires the base space with `ignoreSpecial=true` to have a solution count other than one;
- toroidal clue cells are structural cells and are excluded from ordinary player-given counting and removal.

## Production hardening

The expert hardening is installed at the end of the `p3-size-control.js` production wrapper chain, after P2 recalibration.

Properties:

- expert only;
- no clue floor;
- no target clue count;
- no timeout-based acceptance or rejection;
- deterministic full single-pass removal over surviving non-structural givens;
- every removal is accepted only if exact full-variant uniqueness remains 1;
- variant essentiality is rechecked on the final puzzle;
- gentle/focused behavior is unchanged.

Metadata:

```text
verification=solver-verified-local-irreducible
generatorFamily=seeded-symbol-permutation-expert-local-irreducible
policy=contract-driven-local-irreducibility
localIrreducibilityProof=monotone-nonuniqueness-from-single-pass
locallyIrreducibleUnderProductionContract=true
```

## Why one pass proves local irreducibility

Under clue removal, the exact solution set can only stay the same or grow. If deleting a given makes the puzzle non-unique, deleting still more givens cannot make it unique again. Therefore a rejected removal remains rejected later in the same pass.

## Canonical closure evidence

Initial calibrated host-realm frontier at HEAD `a95bbc2`:

```text
START givens=8/30 density=0.267 generationMs=28.7
BASELINE variantSolutions=1 baseSolutions=2 variantEssential=true runtimeMs=2.0
removable=6
rejected=2
locallyIrreducible=false
```

Final host-realm production closure at HEAD `0bc0daa`:

```text
START givens=4/30 density=0.133 generationMs=97.4
BASELINE variantSolutions=1 baseSolutions=2 variantEssential=true runtimeMs=6.5
STRUCTURE toroidalClues=6 clueCells=6
acceptedRemovals=4
rejectedRemovals=4
FRONTIER_SUMMARY startingGivens=4 removable=0 rejected=4 locallyIrreducible=true slowestMs=50.8
TOROIDAL_SKYSCRAPER_EXPERT_FRONTIER:PASS
RC:0
```

The P2 metadata remains visible (`p2Recalibrated=true`, target 10), but the final expert output is intentionally sparser because the local-irreducibility wrapper runs after that calibration step.

## Scope of the claim

`4` is the canonical deterministic locally irreducible player-given count for `seed=92001` under the current Toroidal Skyscraper production contract. This is not a claim of global mathematical minimality across all possible clue structures or seeds.
