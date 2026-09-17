(function(root){
  'use strict';
  if(!root.LineGeneratorCore||root.LineGeneratorDirected)return;
  var core=root.LineGeneratorCore,EXHAUSTED=core.EXHAUSTED;

  var CONFIGS={
    thermo:{
      family:'line-thermo-directed-fresh-fill-mrv',
      seedXor:0x54484552,
      dataKey:'thermos',
      minLength:3,maxLength:6,initialLines:2,
      transition:function(a,b){return b>a;}
    },
    'slow-thermo':{
      family:'line-slow-thermo-directed-fresh-fill-mrv',
      seedXor:0x534C4F57,
      dataKey:'lines',
      minLength:3,maxLength:6,initialLines:2,
      transition:function(a,b){return b>=a&&b-a<=1;}
    }
  };

  function configFor(id){return CONFIGS[id]||null;}
  function lineValid(solution,line,transition){
    if(!core.validateSimplePath(line,{minLength:2}))return false;
    for(var i=1;i<line.length;i++)if(!transition(solution[line[i-1][0]][line[i-1][1]],solution[line[i][0]][line[i][1]]))return false;
    return true;
  }

  function buildDirectedPath(solution,seed,options){
    options=options||{};
    if(typeof options.transition!=='function')throw new Error('Directed transition predicate required');
    return core.buildTransitionPath(solution,seed,{
      minLength:options.minLength||3,
      maxLength:options.maxLength||6,
      maxStarts:options.maxStarts||81,
      maxNodes:options.maxNodes||6000,
      seedXor:options.seedXor==null?0x44495245:options.seedXor,
      transition:options.transition
    });
  }

  function carve(generator,candidate,solution,attemptSeed,target,lineCount){
    var grid=core.cloneGrid(solution),order=Array.from({length:81},function(_,i){return i;}),random=core.rng((attemptSeed^0x43415256^lineCount)>>>0),clues=81;core.shuffle(order,random);
    for(var oi=0;oi<order.length&&clues>target;oi++){
      var idx=order[oi],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;
      if(generator.countVariantSolutions(grid,candidate,2)!==1)grid[r][c]=old;else clues--;
    }
    var essential=generator.countSolutions(grid,2)>1;
    if(!essential)for(oi=0;oi<order.length&&!essential;oi++){
      idx=order[oi];r=Math.floor(idx/9);c=idx%9;old=grid[r][c];if(!old)continue;grid[r][c]=0;
      if(generator.countVariantSolutions(grid,candidate,2)!==1)grid[r][c]=old;else{clues--;essential=generator.countSolutions(grid,2)>1;}
    }
    if(!essential)return null;
    var stats={};if(generator.countVariantSolutions(grid,candidate,2,stats)!==1)return null;
    return{grid:grid,clues:clues,stats:stats};
  }

  function makeVariantPilot(generator,variant,seed,difficulty,options){
    options=options||{};var cfg=configFor(variant&&variant.id);if(!cfg)throw new Error('Unsupported directed-line variant');
    var targets=options.targets||{gentle:40,focused:32,expert:27},target=targets[difficulty]||targets.focused,maxTopologyAttempts=options.maxTopologyAttempts||10,maxLines=options.maxLines||5,initialLines=Math.min(maxLines,options.initialLines||cfg.initialLines);
    for(var attempt=0;attempt<maxTopologyAttempts;attempt++){
      var attemptSeed=((seed>>>0)^cfg.seedXor^Math.imul(attempt+1,0x9E3779B1))>>>0,fresh=core.freshStandardSolution(attemptSeed,options.solutionOptions),solution=fresh.grid,lines=[],seenTopology={};
      for(var lineIndex=0;lineIndex<maxLines;lineIndex++){
        var built;
        try{built=buildDirectedPath(solution,(attemptSeed^Math.imul(lineIndex+1,0x85EBCA6B))>>>0,{transition:cfg.transition,seedXor:cfg.seedXor,minLength:options.minLength||cfg.minLength,maxLength:options.maxLength||cfg.maxLength,maxNodes:options.pathNodeLimit||6000,maxStarts:options.maxStarts||81});}
        catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)break;throw error;}
        var fp=core.topologyFingerprint([built.path],{directed:true});if(seenTopology[fp])continue;seenTopology[fp]=1;
        if(!lineValid(solution,built.path,cfg.transition))throw new Error('Invalid directed-line topology');
        lines.push(built.path);if(lines.length<initialLines)continue;
        var candidate=JSON.parse(JSON.stringify(variant));candidate.solution=core.cloneGrid(solution);var data=Object.assign({},candidate.data||{});data[cfg.dataKey]=lines.map(function(line){return line.map(function(p){return p.slice();});});candidate.data=data;
        var carved=carve(generator,candidate,solution,attemptSeed,target,lines.length);if(!carved)continue;
        candidate.puzzle=carved.grid;candidate.generation={seed:seed>>>0,clues:carved.clues,unique:true,verification:'solver-verified',generatorFamily:cfg.family,solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:(carved.stats.nodes||0)+(carved.stats.branches||0)*3+(carved.stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,topologyFingerprint:core.topologyFingerprint(lines,{directed:true}),lineCount:lines.length,pilot:true};
        return candidate;
      }
    }
    throw new Error(EXHAUSTED+': '+variant.id+' directed pilot');
  }

  root.LineGeneratorDirected={CONFIGS:CONFIGS,configFor:configFor,lineValid:lineValid,buildDirectedPath:buildDirectedPath,makeVariantPilot:makeVariantPilot};
})(globalThis);
