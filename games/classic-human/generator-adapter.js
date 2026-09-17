(function(root){'use strict';
  var PROFILE='classic-runtime-v1';
  function classicVariant(){
    return {id:'classic-pool',title:'Classic Sudoku',family:'Core',kind:'classic',data:{},puzzle:[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],solution:[[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],[8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],[9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]]};
  }
  function resolveGenerator(){
    if(root.SudokuGenerator&&typeof root.SudokuGenerator.make==='function')return root.SudokuGenerator;
    if(typeof require==='function'){
      require('../sudoku-generator.js');
      if(root.SudokuGenerator&&typeof root.SudokuGenerator.make==='function')return root.SudokuGenerator;
    }
    throw new Error('SudokuGenerator.make unavailable');
  }
  function gridString(grid){var out='';for(var r=0;r<9;r++)for(var c=0;c<9;c++)out+=String(grid[r][c]||0);return out;}
  function makeCandidate(seed,targetBand){
    if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('seed must be a non-negative safe integer');
    if(['gentle','focused','expert'].indexOf(targetBand)<0)throw new RangeError('targetBand invalid');
    var generated=resolveGenerator().make(classicVariant(),seed,targetBand);
    if(!generated||!generated.generation||generated.generation.unique!==true||generated.generation.verification!=='solver-verified')throw new Error('runtime generator did not produce solver-verified unique classic puzzle');
    return {puzzle:gridString(generated.puzzle),targetBand:targetBand,generatorProfile:PROFILE,seed:seed,runtimeDifficultyScore:generated.generation.difficultyScore,generatorFamily:generated.generation.generatorFamily};
  }
  var api={PROFILE:PROFILE,classicVariant:classicVariant,makeCandidate:makeCandidate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanGeneratorAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this);
