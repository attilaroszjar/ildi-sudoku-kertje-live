# Classic Human H7 APE soundness handover

Repo: `attilaroszjar/ildi-sudoku-kertje`

Branch: `feature/classic-human-post40-expansion`

## Current state

H6 MSLS is complete and production-trusted. It is `serverPreferred`, solves the Inkala 2012 frontier, and passed canonical Classic Human audit before H7 work.

H7 explored the AI Escargot 2006 stall. Complex fish, deeper AIC/grouped-AIC/X-chain/XY-chain budgets, and full digit-forcing seed coverage all produced zero useful deductions. An initial Aligned Pair Exclusion (APE) probe looked promising, but the first integrated implementation was unsound on AI Escargot and was therefore quarantined.

APE is currently:

- registered in `contracts.js`
- exported as `findAlignedPairExclusion`
- **not present in `FINDERS`**
- `serverPreferred:true` metadata retained
- `IMPLEMENTED_UNWIRED`
- `NEEDS_FIX`
- `productionTrusted:false`

Inventory target while quarantined:

```text
registered:50
wired:49
implementedUnwired:1
declaredOnly:0
verified:49
limitedVerified:0
needsFix:1
unaudited:0
productionTrusted:49
```

## Soundness failure and repairs

The first integrated APE implementation drove AI Escargot to `INVALID` after 63 solver steps. An exact-solution replay isolated the first bad deduction:

```text
step:4
bad elimination: cell 1 digit 6
```

Two proof defects were then identified and repaired.

### Repair 1: ALS must not contain either base cell

A rejection witness used an ALS containing a base cell itself. Such an ALS cannot be treated as an external exclusion witness. `rejectionWitness` now rejects ALSes containing either base cell.

### Repair 2: ordered base assignments must never be swapped

For a fixed candidate pair `(A=p, B=q)`, the old implementation accepted a reverse orientation where A merely saw ALS occurrences of `q` and B saw ALS occurrences of `p`.

This is invalid for the ordered hypothesis. The corrected rule is only:

```text
A sees every ALS occurrence of p
B sees every ALS occurrence of q
```

The old `ba` orientation path was removed. ALS witnesses now use only `orientation:'ab'`.

## Latest validated local result before baseline cleanup

At local HEAD `64d6672`:

```text
APE targeted audit: 6/6 PASS
CLASSIC_H7_APE_SOUNDNESS_REPLAY {"id":"ai-escargot-2006","step":2,"apeSteps":0,"status":"STALLED"}
STATUS:CLEAN
```

Interpretation: after the soundness fixes, no unsound APE deduction is produced on AI Escargot. The correct APE implementation currently finds no applicable APE step at the original frontier and therefore does not unlock the puzzle.

## Canonical-baseline cleanup after that validation

After `64d6672`, integration/audit tests were updated to recognize the deliberate quarantine rather than incorrectly expecting all 50 techniques to be wired and trusted.

Updated tests include:

- `classic-human-h1-integration.test.js`
- `classic-human-h3-integration.test.js`
- `classic-human-h4-integration.test.js`
- `classic-human-h6-integration.test.js`
- `classic-human-h7-integration.test.js`
- `classic-human-technique-audit-inventory.test.js`
- `classic-human-server-preferred-gating.test.js`

These updates require validation on Linux.

## Next validation sequence

Run the bounded quarantine gate first:

```bash
node --test \
  tests/classic-human-technique-audit-ape.test.js \
  tests/classic-human-h7-integration.test.js \
  tests/classic-human-technique-audit-inventory.test.js \
  tests/classic-human-server-preferred-gating.test.js \
  tests/classic-human-h1-integration.test.js \
  tests/classic-human-h3-integration.test.js \
  tests/classic-human-h4-integration.test.js \
  tests/classic-human-h6-integration.test.js
```

Expected: all PASS, with one explicit quarantined APE in inventory.

Then run canonical:

```bash
npm run test:classic-human
```

Canonical must PASS while APE remains quarantined.

## Decision after canonical PASS

Do **not** re-enable APE merely because targeted correctness tests are green. The repaired APE currently does not unlock AI Escargot.

Recommended next decision:

1. Keep APE as a documented, correct but quarantined capability until broader non-redundancy value is proven; and
2. Resume frontier discovery from the original AI Escargot 2-step stall for a genuinely new H8 technique/representation.

Do not spend more effort on:

- complex fish: 0/24 frontier unlocks explained
- longer AIC/grouped-AIC/X/XY chain budgets: 0 eliminations
- larger digit-forcing seed coverage: 0 actionable seeds across all 20 binary and 59 ternary seeds
- naive APE: initial apparent unlocks were artifacts of the unsound proof implementation

The next H8 search should be evidence-driven from AI Escargot's exact frontier, not a generic technique expansion.
