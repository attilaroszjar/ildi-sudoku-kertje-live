# Mini-6 expert playability closure

Closed on 2026-09-15.

Canonical host-realm closure seed: `92001`.

## Before

- expert givens: 20 / 36
- density: 0.556
- exact unique: yes
- first-removal frontier: 18 of 20 givens individually removable

## Production hardening

The expert path now applies a deterministic single-pass exact uniqueness carve with no clue floor, no target clue count and no runtime cutoff used as an eligibility rule. Gentle/focused behavior is unchanged.

Policy: `contract-driven-local-irreducibility`.

Local irreducibility proof: `monotone-nonuniqueness-from-single-pass`.

Verification: `rotation-safe-solver-verified-local-irreducible`.

## Canonical closure

- final givens: 10 / 36
- density: 0.278
- accepted removals: 10
- rejected removals: 10
- exact solutions: 1
- generation runtime: 5.9 ms
- remaining individually removable givens: 0
- local irreducibility: PASS

No claim is made that 10 givens is a global mathematical minimum; it is the deterministic locally irreducible production result for the canonical seed.
