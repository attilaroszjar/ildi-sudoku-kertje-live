# Double Skyscraper expert playability closure

**Status:** CLOSED
**Date:** 2026-09-15
**Canonical seed:** `92001`
**Difficulty:** `expert`

## Result

The production Double Skyscraper expert generator is already locally irreducible under its current exact production contract. No production hardening was required.

Host-realm closure evidence:

```text
START givens=3/36 density=0.083 generationMs=829.7
BASELINE variantSolutions=1 baseSolutions=2 variantEssential=true runtimeMs=91.4
STRUCTURE outsideClues=12
FRONTIER_SUMMARY startingGivens=3 removable=0 rejected=3 locallyIrreducible=true slowestMs=50.8
DOUBLE_SKYSCRAPER_EXPERT_FRONTIER:PASS
RC:0
```

Each of the three surviving player givens is individually necessary: removing any one yields at least two solutions under the full Double Skyscraper contract.

## Production contract

The exact verifier is:

```text
SudokuGenerator.countDoubleSkyscraperSolutions(...)
```

The canonical production result satisfies:

- full variant solution count exactly 1;
- base space without Double Skyscraper special rules has at least 2 solutions;
- variant-essentiality is therefore true;
- all surviving player givens are individually non-removable;
- no clue floor, timeout, or heuristic cutoff is needed for the closure claim.

## Correct scope of the claim

`3` is the canonical `seed=92001` production result and is locally irreducible under the current exact Double Skyscraper contract. This is not a claim of a global mathematical minimum over all Double Skyscraper instances.

## Runtime note

The verifier is materially heavier than Toroidal Skyscraper but still practical for a targeted closure audit:

```text
generationMs=829.7
baselineMs=91.4
slowest frontier check=50.8 ms
```

No production change was made because the current generator already reaches the local frontier.
