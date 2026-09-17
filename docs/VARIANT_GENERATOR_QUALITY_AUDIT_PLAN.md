# Variant Generator Quality Audit Plan

Status: planning / architecture audit
Branch baseline: `feature/classic-1to9-difficulty`
Baseline HEAD before this document: `2de0b91`

## Goal

Before extending Classic human rating to special Sudoku variants, harden the variant generators so that production puzzles satisfy two player-facing requirements:

1. **The special rule must genuinely matter.** A generated puzzle must be uniquely solvable under the variant rules but must not already be uniquely solvable as plain Classic Sudoku.
2. **The generator must produce a broad puzzle space.** Different seeds must not merely carve different clue masks from one canonical solution, nor rely mainly on symbol permutations / rotations / reflections of a tiny structural core.

This work precedes broad human-rating migration. A difficulty model is not meaningful if the generator itself produces structurally narrow or semantically non-essential content.

## Canonical acceptance contract

Every production special-Sudoku generation path should eventually satisfy:

- `VALID`
- `UNIQUE_UNDER_VARIANT`
- `VARIANT_ESSENTIAL`
- `SEED_DETERMINISTIC`
- `EXACT_REPLAYABLE`
- `SOLUTION_DIVERSITY_PASS`
- `TOPOLOGY_DIVERSITY_PASS` where the variant has mutable clue / constraint topology
- `TARGET_DIFFICULTY_MATCH`
- no dishonest best-effort fallback

If the bounded search cannot satisfy the contract, return an explicit generation exhaustion/failure state rather than relabeling a weaker puzzle or returning a fixed fallback.

## Variant-essentiality definition

For a Classic-based special Sudoku puzzle `P` with variant rules `V`:

```text
countSolutionsUnderVariant(P, V, limit=2) == 1
AND
countClassicSolutions(P, limit=2) != 1
```

This is the minimum semantic gate. It proves that the special rule is necessary for uniqueness.

A future stronger metric may measure **variant dependency**: how much of a human solve actually relies on the special rules. Essentiality is binary and necessary, but a puzzle where one trivial special clue merely breaks a final ambiguity may still be a weak experience.

## Current architecture findings

### Finding A — essentiality infrastructure is already strong

The shared generator has `variantRequiresEssential()` and a broad `variantEssentialKinds` inventory. `makeVariantPuzzle()` verifies variant uniqueness and checks Classic ambiguity. Several post-hardening tests explicitly assert:

- variant-aware unique solution,
- `generation.variantEssential === true`,
- and for many variants `countSolutions(puzzle, 2) > 1` under plain Classic rules.

This is a good foundation and should be retained as a hard gate.

### Finding B — diversity is the systemic weakness

The generic `makeVariantPuzzle()` starts from `variant.solution` and removes givens. Therefore every variant routed through this path can produce many puzzle masks while still being based on the same completed solution.

This affects a large set of `variantRequiresEssential` Sudoku families unless a dedicated generator replaces the generic path.

Consequences:

- puzzle hash diversity can look excellent,
- exact uniqueness can be correct,
- variant-essentiality can be correct,
- yet **solution diversity can still be effectively 1**.

This is not sufficient for production quality.

### Finding C — Diagonal currently has the same structural limitation

`diagonal-generator-hardening.js` performs diagonal-aware exact carving, but starts from the canonical `variant.solution`.

Therefore Diagonal is currently a good **essentiality reference**, but not yet a good **diversity reference**.

### Finding D — major Skyscraper paths are structurally narrow

Several Skyscraper-family generators call `symbolPermutedSolution(variant.solution, random)`.

That helper only remaps symbols. It does not construct a genuinely new Sudoku solution structure.

Thus these paths can report multiple distinct completed grids while remaining in one structural equivalence family.

Existing tests checking `seen.size >= 3` are useful but too weak for Ildi's requirement because digit relabeling alone can satisfy them.

## Diversity model

Do not use a single `unique puzzles` counter as the diversity audit.

Track separate dimensions:

### 1. Puzzle diversity

Hash the full playable puzzle state.

Purpose: catches exact duplicate outputs.

### 2. Solution diversity

Hash completed solutions before clue removal.

Purpose: detects generators that only vary clue masks.

### 3. Constraint-topology diversity

Hash the geometry/topology of special rules independently of their numeric values where appropriate.

Examples:

- Kropki / XV / Consecutive: marked-edge layout and relation types
- Thermo: line geometry
- Killer: cage partition geometry
- Arrow: circle/path geometry
- Renban / Whispers / Between Lines: line geometry
- Skyscraper: outside / inside sightline topology

Purpose: detects one fixed rule layout with superficial numeric changes.

### 4. Structural solution diversity

Normalize at least obvious equivalences so that digit relabeling, rotations/reflections, and other cheap automorphisms do not count as fully independent structural solutions.

A perfect Sudoku-isomorphism canonicalizer is not required for the first slice. Start with bounded, deterministic normalization that removes the most obvious false diversity signals.

## Initial generator quality classes

### Class A — production quality target

- variant exact unique,
- Classic non-unique,
- broad solution diversity,
- broad relevant topology diversity,
- deterministic/replayable,
- no fixed fallback,
- target difficulty contract holds.

### Class B — semantically correct but structurally narrow

- variant-essential and exact unique,
- but completed solutions or constraint topologies come from a narrow canonical/permutation core.

This is expected to contain many current special Sudoku generators.

### Class C — production unacceptable

Any path that can:

- return a puzzle already uniquely solvable as Classic,
- return an unverified/non-unique puzzle,
- use an unsafe fixed fallback,
- or label a puzzle with a target difficulty it did not meet.

Class C is fixed first; Class B is the next major priority.

## Migration taxonomy and likely generator strategy

| Family | Examples | Essentiality base | Main diversity requirement | Likely solution-generation strategy |
| --- | --- | --- | --- | --- |
| Extra houses / regions | Diagonal, Hyper, Disjoint, Jigsaw | strong | fresh completed grids | seeded randomized exact fill under house topology |
| Binary adjacency | Kropki, XV, Consecutive, difference, ratio | strong | fresh grids + edge topology | generate fresh solved grid, then derive/select relation topology and carve jointly |
| Anti / cell property | Odd-Even, Anti-Knight, Anti-King, Non-Consecutive | strong | fresh grids + clue placement where applicable | randomized exact fill respecting fixed anti constraints; derive sparse cell clues if needed |
| Ordering / line | Thermo, Greater Than, Renban | strong | fresh grids + line topology | fresh solved grid plus regenerated compatible line topology, then joint sculpting |
| Visibility | Skyscraper family | strong exact solvers | fresh grids + clue/sightline structure | replace symbol-only permutation with seeded structural solution generation |
| Cage / sum | Killer, Little Killer, Arrow, Sandwich | strong | fresh grids + cage/path/topology | fresh solution + generated compatible topology + exact joint validation |
| Hybrid | Killer-Skyscraper, Diagonal-Skyscraper, etc. | variable but often strong | composition diversity | compose validated family adapters only after single-family generators are sound |

## Pilot order for generator hardening

### Pilot 1 — Diagonal

Why first:

- simplest special topology,
- exact diagonal solver already exists,
- essentiality already works,
- current diversity defect is very clear: canonical solution carving.

Target:

- introduce a seeded fresh full-solution generator under row/column/box + two diagonal houses,
- retain exact uniqueness and variant-essential carving,
- audit structural solution diversity across a bounded seed sample,
- no fallback to the canonical completed grid.

This becomes the reference implementation for extra-house variants.

### Pilot 2 — Kropki / XV / Consecutive family

Why second:

- represents adjacency constraints,
- current essentiality gates are strong,
- forces a reusable relation-topology abstraction.

Target:

- do not create three unrelated generators,
- build a shared binary-relation generation/sculpting layer,
- produce fresh solved grids and varied edge topologies,
- exact validation remains variant-specific through the existing solver interface.

### Pilot 3 — Skyscraper

Why third:

- visibility constraints are substantially different,
- existing exact solver and measured workload infrastructure are good,
- current `symbolPermutedSolution()` usage exposes a clear structural-diversity weakness,
- success proves the generator-quality framework is not Classic-like only.

Target:

- replace symbol-only solution diversity with genuine structural solution generation,
- retain regenerated visibility clues,
- preserve variant-essentiality,
- expand diversity tests beyond raw JSON inequality.

## Bounded audit harness

The initial audit should be bounded and deterministic. Do not brute-force the entire catalogue.

For each selected variant and difficulty band, use a small canonical seed set first (for example 16 or 32 seeds) and report only compact aggregates:

```text
VARIANT_GENERATOR_AUDIT <id>
seeds=32
exactUnique=32
variantEssential=32
puzzleUnique=32
solutionUnique=...
topologyUnique=...
structuralSolutionUnique=...
failures=0
runtimeP50Ms=...
runtimeP95Ms=...
runtimeMaxMs=...
PASS|FAIL
```

Escalate sample size only after the targeted generator is correct and runtime is acceptable.

## Required regression tests

Every hardened pilot must add tests for:

1. deterministic same-seed replay,
2. variant exact uniqueness,
3. Classic non-uniqueness,
4. completed-solution validity,
5. bounded multi-seed solution diversity,
6. topology diversity if topology is generated,
7. rejection of unsafe fallback behavior,
8. difficulty ordering / target contract,
9. metadata integrity,
10. canonical release gate after targeted tests pass.

## Explicit non-goals for this phase

Do not yet:

- migrate every variant to a human solver,
- define one universal raw difficulty formula,
- touch the Classic challenge collector,
- perform a brute-force 100+ game catalogue generation run,
- duplicate Classic generator logic per variant.

## Architecture direction

The reusable layer should separate four responsibilities:

```text
FreshSolutionFactory
    -> ConstraintTopologyFactory
    -> VariantSculptor
    -> ExactVariantVerifier
```

The orchestration layer owns:

- deterministic seeds,
- attempt/time budgets,
- replay metadata,
- target acceptance,
- diversity fingerprints,
- explicit exhaustion.

Variant adapters own:

- valid complete-grid construction constraints,
- special clue/topology construction,
- exact rule validation,
- family-specific sculpting heuristics.

This layer should be completed before broad `human-rating-core` migration.

## First implementation slice

Implement only the **Diagonal fresh-solution + diversity reference path** first.

Acceptance gate:

- no use of the canonical `variant.solution` as the generated solution source,
- 100% variant exact uniqueness on the bounded canonical seed sample,
- 100% Classic non-uniqueness,
- deterministic replay,
- materially diverse completed solutions after obvious symmetry/symbol normalization,
- Gentle / Focused / Expert generation remains bounded and ordered,
- no fixed fallback,
- targeted tests PASS,
- canonical release gate PASS.

After this gate passes, reuse the resulting solution/diversity contracts for Hyper/Disjoint and then begin the adjacency-family pilot.
