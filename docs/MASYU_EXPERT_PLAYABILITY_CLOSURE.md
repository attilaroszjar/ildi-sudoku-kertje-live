# Masyu Expert playability closure

**Status:** CLOSED  
**Canonical seed:** `101001`  
**Board:** 4×4

## Removable atoms and contract

Each visible black or white circle is one removable clue atom. The seeded Expert path tries every circle once in deterministic order. A removal is retained only when the exact Masyu verifier still finds exactly one valid loop. No clue floor, target circle count, or runtime cutoff terminates the Expert pass.

Uniqueness is monotone when constraints are removed: after a rejected removal has already produced multiple solutions, later clue removals cannot restore uniqueness. Therefore the completed single pass proves local irreducibility.

## Canonical evidence

- baseline Expert circles: 6;
- final Expert circles: 3;
- accepted removals: 3;
- rejected removals: 3;
- exact solution count: 1;
- independently checked remaining atoms: 3;
- individually removable remaining atoms: 0;
- policy: `contract-driven-local-irreducibility`;
- proof: `monotone-nonuniqueness-from-single-pass`.

Fresh host-realm closure measurement:

- Expert generation: 31.4 ms;
- final exact verification: 5.1 ms;
- exact verification search: 5,515 nodes, 2,757 branch points, 2,757 dead ends.

## Regression protection

`node --test tests/masyu-expert-playability-closure.test.js`

The six assertions cover the canonical frontier, exact uniqueness, every remaining circle, metadata, unchanged Gentle/Focused canonical behavior, and deterministic replay.

No global-minimum claim is made. Three circles are the deterministic locally irreducible production result for the canonical seed.
