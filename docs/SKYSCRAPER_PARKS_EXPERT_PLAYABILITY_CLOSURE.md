# Skyscraper Parks expert playability closure

**Closed:** 2026-09-14  
**Variant:** `skyscraper-parks`  
**Canonical expert seed:** `92001`

## Closure result

The Skyscraper Parks expert generator is closed for the playability / clue-density audit.

Canonical host-realm production result:

- givens: **11 / 81**
- given density: **0.136**
- source givens before contract carve: **30**
- accepted removals: **19**
- rejected removals: **11**
- exact variant solutions: **1**
- base-family solutions without the skyscraper clues: **2**
- variant-essential: **PASS**
- locally irreducible under the production contract: **PASS**
- production generation runtime: **34935.2 ms**
- final exact verification runtime: **4360 ms**

The result is not claimed to be a global mathematical minimum. It is a deterministic locally irreducible production result for the canonical seed under the exact production contract.

## Original failure mode

The previous expert path deliberately stopped at a configured target of **30 givens**.

The canonical 30-given frontier showed that **28 of 30 givens were individually removable** while preserving both exact uniqueness under the full Skyscraper Parks rules and variant-essentiality. The old stop was therefore a configured target, not a natural irreducibility frontier.

## Exact verifier work

The original park verifier performed skyscraper clue validation repeatedly while rows and columns were still incomplete. A completion-only exact validation optimization reduced the canonical 30-clue frontier workload by roughly an order of magnitude without changing the search result.

A sound post-assignment partial visibility bound was then added. It rejects a branch only when the currently fixed visible prefix has already exceeded the target or cannot possibly still reach it. Differential testing produced zero mismatches, and the canonical sparse hotspot improved from roughly **264.4 s** to **7.17 s**.

The final production verifier is hybrid:

- above 15 givens: post-assignment prefix-bound exact search;
- at or below 15 givens: incremental exact line-domain search;
- `ignoreClues=true`: base-family verification remains on the legacy/base path.

Verification metadata:

`skyscraper-parks-hybrid-exact-v1`

The hybrid runtime gate produced:

- 31 normal-density cases;
- mismatches: **0**;
- legacy total: **145.9 ms**;
- hybrid total: **139.0 ms**;
- canonical 11-clue sparse uniqueness: **1 solution** in **7281.6 ms**;
- base-family count: **2**.

## Contract-driven expert carve

The production expert wrapper keeps the stable deterministic 30-given source generation, then performs a deterministic seeded single-pass removal over all givens.

A removal is retained only when exact uniqueness under the full Skyscraper Parks rules remains true. Variant-essentiality is verified on the final puzzle. There is:

- **no clue floor**;
- **no target clue count**;
- **no runtime cutoff** used as a carving eligibility rule.

Policy:

`contract-driven-local-irreducibility`

Proof:

`monotone-nonuniqueness-from-single-pass`

The proof relies on monotonicity: once removing a particular given makes the puzzle non-unique, deleting additional givens cannot restore uniqueness. Therefore rejected removals do not need to be reconsidered later in the same removal chain.

The final canonical 11-given puzzle was additionally certified from the full removal history: 11 retained givens had already been proven critical at earlier supersets, while the final previously untested given was successfully removed at the 12-to-11 step. This closes local irreducibility for the resulting 11-given puzzle.

## Production closure evidence

Host-realm closure gate:

`SKYSCRAPER_PARKS_PRODUCTION_CLOSURE_GATE:PASS`

Canonical payload:

- `clues=11`
- `density=0.136`
- `variantSolutions=1`
- `baseFamilySolutions=2`
- `uniqueUnderVariant=true`
- `variantEssential=true`
- `locallyIrreducibleUnderProductionContract=true`
- `policy=contract-driven-local-irreducibility`
- `verification=skyscraper-parks-hybrid-exact-v1`
- `clueFloor=false`
- `runtimeCutoff=false`
- `sourceClues=30`
- `acceptedRemovals=19`
- `rejectedRemovals=11`

## Runtime interpretation

The closure runtime is materially larger than Nabner and Classic expert generation, but it is bounded host-realm production evidence rather than `node:vm` evidence. The canonical generation completed in about **34.9 seconds** and the final exact verification in about **4.36 seconds**.

This is accepted for the current hardening milestone because the generator no longer uses an artificial clue floor to hide verifier cost, and all pruning used by the production verifier is exact. Future performance work may reduce this runtime, but must not weaken the production contract or reintroduce a clue floor.

## Final status

**Skyscraper Parks expert: CLOSED / CLUE-DENSITY HARDENED.**

The next unresolved warning in the original 77-Sudoku runtime density inventory is **Lockout**.
