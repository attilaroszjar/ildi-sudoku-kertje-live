# Classic Human H6 — Multi-Sector Locked Sets implementation plan

Status: PLANNED
Branch: feature/classic-human-post40-expansion
Scope: classical rank-zero MSLS only

## Why H6 now points to MSLS

Post-40 diagnostics after H1–H5:

- Canonical Classic Human audit remains green at 48 registered / wired / VERIFIED / productionTrusted techniques.
- Curated Brutal / golden corpus is AI Escargot (2006) and Arto Inkala (2012).
- AI Escargot advances two steps under max capability: hidden-single, then finned-swordfish, then stalls.
- Inkala 2012 stalls at step 0.
- Exact-frontier analysis shows many exact-false candidates remain at each stall frontier.
- Bounded frontier-unlock probe found that removing one exact-false candidate unlocks a cheap human step in 13/72 sampled Inkala false candidates and 24/72 sampled AI Escargot false candidates.
- Strict finless rank-zero Complex Fish probe (sizes 2..4, pairwise-disjoint base occurrences, exact disjoint cover partition) explained 0/13 Inkala unlock keys and 0/24 AI Escargot unlock keys.

Decision:

- Do not implement Franken Fish or Mutant Fish next merely because they are on the deferred H6 list.
- Prioritize a bounded classical Multi-Sector Locked Sets implementation.
- Treat Multi-fish, SK Loop, almost-MSLS and generic rank theory as out of scope for this first H6 slice.

External evidence also supports this direction: public analyses describe MSLS as rank-zero logic across multiple row/column/box sectors; Inkala 2012 has a documented MSLS/Multi-fish reduction, while AI Escargot is discussed in terms of an almost-SK-loop / higher-degree rank structure. The first implementation must therefore target exact rank-zero MSLS and remain fail-closed on almost-rank-zero patterns.

## Technique contract

Technique id:

- `multi-sector-locked-set`

Initial metadata:

- implementationStatus: IMPLEMENTED_UNWIRED until dedicated audit PASS
- auditStatus: UNAUDITED until dedicated audit PASS
- productionTrusted: false until dedicated audit PASS
- serverPreferred: true from the start
- serverOnly: false unless profiling later proves production use unacceptable
- requiresUniqueness: false

Do not assign a final rating before calibration against existing high-end techniques and observed traces. A placeholder is acceptable only while unwired and must not be used for production pool decisions.

## Logical scope

Implement only classical rank-zero MSLS patterns in which:

1. a bounded set of row/column sectors is selected;
2. a bounded set of intersecting boxes participates;
3. selected candidate truths have exactly enough available cover slots to force full occupancy;
4. therefore cover candidates outside the base/truth structure can be eliminated;
5. the rank is exactly zero — no positive-rank, negative-rank, almost-MSLS, Kraken, guardian or chain completion is allowed.

The implementation must produce eliminations only. No placement shortcut should be emitted directly; placements can arise later through normal singles after the eliminations are applied.

## Enumeration strategy

Correctness and boundedness are more important than completeness.

Phase H6.1 should support the canonical row-oriented and column-oriented MSLS forms first.

Recommended bounded search shape:

- choose orientation: rows or columns;
- choose 2..4 primary sectors;
- derive intersecting 3x3 boxes from candidate occupancy rather than freely enumerating arbitrary house sets;
- enumerate a bounded digit partition / cover assignment only where candidate counts make rank-zero possible;
- reject immediately if any selected truth has an escape occurrence outside the proposed cover structure;
- reject immediately if cover capacity exceeds or falls short of truth count;
- require at least one elimination;
- canonicalize/dedupe by orientation + sector set + digit sets + elimination set.

Hard defaults for the first implementation:

- maxPrimarySectors: 4
- maxDigits: 6
- maxPatterns: 64
- maxCombinations: explicit finite budget, initially 20000 or lower if profiling permits
- deterministic lexicographic enumeration only

No unrestricted powerset search over rows/columns/boxes/digits.

## Preferred implementation architecture

Create:

- `games/classic-human/msls.js`

Expose:

- `findMultiSectorLockedSet(state, options)`

Keep rank-specific helpers private unless another audited technique later needs them. Do not create a generic public rank engine during this slice.

Useful internal structures may include:

- primary sector descriptors
- box intersections
- per-digit candidate occurrence bitsets
- truth-count / cover-capacity counters
- canonical witness keys

Reuse existing contract helpers, cell indexing, mask utilities and deterministic deduction normalization.

## Dedicated audit requirements

Create:

- `tests/classic-human-technique-audit-msls.test.js`

Mandatory coverage before VERIFIED:

### Positive fixtures

- canonical row-oriented MSLS
- canonical column-oriented transpose
- at least one pattern with more than two primary sectors
- at least one pattern producing multiple exact eliminations

### Negative / near-miss fixtures

- one truth has an escape candidate
- cover capacity is one too large (positive rank)
- cover capacity is one too small / inconsistent
- candidate partition overlaps illegally
- box geometry broken
- no external elimination
- almost-MSLS requiring an extra chain must be rejected

### Invariants

- exact elimination set
- no eliminations from protected/base pattern candidates
- source state immutability
- apply safety
- digit relabeling
- row/column transpose symmetry
- deterministic enumeration
- hard budget enforcement
- repeated-call stability

### Oracle validation

For each positive fixture, independently verify every emitted elimination by a small exhaustive assignment oracle restricted to the fixture pattern. Do not use the production MSLS finder itself as the oracle.

## Integration policy

Only after dedicated Linux audit PASS:

1. mark VERIFIED;
2. set productionTrusted true;
3. wire into `games/classic-human/index.js`;
4. keep `serverPreferred:true`;
5. update inventory counts and stale global-count tests;
6. add explicit fail-closed top-level gating test:
   - no MSLS without `allowServerPreferred:true`
   - MSLS available with `allowServerPreferred:true`
7. run targeted integration slice;
8. run `npm run test:classic-human`;
9. verify A_G_FULL < 10000 ms and EXPENSIVE < 5000 ms.

## Golden differential after integration

Do not judge MSLS success solely by whether a golden is fully solved.

Re-run:

- `npm run audit:classic-post40`
- `npm run audit:classic-post40-frontier`
- `npm run audit:classic-post40-unlock`

Compare against pre-MSLS baseline:

Inkala 2012 baseline:

- max-capability status: STALLED
- baseline steps: 0
- unresolved: 60
- exact-false candidates: 194
- sampled unlocks: 13/72

AI Escargot baseline:

- max-capability status: STALLED
- baseline steps: 2
- trace: hidden-single -> finned-swordfish
- unresolved: 57
- exact-false candidates: 155
- sampled unlocks: 24/72

Record:

- whether MSLS appears
- first-use depth
- exact eliminations
- downstream newly unlocked techniques
- newly solved / additional steps
- frontier reduction
- runtime cost

A useful result is any verified frontier movement, even if full solve remains unavailable.

## Stop conditions

Stop and do not wire if any of the following occurs:

- canonical positive cannot be expressed without broad generic rank machinery;
- near-miss positive-rank fixture is accepted;
- deterministic bounded enumeration cannot stay inside the canonical runtime envelope;
- the finder depends on solution-oracle information;
- eliminations cannot be independently justified by the fixture oracle.

If classical MSLS gives zero coverage on both goldens after VERIFIED implementation, document that result before considering Multi-fish, SK Loop, almost-MSLS or broader rank logic.

## Immediate next implementation step

Implement H6.1 in quarantine:

1. add `games/classic-human/msls.js`;
2. register as IMPLEMENTED_UNWIRED / UNAUDITED / serverPreferred;
3. add canonical row-oriented fixture and exact-assignment oracle;
4. add transpose positive and three near-miss negatives;
5. run only `tests/classic-human-technique-audit-msls.test.js` on Linux;
6. diagnose fixture vs implementation before any wiring.
