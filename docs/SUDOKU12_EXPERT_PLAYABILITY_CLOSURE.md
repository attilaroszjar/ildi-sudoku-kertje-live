# Sudoku 12x12 expert playability closure

**Closed:** 2026-09-15  
**Canonical seed:** `92001`  
**Difficulty:** `expert`

## Finding

The original 12x12 expert production output stopped at 93 / 144 givens (64.6%). A first-removal frontier audit showed that 90 of those 93 givens were individually removable while exact uniqueness remained true, proving that the configured stopping point was not a natural information frontier.

## Production hardening

The expert path now keeps the stable seeded 12x12 source and applies a deterministic single-pass exact uniqueness carve with:

- no clue floor;
- no target clue count;
- no runtime cutoff used as a carving eligibility rule;
- exact `countSolutions(..., 2)` verification after every attempted removal;
- monotone non-uniqueness as the local-irreducibility proof for rejected removals.

Gentle/focused generation remains unchanged.

Production metadata:

- `policy=contract-driven-local-irreducibility`
- `localIrreducibilityProof=monotone-nonuniqueness-from-single-pass`
- `verification=rotation-safe-solver-verified-local-irreducible`
- `generatorFamily=sudoku12-rotation-safe-expert-local-irreducible`

## Canonical host-realm closure evidence

For seed `92001`:

- source givens: 93 / 144;
- source density: 0.646;
- final givens: **49 / 144**;
- final density: **0.340**;
- accepted removals: 44;
- rejected removals: 49;
- exact solutions: 1;
- generation runtime: **3805.0 ms**;
- final exact verification: **256.0 ms**;
- independent single-given closure checks: 49;
- remaining individually removable givens: **0**;
- slowest closure check: **1137.6 ms**;
- local irreducibility: **PASS**.

Every remaining given produced at least two solutions when removed individually.

## Scope of the claim

This is a deterministic locally irreducible production result for the canonical seed. It is **not** a claim that 49 givens is a global mathematical minimum for 12x12 Sudoku.

## Next remediation target

The next pure cell-given target in the nonstandard Grid cohort is `mini-6`, whose expert baseline inventory measured 20 / 36 givens (55.6%).
