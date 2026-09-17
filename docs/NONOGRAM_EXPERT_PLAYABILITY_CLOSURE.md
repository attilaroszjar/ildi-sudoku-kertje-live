# Nonogram Expert playability closure

**Status:** CLOSED  
**Canonical seed:** `101001`  
**Board:** 10×10

## Contract

Standard Nonogram clues are not an optional sparse clue set. Every row and every column has one complete ordered run-length sequence; deleting an individual run or omitting a line clue changes the puzzle language rather than removing an optional clue atom.

Therefore clue-removal local irreducibility is **not applicable** to standard Nonogram. Expert remains a full-clue puzzle and difficulty is driven by candidate selection: among exact-unique generated boards it selects the candidate with the highest line-pattern ambiguity score.

Canonical metadata:

- `playabilityPolicy: full-line-clue-contract`;
- `localIrreducibility: not-applicable-mandatory-line-clues`;
- `removableClueAtoms: 0`;
- `expertSelection: highest-exact-unique-line-ambiguity`.

## Canonical evidence

For the canonical 10×10 Expert seed:

- row clue sequences: 10 / 10 retained;
- column clue sequences: 10 / 10 retained;
- visible line clues: 20;
- exact solution count: 1;
- deterministic replay: PASS;
- lower-difficulty isolation: PASS.

Targeted gate run on 2026-09-15:

- `tests/nonogram-expert-playability-contract.test.js`: 3 / 3 PASS;
- `tests/p3-nonogram-complete.test.js`: 4 / 4 PASS;
- total: 7 / 7 PASS;
- exit code: 0.

## Regression protection

```text
node --test tests/nonogram-expert-playability-contract.test.js
node --test tests/p3-nonogram-complete.test.js
```

The contract test covers mandatory full-line clues, exact uniqueness, canonical clue fidelity, deterministic Expert replay and lower-difficulty isolation. The existing multi-size regression continues to cover exact-unique 5×5, 6×6, 8×8 and 10×10 generation, seed diversity, size/difficulty independence and shared size-selector registration.

No claim of clue-removal irreducibility is made because there are no removable standard clue atoms. This is a deliberate rules-level closure, not a runtime shortcut or artificial clue floor.
