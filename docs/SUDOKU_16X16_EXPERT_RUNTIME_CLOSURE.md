# Sudoku 16x16 Expert runtime closure

## Scope

This closure covers the `sudoku-16x16` Expert production generation hotspot found during the hard-puzzle playtest/runtime audit.

The quality contract is unchanged:

- exact uniqueness;
- exact 16x16 Classic constraints with 4x4 boxes;
- deterministic seeded generation;
- contract-driven local irreducibility;
- no timeout in production;
- no artificial clue floor;
- monotone single-pass local-irreducibility proof.

## Baseline evidence

Initial production benchmark on seeds `93000..93004` showed a severe tail:

- min: `204.075 ms`
- median: `665.037 ms`
- max / p95: `8907.842 ms`
- hotspot seed: `93000`
- all seeds exact unique and locally irreducible.

The hotspot phase profile showed that base generation was cheap (`13.062 ms`) and the cost came from the exact local-irreducibility pass (`8437.834 ms`). The slowest removal trial visited over 3.1 million DLX nodes.

## Rejected optimizations

The following exact alternatives were tested and rejected because they did not improve runtime robustly:

- known-solution alternative search: correct but slower (`speedup 0.715`);
- descending candidate row order: effectively noise (`speedup 1.009`);
- dynamic minimum-column impact tie-break: fewer nodes in some states but much slower overall (`speedup 0.267`);
- static constraint-class tie-break: substantially slower (`speedup 0.202`);
- full box-interleaved removal order: excellent on seed `93000` but created a new `12.75 s` hotspot on seed `93004`;
- fully balanced seeded variants: retained timeout tails on the five-seed probe.

None of these rejected experiments changed production behavior.

## Accepted optimization

Production now uses a conservative hybrid clue-removal order for 16x16 Expert only:

1. construct the existing deterministic seeded shuffle;
2. group those shuffled givens by 4x4 box;
3. build a round-robin box-balanced ordering;
4. take the first 64 cells of that balanced ordering as a prefix;
5. append the remaining givens in their original seeded-shuffle order.

Production metadata:

`removalOrder: hybrid-box-prefix-64-seeded`

The exact DLX solver itself is unchanged.

## Production validation

Final host-realm production benchmark, seeds `93000..93004`:

| seed | generation | verification | givens | unique | locally irreducible |
| ---: | ---: | ---: | ---: | :---: | :---: |
| 93000 | 570.681 ms | 14.158 ms | 92 | yes | yes |
| 93001 | 143.567 ms | 3.944 ms | 97 | yes | yes |
| 93002 | 779.629 ms | 42.388 ms | 91 | yes | yes |
| 93003 | 278.420 ms | 5.286 ms | 95 | yes | yes |
| 93004 | 710.677 ms | 25.197 ms | 94 | yes | yes |

Aggregate:

- min: `143.567 ms`
- median: `570.681 ms`
- max / p95: `779.629 ms`
- givens range: `91..97`
- all unique: PASS
- all locally irreducible: PASS
- production contract: PASS

Compared with the original worst case (`8907.842 ms`), the final worst case (`779.629 ms`) is about **11.4x faster** while preserving the exact quality contract.

## Closure decision

**CLOSED / PASS.**

The 16x16 Expert runtime hotspot is resolved. No clue floor, timeout, approximate uniqueness test, or weakened local-irreducibility rule was introduced.
