(function(root){
  'use strict';
  if(!root.LineGeneratorCore||root.LineGeneratorSymmetric)return;
  var core=root.LineGeneratorCore,EXHAUSTED=core.EXHAUSTED;
  function key(p){return p[0]+','+p[1];}

  function buildZipperPath(solution,seed,options){
    options=options||{};
    var minLength=options.minLength||3,maxLength=options.maxLength||7,maxNodes=options.maxNodes||6000,maxCenters=options.maxCenters||81;
    if((minLength&1)===0)minLength++;
    if((maxLength&1)===0)maxLength--;
    var random=core.rng(((seed>>>0)^0x5A495050)>>>0),centers=Array.from({length:81},function(_,i){return [Math.floor(i/9),i%9];}),nodes=0;
    core.shuffle(centers,random);
    var lengths=[];for(var len=minLength;len<=maxLength;len+=2)lengths.push(len);core.shuffle(lengths,random);

    function search(center,targetLength){
      var target=solution[center[0]][center[1]],path=[center.slice()],seen={};seen[key(center)]=1;
      function grow(){
        if(++nodes>maxNodes)return null;
        if(path.length===targetLength)return path.slice();
        var left=path[0],right=path[path.length-1],leftNext=core.neighbours4(left).filter(function(p){return !seen[key(p)];});
        core.shuffle(leftNext,random);
        for(var i=0;i<leftNext.length;i++){
          var lp=leftNext[i],lk=key(lp);seen[lk]=1;
          var rightNext=core.neighbours4(right).filter(function(p){return !seen[key(p)]&&key(p)!==lk&&solution[lp[0]][lp[1]]+solution[p[0]][p[1]]===target;});
          core.shuffle(rightNext,random);
          for(var j=0;j<rightNext.length;j++){
            var rp=rightNext[j],rk=key(rp);seen[rk]=1;path.unshift(lp);path.push(rp);
            var found=grow();if(found)return found;
            path.shift();path.pop();delete seen[rk];if(nodes>maxNodes)break;
          }
          delete seen[lk];if(nodes>maxNodes)break;
        }
        return null;
      }
      return grow();
    }

    for(var ci=0;ci<Math.min(maxCenters,centers.length);ci++)for(var li=0;li<lengths.length;li++){
      var found=search(centers[ci],lengths[li]);
      if(found&&core.validateSimplePath(found,{minLength:minLength,maxLength:maxLength}))return {path:found,center:found[(found.length-1)/2],target:solution[found[(found.length-1)/2][0]][found[(found.length-1)/2][1]],nodes:nodes};
      if(nodes>maxNodes)break;
    }
    throw new Error(EXHAUSTED+': Zipper topology');
  }

  function makeZipperPilot(generator,variant,seed,difficulty,options){
    options=options||{};
    var targets=options.targets||{gentle:40,focused:32,expert:27},targetClues=targets[difficulty]||targets.focused,maxTopologyAttempts=options.maxTopologyAttempts||8,maxLines=options.maxLines||4;
    for(var attempt=0;attempt<maxTopologyAttempts;attempt++){
      var attemptSeed=((seed>>>0)^Math.imul(attempt+1,0xA24BAED5))>>>0,fresh=core.freshStandardSolution(attemptSeed,options.solutionOptions),solution=fresh.grid,lines=[],seenTopology={};
      for(var lineIndex=0;lineIndex<maxLines;lineIndex++){
        var built;
        try{built=buildZipperPath(solution,(attemptSeed^Math.imul(lineIndex+1,0x9FB21C65))>>>0,{minLength:options.minLength||3,maxLength:options.maxLength||7,maxNodes:options.pathNodeLimit||6000,maxCenters:options.maxCenters||81});}
        catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)break;throw error;}
        var fp=core.topologyFingerprint([built.path],{directed:false});if(seenTopology[fp])continue;seenTopology[fp]=1;lines.push(built.path);
        var candidate=JSON.parse(JSON.stringify(variant));candidate.solution=core.cloneGrid(solution);candidate.data=Object.assign({},candidate.data||{},{lines:lines.map(function(line){return {cells:line.map(function(p){return p.slice();})};})});
        var grid=core.cloneGrid(solution),order=Array.from({length:81},function(_,i){return i;}),random=core.rng((attemptSeed^0x43415256^lineIndex)>>>0),clues=81;core.shuffle(order,random);
        for(var oi=0;oi<order.length&&clues>targetClues;oi++){
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
        candidate.puzzle=grid;candidate.generation={seed:seed>>>0,clues:clues,unique:true,verification:'solver-verified',generatorFamily:'line-zipper-fresh-fill-mrv',solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:(stats.nodes||0)+(stats.branches||0)*3+(stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,topologyFingerprint:core.topologyFingerprint(lines,{directed:false}),lineCount:lines.length,pilot:true};
        return candidate;
      }
    }
    throw new Error(EXHAUSTED+': Zipper pilot');
  }

  root.LineGeneratorSymmetric={buildZipperPath:buildZipperPath,makeZipperPilot:makeZipperPilot};
})(globalThis);
