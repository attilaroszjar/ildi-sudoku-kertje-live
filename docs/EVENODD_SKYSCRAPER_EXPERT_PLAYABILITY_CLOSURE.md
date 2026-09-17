# Even/Odd Skyscraper expert playability closure

**Status:** CLOSED
**Date:** 2026-09-15
**Canonical seed:** `92001`
**Difficulty:** `expert`

## Problem

The production Even/Odd Skyscraper expert generator stopped at 14 cell givens on a 6x6 board even though every one of those 14 givens was individually removable while preserving the full variant contract.

The starting production state was:

```text
givens=14/36
density=0.389
outsideClues=24
parityCells=36
variantSolutions=1
baseSolutions=2
variantEssential=true
```

The targeted frontier audit found:

```text
startingGivens=14
removable=14
rejected=0
locallyIrreducible=false
```

So the expert generator was stopping at a target count instead of the natural information frontier.

## Exact production contract

The existing exact verifier is:

```text
SudokuGenerator.countEvenOddSkyscraperSolutions(grid, variant, 2, ignoreSpecial)
```

The full variant contract uses `ignoreSpecial=false` and therefore enforces:

- row/column Latin uniqueness;
- all 36 parity-cell constraints;
- all 24 outside Even/Odd Skyscraper visibility-parity clues.

Variant essentiality is checked by the same exact counter with `ignoreSpecial=true`.

The production requirements are therefore:

```text
full variant solution count = 1
base solution count != 1
```

## Production hardening

Expert generation now continues beyond the old target with a deterministic full removal pass.

Properties:

- expert only;
- no clue floor;
- no target clue count after the initial generation stage;
- no timeout-based acceptance or rejection;
- existing exact counter reused directly;
- removal accepted only when the full variant remains exactly unique;
- final variant-essentiality is rechecked;
- gentle/focused behavior is unchanged.

Production metadata records:

```text
verification=solver-verified-local-irreducible
policy=contract-driven-local-irreducibility
localIrreducibilityProof=monotone-nonuniqueness-from-single-pass
locallyIrreducibleUnderProductionContract=true
```

The measured runtime wrapper may suffix the generator family, so the canonical production family is accepted by prefix:

```text
seeded-row-column-permutation-expert-local-irreducible...
```

## Why one pass proves local irreducibility

If removing a given makes the full variant non-unique, removing additional givens cannot reduce the solution set back to one. Non-uniqueness is monotone under clue removal.

Likewise, once the special Even/Odd Skyscraper rules are essential, removing ordinary cell givens cannot make the base puzzle uniquely solvable again: removing clues can only keep or increase the base solution set.

Therefore a deterministic single pass over all surviving givens is sufficient to prove local irreducibility under the production contract.

## Canonical closure evidence

Final host-realm production closure at commit `54d428e`:

```text
START givens=0/36 density=0.000 generationMs=285.0
BASELINE variantSolutions=1 baseSolutions=2 variantEssential=true runtimeMs=47.0 counter=countEvenOddSkyscraperSolutions
STRUCTURE outsideClues=24 parityCells=36
GENERATOR_METADATA {
  "clues":0,
  "unique":true,
  "verification":"solver-verified-local-irreducible",
  "generatorFamily":"seeded-row-column-permutation-expert-local-irreducible-nested-measured",
  "variantEssential":true,
  "policy":"contract-driven-local-irreducibility",
  "localIrreducibilityProof":"monotone-nonuniqueness-from-single-pass",
  "locallyIrreducibleUnderProductionContract":true,
  "acceptedRemovals":14,
  "rejectedRemovals":0
}
FRONTIER_SUMMARY startingGivens=0 removable=0 rejected=0 locallyIrreducible=true slowestMs=0.0
EVENODD_SKYSCRAPER_EXPERT_FRONTIER:PASS
RC:0
```

The final canonical puzzle therefore requires **zero ordinary cell givens** for seed `92001`: the 24 outside clues plus 36 parity cells already determine a unique solution while remaining variant-essential.

## Correct scope of the claim

`0` is the canonical cell-given count for seed `92001` under the current deterministic production topology.

This does **not** mean the puzzle has zero information. Its information is carried entirely by the structural clue channels:

- 24 outside visibility-parity clues;
- 36 parity-cell annotations.

Nor is this a global minimum claim across every possible Even/Odd Skyscraper topology or clue layout.

## Runtime

Final host-realm timings:

```text
generationMs=285.0
baseline exact verification=47.0 ms
```

This is acceptable for the current production hardening programme and requires no clue floor or unsafe cutoff.

## Regression gate

`scripts/evenodd-skyscraper-expert-playability-frontier.mjs` now requires:

- exact full-variant count 1;
- base count not equal to 1;
- `variantEssential=true`;
- non-empty outside clue structure;
- non-empty parity-cell structure;
- hardened verification metadata;
- hardened generator family prefix;
- `policy=contract-driven-local-irreducibility`;
- monotone local-irreducibility proof metadata;
- `locallyIrreducibleUnderProductionContract=true`;
- zero individually removable surviving givens.

Any regression to the old 14-given target stop or a non-irreducible expert output fails the gate.
