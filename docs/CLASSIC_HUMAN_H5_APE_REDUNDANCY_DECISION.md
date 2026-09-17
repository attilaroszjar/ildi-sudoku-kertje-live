# Classic Human H5 — Aligned Pair Exclusion redundancy decision

Status: REDUNDANT / SKIP IMPLEMENTATION
Branch: `feature/classic-human-post40-expansion`
Decision basis: differential corpus probe after H1-H4 completion

## Decision

Do not implement Aligned Pair Exclusion as a separate Classic Human finder.

The mandatory H5 pre-implementation gate was executed against a small differential corpus covering documented APE archetypes. For every oracle-proven APE elimination in the corpus, the current wings/AIC/ALS stack already produced the same elimination.

Observed differential coverage:

- `ape-bivalue-blockers`
  - `56:8`
  - covered by: `aic`, `als-xy-wing`, `als-xz`, `xy-wing`
- `ape-two-cell-als`
  - `19:1`
  - covered by: `aic`, `als-xz`
  - `20:3`
  - covered by: `als-xz`, `xyz-wing`
- `ape-nonaligned-mixed-als`
  - `9:1`
  - covered by: `aic`, `als-xy-wing`, `als-xz`

All corpus cases returned `fullyCovered:true`.

## Interpretation

APE is a documented human-solving name, but in the current solver it does not add demonstrated logical capability beyond already VERIFIED generalized engines. Adding a dedicated finder would therefore increase implementation and audit surface without improving the measured deduction frontier.

This decision is capability-based, not name-based. If a future curated corpus contains an APE deduction not reproduced by the current stack, this decision may be revisited.

## H5 outcome

- differential corpus: PASS
- APE implementation: SKIPPED
- reason: REDUNDANT under current wings/AIC/ALS capability
- new registered technique: none
- inventory remains unchanged

## Brutal-search restart condition

The post-40 expansion restart condition is now satisfied:

- H1 Finned/Sashimi Fish: completed and VERIFIED
- H2 Extended Uniqueness: completed and VERIFIED
- H3 Sue de Coq: completed and VERIFIED
- H4 Junior Exocet: completed and VERIFIED, `serverPreferred`
- H5 Aligned Pair Exclusion: explicitly documented REDUNDANT after differential coverage probe

Brutal/max-capability diagnostics may now resume, subject to the mandatory curated comparison of newly solved puzzles, exact-frontier movement, technique hit counts, first-use depth, runtime cost, and stall census.
