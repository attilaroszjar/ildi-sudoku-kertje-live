# Skyscraper Parks 2 expert runtime decision

## Status

The expert playability audit for `skyscraper-parks2` established the following canonical seed-92001 evidence before production closure:

- baseline expert puzzle: 20/64 givens;
- exact variant uniqueness: 1 solution;
- base/non-special solution count: at least 2, therefore the variant is essential;
- all 20 baseline givens were individually removable under the variant contract;
- deterministic expert carve progressed to 6 givens while preserving exact uniqueness at every accepted removal;
- the final observed removal attempt (`step=63`) was rejected with 2 variant solutions;
- no artificial clue floor or timeout was introduced.

Several exact runtime implementations were evaluated for the sparse endgame: cell backtracking with pruning, row-domain search, MRV row-domain search, row+column domains, BigInt domain masks, alternative-witness search, cached domains, prefix tries, and line-pattern CSP/arc-consistency. None produced acceptable production runtime for the full deterministic expert carve on the host runtime.

## Decision

Do **not** keep iterating on synchronous browser-time sparse exact search for Parks2 expert generation.

The production-quality route is an offline/precomputed certified expert corpus (or equivalent build-time generation) with runtime seeded selection/transformation. Runtime must not claim local irreducibility merely from a cutoff, clue floor, timeout, or unverified template.

Each certified corpus entry must store enough evidence to re-audit independently, including at minimum:

- puzzle givens;
- full solution;
- Parks2 outside clues / structural data;
- exact variant uniqueness certificate/result;
- base non-uniqueness / variant-essential result;
- local-irreducibility result under the production contract;
- deterministic provenance (generator/version/seed or canonical source id).

A build-time verifier must re-check the exact production contract for every corpus entry. Runtime selection may be fast, but certification remains exact and reproducible outside the interactive generation path.

## Current development state

The working-tree `games/sudoku-generator.js` contains experimental Parks2 sparse-solver changes from the runtime investigation and must **not** be committed as production code until the chosen corpus/build-time architecture replaces or cleanly supersedes them.

The already committed iteration19 optimization that skips redundant post-generation measurement when exact local-irreducibility certificates are present remains conceptually valid, but it does not solve the core Parks2 sparse-generation runtime blocker.
