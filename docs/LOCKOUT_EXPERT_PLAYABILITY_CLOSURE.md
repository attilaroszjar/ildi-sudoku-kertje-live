# Lockout expert playability closure

**Status:** CLOSED
**Date:** 2026-09-14
**Variant:** `lockout`
**Canonical seed:** `92001`
**Difficulty:** `expert`

## Closure result

The Lockout expert playability remediation is closed on the host-realm production runtime path.

The original proven-sibling generator stopped at an explicit 29-given expert target. A production-topology frontier audit showed that 15 of those 29 givens were individually removable while exact Lockout uniqueness remained true. This proved that the configured target was an artificial density stop rather than a natural irreducibility frontier.

The expert path now applies deterministic contract-driven local carving with no clue floor and no target clue count. A single seeded removal pass is sufficient to prove local irreducibility because a rejected removal is already non-unique, and removing further givens cannot restore uniqueness.

## Canonical host-realm evidence

Final canonical result for seed `92001`:

- source givens: 29;
- final givens: **21 / 81**;
- density: **0.259**;
- accepted post-target removals: 8;
- rejected removals: 21;
- exact Lockout solutions: 1;
- Classic solutions: 2;
- Lockout essential: true;
- generated Lockout line count: 4;
- deterministic fresh-process regeneration: PASS;
- remaining individually removable givens: 0;
- local irreducibility: PASS;
- policy: `contract-driven-local-irreducibility`;
- proof: `monotone-nonuniqueness-from-single-pass`.

No claim is made that 21 is a global mathematical minimum. It is the deterministic locally irreducible production result for the canonical seed and removal order.

## Generated topology correction

The first frontier probe incorrectly verified the generated puzzle against the static one-line Lockout topology from `SudokuBank`. The production generator actually returns a fresh four-line topology in `generated.data.lines` and verifies uniqueness against that generated topology.

The corrected probe explicitly compares both topologies and uses the returned/generated topology for all canonical correctness and removal checks. On the closure seed:

- generated-topology solution count: 1;
- bank-topology solution count: 2;
- Classic solution count: 2;
- generated vs. bank topology equal: false.

This correction was an audit-harness fix, not a production uniqueness defect.

## Exact verifier hardening

The generic production exact solver was correct but became expensive around the 21-given frontier because its MRV candidates were based only on row/column/box constraints and Lockout feasibility was checked after trial assignment.

The hardened Lockout counter uses the same exact partial Lockout semantics earlier in search:

- row/column/box candidate masks;
- feasible endpoint-pair filtering for every affected Lockout line;
- naked-single propagation;
- Lockout-pressure MRV tie-breaking;
- no heuristic cutoff;
- no runtime cutoff used as a correctness decision.

Production verification label:

`lockout-feasible-endpoint-pressure-mrv-exact-v2`

## Differential correctness evidence

The specialized exact counter was compared against the pre-hardening generic exact counter on 22 canonical states:

- the final 21-given baseline;
- every one of the 21 single-given removals.

Result:

- cases: 22;
- mismatches: **0**;
- baseline: specialized 1, reference 1;
- every single-removal state: specialized 2, reference 2;
- differential gate: **PASS**.

Therefore the optimized exact verifier preserves the observed solution counts across the full canonical local-irreducibility frontier.

## Runtime evidence

Host-realm differential run:

- specialized total: **1866.5 ms**;
- reference total: **6087.7 ms**;
- aggregate speedup: **3.26x**;
- specialized worst case: **330.6 ms**;
- reference worst case: **1490.8 ms**.

Final optimized frontier run:

- generation: **542.0 ms**;
- final exact baseline verification: **96.6 ms**;
- slowest single-removal exact verification: **304.0 ms**;
- local irreducibility: PASS.

The current generic runtime wrapper chain does not propagate search-stat instrumentation (`nodes`, `branches`, `deadEnds`, `propagated`) to the audit object, so those printed counters remain zero and are not treated as evidence. This is diagnostic-only and does not affect the solution-count parity or runtime evidence above.

## Closure contract

Lockout expert now satisfies the playability remediation contract:

```text
VALID
UNIQUE_UNDER_VARIANT
VARIANT_ESSENTIAL
DETERMINISTIC_SEEDED
NO_ARTIFICIAL_EXPERT_CLUE_FLOOR
LOCALLY_IRREDUCIBLE_UNDER_PRODUCTION_CONTRACT
EXACT_VERIFIER_DIFFERENTIAL_PARITY
BOUNDED_HOST_REALM_RUNTIME
```

The next playability target must be selected from a fresh canonical 77-Sudoku runtime density inventory rather than inferred from the old pre-Lockout ordering.
