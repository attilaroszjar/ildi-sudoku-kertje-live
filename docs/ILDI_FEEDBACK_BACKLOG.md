# Ildi feedback backlog

Deferred user feedback captured during the variant-generator hardening program. These observations predate the current generator-development round and must not interrupt that round; revisit them after the current generator-quality milestone.

## 2026-09-08 — pre-current-development feedback

1. **Hyper / Windoku visual clarity**
   - The shaded Hyper/Windoku regions are not visually clear enough; it is difficult to see exactly which cells belong to the shaded regions.
   - Follow-up: audit region rendering/contrast/boundaries in both light and dark themes and make the four Hyper regions unambiguous without obscuring digits or selection state.

2. **Thermo Sudoku legibility**
   - Digits on/around thermo markings are hard to read because of the line/mark rendering.
   - Follow-up: audit thermo stroke, bulb, layering/z-index, opacity and digit contrast so constraint graphics never hide entered/given digits.

3. **Kropki difficulty**
   - Kropki currently feels too difficult.
   - Follow-up: recalibrate Kropki player-facing difficulty/generator target after variant generators are production-quality; do not infer the final human 1-9 mapping from the current legacy band alone.

4. **XV difficulty**
   - XV currently does not feel very difficult.
   - Follow-up: recalibrate XV player-facing difficulty/generator target after variant generators are production-quality.

5. **Rossini rule explanation / rendering**
   - Current Rossini explanation is not good enough.
   - A required `V`/direction marker appears to be missing or in the wrong place in the rendered puzzle.
   - Follow-up: audit canonical Rossini semantics, Hungarian/English rule copy, clue orientation/placement and renderer/runtime agreement. Add a targeted visual/semantic regression before declaring fixed.

## Scheduling

Do not interrupt the active line-family generator hardening for these items. Keep them as explicit deferred work and include them in the next post-generator UX/rules/difficulty cleanup milestone.
