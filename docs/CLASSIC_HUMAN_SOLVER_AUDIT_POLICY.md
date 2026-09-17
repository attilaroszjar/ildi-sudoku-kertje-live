# Classic Human Solver Audit Policy

## Purpose

The Classic Human solver audit is a correctness and declared-capability audit of the implemented human-solving technique stack. Its purpose is not to force the solver to solve any particular famous puzzle.

## Golden benchmark role

AI Escargot (2006) and Arto Inkala's 2012 puzzle are persistent external golden benchmarks. They are stress, regression and gap-observation references only.

Their outcome is explicitly NON-GATING:

- SOLVED is useful evidence that the current technique stack can cover that benchmark.
- STALLED is not a failure by itself.
- A benchmark may remain permanently STALLED if solving it requires techniques, generality or search behavior outside the solver's declared capability.
- No implementation may be distorted, broadened unsafely or made less human-like merely to make either golden benchmark pass.

## Required 10/10 standard

Every technique that the solver declares as implemented must work correctly within its explicitly documented capability envelope.

A technique is audit-complete only when all of the following are demonstrated:

1. **Logical soundness** — every placement and elimination returned by the finder is logically valid for the input candidate state.
2. **State safety** — applying the deduction preserves a valid candidate state and never removes the true solution candidate on valid unique fixtures.
3. **Positive detection** — canonical positive fixtures covering the declared supported forms are found.
4. **Negative discrimination** — near-miss and adversarial non-pattern fixtures do not produce false positives.
5. **Symmetry invariance** — row/column/box-preserving transformations and digit relabelings do not change correctness.
6. **Determinism** — identical state and options produce identical deductions and ordering.
7. **Boundary correctness** — documented search budgets, length/depth limits and option bounds are respected exactly and fail closed when invalid.
8. **Integration correctness** — the technique behaves correctly inside the full solver, including candidate updates, finder ordering and repeated application.
9. **Oracle validation where practical** — eliminations/placements are cross-checked against exact solution reasoning or independently constructed proof fixtures.
10. **Declared completeness only** — the implementation must cover every form it claims to support. Unsupported generalizations must be documented rather than silently implied by the technique name.

The phrase "10/10" in this project means all ten requirements above are satisfied for the technique's declared scope. It does not mean the implementation must cover every variant of a technique known in Sudoku literature unless that broader scope is explicitly declared.

## Audit classification

Each implemented finder must end the audit with one of these states:

- `VERIFIED` — all ten requirements pass for the declared scope.
- `LIMITED_VERIFIED` — sound and reliable, but intentionally supports only a documented subset of the broader named technique family.
- `NEEDS_FIX` — a correctness, determinism, state-safety or declared-scope completeness defect exists.
- `UNAUDITED` — insufficient evidence yet.

Only `VERIFIED` and `LIMITED_VERIFIED` finders may be trusted by production difficulty classification. `LIMITED_VERIFIED` must retain its documented scope limitation.

## Golden regression expectation

After solver changes, both golden benchmarks should be rerun under `production-brutal` and `max-capability` profiles. The result is recorded for longitudinal comparison, but no specific solve status is required for merge unless a change unexpectedly regresses a previously demonstrated capability without explanation.

A regression means, for example, a benchmark that previously reached a sound later state or solved now stalls earlier because of a solver defect. Remaining consistently STALLED is acceptable.

## Production Brutal search

The Brutal production search remains on hold until the implemented technique set used for classification has been audited to the standard above. The hold is about trust in the solver's reasoning, not about making the golden benchmarks solvable.
