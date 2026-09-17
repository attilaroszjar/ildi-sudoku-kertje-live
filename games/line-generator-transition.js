(function(root){
  'use strict';
  if(!root.LineGeneratorCore||root.LineGeneratorTransition)return;
  var core=root.LineGeneratorCore,EXHAUSTED=core.EXHAUSTED;

  var CONFIGS={
    'dutch-whispers':{
      family:'line-dutch-whispers-fresh-fill-mrv',
      seedXor:0x44555443,
      minLength:4,maxLength:7,initialLines:2,
      transition:function(a,b){return Math.abs(a-b)>=4;}
    },
    'parity-line':{
      family:'line-parity-fresh-fill-mrv',
      seedXor:0x50415249,
      minLength:4,maxLength:7,initialLines:3,
      transition:function(a,b){return (a&1)!==(b&1);}
    }
  };

  function configFor(id){return CONFIGS[id]||null;}

  function carve(generator,candidate,solution,attemptSeed,target,lineCount){
    var grid=core.cloneGrid(solution),order=Array.from({length:81},function(_,i){return i;}),random=core.rng((attemptSeed^0x43415256^lineCount)>>>0),clues=81;
    core.shuffle(order,random);
    for(var oi=0;oi<order.length&&clues>target;oi++){
      var idx=order[oi],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;
      if(generator.countVariantSolutions(grid,candidate,2)!==1)grid[r][c]=old;else clues--;
    }
    var essential=generator.countSolutions(grid,2)>1;
    if(!essential){
      for(oi=0;oi<order.length&&!essential;oi++){
        idx=order[oi];r=Math.floor(idx/9);c=idx%9;old=grid[r][c];if(!old)continue;grid[r][c]=0;
        if(generator.countVariantSolutions(grid,candidate,2)!==1)grid[r][c]=old;else{clues--;essential=generator.countSolutions(grid,2)>1;}
      }
    }
    if(!essential)return null;
    var stats={};if(generator.countVariantSolutions(grid,candidate,2,stats)!==1)return null;
    return {grid:grid,clues:clues,stats:stats};
  }

  function makeTransitionVariant(generator,variant,seed,difficulty,options){
    options=options||{};
    var cfg=configFor(variant&&variant.id);if(!cfg)throw new Error('Unsupported transition variant');
    var targets=options.targets||{gentle:40,focused:32,expert:27},target=targets[difficulty]||targets.focused,maxTopologyAttempts=options.maxTopologyAttempts||8,maxLines=options.maxLines||4,initialLines=Math.min(maxLines,options.initialLines||cfg.initialLines||1);
    for(var attempt=0;attempt<maxTopologyAttempts;attempt++){
      var attemptSeed=((seed>>>0)^cfg.seedXor^Math.imul(attempt+1,0x9E3779B1))>>>0,fresh=core.freshStandardSolution(attemptSeed,options.solutionOptions),solution=fresh.grid,lines=[],seenTopology={};
      for(var lineIndex=0;lineIndex<maxLines;lineIndex++){
        var built;
        try{
          built=core.buildTransitionPath(solution,(attemptSeed^Math.imul(lineIndex+1,0x85EBCA6B))>>>0,{minLength:options.minLength||cfg.minLength,maxLength:options.maxLength||cfg.maxLength,maxNodes:options.pathNodeLimit||4000,seedXor:cfg.seedXor,transition:cfg.transition});
        }catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)break;throw error;}
        var fp=core.topologyFingerprint([built.path],{directed:false});if(seenTopology[fp])continue;seenTopology[fp]=1;lines.push(built.path);
        if(lines.length<initialLines)continue;

        var candidate=JSON.parse(JSON.stringify(variant));candidate.solution=core.cloneGrid(solution);candidate.data=Object.assign({},candidate.data||{},{lines:lines.map(function(line){return line.map(function(p){return p.slice();});})});
        var carved=carve(generator,candidate,solution,attemptSeed,target,lines.length);
        if(!carved)continue;
        candidate.puzzle=carved.grid;candidate.generation={seed:seed>>>0,clues:carved.clues,unique:true,verification:'solver-verified',generatorFamily:cfg.family,solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:(carved.stats.nodes||0)+(carved.stats.branches||0)*3+(carved.stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,topologyFingerprint:core.topologyFingerprint(lines,{directed:false}),lineCount:lines.length,pilot:true};
        return candidate;
      }
    }
    throw new Error(EXHAUSTED+': '+variant.id+' pilot');
  }

  root.LineGeneratorTransition={CONFIGS:CONFIGS,configFor:configFor,makeTransitionVariant:makeTransitionVariant};
})(globalThis);
