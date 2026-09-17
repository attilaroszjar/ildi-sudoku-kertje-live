# LITS Expert playability closure

**Status:** CLOSED  
**Canonical seed:** `100001`  
**Board:** 6×6

## Classification

LITS is a complete-puzzle-definition family. Its 36-cell region partition is the board topology that defines which tetromino must be selected in each region; region cells are not prefilled solution answers and are not optional clue atoms. Removing a cell from the partition would create an invalid or differently defined puzzle rather than a sparser instance of the same LITS contract.

The Expert policy is therefore explicitly non-carvable:

- `policy=complete-region-partition-topology`
- `removableAtomPolicy=none-region-partition-is-puzzle-definition`
- `localIrreducibilityApplicability=not-applicable-complete-region-definition`
- `playabilityMetric=solution-state-exposure-and-region-choice-complexity`
- `startingAnswerCount=0`

## Canonical evidence

- complete region-definition cells: 36 / 36;
- regions: 6;
- prefilled shaded answer cells: 0;
- exact solution count: 1;
- deterministic seeded generation: PASS;
- Gentle starters: 4;
- Focused starters: 2;
- Expert starters: 0.

Host-realm measurements on the closure run:

- Expert generation: 78.4 ms;
- final exact verification: 1.7 ms;
- exact verifier search: 11 nodes, 10 branch points.

## Regression gate

`node --test tests/lits-expert-playability-closure.test.js`

The six assertions protect zero Expert answer exposure, explicit non-carvable metadata, exact uniqueness, complete region topology, unchanged Gentle/Focused starter counts, and deterministic generation.

No global-minimum claim applies: the region partition is the puzzle definition, while the removable Expert answer-state atom count is already zero.
