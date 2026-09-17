(function(root){
  'use strict';
  if(!root.LineGeneratorCore||root.LineGeneratorSlidingTriple)return;
  var core=root.LineGeneratorCore,EXHAUSTED=core.EXHAUSTED;

  var CONFIGS={
    entropic:{
      family:'line-entropic-sliding-triple-fresh-fill-mrv',
      seedXor:0x454E5452,
      classOf:function(v){return Math.floor((v-1)/3);}
    },
    modular:{
      family:'line-modular-sliding-triple-fresh-fill-mrv',
      seedXor:0x4D4F4455,
      classOf:function(v){return v%3;}
    }
  };

  function key(p){return p[0]+','+p[1];}
  function configFor(id){return CONFIGS[id]||null;}

  function buildSlidingTriplePath(solution,seed,options){
    options=options||{};
    var classOf=options.classOf;if(typeof classOf!=='function')throw new Error('Sliding-triple classOf required');
    var minLength=options.minLength||4,maxLength=options.maxLength||7,maxNodes=options.maxNodes||6000,maxStarts=options.maxStarts||81;
    var random=core.rng(((seed>>>0)^(options.seedXor==null?0x53545249:options.seedXor))>>>0),starts=Array.from({length:81},function(_,i){return[Math.floor(i/9),i%9];}),lengths=[],nodes=0;
    core.shuffle(starts,random);for(var len=minLength;len<=maxLength;len++)lengths.push(len);core.shuffle(lengths,random);

    function walk(path,seen,pattern,target){
      if(++nodes>maxNodes)return null;
      if(path.length===target)return path.slice();
      var expected=pattern[path.length%3],last=path[path.length-1];
      var next=core.neighbours4(last).filter(function(p){return !seen[key(p)]&&classOf(solution[p[0]][p[1]])===expected;});
      core.shuffle(next,random);
      for(var i=0;i<next.length;i++){
        var p=next[i],k=key(p);seen[k]=1;path.push(p);
        var found=walk(path,seen,pattern,target);if(found)return found;
        path.pop();delete seen[k];if(nodes>maxNodes)return null;
      }
      return null;
    }

    for(var li=0;li<lengths.length;li++)for(var si=0;si<Math.min(maxStarts,starts.length);si++){
      var start=starts[si],firstClass=classOf(solution[start[0]][start[1]]),rest=[0,1,2].filter(function(x){return x!==firstClass;});core.shuffle(rest,random);
      var pattern=[firstClass,rest[0],rest[1]],seen={};seen[key(start)]=1;
      var found=walk([start],seen,pattern,lengths[li]);
      if(found&&core.validateSimplePath(found,{minLength:minLength,maxLength:maxLength}))return{path:found,pattern:pattern.slice(),nodes:nodes};
      if(nodes>maxNodes)break;
    }
    throw new Error(EXHAUSTED+': sliding-triple topology');
  }

  function lineValid(solution,line,classOf){
    for(var i=0;i<=line.length-3;i++){
      var seen={};for(var j=0;j<3;j++)seen[classOf(solution[line[i+j][0]][line[i+j][1]])]=1;
      if(Object.keys(seen).length!==3)return false;
    }
    return true;
  }

  function carve(generator,candidate,solution,attemptSeed,target,lineCount){
    var grid=core.cloneGrid(solution),order=Array.from({length:81},function(_,i){return i;}),random=core.rng((attemptSeed^0x43415256^lineCount)>>>0),clues=81,lastAcceptedStats=null;core.shuffle(order,random);
    for(var oi=0;oi<order.length&&clues>target;oi++){
      var idx=order[oi],r=Math.floor(idx/9),c=idx%9,old=grid[r][c],stats={};grid[r][c]=0;
      if(generator.countVariantSolutions(grid,candidate,2,stats)!==1)grid[r][c]=old;else{clues--;lastAcceptedStats=stats;}
    }
    var essential=generator.countSolutions(grid,2)>1;
    if(!essential)for(oi=0;oi<order.length&&!essential;oi++){
      idx=order[oi];r=Math.floor(idx/9);c=idx%9;old=grid[r][c];if(!old)continue;stats={};grid[r][c]=0;
      if(generator.countVariantSolutions(grid,candidate,2,stats)!==1)grid[r][c]=old;else{clues--;lastAcceptedStats=stats;essential=generator.countSolutions(grid,2)>1;}
    }
    if(!essential||!lastAcceptedStats)return null;
    return{grid:grid,clues:clues,stats:lastAcceptedStats};
  }

  function makeVariantPilot(generator,variant,seed,difficulty,options){
    options=options||{};var cfg=configFor(variant&&variant.id);if(!cfg)throw new Error('Unsupported sliding-triple variant');
    var targets=options.targets||{gentle:40,focused:32,expert:27},target=targets[difficulty]||targets.focused,maxTopologyAttempts=options.maxTopologyAttempts||8,maxLines=options.maxLines||4,initialLines=Math.min(maxLines,options.initialLines||2);
    for(var attempt=0;attempt<maxTopologyAttempts;attempt++){
      var attemptSeed=((seed>>>0)^cfg.seedXor^Math.imul(attempt+1,0x9E3779B1))>>>0,fresh=core.freshStandardSolution(attemptSeed,options.solutionOptions),solution=fresh.grid,lines=[],seenTopology={};
      for(var lineIndex=0;lineIndex<maxLines;lineIndex++){
        var built;
        try{built=buildSlidingTriplePath(solution,(attemptSeed^Math.imul(lineIndex+1,0x85EBCA6B))>>>0,{classOf:cfg.classOf,seedXor:cfg.seedXor,minLength:options.minLength||4,maxLength:options.maxLength||7,maxNodes:options.pathNodeLimit||6000,maxStarts:options.maxStarts||81});}
        catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)break;throw error;}
        var fp=core.topologyFingerprint([built.path],{directed:false});if(seenTopology[fp])continue;seenTopology[fp]=1;
        if(!lineValid(solution,built.path,cfg.classOf))throw new Error('Invalid sliding-triple topology');
        lines.push(built.path);if(lines.length<initialLines)continue;
        var candidate=JSON.parse(JSON.stringify(variant));candidate.solution=core.cloneGrid(solution);candidate.data=Object.assign({},candidate.data||{},{lines:lines.map(function(line){return line.map(function(p){return p.slice();});})});
        var carved=carve(generator,candidate,solution,attemptSeed,target,lines.length);if(!carved)continue;
        candidate.puzzle=carved.grid;candidate.generation={seed:seed>>>0,clues:carved.clues,unique:true,verification:'solver-verified',generatorFamily:cfg.family,solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:(carved.stats.nodes||0)+(carved.stats.branches||0)*3+(carved.stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,topologyFingerprint:core.topologyFingerprint(lines,{directed:false}),lineCount:lines.length,pilot:true};
        return candidate;
      }
    }
    throw new Error(EXHAUSTED+': '+variant.id+' sliding-triple pilot');
  }

  root.LineGeneratorSlidingTriple={CONFIGS:CONFIGS,configFor:configFor,buildSlidingTriplePath:buildSlidingTriplePath,lineValid:lineValid,makeVariantPilot:makeVariantPilot};
})(globalThis);
