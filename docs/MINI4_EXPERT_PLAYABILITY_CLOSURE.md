# Mini 4x4 expert playability closure

Closed on 2026-09-15.

Canonical seed: `92001`
Difficulty: `expert`

## Baseline

The pre-hardening expert output had 6 givens out of 16 cells (density 0.375). A direct single-given frontier audit found 2 of those 6 givens individually removable while preserving exact uniqueness, proving that the old output was not locally irreducible.

## Production policy

The expert path now applies a deterministic exact uniqueness carve over the stable seeded source with:

- no clue floor;
- no target clue count;
- no runtime cutoff used as a carving eligibility rule;
- exact `countSolutions(..., 2)` verification for every attempted removal;
- monotone non-uniqueness from rejected removals as the local-irreducibility proof.

Gentle and focused behavior are unchanged.

## Canonical host-realm closure

- source givens: 6;
- final givens: **5 / 16**;
- density: **0.313**;
- accepted removals: 1;
- rejected removals: 5;
- exact solutions: 1;
- generation runtime: **3.6 ms**;
- independent remaining-given checks: 5;
- remaining individually removable givens: **0**;
- slowest closure check: effectively **0.0 ms** at reported precision;
- local irreducibility: **PASS**;
- policy: `contract-driven-local-irreducibility`;
- verification: `solver-verified-local-irreducible`;
- generator family: `mini4-expert-local-irreducible`.

No claim is made that 5 givens is a global mathematical minimum. It is the deterministic locally irreducible production result for the canonical seed.
