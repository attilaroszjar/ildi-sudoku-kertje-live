import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Contracts = require('../../../games/classic-human/contracts.js');
const Human = require('../../../games/classic-human/index.js');

function bitCount(value) {
  return Contracts.bitCount(value);
}

function unresolvedStats(state) {
  let unresolved = 0;
  let bivalue = 0;
  let trivalue = 0;
  let fourPlus = 0;
  for (let cell = 0; cell < 81; cell += 1) {
    const [row, col] = Contracts.rowCol(cell);
    if (state.grid[row][col]) continue;
    unresolved += 1;
    const count = bitCount(state.masks[cell]);
    if (count === 2) bivalue += 1;
    else if (count === 3) trivalue += 1;
    else if (count >= 4) fourPlus += 1;
  }
  return Object.freeze({ unresolved, bivalue, trivalue, fourPlus });
}

function finderOptions(profile) {
  return {
    maxSteps: profile.maxSteps,
    allowUniqueness: profile.allowUniqueness,
    allowServerPreferred: profile.allowServerPreferred,
    allowServerOnly: profile.allowServerOnly,
    finderOptions: profile.finderOptions || {},
  };
}

function isCandidateState(state) {
  return !!state
    && Array.isArray(state.grid)
    && state.grid.length === 9
    && state.grid.every((row) => Array.isArray(row) && row.length === 9)
    && state.masks != null
    && typeof state.masks.length === 'number'
    && state.masks.length === 81
    && typeof state.apply === 'function'
    && typeof state.cloneGrid === 'function'
    && typeof state.valid === 'boolean';
}

export function censusGoldenStall(state, profile) {
  if (!isCandidateState(state)) {
    throw new TypeError('censusGoldenStall requires a ClassicHumanState-compatible candidate state');
  }
  const options = finderOptions(profile);
  const eligible = Human.eligibleFinders(options);
  const counts = {};
  const errors = {};
  const zero = [];
  const nonzero = {};

  for (const item of eligible) {
    const id = item.entry.id;
    try {
      const found = item.entry.fn(state, Human.optionsForFinder(options, id));
      const count = Array.isArray(found) ? found.length : 0;
      counts[id] = count;
      if (count > 0) nonzero[id] = count;
      else zero.push(id);
    } catch (error) {
      errors[id] = error instanceof Error ? error.message : String(error);
    }
  }

  return Object.freeze({
    eligibleFinders: eligible.length,
    state: unresolvedStats(state),
    nonzero: Object.freeze(nonzero),
    zero: Object.freeze(zero),
    errors: Object.freeze(errors),
    counts: Object.freeze(counts),
  });
}
