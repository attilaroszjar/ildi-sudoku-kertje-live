const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const C=require('../games/classic-human/contracts.js');
const Guided=require('../games/classic-human/runtime-guided-generator.js');
const Runtime=require('../games/classic-human-runtime-generator.js');

function classic(){return {id:'classic',title:'Classic Sudoku',family:'Core',rule:'Classic',kind:'classic',data:{},puzzle:[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],solution:[[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],[8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],[9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]]};}
function puzzleString(grid){return grid.flat().join('');}
function loadGenerator(){const p=require.resolve('../games/sudoku-generator.js');delete require.cache[p];delete global.SudokuGenerator;require(p);assert.ok(global.SudokuGenerator);return global.SudokuGenerator;}

test('runtime Classic generator is deterministic, unique and bounded',()=>{
  const generator=loadGenerator();Runtime.install(generator);
  for(const band of ['gentle','focused','expert']){
    const seed=71000+['gentle','focused','expert'].indexOf(band)*100;
    const a=generator.make(classic(),seed,band),b=generator.make(classic(),seed,band);
    assert.deepEqual(a.puzzle,b.puzzle);
    assert.deepEqual(a.solution,b.solution);
    assert.equal(a.generation.source,'classic-human-runtime-generator');
    assert.equal(a.generation.requestedHumanBand,band);
    assert.equal(a.generation.runtimeProfile,band==='expert'?Runtime.expertProfile:Guided.PROFILE);
    assert.equal(a.generation.unique,true);
    assert.equal(a.generation.verification,'solver-verified');
    if(band==='expert'){
      assert.ok(a.generation.baseAttempts<=Runtime.expertBudget.seedAttempts*Runtime.expertBudget.baseProfiles.length);
      assert.ok(a.generation.removalAttempts<=Runtime.expertBudget.seedAttempts*Runtime.expertBudget.baseProfiles.length*Runtime.expertBudget.maxDepth*Runtime.expertBudget.beamWidth*Runtime.expertBudget.childLimit);
    }else{
      assert.ok(a.generation.baseAttempts<=Guided.BUDGETS[band].baseAttempts+1);
      assert.ok(a.generation.removalAttempts<=Guided.BUDGETS[band].baseAttempts*Guided.BUDGETS[band].removals);
    }
    assert.equal(a.generation.fallbackSource,null);
    assert.equal(C.countSolutions(puzzleString(a.puzzle),2),1);
    const ps=puzzleString(a.puzzle),ss=a.solution.flat().join('');for(let i=0;i<81;i++)if(ps[i]!=='0')assert.equal(ps[i],ss[i]);
  }
});

test('focused Classic stays inside semantic levels 3 through 5',()=>{
  const generator=loadGenerator();Runtime.install(generator);const seen=new Set();
  for(let seed=72500;seed<72516;seed++){
    const out=generator.make(classic(),seed,'focused'),key=puzzleString(out.puzzle);
    assert.equal(out.generation.humanStatus,'SOLVED_LOGICALLY');
    assert.ok(out.generation.humanLevel>=3&&out.generation.humanLevel<=5,'seed '+seed+' produced level '+out.generation.humanLevel);
    assert.equal(out.generation.degraded,false);
    assert.equal(out.generation.fallbackSource,null);
    assert.equal(seen.has(key),false,'seed '+seed+' repeated a focused puzzle');
    seen.add(key);
  }
});

test('focused contract is explicit and bounded',()=>{
  assert.deepEqual(Guided.LEVEL_RANGE.focused,[3,5]);
  assert.ok(Guided.BUDGETS.focused.baseAttempts>=4&&Guided.BUDGETS.focused.baseAttempts<=8);
  assert.ok(Guided.BUDGETS.focused.removals>=12&&Guided.BUDGETS.focused.removals<=20);
  assert.ok(Guided.BUDGETS.focused.baseAttempts*Guided.BUDGETS.focused.removals<=120);
});

test('expert Classic never degrades below semantic level 6 and stays varied',()=>{
  const generator=loadGenerator();Runtime.install(generator);const seen=new Set();
  for(let seed=73000;seed<73012;seed++){
    const out=generator.make(classic(),seed,'expert'),key=puzzleString(out.puzzle);
    assert.equal(out.generation.humanStatus,'SOLVED_LOGICALLY');
    assert.ok(out.generation.humanLevel>=6&&out.generation.humanLevel<=8,'seed '+seed+' produced level '+out.generation.humanLevel);
    assert.equal(out.generation.runtimeProfile,Runtime.expertProfile);
    assert.equal(out.generation.fallbackSource,null);
    assert.equal(seen.has(key),false,'seed '+seed+' repeated an expert puzzle');
    seen.add(key);
  }
});

test('expert uses production-style bounded sculpting rather than a fixed fallback',()=>{
  const b=Runtime.expertBudget;
  assert.deepEqual(b.baseProfiles,['expert','focused','gentle']);
  assert.ok(b.seedAttempts>=4&&b.seedAttempts<=8);
  assert.equal(b.maxDepth,2);
  assert.equal(b.beamWidth,2);
  assert.equal(b.childLimit,27);
  assert.ok(b.seedAttempts*b.baseProfiles.length*b.maxDepth*b.beamWidth*b.childLimit<=2600);
});

test('consecutive Classic seeds avoid obvious immediate repetition',()=>{
  const generator=loadGenerator();Runtime.install(generator);const seen=new Set();
  for(let seed=72000;seed<72006;seed++){
    const out=generator.make(classic(),seed,'gentle'),key=puzzleString(out.puzzle);assert.equal(seen.has(key),false);seen.add(key);
  }
});

test('runtime adapter leaves non-Classic generation untouched',()=>{
  let calls=0;const generator={make(v,s,d){calls++;return {id:v.id,seed:s,difficulty:d};}};Runtime.install(generator);
  assert.deepEqual(generator.make({id:'diagonal'},11,'focused'),{id:'diagonal',seed:11,difficulty:'focused'});assert.equal(calls,1);
});

test('browser wiring loads human runtime before final hardening without external pool dependency',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const runtime=html.indexOf('<script src="games/classic-human-runtime-generator.js"></script>');
  const finalHardening=html.indexOf('<script src="games/iteration23-generator-hardening.js"></script>');
  const library=html.indexOf('<script src="games/sudoku-library.js"></script>');
  assert.ok(runtime>=0&&runtime<finalHardening&&finalHardening<library);
  assert.equal(html.includes('<script src="games/classic-human-runtime.js"></script>'),false);
  assert.equal(html.includes('data/classic-human-pools'),false);
  for(const dep of ['contracts.js','runtime-solver.js','runtime-evaluator.js','runtime-guided-generator.js'])assert.ok(html.includes('games/classic-human/'+dep));
});
