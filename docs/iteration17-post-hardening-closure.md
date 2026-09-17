# Iteration 17 post-hardening closure

## Scope

- Product Skyscrapers Sudoku
- Killer Skyscrapers Sudoku

## Dedicated audit

- `tests/iteration17-post-hardening.test.js`
- `tests/sudoku-iteration17.test.js`
- targeted result: 9/9 PASS

## Proven properties

### Product Skyscrapers Sudoku

- outside clues equal the product of all visible building heights;
- deterministic generation for equal seed/difficulty;
- seed-diverse generated clue layouts;
- solver-certified variant uniqueness;
- classic Sudoku ambiguity proves variant-essentiality;
- clue-ordered gentle/focused/expert difficulty;
- measured product-skyscraper-aware MRV/backtracking search evidence via `searchStats` and `difficultyScore`;
- runtime enforcement and product clue rendering are wired.

### Killer Skyscrapers Sudoku

- all skyscraper visibility clues are exact;
- every Killer cage has the required sum and no repeated digit;
- deterministic, seed-diverse generation;
- solver-certified uniqueness under the combined Killer + Skyscraper rule system;
- classic Sudoku ambiguity proves variant-essentiality;
- clue-ordered difficulty;
- measured combined cage + visibility MRV/backtracking search evidence via `searchStats` and `difficultyScore`;
- runtime cage and skyscraper enforcement/rendering are wired.

## Full regression closure

Production loader: `games/iteration17-generator-hardening.js`

Full suite after production integration:

- tests: 500
- pass: 500
- fail: 0

Release gate:

- RELEASE GATE: PASS
- catalogue: 106
- external runtime dependencies: 0
- standalone SHA-256: `1ccbd8f8346f4e9fcd7aa0045faaaa07f5ca96a1f171b2e600fbcdb281dc08fd`

## Verdict

Both Iteration 17 games are accepted as **10/10 post-hardening**.
