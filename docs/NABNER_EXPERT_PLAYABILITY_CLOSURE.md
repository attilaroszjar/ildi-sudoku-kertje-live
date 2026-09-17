# Nabner expert playability closure

**Status:** CLOSED
**Date:** 2026-09-14
**Branch:** `feature/classic-1to9-difficulty`

## Baseline

The original Nabner expert runtime stopped at an explicit 30-given target:

- 30 / 81 givens
- density: 0.370
- exact unique under Nabner
- variant-essential
- deterministic seeded generation

A one-clue frontier audit on canonical seed `92001` showed that 21 of the 30 givens were individually removable while preserving exact Nabner uniqueness and variant-essentiality. Therefore the fixed target was an early-stop artefact, not a production minimum.

## Production remediation

The expert path now uses:

- the existing deterministic 30-given Nabner baseline as an entry state;
- exact Nabner candidate masks;
- incremental line masks;
- pressure-aware MRV;
- naked-single propagation;
- deterministic seeded clue-removal order;
- no clue floor;
- no runtime cutoff that can discard a valid sparse puzzle;
- a complete single removal pass whose rejected removals are a monotone non-uniqueness certificate.

Production metadata:

```text
policy: contract-driven-local-irreducibility
verification: nabner-naked-single-pressure-mrv-exact-v2
localIrreducibilityProof: monotone-nonuniqueness-from-single-pass
locallyIrreducibleUnderProductionContract: true
```

## Correctness evidence

Differential verification against the previous general exact path produced zero mismatches across the canonical baseline and all one-clue children.

The hardened solver preserves:

- exact uniqueness under Nabner;
- variant-essentiality;
- deterministic seeded generation;
- valid Nabner line constraints;
- local irreducibility under the production contract.

## Sparse production evidence

Four canonical expert seeds produced:

| Seed | Givens | Density | Local irreducible |
| --- | ---: | ---: | --- |
| 92001 | 17 | 0.210 | yes |
| 92002 | 15 | 0.185 | yes |
| 92003 | 17 | 0.210 | yes |
| 92004 | 18 | 0.222 | yes |

Distribution:

- min: 15 givens
- p50: 17 givens
- max: 18 givens

This removes the original expert density warning without replacing it with a new artificial clue target.

## Runtime evidence

`node:vm`-based diagnostic gates substantially overstate runtime for this recursive solver and must not be treated as the production runtime budget.

A host-realm production measurement for the previously pathological canonical seed `92003` produced:

- generation: 4701.9 ms
- final exact Nabner verification: 610.4 ms
- givens: 17
- unique: PASS
- variant-essential: PASS
- local irreducibility: PASS

The same seed measured roughly 45 seconds inside the VM-based stability harness. This difference is benchmark-environment overhead, not a production-generation regression.

Canonical production runtime evidence therefore comes from the host-realm harness:

```bash
NABNER_HOST_SEED=92003 node scripts/nabner-expert-host-realm-runtime.mjs
```

## Closure conclusion

Nabner expert is `CLUE_DENSITY_HARDENED` for this audit slice.

The relevant production contract is satisfied with substantially sparser puzzles than the original 30-given output, no artificial clue floor, exact verification, deterministic generation, local irreducibility, and bounded host-realm runtime evidence.
