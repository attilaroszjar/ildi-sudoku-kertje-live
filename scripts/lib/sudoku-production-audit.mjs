function assertGrid(grid){
  if(!Array.isArray(grid)||grid.length!==9||grid.some(row=>!Array.isArray(row)||row.length!==9))throw new Error('expected 9x9 grid');
}

export function normalizeSymbols(grid){
  assertGrid(grid);
  const symbols=new Map();let next=1;
  return grid.map(row=>row.map(value=>{
    if(!symbols.has(value))symbols.set(value,next++);
    return symbols.get(value);
  }));
}

export function rotateGrid(grid){
  assertGrid(grid);const n=grid.length;
  return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>grid[n-1-c][r]));
}

export function reflectGrid(grid){
  assertGrid(grid);return grid.map(row=>row.slice().reverse());
}

export function structuralSolutionFingerprint(grid){
  assertGrid(grid);
  const forms=[];let current=grid.map(row=>row.slice());
  for(let rotation=0;rotation<4;rotation++){
    for(const form of [current,reflectGrid(current)])forms.push(normalizeSymbols(form).flat().join(''));
    current=rotateGrid(current);
  }
  forms.sort();
  return forms[0];
}

export function canonicalJson(value){
  if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalJson(value[key])).join(',')+'}';
  return JSON.stringify(value);
}

export function summarizeProductionSamples(samples,{expectedSamples,requireTopology=false,maxSampleMs=null}={}){
  if(!Array.isArray(samples))throw new Error('samples must be an array');
  const expected=expectedSamples??samples.length;
  const passes=samples.filter(row=>row&&row.status==='PASS');
  const failures=[];
  const unique=field=>new Set(passes.map(row=>row[field]).filter(value=>value!==undefined&&value!==null&&value!=='')).size;
  const summary={
    samples:samples.length,
    passes:passes.length,
    timeouts:samples.filter(row=>row&&row.status==='TIMEOUT').length,
    failures:samples.filter(row=>!row||!['PASS','TIMEOUT'].includes(row.status)).length,
    solutionUnique:unique('solution'),
    structuralSolutionUnique:unique('structure'),
    topologyUnique:unique('topology'),
    puzzleUnique:unique('puzzle'),
    maxMs:passes.length?Math.max(...passes.map(row=>Number(row.ms)||0)):null
  };
  if(summary.samples!==expected)failures.push(`samples=${summary.samples}/${expected}`);
  if(summary.passes!==expected)failures.push(`passes=${summary.passes}/${expected}`);
  if(summary.timeouts)failures.push(`timeouts=${summary.timeouts}`);
  if(summary.failures)failures.push(`failures=${summary.failures}`);
  if(summary.solutionUnique!==expected)failures.push(`solutionUnique=${summary.solutionUnique}/${expected}`);
  if(summary.structuralSolutionUnique!==expected)failures.push(`structuralSolutionUnique=${summary.structuralSolutionUnique}/${expected}`);
  if(summary.puzzleUnique!==expected)failures.push(`puzzleUnique=${summary.puzzleUnique}/${expected}`);
  if(requireTopology&&summary.topologyUnique!==expected)failures.push(`topologyUnique=${summary.topologyUnique}/${expected}`);
  if(maxSampleMs!==null&&passes.some(row=>(Number(row.ms)||0)>maxSampleMs))failures.push(`runtime>${maxSampleMs}ms`);
  return {pass:failures.length===0,summary,failures};
}
