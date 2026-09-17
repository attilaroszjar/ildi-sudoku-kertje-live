const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const Runtime=require('../games/classic-human-runtime-generator.js');

function classic(){return {id:'classic',title:'Classic Sudoku',family:'Core',rule:'Classic',kind:'classic',data:{},puzzle:[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],solution:[[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],[8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],[9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]]};}

function loadGenerator(){
  const p=require.resolve('../games/sudoku-generator.js');
  delete require.cache[p];
  delete global.SudokuGenerator;
  delete global.ClassicHumanRuntimeLastGeneration;
  require(p);
  return global.SudokuGenerator;
}

test('Classic runtime publishes bounded human challenge metadata for the UI',()=>{
  const generator=loadGenerator();
  Runtime.install(generator);
  const out=generator.make(classic(),73123,'expert');
  const meta=global.ClassicHumanRuntimeLastGeneration;
  assert.ok(meta);
  assert.equal(meta.source,'classic-human-runtime-generator');
  assert.equal(meta.runtimeProfile,out.generation.runtimeProfile);
  assert.equal(meta.requestedHumanBand,'expert');
  assert.equal(meta.measuredHumanBand,out.generation.measuredHumanBand);
  assert.equal(meta.humanScore,out.generation.humanScore);
  assert.equal(meta.humanLevel,out.generation.humanLevel);
  if(meta.humanStatus==='SOLVED_LOGICALLY')assert.ok(Number.isInteger(meta.humanLevel)&&meta.humanLevel>=1&&meta.humanLevel<=9);
  else assert.equal(meta.humanLevel,null);
  assert.equal(meta.humanStatus,out.generation.humanStatus);
  assert.equal(meta.bounded,true);
  assert.equal(meta.seed,73123);
  assert.ok(Object.isFrozen(meta));
});

test('non-Classic generation does not overwrite the last Classic challenge metadata',()=>{
  delete global.ClassicHumanRuntimeLastGeneration;
  let calls=0;
  const generator={make(v,s,d){calls++;return {id:v.id,seed:s,difficulty:d};}};
  Runtime.install(generator);
  const marker=Object.freeze({source:'classic-human-runtime-generator',humanStatus:'STALLED',humanScore:null,humanLevel:null,bounded:true});
  global.ClassicHumanRuntimeLastGeneration=marker;
  const out=generator.make({id:'diagonal'},9,'focused');
  assert.deepEqual(out,{id:'diagonal',seed:9,difficulty:'focused'});
  assert.equal(calls,1);
  assert.equal(global.ClassicHumanRuntimeLastGeneration,marker);
});

test('standalone app exposes calibrated difficulty persistently in the inspector',()=>{
  const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
  assert.match(app,/humanStatus==='STALLED'/);
  assert.match(app,/humanStatus==='SOLVED_LOGICALLY'/);
  assert.match(app,/Number\.isInteger\(g\.humanLevel\)/);
  assert.match(app,/classic-difficulty-row/);
  assert.match(app,/classic-difficulty-label/);
  assert.match(app,/classic-difficulty-value/);
  assert.match(app,/statusBox\.prepend\(refs\['classic-difficulty-row'\]\)/);
  assert.match(app,/classicDifficulty:'Nehézség'/);
  assert.match(app,/String\(info\.level\)\+'\/9'/);
  assert.match(app,/9\/9 · 🔥 Brutál/);
  assert.match(app,/9\/9 · 🔥 Brutal/);
  assert.match(app,/⚠ Extra kemény/);
  assert.doesNotMatch(app,/humanScore>=240/);
  assert.match(app,/Gratulálok, Ildi!/);
  assert.match(app,/completion-message/);
  assert.match(app,/complete:finishSolve,solved:finishSolve/);
});
