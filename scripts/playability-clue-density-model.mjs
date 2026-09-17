export const DENSITY_WARNING_CEILINGS=Object.freeze({gentle:0.55,focused:0.45,expert:0.35});

export function normalizeDifficulty(value){
  const raw=String(value||'').trim().toLowerCase();
  if(['gentle','easy','könnyű','konnyu'].includes(raw))return 'gentle';
  if(['focused','medium','közepes','kozepes'].includes(raw))return 'focused';
  if(['expert','hard','brutal','brutál','brutal9','nehéz','nehez'].includes(raw))return 'expert';
  return raw||'focused';
}

export function gridGivenMetrics(puzzle){
  if(!Array.isArray(puzzle)||!puzzle.length)throw new Error('puzzle must be a non-empty grid');
  const rows=puzzle.length;
  const cols=Array.isArray(puzzle[0])?puzzle[0].length:0;
  if(!cols||puzzle.some(row=>!Array.isArray(row)||row.length!==cols))throw new Error('puzzle must be rectangular');
  let filled=0;
  for(const row of puzzle)for(const value of row)if(value!==0&&value!==null&&value!==undefined&&value!=='')filled++;
  const total=rows*cols;
  return {rows,cols,total,filled,empty:total-filled,density:filled/total};
}

export function densityWarningCeiling(difficulty){
  const normalized=normalizeDifficulty(difficulty);
  return DENSITY_WARNING_CEILINGS[normalized]??DENSITY_WARNING_CEILINGS.focused;
}

export function classifyGridDensity(puzzle,difficulty){
  const metrics=gridGivenMetrics(puzzle);
  const normalizedDifficulty=normalizeDifficulty(difficulty);
  const warningCeiling=densityWarningCeiling(normalizedDifficulty);
  return {...metrics,difficulty:normalizedDifficulty,warningCeiling,denseWarning:metrics.density>warningCeiling};
}

export function summarizeDensity(rows){
  const measured=rows.filter(row=>Number.isFinite(row.density));
  const denseWarnings=measured.filter(row=>row.denseWarning).length;
  const densities=measured.map(row=>row.density).sort((a,b)=>a-b);
  const median=densities.length?densities[Math.floor((densities.length-1)/2)]:null;
  return {
    measured:measured.length,
    denseWarnings,
    min:densities.length?densities[0]:null,
    median,
    max:densities.length?densities[densities.length-1]:null
  };
}
