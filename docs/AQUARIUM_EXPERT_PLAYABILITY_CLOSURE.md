# Aquarium expert playability closure

**Closed:** 2026-09-15  
**Canonical seed:** `94001`  
**Difficulty:** `expert`

## Finding

The original 7x7 Aquarium expert production output exposed all 14 outside sum clues: 7 row sums and 7 column sums. A first-removal frontier audit found **all 14 / 14 clues individually removable** while exact uniqueness remained true. The configured presentation therefore stopped before the natural information frontier.

## Production hardening

The expert path now keeps the seeded calibrated-region source and applies a deterministic exact single-pass clue carve over row/column sum atoms with:

- no clue floor;
- no target clue count;
- no runtime cutoff used as a carving eligibility rule;
- exact Aquarium verification after every attempted removal;
- null row/column entries representing intentionally omitted outside clues;
- monotone non-uniqueness as the local-irreducibility proof for rejected removals.

Gentle/focused generation remains unchanged.

Production metadata:

- `policy=contract-driven-local-irreducibility`
- `localIrreducibilityProof=monotone-nonuniqueness-from-single-pass`
- `verification=solver-verified-local-irreducible`
- `generatorFamily=seeded-water-levels-calibrated-regions-expert-local-irreducible`

## Canonical host-realm closure evidence

For seed `94001`:

- board: 7x7;
- source visible clues: 14;
- final visible clues: **8**;
- accepted removals: 6;
- rejected removals: 8;
- exact solutions: 1;
- clue-less base solutions with all outside sums omitted: 2;
- variant-essential: true;
- production generation runtime: **39.8 ms**;
- independent remaining-clue checks: 8;
- remaining individually removable clues: **0**;
- slowest closure check: **6.6 ms**;
- local irreducibility: **PASS**.

Canonical final outside clues:

- rows: `[0,1,null,5,null,null,4]`
- columns: `[null,1,0,null,3,null,2]`

## Scope of the claim

This is a deterministic locally irreducible production result for the canonical seed. It is not a claim that eight clues is a global mathematical minimum across all Aquarium instances or all region layouts.

## Next remediation target

The next Japanese-logic entry in the canonical playability policy snapshot is `battleships`.
