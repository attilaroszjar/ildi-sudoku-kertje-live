# Sudoku variant generator quality status

Canonical generator-quality ledger. Update this file in the same slice whenever generator, solver, audit, runtime, difficulty or release status changes.

## Completion contract

Category A / COMPLETE requires direct evidence for:

- valid completed solution under exact variant rules;
- exact unique under variant rules;
- Classic ambiguous (`variantEssential`): variant solutions == 1 AND Classic solutions > 1;
- deterministic replay;
- no best-effort fallback; bounded failure => `GENERATION_EXHAUSTED`;
- completed-solution diversity;
- symbol + D4-normalized structural solution diversity;
- constraint/topology diversity where applicable;
- ordered difficulty contract;
- bounded production runtime;
- production wiring;
- targeted regression + bounded quality audit;
- standalone build + release gate.

Human 1-9 rating stays deferred until Category A.

## Completed / Category A

| Variant | Direct evidence | Release |
|---|---|---|
| Diagonal | Fresh seeded MRV solution; 32x3 exact/essential/structural/difficulty/runtime audit | PASS |
| Hyper | Fresh seeded MRV solution; 32x3 exact/essential/structural/difficulty/runtime audit | PASS |
| Disjoint Groups | Fresh seeded MRV solution; 32x3 exact/essential/structural/difficulty/runtime audit | PASS |
| Kropki | Fresh solution + regenerated relation topology; 96/96 exact/essential; 32/32 structural/topology diversity | PASS |
| XV | Fresh solution + regenerated X/V topology; 96/96 exact/essential; 32/32 structural/topology diversity | PASS |
| Consecutive | Fresh solution + regenerated relation topology; 96/96 exact/essential; 32/32 structural/topology diversity | PASS |
| Greater Than | Fresh solution + 24-32 seeded inequalities; 96/96 exact/essential; 32/32 structural/topology; difficulty 42 < 58 < 143 | PASS |
| Odd / Even | Fresh solution + 24-32 seeded parity marks; 96/96 exact/essential; 32/32 structural/topology; difficulty 42 < 50 < 65 | artifact `2ca140c` |
| Whispers | `line-whispers-fresh-fill-mrv`; 96/96; structuralSolution 32/32; structuralTopology 31/32; difficulty 59 < 64.5 < 183; p95 147.1 / 154.1 / 447.7 ms | artifact `fe7b0bf` |
| Renban | `line-renban-fresh-fill-mrv`; 96/96; structuralSolution 32/32; structuralTopology 32/32; difficulty 64.5 < 85 < 195.5; p95 327.5 / 352.7 / 947.6 ms | artifact `f980d06` |
| Between | `line-between-fresh-fill-mrv`; 96/96; structuralSolution 32/32; structuralTopology 32/32; difficulty 58.5 < 95 < 446; p95 786.8 / 582.6 / 948.9 ms | artifact `8361051` |
| Zipper | `line-zipper-fresh-fill-mrv`; 96/96; structuralSolution 32/32; structuralTopology 25/32; difficulty 62.5 < 93.5 < 205.5; p95 741.2 / 812.0 / 967.2 ms | artifact `599492f` |
| **Dutch Whispers** | `line-dutch-whispers-fresh-fill-mrv`; pilot 3/3; production 6/6; optimized 32x3 audit 96/96; structuralSolution 32/32; structuralTopology 32/32; difficulty **45 < 57.5 < 185**; p95 **301.7 / 331.0 / 558.1 ms** | **artifact `c81d73d`**, build/release/commit/push RC 0, CLEAN |
| **Parity Line** | `line-parity-fresh-fill-mrv`; pilot 3/3; production 6/6; optimized 32x3 audit 96/96; structuralSolution 32/32; structuralTopology 32/32; difficulty **46 < 50 < 184.5**; p95 **206.6 / 255.6 / 400.8 ms** | **artifact `c81d73d`**, build/release/commit/push RC 0, CLEAN |
| **Nabner** | `line-nabner-fresh-fill-mrv`; final 32x3 audit 96/96; structuralSolution 32/32; structuralTopology 32/32; difficulty **51 < 60.5 < 165.5**; p95 **201.3 / 182.6 / 540.4 ms** | **artifact `b78ef75`**, build/release/commit/push RC 0, CLEAN |
| **Palindrome** | `line-palindrome-fresh-fill-mrv`; final 32x3 audit 96/96; structuralSolution 32/32; structuralTopology 32/32; difficulty **56.5 < 65.5 < 172.5**; p95 **222.2 / 249.5 / 484.3 ms** | **artifact `b78ef75`**, build/release/commit/push RC 0, CLEAN |
| **Lockout** | `line-lockout-fresh-fill-mrv`; production expert = 29 clues + 4 lines; final 32x3 audit 96/96; structuralSolution 32/32; structuralTopology **64/64**; difficulty **64.5 < 114 < 147.5**; p95 **710.8 / 740.4 / 722.3 ms** | **artifact `b78ef75`**, build/release/commit/push RC 0, CLEAN |
| **Entropic** | `line-entropic-sliding-triple-fresh-fill-mrv`; final 32x3 audit 96/96; structuralSolution 32/32; structuralTopology 32/32; difficulty **56.5 < 80 < 242.5**; p95 **440.0 / 426.8 / 985.7 ms** | **artifact `0cef08d`**, targeted 12/12 PASS, build/release/commit/push PASS |
| **Modular** | `line-modular-sliding-triple-fresh-fill-mrv`; final 32x3 audit 96/96; structuralSolution 32/32; structuralTopology 32/32; difficulty **50.5 < 75 < 216.5**; p95 **208.0 / 222.5 / 983.2 ms** | **artifact `0cef08d`**, targeted 12/12 PASS, build/release/commit/push PASS |
| **Thermo** | `line-thermo-directed-fresh-fill-mrv`; final 32x3 audit 96/96; structuralSolution 32/32; structuralTopology 32/32; difficulty **60.5 < 100 < 325.5**; p95 **311.8 / 314.3 / 844.6 ms**; transparent renderer regression 15/15 PASS | **artifact `873a49e`**, release PASS, SHA256 `4bc9c1b613a35e3ca6991048f283a8ec9382113a18003c1afb19ae95eb346847` |
| **Slow Thermo** | `line-slow-thermo-directed-fresh-fill-mrv`; final 32x3 audit 96/96; structuralSolution 32/32; structuralTopology 32/32; difficulty **46 < 51 < 117**; p95 **169.9 / 223.0 / 413.4 ms**; transparent renderer regression 15/15 PASS | **artifact `873a49e`**, release PASS, SHA256 `4bc9c1b613a35e3ca6991048f283a8ec9382113a18003c1afb19ae95eb346847` |
| **Region Sum Line** | `line-region-sum-fresh-fill-mrv`; contiguous-region semantics fixed with A->B->A regression; pilot/runtime 12/12 PASS; Audit A PASS; final 32x3 Audit B PASS with 96/96 exact/essential, 32/32 structuralSolution, 32/32 structuralTopology, ordered difficulty and p95 < 1000 ms; production gate 10/10 PASS | **artifact `873a49e`**, release PASS, SHA256 `4bc9c1b613a35e3ca6991048f283a8ec9382113a18003c1afb19ae95eb346847` |
| **Argyle** | `line-argyle-lattice-fresh-fill-mrv`; exact `uniqueline` runtime semantics; Audit A 8/8 structuralSolution/topology; final 32x3 Audit B 96/96 exact/essential, structuralSolution 32/32, structuralTopology 32/32; difficulty **45.5 < 61 < 199**; p95 **258.0 / 440.6 / 942.1 ms**; production gate 7/7 PASS | **artifact `cbc1921`**, release PASS, SHA256 `b7d8fbf7e333c6a705c7f75aa9e40a0ff0d1fbd7f47147ac304a4a846e9f582d` |
| **Arrow** | `arrow-fresh-fill-mrv-topology`; exact circle=path-sum semantics audited 10/10; Audit A 8/8 exact/essential/replay, structuralSolution 8/8, structuralTopology 8/8, p95 **96.2 ms**; final 32x3 Audit B **96/96**, structuralSolution **32/32**, structuralTopology **32/32**, difficulty **52 < 71.5 < 239.5**, p95 **98.0 / 117.0 / 625.5 ms**; production gate **10/10 PASS** | **artifact `6558681`**, release PASS, SHA256 `f332ebde89e5b5c7244101a2f0fb6f57a308216593687da1e51edfa98d6c5f75` |

## Line-family architecture

Canonical design: `docs/LINE_FAMILY_GENERATOR_ARCHITECTURE.md`.

Proven representative primitives:

1. local transition -> Whispers;
2. whole-line set -> Renban;
3. endpoint/interior -> Between;
4. symmetric pair -> Zipper;
5. sliding triple -> Entropic, Modular;
6. directed transition -> Thermo, Slow Thermo;
7. region-aware segment -> Region Sum Line;
8. macro/template lattice -> Argyle.

Sibling rollout reuses those proven primitives. `games/line-generator-proven-siblings.js` contains the production bounded fresh-solution adapters for Nabner, Palindrome and Lockout. `games/line-generator-sliding-triple.js` contains the shared production bounded fresh-solution primitive for Entropic and Modular. `games/line-generator-directed.js` contains the shared production bounded fresh-solution primitive for Thermo and Slow Thermo. `games/line-generator-region-sum.js` contains the Region Sum contiguous-region topology generator. `games/line-generator-argyle.js` contains the Argyle diagonal lattice/template generator.

All line-family generator primitives are now production-hardened. Human 1-9 remains deferred until the full variant generator-quality program closes.

### Line-family status

| Variant | Current evidence | Next |
|---|---|---|
| Argyle | **COMPLETE / Category A** | Human 1-9 later |
| Between | COMPLETE | Human 1-9 later |
| Dutch Whispers | **COMPLETE / Category A** | Human 1-9 later |
| Entropic | **COMPLETE / Category A** | Human 1-9 later |
| Lockout | **COMPLETE / Category A** | Human 1-9 later |
| Modular | **COMPLETE / Category A** | Human 1-9 later |
| Nabner | **COMPLETE / Category A** | Human 1-9 later |
| Palindrome | **COMPLETE / Category A** | Human 1-9 later |
| Parity Line | **COMPLETE / Category A** | Human 1-9 later |
| Region Sum Line | **COMPLETE / Category A** | Human 1-9 later |
| Renban | COMPLETE | Human 1-9 later |
| Slow Thermo | **COMPLETE / Category A** | Human 1-9 later |
| Thermo | **COMPLETE / Category A** | Human 1-9 later |
| Whispers | COMPLETE | Human 1-9 later |
| Zipper | COMPLETE | Human 1-9 later |

## Lockout runtime optimization

The Lockout issue was isolated to a long-tail expert variant-solver search defect, not fresh-solution generation, semantics, uniqueness, essentiality or topology diversity. The established `p95 < 1000 ms` threshold remained unchanged throughout.

Two-line expert topology produced p95 2164.5 ms. Three lines improved a limited targeted sample to 1184.8 ms. Four lines made that limited sample pass at 686.7 ms, but the canonical 32-seed rerun exposed unrepresented slow seeds and regressed to expert p95 3665.2 ms.

The canonical 32-seed expert tail diagnostic proved the dominant outliers were solver-search explosions rather than solution generation: seed 83 took 5026.3 ms with difficulty score 11016 and solutionNodes 82; seed 197 took 3575.4 ms with score 5611 and solutionNodes 99. The next slowest seed was only ~841 ms. All outputs had 27 clues and four Lockout lines.

The smallest Lockout-specific intervention was then validated on all canonical 32 expert seeds: retain the four-line topology but stop carving at **29 clues**. `LOCKOUT_EXPERT_CLUE_TARGET_PILOT` passed with median score 147.5, p95 720.8 ms and max 1194.2 ms. Because median 147.5 remains above the observed focused median 114, expert ordering is preserved while the p95 contract is restored.

`games/line-generator-proven-siblings.js` carries this as explicit Lockout configuration (`initialLinesByDifficulty.expert=4`, `targetsByDifficulty.expert=29`). No fallback was added; all other proven siblings and Lockout gentle/focused keep their existing targets. Production regression at `252d5ca` passed 4/4 and directly verifies the 29-clue/four-line expert route.

The final shared 32x3 bounded audit at `5d19f7b` is fully green: Lockout exact/essential/replay/diversity/difficulty all pass with p95 710.8 / 740.4 / 722.3 ms, alongside green Nabner and Palindrome audits. Standalone/release artifact `b78ef75` completed with build/release/commit/push RC 0 and CLEAN status, so all three are now Category A.

## Deferred Ildi feedback

Pre-current-development visual/rules/difficulty observations are tracked in `docs/ILDI_FEEDBACK_BACKLOG.md`. Do not interrupt generator hardening for them; revisit in the post-generator UX/rules/difficulty cleanup milestone.

## Other HIGH-priority families

Arrow is **COMPLETE / Category A**. Killer -> build fresh cage primitive. Combined Killer variants wait until Killer is Category A; Arrow can then be reused as an already-proven contributing primitive.

Jigsaw remains separate: irregular regions replace standard boxes; do not force into extra-house core.

Outside/visibility and Skyscraper families remain pending; Skyscraper requires explicit structural-diversity audit because digit permutation is not genuine diversity.

Legacy iteration hardenings and seven LOW inventory entries remain unresolved and must receive direct evidence rows before the generator-quality program closes.

## Work order

1. **Killer fresh cage primitive.**
2. Combined Killer variants after Killer is Category A.
3. Legacy audit, Jigsaw, outside/visibility, Skyscraper, LOW inventory.
4. Only then variant human 1-9.

## Recent evidence

- Arrow semantic/runtime + production targeted gate: 10/10 PASS.
- Arrow Audit A: 8/8 exact/essential/replayable; structuralSolution 8/8; structuralTopology 8/8; p95 96.2 ms.
- Arrow final 32x3 Audit B: 96/96 exact/essential; structuralSolution 32/32; structuralTopology 32/32; difficulty 52 < 71.5 < 239.5; p95 98.0 / 117.0 / 625.5 ms.
- Arrow production artifact `6558681`; release PASS; SHA256 `f332ebde89e5b5c7244101a2f0fb6f57a308216593687da1e51edfa98d6c5f75`.
- Argyle production artifact `cbc1921`; release PASS; SHA256 `b7d8fbf7e333c6a705c7f75aa9e40a0ff0d1fbd7f47147ac304a4a846e9f582d`.
- Thermo + Slow Thermo + Region Sum release: artifact `873a49e`; release PASS; SHA256 `4bc9c1b613a35e3ca6991048f283a8ec9382113a18003c1afb19ae95eb346847`.

## Canonical next step

Start **Killer fresh cage primitive**. Audit current Killer cage semantics, exact solver behavior and renderer first; then implement a bounded fresh-solution cage-topology generator. Combined Killer variants remain blocked until Killer itself is Category A.
