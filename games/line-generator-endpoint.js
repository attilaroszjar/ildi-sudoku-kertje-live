(function(root){
  'use strict';
  if(!root.LineGeneratorCore)return;
  if(root.LineGeneratorEndpoint)return;
  var core=root.LineGeneratorCore,EXHAUSTED=core.EXHAUSTED;

  function key(cell){return cell[0]+','+cell[1];}
  function sameCell(a,b){return a[0]===b[0]&&a[1]===b[1];}

  function buildBetweenPath(solution,seed,options){
    options=options||{};
    var minLength=options.minLength||4,maxLength=options.maxLength||7,maxNodes=options.maxNodes||8000,maxPairs=options.maxPairs||240;
    var random=core.rng(((seed>>>0)^0x4254574E)>>>0),nodes=0,pairs=[];
    for(var r1=0;r1<9;r1++)for(var c1=0;c1<9;c1++)for(var r2=0;r2<9;r2++)for(var c2=0;c2<9;c2++){
      if(r1===r2&&c1===c2)continue;
      var a=solution[r1][c1],b=solution[r2][c2];
      if(Math.abs(a-b)<2)continue;
      var manhattan=Math.abs(r1-r2)+Math.abs(c1-c2);
      if(manhattan<2||manhattan>maxLength-1)continue;
      pairs.push({start:[r1,c1],end:[r2,c2],lo:Math.min(a,b),hi:Math.max(a,b)});
    }
    core.shuffle(pairs,random);
    var lengths=[];for(var len=minLength;len<=maxLength;len++)lengths.push(len);core.shuffle(lengths,random);

    function search(pair,targetLength){
      var start=pair.start,end=pair.end,seen={};seen[key(start)]=1;
      function walk(path){
        if(++nodes>maxNodes)return null;
        var last=path[path.length-1];
        if(path.length===targetLength)return sameCell(last,end)?path.slice():null;
        var remaining=targetLength-path.length,dist=Math.abs(last[0]-end[0])+Math.abs(last[1]-end[1]);
        if(dist>remaining||((remaining-dist)&1))return null;
        var next=core.neighbours4(last).filter(function(p){
          var k=key(p);if(seen[k])return false;
          if(sameCell(p,end))return path.length===targetLength-1;
          var v=solution[p[0]][p[1]];return v>pair.lo&&v<pair.hi;
        });
        core.shuffle(next,random);
        for(var i=0;i<next.length;i++){
          var p=next[i],k=key(p);seen[k]=1;path.push(p);
          var found=walk(path);if(found)return found;
          path.pop();delete seen[k];if(nodes>maxNodes)return null;
        }
        return null;
      }
      return walk([start]);
    }

    for(var pi=0;pi<Math.min(maxPairs,pairs.length);pi++){
      var pair=pairs[pi];
      for(var li=0;li<lengths.length;li++){
        var found=search(pair,lengths[li]);
        if(found&&core.validateSimplePath(found,{minLength:minLength,maxLength:maxLength}))return {path:found,lo:pair.lo,hi:pair.hi,nodes:nodes};
        if(nodes>maxNodes)break;
      }
      if(nodes>maxNodes)break;
    }
    throw new Error(EXHAUSTED+': Between topology');
  }

  function makeBetweenPilot(generator,variant,seed,difficulty,options){
    options=options||{};
    var targets=options.targets||{gentle:40,focused:32,expert:27},target=targets[difficulty]||targets.focused,maxTopologyAttempts=options.maxTopologyAttempts||8,maxLines=options.maxLines||4;
    for(var attempt=0;attempt<maxTopologyAttempts;attempt++){
      var attemptSeed=((seed>>>0)^Math.imul(attempt+1,0x7FEB352D))>>>0,fresh=core.freshStandardSolution(attemptSeed,options.solutionOptions),solution=fresh.grid,lines=[],seenTopology={};
      for(var lineIndex=0;lineIndex<maxLines;lineIndex++){
        var built;
        try{built=buildBetweenPath(solution,(attemptSeed^Math.imul(lineIndex+1,0x846CA68B))>>>0,{minLength:options.minLength||4,maxLength:options.maxLength||7,maxNodes:options.pathNodeLimit||8000,maxPairs:options.maxPairs||240});}
        catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)break;throw error;}
        var fp=core.topologyFingerprint([built.path],{directed:false});if(seenTopology[fp])continue;seenTopology[fp]=1;lines.push(built.path);
        var candidate=JSON.parse(JSON.stringify(variant));candidate.solution=core.cloneGrid(solution);candidate.data=Object.assign({},candidate.data||{},{lines:lines.map(function(line){return {cells:line.map(function(p){return p.slice();})};})});
        var grid=core.cloneGrid(solution),order=Array.from({length:81},function(_,i){return i;}),random=core.rng((attemptSeed^0x43415256^lineIndex)>>>0),clues=81;core.shuffle(order,random);
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
        if(!essential)continue;
        var stats={},unique=generator.countVariantSolutions(grid,candidate,2,stats)===1;if(!unique)continue;
        candidate.puzzle=grid;candidate.generation={seed:seed>>>0,clues:clues,unique:true,verification:'solver-verified',generatorFamily:'line-between-fresh-fill-mrv',solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:(stats.nodes||0)+(stats.branches||0)*3+(stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,topologyFingerprint:core.topologyFingerprint(lines,{directed:false}),lineCount:lines.length,pilot:true};
        return candidate;
      }
    }
    throw new Error(EXHAUSTED+': Between pilot');
  }

  root.LineGeneratorEndpoint={buildBetweenPath:buildBetweenPath,makeBetweenPilot:makeBetweenPilot};
})(globalThis);
