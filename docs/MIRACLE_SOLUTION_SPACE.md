# Miracle Sudoku solution-space contract

This note documents why the generic `4/4 structuralSolutionUnique` rule is not applicable to Miracle Sudoku.

## Canonical rule set

Miracle Sudoku in this repository is standard 9x9 Sudoku plus:

- Anti-King;
- Anti-Knight;
- Non-Consecutive orthogonal neighbours.

## Known solution space

Independent public enumerations report exactly **72** fully completed Miracle Sudoku grids. These are all equivalent under the spatial dihedral symmetries of the square together with the rule-preserving cyclic relabellings that occur for Miracle solutions. Relevant public references:

- Sudoku Theory, `Snipes`: https://sudokutheory.com/wiki/index.php?title=Snipes
- Puzzling Stack Exchange, `How many unique miracle sudokus are there?`: https://puzzling.stackexchange.com/questions/98479/how-many-unique-miracle-sudokus-are-there
- Ethan McCarthy, `On Miracle Sudoku`: https://ethmcc.github.io/miracle-sudoku/

Therefore demanding four distinct symbol-normalized D4 structural fingerprints would require structure that does not exist in the mathematical solution space.

## Repository certificate

`scripts/miracle-solution-space-audit.mjs` is the local fail-closed certificate. It must prove all of the following against the repository's own exact variant solver:

1. the empty Miracle grid has exactly **72** completed solutions;
2. 9 cyclic digit shifts x 8 D4 spatial transforms of the canonical solution produce **72 distinct valid grids**;
3. those 72 grids collapse to exactly **1** value under the repository's existing symbol-normalized D4 structural fingerprint.

Together, (1) and (2) establish that the constructed 72 grids exhaust the solution space; (3) establishes that `structuralSolutionUnique=1` is the mathematically correct maximum under the project's current structural fingerprint.

## Production contract

Miracle still requires real output diversity. The production gate therefore requires:

- 4/4 distinct completed solution grids;
- 4/4 distinct puzzles;
- exact uniqueness under the full Miracle rules;
- Classic ambiguity / variant essentiality;
- deterministic replay;
- bounded runtime with no fallback;
- the dedicated Miracle production marker;
- exactly one structural orbit, backed by the separate solution-space certificate.

This is a variant-specific mathematical exception, not a relaxation of the general Category A diversity requirement.
