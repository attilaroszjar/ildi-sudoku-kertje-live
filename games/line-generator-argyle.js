(function(root){
  'use strict';
  if(!root.LineGeneratorCore||!root.ArgyleRuntimeHardening||root.LineGeneratorArgyle)return;
  var core=root.LineGeneratorCore,EXHAUSTED=core.EXHAUSTED;

  function key(p){return p[0]+','+p[1];}
  function lineKey(line){var a=line.map(key).join(';'),b=line.slice().reverse().map(key).join(';');return a<b?a:b;}
  function values(solution,line){return line.map(function(p){return solution[p[0]][p[1]];});}
  function uniqueOnSolution(solution,line){var vals=values(solution,line);return new Set(vals).size===vals.length;}
  function slope(line){if(line.length<2)return 0;return (line[1][1]-line[0][1])>0?1:-1;}
  function diagonalPool(solution,options){
    options=options||{};var minLength=options.minLength||4,maxLength=options.maxLength||8,out=[],seen={};
    function add(line){if(line.length<minLength||line.length>maxLength)return;if(!uniqueOnSolution(solution,line))return;var k=lineKey(line);if(seen[k])return;seen[k]=1;out.push(line.map(function(p){return p.slice();}));}
    function walk(r,c,dr,dc){var line=[];while(r>=0&&r<9&&c>=0&&c<9){line.push([r,c]);r+=dr;c+=dc;}return line;}
    function addWindows(full){
      var hi=Math.min(maxLength,full.length);
      for(var len=minLength;len<=hi;len++)for(var start=0;start+len<=full.length;start++)add(full.slice(start,start+len));
    }
    for(var c=0;c<9;c++)addWindows(walk(0,c,1,1));
    for(var r=1;r<9;r++)addWindows(walk(r,0,1,1));
    for(c=0;c<9;c++)addWindows(walk(0,c,1,-1));
    for(r=1;r<9;r++)addWindows(walk(r,8,1,-1));
    return out;
  }
  function intersectionCount(lines){var count=0;for(var i=0;i<lines.length;i++)for(var j=i+1;j<lines.length;j++){var set={};for(var a=0;a<lines[i].length;a++)set[key(lines[i][a])]=1;for(var b=0;b<lines[j].length;b++)if(set[key(lines[j][b])]){count++;break;}}return count;}
  function chooseLattice(solution,seed,options){
    options=options||{};var pool=diagonalPool(solution,options),random=core.rng(((seed>>>0)^0x41524759)>>>0),target=options.lineCount||8,minEach=options.minEachSlope||3;
    core.shuffle(pool,random);var plus=pool.filter(function(l){return slope(l)>0;}),minus=pool.filter(function(l){return slope(l)<0;});core.shuffle(plus,random);core.shuffle(minus,random);
    if(plus.length<minEach||minus.length<minEach)throw new Error(EXHAUSTED+': Argyle lattice pool');
    var chosen=[],remainingPlus=plus.slice(),remainingMinus=minus.slice();
    function overlaps(line,existing){var set={};for(var i=0;i<line.length;i++)set[key(line[i])]=1;for(var j=0;j<existing.length;j++)for(var k=0;k<existing[j].length;k++)if(set[key(existing[j][k])])return true;return false;}
    function takeFrom(pool,preferCrossing){
      for(var i=0;i<pool.length;i++)if(!preferCrossing||!chosen.length||overlaps(pool[i],chosen)){var line=pool.splice(i,1)[0];chosen.push(line);return true;}
      if(preferCrossing)return takeFrom(pool,false);return false;
    }
    while(chosen.length<target&&(remainingPlus.length||remainingMinus.length)){
      var takePlus=chosen.length%2===0;
      if(takePlus){if(!takeFrom(remainingPlus,true))takeFrom(remainingMinus,true);}else{if(!takeFrom(remainingMinus,true))takeFrom(remainingPlus,true);}
    }
    if(chosen.length<Math.min(target,minEach*2))throw new Error(EXHAUSTED+': Argyle lattice size');
    var pos=chosen.filter(function(l){return slope(l)>0;}).length,neg=chosen.length-pos;
    if(pos<minEach||neg<minEach||intersectionCount(chosen)<Math.max(3,chosen.length-2))throw new Error(EXHAUSTED+': Argyle lattice crossings');
    return chosen;
  }
  function carve(generator,candidate,solution,seed,target){
    var grid=core.cloneGrid(solution),order=Array.from({length:81},function(_,i){return i;}),random=core.rng((seed^0x41524356)>>>0),clues=81;core.shuffle(order,random);
    for(var oi=0;oi<order.length&&clues>target;oi++){
      var idx=order[oi],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;
      if(generator.countVariantSolutions(grid,candidate,2)!==1)grid[r][c]=old;else clues--;
    }
    var essential=generator.countSolutions(grid,2)>1;
    if(!essential)for(oi=0;oi<order.length&&!essential;oi++){
      idx=order[oi];r=Math.floor(idx/9);c=idx%9;old=grid[r][c];if(!old)continue;grid[r][c]=0;
      if(generator.countVariantSolutions(grid,candidate,2)!==1)grid[r][c]=old;else{clues--;essential=generator.countSolutions(grid,2)>1;}
    }
    if(!essential)return null;var stats={};if(generator.countVariantSolutions(grid,candidate,2,stats)!==1)return null;
    return{grid:grid,clues:clues,stats:stats};
  }
  function makeVariantPilot(generator,variant,seed,difficulty,options){
    options=options||{};if(!variant||variant.id!=='argyle')throw new Error('Argyle variant required');
    var targets=options.targets||{gentle:40,focused:32,expert:27},target=targets[difficulty]||targets.focused,maxAttempts=options.maxAttempts||12;
    for(var attempt=0;attempt<maxAttempts;attempt++){
      var attemptSeed=((seed>>>0)^0x41524759^Math.imul(attempt+1,0x9E3779B1))>>>0,fresh=core.freshStandardSolution(attemptSeed,options.solutionOptions),solution=fresh.grid,lines;
      try{lines=chooseLattice(solution,attemptSeed,{minLength:options.minLength||4,maxLength:options.maxLength||8,lineCount:options.lineCount||8,minEachSlope:options.minEachSlope||3});}
      catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)continue;throw error;}
      var candidate=JSON.parse(JSON.stringify(variant));candidate.solution=core.cloneGrid(solution);candidate.data=Object.assign({},candidate.data||{},{lines:lines.map(function(line){return line.map(function(p){return p.slice();});})});
      var carved=carve(generator,candidate,solution,attemptSeed,target);if(!carved)continue;
      candidate.puzzle=carved.grid;candidate.generation={seed:seed>>>0,clues:carved.clues,unique:true,verification:'solver-verified',generatorFamily:'line-argyle-lattice-fresh-fill-mrv',solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:(carved.stats.nodes||0)+(carved.stats.branches||0)*3+(carved.stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,topologyFingerprint:core.topologyFingerprint(lines,{directed:false}),lineCount:lines.length,pilot:true};
      return candidate;
    }
    throw new Error(EXHAUSTED+': Argyle pilot');
  }
  root.LineGeneratorArgyle={diagonalPool:diagonalPool,chooseLattice:chooseLattice,uniqueOnSolution:uniqueOnSolution,intersectionCount:intersectionCount,makeVariantPilot:makeVariantPilot};
})(typeof window!=='undefined'?window:globalThis);
