# Iteration 7 post-hardening closure

Status: **CLOSED / 10/10**

Canonical game:

- Battenburg Sudoku

## Findings resolved

1. The Battenburg rule itself was already correct: the variant defines a complete `allGiven` parity contract, so marked intersections are checkerboards and unmarked intersections may not form a checkerboard.
2. Variant-aware generation already proved Battenburg-essential uniqueness and deterministic seeded generation.
3. Dedicated audit coverage was missing measured variant-search difficulty evidence. `games/iteration7-generator-hardening.js` now attaches Battenburg-aware MRV/backtracking `searchStats` and a deterministic `difficultyScore` without altering the game mechanics.
4. The measured-difficulty wrapper is loaded by the production runtime.

## Regression evidence

Targeted Battenburg gate on commit `c6057a0`:

- tests: 8
- pass: 8
- fail: 0

Covered properties:

- complete positive and negative `allGiven` Battenburg topology
- deterministic generation
- seed diversity
- solver-certified variant uniqueness
- genuine variant essentiality over Classic Sudoku
- Gentle >= Focused >= Expert clue ordering
- variant-aware measured search evidence
- runtime marked/unmarked checkerboard enforcement
- visible Battenburg markers

Full project regression after production loader integration:

- tests: 460
- pass: 460
- fail: 0

Release gate:

- `RELEASE GATE: PASS`
- catalogue: 106
- external runtime dependencies: 0
- standalone SHA-256: `73b24f3743fbbac29a67bb639a2e414363bce305db39dac29bf5f4a23cef07c6`

## Relevant hardening commits

- `b10994a` - dedicated Battenburg post-hardening regressions
- `9162823` - measured Battenburg variant-search evidence
- `c6057a0` - load Battenburg hardening in dedicated regression
- `300e468` - load Battenburg hardening in production runtime

Battenburg Sudoku has no known open source, generation, solver, renderer, or release finding after the above gates.
