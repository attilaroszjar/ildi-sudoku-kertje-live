# Nabner generator production hardening

## Status

Production gate: `PASS`.

Nabner now satisfies the production generator contract: fresh seeded solutions, real topology diversity, exact uniqueness under Nabner rules, real Classic ambiguity / variant necessity, deterministic replay, strict clue-count difficulty separation, and bounded production runtime.

The inventory classification is promoted separately after this measured gate result.

## Production configuration

The production path routes through `LineGeneratorProvenSiblings.makeVariantPilot`.

- gentle: 40 clues, 2 initial Nabner lines;
- focused: 32 clues, 2 initial Nabner lines;
- expert: 30 clues, 4 initial Nabner lines;
- Nabner mixes a deterministic difficulty salt into fresh-solution/topology generation;
- expert carving prioritizes cells belonging to Nabner lines while preserving the seeded order inside the two partitions;
- exact variant uniqueness is checked during carving and before acceptance;
- Classic Sudoku must have more than one solution before acceptance;
- if establishing Classic ambiguity temporarily carves below target, givens are restored only while Classic ambiguity remains true;
- the candidate must return exactly to the requested clue target.

Palindrome and Lockout do not inherit the Nabner-specific difficulty seed or expert line-first carve policy.

## Why the final runtime fix is safe

Profiling isolated the remaining expert runtime tail to repeated Nabner variant-solver calls during clue removal, not fresh-solution generation and not Classic ambiguity checks.

For the worst measured seed, an off-line-first carve was faster but failed the mandatory variant-essential contract because the resulting puzzle remained Classic-unique. It was rejected.

A line-first carve preserved exact variant uniqueness and Classic ambiguity for the measured slow seeds while substantially reducing their runtime. The policy was therefore enabled only for Nabner expert and then validated by the complete production gate rather than promoted from the micro-benchmark alone.

## Final production gate

Command:

```bash
node scripts/nabner-generator-production-audit.mjs
```

Final 192-sample result (64 seeds per difficulty):

- solution diversity: 192/192
- structural solution diversity: 192/192
- topology diversity: 192/192
- puzzle diversity: 192/192
- valid: 192/192
- exact unique: 192/192
- variant essential: 192/192
- deterministic: 192/192
- failures: 0
- gentle clues: exactly 40
- focused clues: exactly 32
- expert clues: exactly 30
- gentle runtime p50/p95/max: 78.2 / 195.0 / 377.6 ms
- focused runtime p50/p95/max: 105.0 / 225.4 / 556.0 ms
- expert runtime p50/p95/max: 171.6 / 294.0 / 869.9 ms
- correctness: PASS
- diversity: PASS
- runtime: PASS
- difficulty ordering: PASS
- `NABNER_PRODUCTION_GATE:PASS`

The runtime gate remains unchanged: p95 must be below 500 ms and max below 1000 ms for every difficulty. No threshold was relaxed to obtain the pass.

## Production conclusion

Nabner is eligible for `PRODUCTION_QUALITY` inventory status. Its special rule is demonstrably necessary for every audited sample, and the production generator no longer depends on permutations of one solution/topology family.
