# Domino Skyscraper expert playability closure

**Status:** CLOSED (correctness), performance debt remains
**Date:** 2026-09-15
**Canonical seed:** `92001`
**Difficulty:** `expert`

## Problem

The production Domino Skyscraper expert generator stopped at 15 cell givens on a 7x7 board. A host-realm frontier audit showed that 11 of those 15 givens were individually removable while preserving the full Domino Skyscraper contract.

## Exact production contract

The canonical production verifier is:

```js
SudokuGenerator.countDominoSkyscraperSolutions(grid, variant, 2, ignoreSpecial)
```

For the canonical generated structure:

- outside clues: 8;
- dominoes: 5;
- full variant uniqueness is checked with `ignoreSpecial=false`;
- base uniqueness is checked with `ignoreSpecial=true`;
- variant-essentiality requires the full variant to be unique while the base contract is not unique.

## Production hardening

Expert generation now continues past the old target stop with one complete deterministic removal pass.

Properties:

- expert only;
- gentle/focused behavior unchanged;
- no clue floor;
- no target clue count after the expert hardening pass begins;
- no timeout-based acceptance or rejection;
- exact existing production verifier reused;
- variant-essentiality preserved;
- local irreducibility justified by monotone non-uniqueness under clue removal.

Metadata:

```text
verification=solver-verified-local-irreducible
policy=contract-driven-local-irreducibility
localIrreducibilityProof=monotone-nonuniqueness-from-single-pass
locallyIrreducibleUnderProductionContract=true
```

## Canonical closure evidence

Initial frontier at HEAD `aa932f6`:

```text
START givens=15/49 density=0.306 generationMs=34.2
BASELINE variantSolutions=1 baseSolutions=2 variantEssential=true runtimeMs=3.1
FRONTIER_SUMMARY startingGivens=15 removable=11 rejected=4 locallyIrreducible=false slowestMs=5.9
DOMINO_SKYSCRAPER_EXPERT_FRONTIER:PASS
```

Final hardened host-realm closure at HEAD `7ec4424`:

```text
START givens=7/49 density=0.143 generationMs=8600.7
BASELINE variantSolutions=1 baseSolutions=2 variantEssential=true runtimeMs=275.8
acceptedRemovals=8
rejectedRemovals=7
FRONTIER_SUMMARY startingGivens=7 removable=0 rejected=7 locallyIrreducible=true slowestMs=2336.8
DOMINO_SKYSCRAPER_EXPERT_FRONTIER:PASS
RC:0
```

The deterministic expert production result therefore moved from 15 to 7 cell givens and is locally irreducible under the same exact contract.

## Correct scope of the claim

`7` is the canonical `seed=92001` deterministic locally irreducible result under the current generated 8-outside-clue / 5-domino production structure.

This is not a global mathematical minimum claim.

## Performance debt

Correctness is closed, but performance is not ideal:

- production generation: about `8.6 s`;
- baseline exact verification: about `276 ms`;
- slowest surviving-clue rejection check: about `2.34 s`.

The solver remains exact and there is no runtime cutoff. Future optimization should reduce search cost without weakening the production contract or introducing a clue floor.

## Regression gate

`scripts/domino-skyscraper-expert-playability-frontier.mjs` requires:

- full variant solution count exactly 1;
- base solution count not 1;
- variant-essentiality true;
- hardened verification/policy/proof metadata;
- `locallyIrreducibleUnderProductionContract === true`;
- zero individually removable surviving givens.
