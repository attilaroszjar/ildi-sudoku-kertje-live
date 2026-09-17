# Hashiwokakero expert playability closure

**Closed:** 2026-09-15  
**Canonical seed:** `96001`  
**Difficulty:** `expert`  
**Canonical board:** `7x7`

## Finding

The original production Hashiwokakero expert puzzle exposed all island numbers. On the canonical 7x7 seed there were 13 islands / 13 visible numeric clues.

A sparse-clue exact audit proved that all 13 clues were individually removable from the fully-clued state while uniqueness remained true. The numberless topology itself was not unique (`bareCount=2`, capped), so the clue channel is still genuinely necessary; the production output was simply over-clued.

## Exact carve contract

Expert generation now applies a deterministic seeded single-pass clue carve:

- no artificial clue floor;
- no target clue count;
- no timeout used as an eligibility rule;
- each island number is removed only if the sparse exact Hashiwokakero solver still finds exactly one solution;
- rejected removals are certified by monotone non-uniqueness;
- remaining clues are independently rechecked at closure.

## Canonical production closure evidence

For seed `96001`, 7x7 Expert:

- source clues: 13;
- final visible clues: **9**;
- accepted removals: 4;
- rejected removals: 9;
- exact solutions: **1**;
- numberless topology solutions: **2** (capped);
- variant-essential: **PASS**;
- production generation: **8.6 ms**;
- independent closure checks: 9;
- remaining individually removable clues: **0**;
- closure recheck total: **1.4 ms**;
- slowest single closure check: **0.3 ms**;
- local irreducibility: **PASS**.

Canonical final visible clues:

`0:2@0,6 1:3@1,6 3:2@2,5 4:3@2,4 6:2@3,3 7:3@4,3 9:2@5,2 11:3@6,1 12:1@6,0`

## Production metadata

- `verification=solver-verified-local-irreducible`
- `policy=contract-driven-local-irreducibility`
- `localIrreducibilityProof=monotone-nonuniqueness-from-single-pass`

## Scope of the claim

This proves deterministic local irreducibility under the production Hashiwokakero clue contract for the canonical seed. It is not a claim that 9 clues is a global mathematical minimum across all topologies, clue encodings, sizes, or seeds.
