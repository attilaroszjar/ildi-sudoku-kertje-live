# P3 Closure — Size Expansion Programme

**Closed:** 2026-09-14
**Status:** COMPLETE
**Result:** 16 / 16 P3 backlog items CLOSED

## Objective

The P3 programme implemented the size-expansion requests originating from
Ildi's feedback while preserving the production-quality generator contract.

Board size is now treated independently from puzzle difficulty.

## Completed areas

The programme completed multi-size production support across the requested
Japanese logic and Sudoku-family games, including:

- Hitori
- Hashiwokakero / Hidak
- Fillomino
- Slitherlink
- Akari
- Nurikabe
- Nonogram
- Masyu
- Star Battle
- Galaxies / Tentaisho
- Ripple Effect
- Battleships
- Heyawake
- Futoshiki
- Classic Skyscraper
- Double Skyscraper

## Shared UX

P3 replaced per-game ad-hoc size controls with one shared board-size selector.

Each game registers only its supported sizes. Size selection remains distinct
from difficulty selection.

## Production contract

Where applicable, completed generators provide:

- deterministic seeded generation;
- exact rule-valid solutions;
- exact uniqueness under the full variant rules;
- variant-essentiality where required;
- structural or topology diversity;
- bounded generation;
- solver-backed verification;
- runtime dimensions derived from the selected board size.

## Performance work

Several generators or solvers required explicit runtime hardening rather than
larger retry limits.

Notable examples include:

- Heyawake bounded starter generation;
- Nurikabe bounded topology construction;
- Slitherlink propagation-first edge solving;
- Masyu propagation-first loop solving;
- Battleships pruning by fleet and row/column deficits;
- Ripple Effect solver-valid construction by design;
- Double Skyscraper row-pattern exact solving.

The final Double Skyscraper targeted residual gate completed in approximately
365 ms.

## Final state

- P0 OPEN: 0
- P1 OPEN: 0
- P2 OPEN: 0
- P3 OPEN: 0
- active Ildi backlog: 0

P3 is closed. The next development cycle must begin from newly received Ildi
feedback or a separately approved programme, rather than extending this phase
implicitly.
