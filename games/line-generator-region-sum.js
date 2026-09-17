(function(root){
  'use strict';
  if(!root.LineGeneratorCore||!root.RegionSumSegments||root.LineGeneratorRegionSum)return;
  var core=root.LineGeneratorCore,rs=root.RegionSumSegments,EXHAUSTED=core.EXHAUSTED;

  function key(p){return p[0]+','+p[1];}
  function segmentInfo(solution,path){
    return rs.split(path,solution.length).map(function(seg){
      return {cells:seg,sum:seg.reduce(function(total,p){return total+solution[p[0]][p[1]];},0)};
    });
  }
  function topologyValid(solution,path,options){
    options=options||{};var minSegments=options.minSegments||2,minSegmentLength=options.minSegmentLength||2,segments=segmentInfo(solution,path);
    if(segments.length<minSegments)return false;
    for(var i=0;i<segments.length;i++)if(segments[i].cells.length<minSegmentLength)return false;
    var target=segments[0].sum;for(i=1;i<segments.length;i++)if(segments[i].sum!==target)return false;
    return true;
  }
  function buildRegionSumPath(solution,seed,options){
    options=options||{};
    var minLength=options.minLength||4,maxLength=options.maxLength||9,minSegments=options.minSegments||2,minSegmentLength=options.minSegmentLength||2,maxNodes=options.maxNodes||120000,maxStarts=options.maxStarts||81;
    var random=core.rng(((seed>>>0)^(options.seedXor==null?0x5253554D:options.seedXor))>>>0),starts=Array.from({length:81},function(_,i){return[Math.floor(i/9),i%9];}),nodes=0;core.shuffle(starts,random);

    function partialFeasible(path){
      var segs=segmentInfo(solution,path),completed=segs.slice(0,-1),active=segs[segs.length-1],target=null;
      if(completed.length){
        if(completed[0].cells.length<minSegmentLength)return false;target=completed[0].sum;
        for(var i=1;i<completed.length;i++)if(completed[i].cells.length<minSegmentLength||completed[i].sum!==target)return false;
        if(active.sum>target)return false;
        if(active.cells.length>=minSegmentLength&&active.sum===target)return true;
      }
      return true;
    }
    function walk(path,seen){
      if(++nodes>maxNodes)return null;
      if(path.length>=minLength&&path.length<=maxLength&&topologyValid(solution,path,{minSegments:minSegments,minSegmentLength:minSegmentLength}))return path.slice();
      if(path.length>=maxLength)return null;
      var last=path[path.length-1],next=core.neighbours4(last).filter(function(p){return !seen[key(p)];});core.shuffle(next,random);
      for(var i=0;i<next.length;i++){
        var p=next[i],k=key(p);seen[k]=1;path.push(p);
        if(partialFeasible(path)){var found=walk(path,seen);if(found)return found;}
        path.pop();delete seen[k];if(nodes>maxNodes)return null;
      }
      return null;
    }
    for(var si=0;si<Math.min(maxStarts,starts.length);si++){
      var s=starts[si],seen={};seen[key(s)]=1;var found=walk([s],seen);
      if(found&&core.validateSimplePath(found,{minLength:minLength,maxLength:maxLength})&&topologyValid(solution,found,{minSegments:minSegments,minSegmentLength:minSegmentLength}))return{path:found,nodes:nodes,segments:segmentInfo(solution,found)};
      if(nodes>maxNodes)break;
    }
    throw new Error(EXHAUSTED+': Region Sum topology');
  }
  function carve(generator,candidate,solution,seed,target,lineCount){
    var grid=core.cloneGrid(solution),order=Array.from({length:81},function(_,i){return i;}),random=core.rng((seed^0x52534356^lineCount)>>>0),clues=81;core.shuffle(order,random);
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
    options=options||{};if(!variant||variant.kind!=='regionsum')throw new Error('Region Sum variant required');
    var targets=options.targets||{gentle:40,focused:32,expert:27},target=targets[difficulty]||targets.focused,maxTopologyAttempts=options.maxTopologyAttempts||10,maxLines=options.maxLines||4,initialLines=Math.min(maxLines,options.initialLines||2);
    for(var attempt=0;attempt<maxTopologyAttempts;attempt++){
      var attemptSeed=((seed>>>0)^0x5253554D^Math.imul(attempt+1,0x9E3779B1))>>>0,fresh=core.freshStandardSolution(attemptSeed,options.solutionOptions),solution=fresh.grid,lines=[],seen={};
      for(var li=0;li<maxLines;li++){
        var built;try{built=buildRegionSumPath(solution,(attemptSeed^Math.imul(li+1,0x85EBCA6B))>>>0,{minLength:options.minLength||4,maxLength:options.maxLength||9,minSegments:options.minSegments||2,minSegmentLength:options.minSegmentLength||2,maxNodes:options.pathNodeLimit||120000});}
        catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)break;throw error;}
        var fp=core.topologyFingerprint([built.path],{directed:false});if(seen[fp])continue;seen[fp]=1;lines.push(built.path);
        if(lines.length<initialLines)continue;
        var candidate=JSON.parse(JSON.stringify(variant));candidate.solution=core.cloneGrid(solution);candidate.data=Object.assign({},candidate.data||{},{lines:lines.map(function(line){return line.map(function(p){return p.slice();});})});
        var carved=carve(generator,candidate,solution,attemptSeed,target,lines.length);if(!carved)continue;
        candidate.puzzle=carved.grid;candidate.generation={seed:seed>>>0,clues:carved.clues,unique:true,verification:'solver-verified',generatorFamily:'line-region-sum-fresh-fill-mrv',solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:(carved.stats.nodes||0)+(carved.stats.branches||0)*3+(carved.stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,topologyFingerprint:core.topologyFingerprint(lines,{directed:false}),lineCount:lines.length,pilot:true};
        return candidate;
      }
    }
    throw new Error(EXHAUSTED+': Region Sum pilot');
  }
  root.LineGeneratorRegionSum={segmentInfo:segmentInfo,topologyValid:topologyValid,buildRegionSumPath:buildRegionSumPath,makeVariantPilot:makeVariantPilot};
})(globalThis);
