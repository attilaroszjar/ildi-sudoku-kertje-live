# Playability / clue-density audit program

**Status:** IN PROGRESS
**Started:** 2026-09-14
**Scope:** full 106-game catalogue

## Why this program exists

The production generator contract already protects mathematical correctness: valid puzzle, exact uniqueness where the family supports an exact solver, variant-essentiality for special Sudoku rules, deterministic seeded generation, and diversity.

That is necessary but not sufficient for good playability. A generator can satisfy all mathematical contracts while leaving too much of the solution prefilled. The result is technically correct but feels partly solved before the player starts.

The motivating regression was Classic Skyscraper 6x6 producing a board with 24 givens out of 36 cells (66.7%). Similar over-cluing can occur in other variants and other game families.

## Canonical product principle

> Keep only the information that the puzzle actually needs. On harder levels, remove givens/clues aggressively until the relevant production contract prevents further safe removal.

There is no artificial minimum clue count whose purpose is merely to make a hard puzzle look fuller.

For hard/expert/brutal content, sparse presentation is desirable when it remains mathematically valid and meaningfully solvable under the variant rules.

## Extended generator-quality contract

Existing production requirements remain mandatory. This program adds a playability dimension:

```text
VALID
UNIQUE_UNDER_VARIANT
VARIANT_ESSENTIAL where applicable
DETERMINISTIC_SEEDED
DIVERSE
BOUNDED_RUNTIME
PLAYABLE_CLUE_DENSITY
DIFFICULTY_APPROPRIATE_INFORMATION
```

For families with removable atomic givens/clues and an exact verifier, the long-term hard-level target is stronger:

```text
LOCALLY_IRREDUCIBLE_UNDER_PRODUCTION_CONTRACT
```

Meaning: after generation, no remaining removable atomic clue/given should be individually removable while preserving all required production properties.

This is a target where computationally practical; it is not permission to replace bounded generation with unbounded brute force.

## Important distinction: measurement vs. gate

A single universal percentage is not valid for all 106 games. A Sudoku given, a Nonogram row clue, a Masyu circle, and an Akari wall number do not carry equivalent information.

The program therefore separates:

1. **measurement** — quantify how much starting information is exposed;
2. **triage** — flag suspiciously dense output;
3. **family adapter** — define removable clue atoms and the exact preservation contract;
4. **minimalization** — remove unnecessary atoms with a bounded seeded process;
5. **regression gate** — prevent a hardened family from drifting back to over-clued output.

## Difficulty direction

For families where fewer givens/clues generally increase search burden, the desired direction is monotonic:

```text
gentle/easy   -> more starting information
focused/medium -> less
expert/hard   -> aggressive carving
brutal         -> aggressive carving + irreducibility where practical
```

The density metric is not itself the final difficulty rating. Human solving complexity remains a separate dimension. However, hard-level generators must not retain removable information merely to make the board look populated.

## Phase A — canonical baseline inventory

Create one shared audit model and runner.

Initial measurable fields for grid-based puzzles:

- board size;
- total cells;
- filled starting cells;
- empty cells;
- given density;
- difficulty label;
- variant/game id;
- metric family;
- triage band.

Initial Sudoku diagnostic ceilings are intentionally **audit warnings, not release failures**:

| Difficulty | suspicious above |
| --- | ---: |
| gentle/easy | 55% givens |
| focused/medium | 45% givens |
| expert/hard/brutal | 35% givens |

These values are baseline detectors. A family hardened by this program should normally aim below its warning ceiling when the exact contract allows it.

Phase A starts with the canonical 77 standard Sudoku variants because they already have the strongest common production-verification infrastructure. The audit framework itself is catalogue-wide and must gain adapters for all remaining game families.

## Phase B — Sudoku runtime sampling

For each canonical Sudoku variant:

- sample deterministic seeds;
- sample every supported difficulty;
- include every supported board size;
- record min / median / max given density;
- identify output with suspiciously high density;
- preserve generator runtime bounds.

This phase must distinguish:

- cell givens;
- structural clues (cages, lines, edges, outside clues, marked cells);
- variants where structural clues themselves can also be minimized.

The first remediation target is the Skyscraper family because the reported playability problem is directly visible there.

## Phase C — exact carving adapters

For each solver-backed family, define:

```text
atoms(puzzle)
remove(atom)
verify(candidate)
score(candidate)
```

`verify(candidate)` must enforce the existing production contract, not only uniqueness.

Preferred hard-level algorithm:

1. start from a valid generated puzzle;
2. derive a deterministic seeded removal order;
3. try removing one atom;
4. keep the removal only if the full production contract still passes;
5. repeat until a bounded pass makes no progress;
6. optionally perform a second deterministic pass for local irreducibility;
7. emit audit metadata.

No unbounded search is allowed in the web runtime.

## Phase D — non-Sudoku families

Add metric and carving adapters by information model, not by visual category.

Expected adapter groups include:

- Latin/grid givens;
- outside-clue grids;
- binary cell-state puzzles;
- loop/path puzzles;
- region-partition puzzles;
- clue-number puzzles;
- marker/circle puzzles;
- fleet/object-placement puzzles.

Examples include Nonogram, Hitori, Futoshiki, Fillomino, Heyawake, Akari, Nurikabe, Ripple Effect, Battleships, Slitherlink, Masyu, Hashiwokakero, Star Battle, Galaxies and the remaining catalogue.

For some families, "more empty" does not map to fewer visible numbers. Their adapter must define the equivalent concept of removable starting information.

## Phase E — production gates

A family becomes `CLUE_DENSITY_HARDENED` only after it has:

- deterministic audit samples;
- explicit removable-atom semantics;
- bounded verifier;
- density/difficulty regression assertions;
- no regression in validity or uniqueness;
- no regression in variant-essentiality where relevant;
- runtime budget evidence.

Release gates should only become strict after a family has completed hardening. The global inventory may report pending families without blocking unrelated work during migration.

## Hardened remediation checkpoints

### Little Killer expert

Closed with exact variant verification, variant-essentiality, optimized tail-mask local irreducibility, and 10 / 81 expert givens on the canonical closure seed.

### Classic expert

Closed with multi-family sparse entry search, exact uniqueness, human expert levels 6–8, deterministic local irreducibility, and a 22–25-given multi-seed distribution. A deeper bounded search found 22 as the best discovered locally irreducible production optimum; no claim is made that 22 is a global mathematical minimum.

### Nabner expert

Closed on 2026-09-14. The original 30-given explicit target was proven to stop early: 21 of the 30 canonical givens were individually removable while preserving the production contract.

The production expert path now uses contract-driven deterministic local irreducibility with exact Nabner verification and no artificial clue floor. Four canonical seeds produced 15–18 givens (p50 17), all exact unique, variant-essential, deterministic and locally irreducible.

The canonical pathological seed `92003` produces 17 givens in 4701.9 ms in the host-realm production runtime harness, with final exact Nabner verification in 610.4 ms. The much larger timings observed in `node:vm` diagnostic harnesses are benchmark-environment overhead and are not the production runtime evidence.

Canonical closure details: `docs/NABNER_EXPERT_PLAYABILITY_CLOSURE.md`.

### Skyscraper Parks expert

Closed on 2026-09-14. The original expert wrapper stopped at an explicit **30-given target**. On the canonical seed `92001`, **28 of the 30 givens were individually removable** while exact uniqueness and variant-essentiality remained true, proving that the configured stop was not a natural irreducibility frontier.

The production verifier was hardened in stages. Completion-only outside-clue validation removed repeated no-op work. A sound post-assignment partial visibility bound produced zero differential mismatches and reduced the canonical sparse hotspot from about 264.4 s to 7.17 s. A hybrid exact verifier now uses the prefix-bound search above 15 givens and an incremental line-domain solver at or below 15 givens, while base-family `ignoreClues` checks stay on the legacy path.

The production expert path keeps the stable deterministic 30-given source, then applies a deterministic contract-driven removal pass with **no clue floor, no target clue count and no runtime cutoff used as a carving eligibility rule**. Monotone non-uniqueness from rejected removals proves local irreducibility after the single pass.

Canonical host-realm closure for seed `92001`:

- source givens: 30;
- final givens: **11 / 81**;
- density: **0.136**;
- accepted removals: 19;
- rejected removals: 11;
- exact variant solutions: 1;
- base-family solutions without skyscraper clues: 2;
- generation runtime: **34935.2 ms**;
- final exact verification: **4360 ms**;
- local irreducibility: PASS;
- policy: `contract-driven-local-irreducibility`;
- verification: `skyscraper-parks-hybrid-exact-v1`.

No claim is made that 11 is a global mathematical minimum; it is the deterministic locally irreducible production result for the canonical seed.

Canonical closure details: `docs/SKYSCRAPER_PARKS_EXPERT_PLAYABILITY_CLOSURE.md`.

### Lockout expert

Closed on 2026-09-14. The original expert target was artificial. The production expert path now uses exact Lockout verification and contract-driven deterministic local irreducibility with no clue floor. The canonical closure seed produces 21 / 81 givens, remains exact unique and variant-essential, and is locally irreducible. The specialized exact verifier is differential-gated against the trusted generic reference.

Canonical closure details: `docs/LOCKOUT_EXPERT_PLAYABILITY_CLOSURE.md`.

### Standard 9x9 Sudoku density sweep

A fresh full-77 runtime density inventory after the Lockout closure reported `denseWarnings=0` and `warningVariants=0`. The original standard-9x9 density-warning remediation sweep is therefore closed. Runtime hotspots remain a separate diagnostic signal; `node:vm` timings are not production runtime evidence when host-realm measurements are available.

### Full-catalogue Phase D inventory

The 106-game catalogue policy snapshot is persisted in `data/playability-catalogue-policy-snapshot.json`: 77 standard 9x9 Sudoku entries have explicit policy coverage and 29 nonstandard entries remain for family-specific policy/hardening. The first nonstandard cohort is the 11 `Grid` + `Outside clues` games, where cell givens and structural clues are measured as separate information channels.

### Sudoku 16x16 expert

Closed on 2026-09-15. The original large-board expert generator stopped at **188 / 256 givens (73.4%)** because of an explicit blank target, not because the puzzle had reached an information frontier. A first-removal audit found 184 of those 188 givens individually removable from the dense starting state.

The production expert path now keeps the stable seeded large-board source and applies a deterministic single-pass exact uniqueness carve with **no clue floor, no target clue count and no runtime cutoff used as a carving eligibility rule**. Exact verification uses a 16x16 Algorithm X / Dancing Links representation with givens pre-covered before the candidate matrix is built. Differential parity against the trusted generic counter passed with 0 mismatches on the canonical dense audit cases.

Canonical host-realm closure for seed `92001`:

- source givens: 188;
- final givens: **92 / 256**;
- density: **0.359**;
- accepted removals: 96;
- rejected removals: 92;
- exact solutions: 1;
- generation runtime: **814.6 ms**;
- final exact verification: **61.0 ms**;
- final exact search: 146,671 nodes / 141,368 branches / 5,302 dead ends;
- independent single-given closure checks: 92;
- remaining individually removable givens: **0**;
- slowest closure check: **225.9 ms**;
- local irreducibility: PASS;
- policy: `contract-driven-local-irreducibility`;
- verification: `classic16-dlx-precovered-exact-v2`.

No claim is made that 92 is a global mathematical minimum; it is the deterministic locally irreducible production result for the canonical seed.

The next cell-given remediation target in the nonstandard Grid cohort is **Sudoku 12x12 expert**, whose baseline inventory measured 93 / 144 givens (64.6%).

## Audit output

The global audit will ultimately report at least:

```text
TOTAL_GAMES
MEASURED
HARDENED
PENDING
DENSE_WARNINGS
BY_FAMILY
BY_DIFFICULTY
BY_SIZE
```

For grid-given families it additionally reports density statistics.

## Initial implementation slice

The first implementation establishes:

- shared density math and triage model;
- canonical difficulty normalization;
- canonical 77-Sudoku baseline inventory;
- a command-line audit entry point;
- regression tests for the audit semantics.

This is intentionally diagnostic first. Generator behavior changes follow from measured evidence rather than blanket percentage edits.

## Closure condition

This program is complete only when all 106 catalogue games have an explicit playability-information policy and every production generator is either:

- density-hardened with a regression gate, or
- explicitly documented as non-carvable with the appropriate alternative playability metric.

Final closure must include a generated inventory and a summary of before/after clue-density distributions.
