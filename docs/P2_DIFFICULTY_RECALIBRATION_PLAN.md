# P2 difficulty recalibration plan

Status: IN PROGRESS
Date: 2026-09-10
Canonical backlog: `data/ildi-development-backlog.json`

## Scope

P2 contains four Ildi-requested difficulty corrections:

1. `skyscraper` — hard/expert is perceived as too easy;
2. `double-skyscrapers` — hard/expert is perceived as too easy;
3. `toroidal-skyscrapers` — hard/expert is perceived as too easy;
4. `odd-even` — hard/expert needs a real increase in difficulty.

The historical 77/77 generator-quality result remains authoritative. P2 does not reopen generator validity; it changes player-facing difficulty pressure while preserving the production generator contract.

## Baseline census

Measured with `scripts/ildi-p2-difficulty-census.mjs`, 4 deterministic seeds per difficulty.

| Variant | Size | Gentle | Focused | Expert | Main signal |
| --- | ---: | --- | --- | --- | --- |
| `skyscraper` | 9 | 40 givens / 36 outside clues / score 50.5 | 32 / 36 / 137.5 | 27 / 36 / 426.5 | Expert still retains the complete 36-clue perimeter. |
| `double-skyscrapers` | 6 | 12 givens / 24 outside clues / score 132.5 | 7 / 24 / 732.5 | 3 / 24 / 11213.5 | Numeric givens are already near-minimal; full perimeter information is the likely human-ease bottleneck. |
| `toroidal-skyscrapers` | 6 | 30 givens / 6 special clues / score 13.5 | 24 / 6 / 19 | 20 / 6 / 23.5 | Expert search pressure barely differs from focused. |
| `odd-even` | 9 | 40 givens / 27 parity markers / score 42 | 32 / 27 / 50 | 27 / 27 / 55 | Expert has almost no measured difficulty separation from focused despite 27 permanent parity markers. |

Baseline gate: `ILDI_P2_DIFFICULTY_CENSUS:PASS` at source `472bc9f`.

## Interpretation

The four variants must not be recalibrated with one global clue-count change.

### Skyscraper

The current 9x9 runtime retains all 36 outside visibility clues at every difficulty. Reducing only Sudoku givens leaves a very information-rich perimeter. Expert should therefore combine lower givens with deterministic outside-clue carving, preserving exact uniqueness and variant essentiality.

The canonical backlog text still mentions an earlier 6x6 hard report. The current canonical runtime measured by the census is 9x9, so P2 implementation targets the actual production runtime. Size expansion remains a separate P3 concern.

### Double Skyscraper

Expert already reaches only 3 numeric givens while keeping all 24 outside clues. Further numeric-given removal is not the primary lever. Expert should remove a deterministic subset of outside clues while preserving exact uniqueness. This is also why the current DFS-style score can be high while the puzzle is still perceived as easy by a human: raw search cost is not equivalent to information presentation.

### Toroidal Skyscraper

The six toroidal clues are already sparse. The useful lever is a substantially lower expert given count, with exact uniqueness checked under the toroidal rule set.

### Odd/Even Sudoku

All 27 parity markers remain fixed across difficulty. Expert should use materially fewer Sudoku givens than the generic 9x9 target while preserving variant uniqueness and essentiality.

## Calibration method

Before production thresholds are changed, run a deterministic candidate sweep over the same seed family. The sweep must answer:

- how far numeric givens can be reduced robustly;
- how far Skyscraper/Double Skyscraper outside clues can be carved robustly;
- whether every candidate remains exact-unique under the variant;
- whether the special rule remains essential;
- whether generation remains deterministic and bounded.

Do not select thresholds from a single lucky seed. A production threshold must succeed across the whole calibration corpus.

## Acceptance contract

P2 can close only when all four variants satisfy all of the following:

- deterministic seeded generation;
- exact uniqueness under the complete variant rules;
- variant essentiality;
- clear gentle < focused < expert information-pressure separation;
- no regression of existing generation contract tests;
- targeted P2 difficulty gate PASS;
- backlog records moved to CLOSED with evidence;
- status page refreshed;
- `docs/P2_CLOSURE.md` created before P3 starts;
- release gate and live publish PASS.

## Phase-boundary rule

As established after P1, every priority phase receives a dedicated closure record. Therefore P2 is not considered closed until `docs/P2_CLOSURE.md` exists and contains the final calibration evidence.