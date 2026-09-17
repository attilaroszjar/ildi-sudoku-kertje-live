# Classic Human H7 — Aligned Pair Exclusion (APE)

## Decision

H7 is **Aligned Pair Exclusion (APE / Subset Exclusion)**.

This is evidence-driven, not speculative:

- AI Escargot remains stalled after H6/MSLS.
- strict Franken/Mutant fish probe explains `0/24` frontier unlocks.
- AIC / Grouped AIC / X-Chain / XY-Chain return `0` deductions through their maximum supported depth.
- exhaustive digit-forcing seed coverage returns `0` actionable binary and ternary seeds.
- the dedicated APE frontier probe on the exact AI Escargot stall state finds:
  - `89` APE eliminations,
  - `69` exact false-candidate eliminations,
  - all `89` findings aligned under the conservative probe.

Therefore APE is a real, non-redundant capability gap in the current 49-technique Classic Human stack.

## Source model

Primary public references:

- SudokuWiki — Aligned Pair Exclusion / Subset Exclusion.
- Sudoku Clean — Aligned Pair Exclusion.

Core rule implemented here:

1. choose two base cells A and B;
2. enumerate every candidate pair `(p,q)`;
3. reject `(p,q)` when either:
   - A and B see each other and `p == q`, or
   - a strict ALS contains both distinct digits and A sees every ALS occurrence of one assigned digit while B sees every occurrence of the other;
4. eliminate candidate `p` from A only if every candidate in B paired with `p` is rejected;
5. symmetrically for B.

Critical Type-2 safety boundary:

- if A and B do **not** see each other, `(x,x)` is not rejected merely because the digits are equal.

## Scope

Initial H7 implementation is intentionally conservative:

- strict ALS definition from the existing `als.js` enumerator;
- ALS size <= 4 cells;
- two-cell base only;
- deterministic pair enumeration;
- explicit `pairBudget` and `maxFindings` hard bounds;
- server-preferred only;
- no Extended Aligned Pair / Triple Exclusion in H7.

## Rollout gates

### H7.1 — correctness-first quarantine

Status target:

- contract registered;
- finder implemented;
- inventory = `IMPLEMENTED_UNWIRED` + `UNAUDITED`;
- absent from `ClassicHuman.FINDERS`;
- `productionTrusted=false`.

Required targeted audit:

- documented Type-1 aligned archetype;
- documented Type-2 non-aligned archetype;
- equal-digit Type-2 safety;
- complete partner-pair proof coverage;
- deterministic repeated enumeration;
- explicit hard-budget validation;
- fail-closed quarantine assertion.

### H7.2 — integration

Only after H7.1 passes:

- mark VERIFIED;
- wire into `FINDERS` as `serverPreferred:true`;
- export public finder;
- update inventory baseline 50;
- preserve default fail-closed behavior without `allowServerPreferred:true`;
- add targeted integration/gating tests.

### H7.3 — canonical validation

Required:

- bounded H7 integration gate;
- `npm run test:classic-human`;
- no production-pool recalibration in the same change.

### H7.4 — frontier validation

Re-run:

- AI Escargot production-brutal vs max-capability;
- exact frontier diagnostics;
- APE hit / first-use / hardest-technique / dependency-depth reporting.

Success criteria:

- at minimum APE must produce a sound frontier elimination on AI Escargot;
- ideally the solver progresses beyond the current 2-step stall;
- whether it fully solves AI Escargot is an empirical result, not a gate for accepting a sound non-redundant APE implementation.

## Performance policy

APE is combinatorial and must remain bounded.

Defaults:

- `maxAlsCells=4`
- `pairBudget=2000`
- `maxFindings=64`

The canonical audit must use synthetic correctness fixtures, not the full AI Escargot APE scan. Full frontier scans remain explicit diagnostic commands so the normal gate stays fast.
