# Futoshiki Expert Playability Closure

Status: CLOSED
Date: 2026-09-15
Branch: `feature/classic-1to9-difficulty`
Canonical seed: `97001`
Canonical board: `6x6`

## Finding

Expert generation previously stopped at explicit profile targets: approximately 14% filled cells and 40% of the available inequalities. These values were useful for producing a unique source candidate, but they were an artificial stopping rule rather than a local uniqueness frontier.

## Production contract

The existing seeded multi-candidate generation and candidate scoring remain unchanged. After the Expert candidate has been selected, production applies one deterministic seeded removal pass over both visible clue channels:

- filled cell values;
- inequality signs.

There is no final clue floor, target clue count, timeout, or heuristic cutoff. A removal is accepted only when the exact Futoshiki solver still counts exactly one solution. Rejected removals remain necessary after later removals because removing constraints can only enlarge the solution set; this gives the single-pass closure its monotone non-uniqueness proof.

Gentle and Focused do not enter this carve path. Canonical byte-stability hashes for both modes are covered by a targeted regression test.

## Canonical host-realm evidence

Seed `97001`, 6x6 Expert:

- production generation: 893.9 ms;
- final givens: 5;
- final inequalities: 10;
- accepted removals: 14;
- rejected removals: 15;
- exact final solution count: 1;
- inequalities removed as a channel: 2 solutions (capped);
- variant-essential: PASS;
- independent closure checks: 15;
- remaining individually removable clues: 0;
- closure recheck total: 238.5 ms;
- slowest closure check: 48.6 ms;
- local irreducibility: PASS.

## Metadata

- `verification=solver-verified-local-irreducible`
- `policy=contract-driven-local-irreducibility`
- `localIrreducibilityProof=monotone-nonuniqueness-from-single-pass`

## Scope

The closure proves deterministic local irreducibility under the complete production-visible Futoshiki clue contract for the canonical seed. It does not claim that 15 total clues is a global mathematical minimum across every solution, topology, size, or seed.
