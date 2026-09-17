# Battleships expert playability closure

**Closed:** 2026-09-15  
**Canonical seed:** `95001`  
**Difficulty:** `expert`  
**Canonical board:** `6x6`

## Finding

The original expert production puzzle exposed 19 information atoms:

- 12 outside fleet totals (6 row + 6 column clues);
- 7 starter cells.

Baseline exact audit found that 5 / 7 starters and 12 / 12 outside clues were individually removable while uniqueness remained true. This proved that the original expert output was substantially over-clued.

## Exact combined carve

The two information channels cannot be minimized independently because removing an outside clue can make a starter necessary, and removing a starter can make an outside clue necessary. The expert contract therefore treats both as one combined atom set.

A deterministic exact single-pass carve is used:

- no artificial clue floor;
- no target atom count;
- no runtime cutoff used as an eligibility rule;
- each candidate removal is accepted only if the exact Battleships solver still finds exactly one solution;
- rejected removals are certified by monotone non-uniqueness;
- remaining atoms are independently rechecked at closure.

## Runtime hardening

The first exact audit implementation was correct but too slow for production:

- carve runtime: ~25.6 s;
- independent frontier recheck: ~13.6 s.

A fixed 6x6 full-fleet universe oracle containing 894,296 legal fleets was then used as a differential optimization oracle. It reproduced exactly the same 10-atom frontier while reducing the proof run to roughly 1.65 s total.

The universe enumerator is not used as the general production algorithm because Battleships supports 5x5 through 8x8. Instead, the production P3 exact DFS verifier was hardened to support sparse outside clues and the same exact combined carve contract across supported sizes.

## Canonical production closure evidence

For seed `95001`, 6x6 Expert:

- production generation: **95.0 ms**;
- source atoms: 19;
- final atoms: **10**;
- final starter cells: **4**;
- final outside clues: **6**;
- accepted removals: **9**;
- rejected removals: **10**;
- exact solutions: **1**;
- bare fleet solution count: **2** (capped);
- independent closure checks: 10;
- remaining individually removable atoms: **0**;
- closure recheck total: **60.5 ms**;
- slowest single closure check: **11.1 ms**;
- local irreducibility: **PASS**.

Canonical final clues:

- rows: `[null,null,3,null,null,2]`
- columns: `[null,2,null,1,2,1]`
- starters:
  - `(4,1) = water`
  - `(0,2) = water`
  - `(2,3) = ship`
  - `(5,5) = ship`

## Production metadata

- `verification=solver-verified-local-irreducible`
- `policy=contract-driven-local-irreducibility`
- `localIrreducibilityProof=monotone-nonuniqueness-from-single-pass`

## Scope of the claim

This proves deterministic local irreducibility under the Battleships production information contract for the canonical seed. It is not a claim that 10 atoms is a global mathematical minimum across all possible encodings or all seeds.
