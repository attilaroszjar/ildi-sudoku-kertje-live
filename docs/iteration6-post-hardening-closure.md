# Iteration 6 post-hardening closure

Status: **CLOSED / 10/10**

Canonical batch:

- Anti-Queen (9) Sudoku
- Quad Sums Sudoku

## Findings resolved

1. Both variants already had solver-aware uniqueness and runtime rule enforcement, but their dedicated post-hardening audit lacked explicit solver-search difficulty evidence.
2. `games/iteration6-generator-hardening.js` now attaches variant-aware search statistics and a finite positive difficulty score to both generators without changing their established rule contracts.
3. The production loader now includes the Iteration 6 hardening wrapper.

## Regression evidence

Targeted Iteration 6 gate:

- tests: 9
- pass: 9
- fail: 0

Covered properties:

- full solution-rule validity
- deterministic generation
- seed diversity
- solver-certified variant uniqueness
- genuine variant essentiality over the Classic baseline
- Gentle >= Focused >= Expert clue ordering
- measured variant-aware solver-search evidence
- Anti-Queen runtime diagonal enforcement
- Quad Sums runtime enforcement and visual marker hook

Full project regression after production loader integration:

- tests: 456
- pass: 456
- fail: 0

Release gate:

- `RELEASE GATE: PASS`
- catalogue: 106
- external runtime dependencies: 0
- standalone SHA-256: `53ea43929dd1183c3e0cc523e23c0b1fae3adcb9f019ba7daf7c843c150ae24d`

## Relevant hardening commits

- `e4581c4` - Iteration 6 dedicated post-hardening regressions
- `95b6600` - measured variant-aware difficulty evidence
- `82e61fa` - load hardening in the targeted regression
- `1c451ab` - load Iteration 6 hardening in production runtime

The two games in this batch have no known open source, generation, solver, runtime, or release finding after the above gates.
