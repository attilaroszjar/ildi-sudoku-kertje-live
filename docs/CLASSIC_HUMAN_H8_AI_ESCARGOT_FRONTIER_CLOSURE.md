# Classic Human H8 AI Escargot frontier closure

Repo: `attilaroszjar/ildi-sudoku-kertje`

Branch: `feature/classic-human-post40-expansion`

## Decision

Stop further AI Escargot frontier expansion for now.

The objective of H8 was evidence-driven frontier discovery, not solving AI Escargot at any computational cost. The investigation produced useful architectural evidence, but the marginal cost of further search is now too high relative to expected value.

Do not increase chain, forcing, nesting, candidate, or seed budgets merely to force a solve.

Do not rewire APE.

## Canonical starting point

Before H8 frontier work:

```text
CLASSIC_HUMAN_AUDIT A_G_FULL PASS tests=99
CLASSIC_HUMAN_AUDIT EXPENSIVE PASS tests=8
CLASSIC_HUMAN_AUDIT PASS total_files=99 expensive_files=8
HEAD:1512d10
```

AI Escargot max-capability baseline:

```text
status: STALLED
steps: 2
hardest: finned-swordfish
unresolved: 57
candidates: 212
bivalue: 2
trivalue: 24
fourPlus: 31
```

## Exact frontier evidence

At the 2-step stall:

```text
exact false candidates: 155
```

A balanced probe of 72 exact-false candidates found 24 single-elimination frontier unlocks:

```text
unlock rate: 24/72 = 0.3333
hidden-single: 11
locked-candidate-pointing: 10
two-string-kite: 1
naked-single: 1
locked-candidate-claiming: 1
```

This showed that many valid eliminations would immediately unlock cheap logic, but did not identify a cheap sound proof for those eliminations.

## Negative evidence

The following directions produced zero useful deductions at the exact frontier:

- AIC through maxEdges 15
- Grouped AIC through maxEdges 12
- X-Chain through maxEdges 15
- XY-Chain through maxCells 12
- all 20 binary digit-forcing seeds
- all 59 ternary digit-forcing seeds
- bounded Death Blossom probe
- singles-only contradiction propagation across 8 selected exact-false frontier candidates
- verified non-forcing human-technique propagation across the same 8 assumptions

Therefore H8 confirmed that merely extending ordinary chain depth or seed budgets is not justified.

## Nested forcing discovery

A targeted dynamic/nested probe found one important positive result.

For the exact-false assumption:

```text
r5c8=5
```

Dynamic forcing remained stable, but nested forcing reached contradiction:

```text
status: CONTRADICTION
reason: propagation
directUsed: 30
nestedUsed: 2
workUsed: 2
stepCount: 32
```

This proves that the existing nested forcing mechanism is capable of establishing at least one useful AI Escargot frontier elimination when given the correct seed.

The normal nested finder did not discover it because its candidate seed selection is bivalue-only. AI Escargot has only 2 bivalue cells at the frontier, while the useful seed `r5c8=5` is in a 5-candidate cell.

## Seed injection result

Injecting `{cell:r5c8,digit:5}` into the normal nested-forcing-chain finder produced a sound solver deduction:

```text
r5c8!=5
technique: nested-forcing-chain
result: FORCED_FALSE
first nested use: step 3
```

The solve then progressed to 6 total steps but stalled again.

Conclusion: the production gap is partly seed selection, but a single good injected seed is not enough to solve AI Escargot.

## Heuristic seed ranking result

Three cheap local rankings were audited over all 212 stall candidates.

The known useful seed `r5c8=5` ranked poorly:

```text
arity_then_support: 162
support_then_arity: 53
pressure: 55
```

Therefore the known useful seed must not be hard-coded or promoted through an oracle-like heuristic.

A bounded actionability audit then tested the top 24 candidates under the best cheap `pressure` ranking with the nested forcing motor:

```text
top8:  actionable 0, forcedFalse 0
top16: actionable 0, forcedFalse 0
top24: actionable 0, forcedFalse 0
elapsed: 106675.3 ms
```

This is the stopping point.

The top-24 audit was already computationally expensive and produced zero actionable seeds. Continuing by testing deeper rankings or raising nested budgets would be a poor use of resources and would violate the project's bounded/evidence-driven design principle.

## H8 conclusion

AI Escargot remains a genuine frontier benchmark and is intentionally unsolved by the current Classic Human solver.

H8 learned the following:

1. The existing production-trusted human set is broad and sound enough to reach a very hard stable frontier.
2. Ordinary deeper chains, complex fish, APE, Death Blossom, and full binary/ternary digit forcing do not explain the frontier.
3. The nested forcing engine can prove at least one exact frontier elimination when seeded directly outside its bivalue-only seed policy.
4. Cheap local ranking does not surface that useful seed early enough.
5. A practical general seed-selection rule has not been established.
6. Further brute-force-style seed enumeration is explicitly not recommended.

## Policy going forward

- Keep AI Escargot as an external hardness/frontier benchmark.
- A `STALLED` result on AI Escargot is acceptable and documented.
- Do not weaken soundness or determinism to solve this single puzzle.
- Do not increase nested/forcing budgets without new independent evidence.
- Do not rewire APE; it remains `IMPLEMENTED_UNWIRED`, `NEEDS_FIX`, `productionTrusted:false`.
- Preserve the H8 diagnostic scripts as research evidence, but do not put the expensive top-seed actionability audit in routine canonical validation.
- Resume product/research work elsewhere rather than pursuing this benchmark further.

## Practical interpretation

The solver has reached the point where solving one famous extreme puzzle would require disproportionately expensive search or a yet-unproven general seed-selection method. The project has already extracted the useful engineering lesson: keep the human solver bounded, sound, deterministic, and honest about where it stalls.
