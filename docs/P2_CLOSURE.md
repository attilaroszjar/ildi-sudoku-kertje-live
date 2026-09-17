# P2 closure — difficulty recalibration

Closed: 2026-09-10

## Scope

P2 covered four Ildi-requested difficulty recalibrations:

1. Classic Skyscraper hard/expert;
2. Double Skyscraper hard/expert;
3. Toroidal Skyscraper hard/expert;
4. Odd/Even Sudoku hard/expert.

The phase deliberately preserved the existing gentle and focused generation policies and changed only the expert calibration.

## Baseline evidence

The pre-calibration census showed:

- Classic Skyscraper expert: 27 givens, 36 outside clues;
- Double Skyscraper expert: 3 givens, 24 outside clues;
- Toroidal Skyscraper expert: 20 givens, 6 toroidal clues;
- Odd/Even Sudoku expert: 27 givens, about 27 parity markers.

The candidate sweep then tested progressively stronger settings and retained only configurations that remained exact-unique and variant-essential for all 4/4 corpus seeds.

## Production calibration selected

- **Classic Skyscraper:** expert keeps 27 givens but reduces the outside-clue set from 36 to 20.
- **Double Skyscraper:** expert keeps 3 givens but reduces outside clues from 24 to 12.
- **Toroidal Skyscraper:** expert keeps all 6 toroidal clues but reduces givens from 20 to 10.
- **Odd/Even Sudoku:** expert targets 16 givens subject to exact uniqueness, allowing the generator to retain extra givens when required.

These choices were the strongest candidate settings that remained seed-stable in the bounded sweep.

## Executable evidence

Production calibration gate at source `32761b5`:

- `P2_RECALIBRATION_GATE:PASS`
- 2/2 targeted tests PASS;
- the first test verifies all four selected expert calibrations across the P2 corpus;
- the second verifies that gentle and focused policies are unchanged.

Post-calibration census:

- Classic Skyscraper expert: `ok=4/4`, givens=27, special=20;
- Double Skyscraper expert: `ok=4/4`, givens=3, special=12;
- Toroidal Skyscraper expert: `ok=4/4`, givens=10, special=6;
- Odd/Even Sudoku expert: `ok=4/4`, median givens=17, special=27;
- `ILDI_P2_DIFFICULTY_CENSUS:PASS`;
- `P2_EVIDENCE_GATE:PASS`.

Gentle/focused census values remained unchanged from the pre-calibration baseline.

## Notes

The pre-calibration Double Skyscraper machine score was already very high, which demonstrated that the old generic solver-search score was not a reliable proxy for Ildi's human difficulty perception in that variant. The selected fix therefore reduces externally supplied information instead of merely optimizing for that score.

No claim is made that these four variants now have a universal human difficulty rating. The closure claim is narrower: the specific Ildi-requested expert-level recalibration has been implemented, exact uniqueness and variant essentiality are retained, the selected settings are seed-stable on the bounded corpus, and easier bands are unchanged.

## Resulting programme state

After P2 closure:

- P0 open: 0
- P1 open: 0
- P2 open: 0
- P3 open: 16
- active backlog items: 16

The next phase is P3 size expansion.
