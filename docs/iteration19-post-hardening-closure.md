# Iteration 19 post-hardening closure

## Scope

Dedicated 10/10 audit closure for `skyscraper-parks2`.

## Proven variant contract

- 8x8 grid.
- Each row and column contains digits 1-6 exactly once and exactly two parks.
- Parks are represented by the configured park value, do not count as buildings, and do not block visibility.
- All 32 outside clues match park-aware visible-building counts.

## Generation and solver evidence

- Deterministic for identical seed+difficulty.
- Seed-diverse for different seeds.
- Unique under the full Parks 2 rules.
- Outside-clue-essential: the same puzzle is ambiguous when the outside clues are ignored.
- Gentle/focused/expert generation is ordered by givens.
- Production hardening adds measured Parks2-aware MRV/backtracking search evidence through `generation.searchStats` and `generation.difficultyScore`.
- The measured solver enforces per row/column: digits 1-6 at most once, park at most twice, and exactly two parks when complete, plus park-aware outside visibility clues.

## Runtime and UI evidence

- Dedicated `skyscraperparks2` runtime path is wired.
- `parksPerLine`, `inputMax`, and the dedicated park input/rendering path are present.
- 8x8 Latin-style layout and candidate-note interaction are covered by the legacy Iteration 19 regression suite.

## Final validation

- Dedicated Iteration 19 suite: 9/9 PASS.
- Full repository suite after production loader integration: 508/508 PASS.
- Release gate: PASS.
- Catalogue: 106.
- External runtime dependencies: 0.
- Standalone SHA-256: `d074c6a2517bb03356566fa73293179ada8c24208c62af31c14be67aadaffcf8`.

Status: `skyscraper-parks2` is 10/10 post-hardening complete.
