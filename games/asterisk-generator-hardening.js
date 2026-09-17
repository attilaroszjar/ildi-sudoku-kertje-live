(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.ExtraHouseGeneratorCore)return;
  var generator=root.SudokuGenerator,core=root.ExtraHouseGeneratorCore,baseMake=generator.make;

  function difficultySalt(difficulty){return difficulty==='gentle'?0x47454e54:(difficulty==='expert'?0x45585054:0x464f4355);}

  function buildTopology(seed){
    var random=core.rng(((seed>>>0)^0x41535452)>>>0),rows=Array.from({length:9},function(_,i){return i;}),usedCols={},usedBoxes={},cells=[];
    core.shuffle(rows,random);
    function search(i){
      if(i===rows.length)return true;
      var r=rows[i],cols=Array.from({length:9},function(_,c){return c;});core.shuffle(cols,random);
      for(var j=0;j<cols.length;j++){
        var c=cols[j],box=Math.floor(r/3)*3+Math.floor(c/3);if(usedCols[c]||usedBoxes[box])continue;
        usedCols[c]=1;usedBoxes[box]=1;cells.push([r,c]);
        if(search(i+1))return true;
        cells.pop();delete usedCols[c];delete usedBoxes[box];
      }
      return false;
    }
    if(!search(0))throw new Error('Asterisk topology generation exhausted');
    cells.sort(function(a,b){return a[0]-b[0]||a[1]-b[1];});return cells;
  }

  function restoreToTarget(grid,solution,target){
    var order=Array.from({length:81},function(_,i){return i;}),clues=grid.flat().filter(Boolean).length;
    for(var i=order.length-1;i>=0&&clues<target;i--){
      var idx=order[i],r=Math.floor(idx/9),c=idx%9;if(grid[r][c])continue;
      grid[r][c]=solution[r][c];
      if(generator.countSolutions(grid,2)===1)grid[r][c]=0;else clues++;
    }
    return clues===target;
  }

  function makeAsterisk(variant,seed,difficulty){
    difficulty=difficulty||'focused';
    var mixedSeed=((seed>>>0)^difficultySalt(difficulty))>>>0,cells=buildTopology(mixedSeed),candidate=JSON.parse(JSON.stringify(variant));
    candidate.data=Object.assign({},candidate.data||{},{cells:cells.map(function(p){return p.slice();})});
    var target=difficulty==='gentle'?40:(difficulty==='expert'?27:32),out=core.makeVariant(generator,candidate,mixedSeed,difficulty,[cells],{
      seedXor:0x41535452,attemptMix:0x9E3779B1,maxAttempts:2,nodeLimit:180000,
      carveSeedXor:0x41535443,label:'Asterisk',generatorFamily:'asterisk-fresh-transversal-extra-house'
    });
    var clues=out.puzzle.flat().filter(Boolean).length;
    if(clues<target&&!restoreToTarget(out.puzzle,out.solution,target))throw new Error('Asterisk exact-target restoration exhausted');
    clues=out.puzzle.flat().filter(Boolean).length;
    if(clues!==target||generator.countSolutions(out.puzzle,2)<=1)throw new Error('Asterisk exact-target variant-essential contract failed');
    out.generation.clues=clues;out.generation.seed=seed>>>0;out.generation.topologyFingerprint=cells.map(function(p){return p[0]+','+p[1];}).join('|');
    out.generation.topologyKind='row-column-box-transversal';return out;
  }

  generator.make=function(variant,seed,difficulty){if(variant&&variant.id==='asterisk')return makeAsterisk(variant,seed,difficulty);return baseMake.call(this,variant,seed,difficulty);};
  root.AsteriskGeneratorHardening={buildTopology:buildTopology,makeAsterisk:makeAsterisk};
})(globalThis);
