# Akari expert playability closure

**Closed:** 2026-09-15  
**Difficulty:** `expert`  
**Supported sizes:** `5x5`, `6x6`, `7x7`, `8x8`, `9x9`

## Finding

The original Akari expert path used a percentage-based clue-removal target. On canonical baseline seed `93001` at 6x6 it produced 8 numbered wall clues from 11 walls, but an independent exact frontier audit found 4 of those 8 numbered clues still individually removable while exact uniqueness remained true.

Baseline evidence before hardening:

- walls: 11;
- numbered clues: 8;
- exact variant solutions: 1;
- numberless-wall-topology base solutions: 2;
- variant-essential: true;
- individually removable numbered clues: 4;
- locally irreducible: false;
- generation runtime: 11.5 ms.

This proved that the percentage target was an artificial stopping point rather than a natural information frontier.

## Production hardening

The expert path now performs a deterministic single pass over every numbered wall clue and removes a clue exactly when `countAkariSolutions(candidate, 2) === 1` remains true.

Expert carving therefore has:

- no clue floor;
- no target clue count;
- no runtime cutoff used as a carving eligibility rule;
- exact Akari uniqueness verification after every attempted removal;
- deterministic seeded removal order;
- monotone non-uniqueness as the local-irreducibility proof for rejected removals.

A single pass is sufficient: removing clues can only enlarge the solution set, so a clue whose removal already produced multiple solutions cannot become safely removable after still more constraints are removed.

Gentle/focused clue-thinning behavior remains difficulty-targeted.

Production metadata for expert output:

- `verification=solver-verified-local-irreducible`
- `policy=contract-driven-local-irreducibility`
- `locallyIrreducibleUnderProductionContract=true`
- `mode=seeded-variant-essential`
- `generatorFamily=akari-multisize-procedural-wall-layout`

## Canonical single-seed closure evidence

For seed `93001`, 6x6:

- walls: 11;
- final numbered clues: **5**;
- accepted removals from fully numbered walls: 6;
- exact variant solutions: 1;
- numberless-wall-topology base solutions: 2;
- variant-essential: true;
- independent remaining-clue checks: 5;
- remaining individually removable clues: **0**;
- generation runtime: **40.7 ms**;
- final exact verification: 0.8 ms;
- independent closure-check total: 2.9 ms;
- slowest single closure check: 0.8 ms;
- local irreducibility: **PASS**.

## Multi-size production evidence

The matrix gate `scripts/akari-expert-playability-matrix.mjs` sampled three deterministic seeds (`93001`, `93017`, `93043`) at every supported size from 5x5 through 9x9.

Result:

- samples: **15**;
- failures: **0**;
- every sample exact unique: PASS;
- every sample numberless base non-unique: PASS;
- every sample variant-essential: PASS;
- every sample locally irreducible: PASS;
- every sample remaining removable numbered clues: **0**;
- slowest complete sample: **456 ms** (`seed=93043`, `9x9`).

The sampled final numbered-clue counts ranged from 2 to 12 depending on size and topology. These are deterministic locally irreducible production outputs, not claims of global mathematical minimum clue counts.

## Scope of the claim

Akari expert is closed for the playability/clue-density program under the production contract above. The closure establishes exact uniqueness, variant-essentiality of the numbered-wall information relative to the same unnumbered wall topology, bounded host-realm runtime on the evidence matrix, and local irreducibility of every sampled production output.

## Next remediation target

Following the canonical nonstandard policy snapshot order within the `Japanese logic` family, the next target is `aquarium`.
