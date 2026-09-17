# Nurikabe Expert Playability Closure

Status: **CLOSED**

## Scope

This closure covers the Nurikabe Expert playability / local-irreducibility work for the supported multi-size production generator.

Supported sizes:

- 5x5
- 6x6
- 7x7
- 8x8

## Production contract

Nurikabe Expert uses exact solver-certified sea starters (`preShaded`) as removable clue atoms.

The production generator now:

1. builds a deterministic seeded Nurikabe topology;
2. derives one numbered clue per white island;
3. obtains an exact-unique starter set;
4. for Expert, greedily removes every starter whose deletion preserves exact uniqueness;
5. keeps only starters whose deletion makes the puzzle non-unique.

Because solution sets are monotone under clue removal, a starter that is necessary at the point it is tested cannot later become unnecessary after additional clue removals. A complete single pass therefore certifies local irreducibility of the retained starter set.

Expert metadata records the local-irreducibility contract.

## Exact-verifier optimization

The original exact solver became prohibitively expensive near the 8x8 Expert frontier. Sound pruning was added without changing the accepted solution space:

- partial 2x2 sea rejection;
- partial island size / reachability checks;
- potential sea-connectivity pruning through non-white cells;
- rejection of white components that can no longer reach any numbered island;
- forced-white detection where a black assignment would create a 2x2 sea block;
- forced-black detection when a completed island touches an undecided cell or when one undecided cell would merge two numbered white components.

These are logical impossibility checks, not heuristic cutoffs.

## Targeted regression evidence

Production targeted gate after optimization:

- 5 tests
- 5 pass
- 0 fail

Covered:

- solver-certified 5x5 through 8x8 generation;
- deterministic replay and seed diversity;
- difficulty / size independence;
- Expert exact starter minimization;
- shared P3 size selector integration.

## Canonical 5x5 Expert evidence

Seed: `101001`

Final starter set:

- `preShaded = 1`
- retained atom: `[4,1]`
- exact solution count with retained atom: `1`
- exact solution count without retained atom: `2`
- individually removable retained atoms: `0`

Optimized exact-search evidence:

- generation: ~54.6 ms
- final exact verify: ~3.4-5.0 ms
- final nodes: 143
- final branches: 114
- final dead ends: 57

## Multi-size Expert evidence

All supported sizes satisfy:

- exact solution count = 1;
- `localIrreducible = true`;
- individually removable retained starters = 0.

Measured host-realm evidence:

| Size | Generation | Verify | Final starters | Nodes |
|---|---:|---:|---:|---:|
| 5x5 | ~52.5 ms | ~5.4 ms | 3 | 118 |
| 6x6 | ~170.9 ms | ~16.4 ms | 5 | 431 |
| 7x7 | ~167.3 ms | ~8.0 ms | 5 | 158 |
| 8x8 | ~1633.3 ms | ~139.7 ms | 3 | 2014 |

Every retained starter was separately removed and exact-counted; every removal produced at least two solutions.

## Runtime improvement

Before the sound verifier pruning, the canonical 8x8 probe measured approximately:

- generation: 41.5 s
- verify: 7.18 s
- nodes: 251,375

After pruning:

- generation: 1.63 s
- verify: 0.14 s
- nodes: 2,014

The puzzle contract and retained local-irreducible starter set remained exact.

## Closure decision

Nurikabe Expert is closed under the Playability / local-irreducibility program.

There is no artificial Expert starter floor. Expert keeps only exact-necessary pre-shaded sea cells, and the supported 5x5-8x8 range has direct runtime and necessity evidence.
