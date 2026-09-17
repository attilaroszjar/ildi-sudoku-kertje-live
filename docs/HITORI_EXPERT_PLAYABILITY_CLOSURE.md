# Hitori Expert Playability Closure

Status: CLOSED
Date: 2026-09-15
Branch: `feature/classic-1to9-difficulty`
Canonical seed: `99001`
Canonical board: `6x6`

## Family-specific finding

Hitori displays a number in every cell, so a generic filled-cell density metric reports 100%. That does not mean the solution is prefilled: the complete number grid is the puzzle definition, while the hidden solution is the set of cells the player must decide to shade.

Removing individual numbers would create a partial-symbol Hitori variant with different rules and solver semantics. The production contract therefore has no removable clue atoms. Local irreducibility is correctly classified as not applicable rather than simulated by deleting puzzle-defining data.

## Alternative playability contract

Expert Hitori is measured by:

- zero exposed solution-state answers at start;
- a complete `n x n` symbol topology;
- exact uniqueness under all Hitori rules;
- deterministic seeded generation and topology diversity;
- the existing candidate score based on exact solver nodes, branches and dead ends;
- Expert selecting the highest-scoring candidate from the same generated candidate set.

Gentle and Focused behavior is unchanged and protected by canonical byte-stability hashes.

## Canonical host-realm evidence

Seed `99001`, 6x6 Expert:

- complete puzzle-definition symbols: 36 / 36;
- exposed shading answers: 0;
- solution black cells to discover: 9;
- exact solution count: 1;
- Expert difficulty score: 8961;
- production generation: 45.0 ms;
- final exact verification: 2.6 ms;
- policy gate: PASS.

For the same seed and size, measured candidate scores remain ordered:

- Gentle: 841;
- Focused: 2433;
- Expert: 8961.

## Metadata

- `policy=complete-grid-symbol-topology`
- `playabilityMetric=solution-state-exposure-and-exact-search-effort`
- `removableAtomPolicy=none-complete-grid-is-puzzle-definition`
- `localIrreducibilityApplicability=not-applicable-complete-grid-definition`
- `startingAnswerCount=0`

## Scope

This closure establishes an explicit non-carvable playability policy for standard complete-grid Hitori. It prevents the catalogue-wide density audit from treating puzzle-definition symbols as prefilled answers while retaining exact uniqueness and the existing difficulty selection behavior.
