# Heyawake Expert Playability Closure

Status: CLOSED
Date: 2026-09-15
Branch: `feature/classic-1to9-difficulty`
Canonical seed: `98001`
Canonical board: `6x6`

## Baseline finding

The production Expert path began uniqueness certification with a fixed 74% starter fraction. On the canonical seed this produced 27 cell-state starters plus four room-number clues, for 31 visible clue atoms.

An exact first-removal audit found 21 of the 27 starters individually removable while uniqueness remained true. The configured starter fraction was therefore an artificial stop rather than a local uniqueness frontier.

## Production contract

The existing seeded room/mask construction and candidate score are unchanged. After the Expert source candidate has been selected, production applies one deterministic seeded removal pass over both removable visible channels:

- cell-state starters;
- room-number clues.

There is no final clue floor, target clue count, timeout, or heuristic eligibility cutoff. A removal is accepted only when the existing exact Heyawake counter still returns exactly one solution. Because removing clues only enlarges the solution set, every rejected atom remains non-removable after subsequent accepted removals.

Gentle and Focused bypass this carve path and retain byte-identical canonical output. The renderer also omits an absent optional room clue instead of displaying a `null` label.

## Canonical host-realm evidence

Seed `98001`, 6x6 Expert:

- source clue atoms: 31;
- final starters: 11;
- final room clues: 4;
- final total clue atoms: 15;
- accepted removals: 16;
- rejected removals: 15;
- production generation: 56.5 ms;
- exact final solution count: 1;
- final exact verification: 4.8 ms;
- clue-free topology solutions: 2 (capped);
- clue-essential: PASS;
- independent closure checks: 15;
- remaining individually removable clues: 0;
- closure recheck total: 24.7 ms;
- slowest closure check: 4.9 ms;
- local irreducibility: PASS.

## Metadata

- `verification=solver-verified-local-irreducible`
- `policy=contract-driven-local-irreducibility`
- `localIrreducibilityProof=monotone-nonuniqueness-from-single-pass`

## Scope

This proves deterministic local irreducibility under the production-visible Heyawake clue contract for the canonical seed. It does not claim that 15 clue atoms is a global mathematical minimum across all room topologies, solutions, board sizes, or seeds.
