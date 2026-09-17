(function(root){
  'use strict';
  if(!root.LineGeneratorCore||root.LineGeneratorProvenSiblings)return;
  var core=root.LineGeneratorCore,EXHAUSTED=core.EXHAUSTED;
  function key(p){return p[0]+','+p[1];}
  function same(a,b){return a[0]===b[0]&&a[1]===b[1];}

  function buildNabnerPath(solution,seed,options){
    options=options||{};
    var minLength=options.minLength||4,maxLength=options.maxLength||6,maxNodes=options.maxNodes||6000;
    var random=core.rng(((seed>>>0)^0x4E41424E)>>>0),starts=Array.from({length:81},function(_,i){return[Math.floor(i/9),i%9];}),nodes=0,lengths=[];
    core.shuffle(starts,random);for(var len=minLength;len<=maxLength;len++)lengths.push(len);core.shuffle(lengths,random);
    function compatible(v,values){for(var i=0;i<values.length;i++)if(v===values[i]||Math.abs(v-values[i])===1)return false;return true;}
    function walk(path,values,seen,target){
      if(++nodes>maxNodes)return null;if(path.length===target)return path.slice();
      var last=path[path.length-1],next=core.neighbours4(last).filter(function(p){var k=key(p),v=solution[p[0]][p[1]];return !seen[k]&&compatible(v,values);});core.shuffle(next,random);
      for(var i=0;i<next.length;i++){var p=next[i],k=key(p),v=solution[p[0]][p[1]];seen[k]=1;path.push(p);values.push(v);var found=walk(path,values,seen,target);if(found)return found;values.pop();path.pop();delete seen[k];if(nodes>maxNodes)return null;}return null;
    }
    for(var li=0;li<lengths.length;li++)for(var si=0;si<starts.length;si++){
      var start=starts[si],seen={};seen[key(start)]=1;var found=walk([start],[solution[start[0]][start[1]]],seen,lengths[li]);
      if(found&&core.validateSimplePath(found,{minLength:minLength,maxLength:maxLength}))return{path:found,nodes:nodes};if(nodes>maxNodes)break;
    }
    throw new Error(EXHAUSTED+': Nabner topology');
  }

  function buildPalindromePath(solution,seed,options){
    options=options||{};
    var minLength=options.minLength||3,maxLength=options.maxLength||7,maxNodes=options.maxNodes||8000,maxCenters=options.maxCenters||81;
    if((minLength&1)===0)minLength++;if((maxLength&1)===0)maxLength--;
    var random=core.rng(((seed>>>0)^0x50414C49)>>>0),centers=Array.from({length:81},function(_,i){return[Math.floor(i/9),i%9];}),lengths=[],nodes=0;core.shuffle(centers,random);for(var len=minLength;len<=maxLength;len+=2)lengths.push(len);core.shuffle(lengths,random);
    function search(center,target){
      var path=[center.slice()],seen={};seen[key(center)]=1;
      function grow(){
        if(++nodes>maxNodes)return null;if(path.length===target)return path.slice();
        var left=path[0],right=path[path.length-1],leftNext=core.neighbours4(left).filter(function(p){return !seen[key(p)];});core.shuffle(leftNext,random);
        for(var i=0;i<leftNext.length;i++){
          var lp=leftNext[i],lk=key(lp),lv=solution[lp[0]][lp[1]];seen[lk]=1;
          var rightNext=core.neighbours4(right).filter(function(p){return !seen[key(p)]&&key(p)!==lk&&solution[p[0]][p[1]]===lv;});core.shuffle(rightNext,random);
          for(var j=0;j<rightNext.length;j++){var rp=rightNext[j],rk=key(rp);seen[rk]=1;path.unshift(lp);path.push(rp);var found=grow();if(found)return found;path.shift();path.pop();delete seen[rk];if(nodes>maxNodes)break;}delete seen[lk];if(nodes>maxNodes)break;
        }
        return null;
      }
      return grow();
    }
    for(var ci=0;ci<Math.min(maxCenters,centers.length);ci++)for(var li=0;li<lengths.length;li++){
      var found=search(centers[ci],lengths[li]);if(found&&core.validateSimplePath(found,{minLength:minLength,maxLength:maxLength}))return{path:found,nodes:nodes};if(nodes>maxNodes)break;
    }
    throw new Error(EXHAUSTED+': Palindrome topology');
  }

  function buildLockoutPath(solution,seed,options){
    options=options||{};
    var minLength=options.minLength||4,maxLength=options.maxLength||7,maxNodes=options.maxNodes||9000,maxPairs=options.maxPairs||260,minGap=options.minGap||3;
    var random=core.rng(((seed>>>0)^0x4C4F434B)>>>0),pairs=[],nodes=0;
    for(var r1=0;r1<9;r1++)for(var c1=0;c1<9;c1++)for(var r2=0;r2<9;r2++)for(var c2=0;c2<9;c2++){
      if(r1===r2&&c1===c2)continue;var a=solution[r1][c1],b=solution[r2][c2];if(Math.abs(a-b)<minGap)continue;
      var dist=Math.abs(r1-r2)+Math.abs(c1-c2);if(dist<2||dist>maxLength-1)continue;pairs.push({start:[r1,c1],end:[r2,c2],lo:Math.min(a,b),hi:Math.max(a,b)});
    }
    core.shuffle(pairs,random);var lengths=[];for(var len=minLength;len<=maxLength;len++)lengths.push(len);core.shuffle(lengths,random);
    function search(pair,target){
      var seen={};seen[key(pair.start)]=1;
      function walk(path){
        if(++nodes>maxNodes)return null;var last=path[path.length-1];if(path.length===target)return same(last,pair.end)?path.slice():null;
        var remaining=target-path.length,dist=Math.abs(last[0]-pair.end[0])+Math.abs(last[1]-pair.end[1]);if(dist>remaining||((remaining-dist)&1))return null;
        var next=core.neighbours4(last).filter(function(p){var k=key(p);if(seen[k])return false;if(same(p,pair.end))return path.length===target-1;var v=solution[p[0]][p[1]];return v<pair.lo||v>pair.hi;});core.shuffle(next,random);
        for(var i=0;i<next.length;i++){var p=next[i],k=key(p);seen[k]=1;path.push(p);var found=walk(path);if(found)return found;path.pop();delete seen[k];if(nodes>maxNodes)return null;}return null;
      }
      return walk([pair.start]);
    }
    for(var pi=0;pi<Math.min(maxPairs,pairs.length);pi++)for(var li=0;li<lengths.length;li++){
      var found=search(pairs[pi],lengths[li]);if(found&&core.validateSimplePath(found,{minLength:minLength,maxLength:maxLength}))return{path:found,lo:pairs[pi].lo,hi:pairs[pi].hi,nodes:nodes};if(nodes>maxNodes)break;
    }
    throw new Error(EXHAUSTED+': Lockout topology');
  }

  var CONFIGS={
    nabner:{family:'line-nabner-fresh-fill-mrv',seedXor:0x4E41424E,initialLines:2,initialLinesByDifficulty:{expert:4},targetsByDifficulty:{expert:30},difficultySeeded:true,lineFirstByDifficulty:{expert:true},builder:buildNabnerPath,wrap:function(line){return line.map(function(p){return p.slice();});}},
    palindrome:{family:'line-palindrome-fresh-fill-mrv',seedXor:0x50414C49,initialLines:2,builder:buildPalindromePath,wrap:function(line){return line.map(function(p){return p.slice();});}},
    lockout:{family:'line-lockout-fresh-fill-mrv',seedXor:0x4C4F434B,initialLines:2,initialLinesByDifficulty:{expert:4},targetsByDifficulty:{expert:29},builder:buildLockoutPath,wrap:function(line){return{cells:line.map(function(p){return p.slice();})};}}
  };

  function restoreToTarget(generator,grid,solution,removed,target){
    for(var i=removed.length-1;i>=0&&removed.length&&target>0;i--){
      var idx=removed[i],r=Math.floor(idx/9),c=idx%9;if(grid[r][c])continue;
      grid[r][c]=solution[r][c];
      if(generator.countSolutions(grid,2)===1)grid[r][c]=0;
      else target--;
    }
    return target===0;
  }

  function prioritizeLineCells(order,candidate){
    var lines=(candidate.data&&candidate.data.lines)||[],marked={};
    for(var i=0;i<lines.length;i++){var cells=Array.isArray(lines[i])?lines[i]:lines[i].cells||[];for(var j=0;j<cells.length;j++)marked[cells[j][0]*9+cells[j][1]]=1;}
    return order.filter(function(idx){return marked[idx];}).concat(order.filter(function(idx){return !marked[idx];}));
  }

  function carve(generator,candidate,solution,attemptSeed,target,lineCount,lineFirst){
    var grid=core.cloneGrid(solution),order=Array.from({length:81},function(_,i){return i;}),random=core.rng((attemptSeed^0x43415256^lineCount)>>>0),clues=81,removed=[];core.shuffle(order,random);if(lineFirst)order=prioritizeLineCells(order,candidate);
    for(var oi=0;oi<order.length&&clues>target;oi++){var idx=order[oi],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;if(generator.countVariantSolutions(grid,candidate,2)!==1)grid[r][c]=old;else{clues--;removed.push(idx);}}
    var essential=generator.countSolutions(grid,2)>1;
    if(!essential)for(oi=0;oi<order.length&&!essential;oi++){idx=order[oi];r=Math.floor(idx/9);c=idx%9;old=grid[r][c];if(!old)continue;grid[r][c]=0;if(generator.countVariantSolutions(grid,candidate,2)!==1)grid[r][c]=old;else{clues--;removed.push(idx);essential=generator.countSolutions(grid,2)>1;}}
    if(!essential)return null;
    if(clues<target){var need=target-clues;if(!restoreToTarget(generator,grid,solution,removed,need))return null;clues=target;}
    if(generator.countSolutions(grid,2)<=1)return null;
    var stats={};if(generator.countVariantSolutions(grid,candidate,2,stats)!==1)return null;return{grid:grid,clues:clues,stats:stats};
  }

  function difficultySalt(difficulty){return difficulty==='gentle'?0x47454e54:(difficulty==='expert'?0x45585054:0x464f4355);}

  function makeVariantPilot(generator,variant,seed,difficulty,options){
    options=options||{};var cfg=CONFIGS[variant&&variant.id];if(!cfg)throw new Error('Unsupported proven sibling variant');
    var targets=options.targets||{gentle:40,focused:32,expert:27},configuredTarget=(cfg.targetsByDifficulty&&cfg.targetsByDifficulty[difficulty]),target=configuredTarget==null?(targets[difficulty]||targets.focused):configuredTarget,maxTopologyAttempts=options.maxTopologyAttempts||8,maxLines=options.maxLines||4,configuredInitial=(cfg.initialLinesByDifficulty&&cfg.initialLinesByDifficulty[difficulty])||cfg.initialLines,initialLines=Math.min(maxLines,options.initialLines||configuredInitial),diffSalt=cfg.difficultySeeded?difficultySalt(difficulty):0,lineFirst=!!(cfg.lineFirstByDifficulty&&cfg.lineFirstByDifficulty[difficulty]);
    for(var attempt=0;attempt<maxTopologyAttempts;attempt++){
      var attemptSeed=((seed>>>0)^cfg.seedXor^diffSalt^Math.imul(attempt+1,0x9E3779B1))>>>0,fresh=core.freshStandardSolution(attemptSeed,options.solutionOptions),solution=fresh.grid,lines=[],seenTopology={};
      for(var lineIndex=0;lineIndex<maxLines;lineIndex++){
        var built;try{built=cfg.builder(solution,(attemptSeed^Math.imul(lineIndex+1,0x85EBCA6B))>>>0,options);}catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)break;throw error;}
        var fp=core.topologyFingerprint([built.path],{directed:false});if(seenTopology[fp])continue;seenTopology[fp]=1;lines.push(built.path);if(lines.length<initialLines)continue;
        var candidate=JSON.parse(JSON.stringify(variant));candidate.solution=core.cloneGrid(solution);candidate.data=Object.assign({},candidate.data||{},{lines:lines.map(cfg.wrap)});
        var carved=carve(generator,candidate,solution,attemptSeed,target,lines.length,lineFirst);if(!carved)continue;
        candidate.puzzle=carved.grid;candidate.generation={seed:seed>>>0,clues:carved.clues,unique:true,verification:'solver-verified',generatorFamily:cfg.family,solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:(carved.stats.nodes||0)+(carved.stats.branches||0)*3+(carved.stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,topologyFingerprint:core.topologyFingerprint(lines,{directed:false}),lineCount:lines.length,pilot:true};return candidate;
      }
    }
    throw new Error(EXHAUSTED+': '+variant.id+' pilot');
  }

  root.LineGeneratorProvenSiblings={CONFIGS:CONFIGS,buildNabnerPath:buildNabnerPath,buildPalindromePath:buildPalindromePath,buildLockoutPath:buildLockoutPath,makeVariantPilot:makeVariantPilot};
})(globalThis);
