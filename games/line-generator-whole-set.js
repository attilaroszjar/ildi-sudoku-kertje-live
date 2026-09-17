(function(root){
  'use strict';
  if(!root.LineGeneratorCore)return;
  if(root.LineGeneratorWholeSet)return;
  var core=root.LineGeneratorCore,EXHAUSTED=core.EXHAUSTED;

  function key(cell){return cell[0]+','+cell[1];}
  function buildRenbanPath(solution,seed,options){
    options=options||{};
    var minLength=options.minLength||4,maxLength=options.maxLength||6,maxNodes=options.maxNodes||5000,random=core.rng(((seed>>>0)^0x52454E42)>>>0),totalNodes=0;
    var lengths=[];for(var len=minLength;len<=maxLength;len++)lengths.push(len);core.shuffle(lengths,random);
    for(var li=0;li<lengths.length;li++){
      var length=lengths[li],starts=[];for(var low=1;low<=10-length;low++)starts.push(low);core.shuffle(starts,random);
      for(var si=0;si<starts.length;si++){
        var low=starts[si],high=low+length-1,cells=[],nodes=0;
        for(var r=0;r<9;r++)for(var c=0;c<9;c++){var v=solution[r][c];if(v>=low&&v<=high)cells.push([r,c]);}
        core.shuffle(cells,random);
        function walk(path,seenValues,seenCells){
          nodes++;totalNodes++;if(nodes>maxNodes)return null;
          if(path.length===length)return path.slice();
          var last=path[path.length-1],next=core.neighbours4(last).filter(function(p){var v=solution[p[0]][p[1]];return v>=low&&v<=high&&!seenValues[v]&&!seenCells[key(p)];});
          core.shuffle(next,random);
          for(var i=0;i<next.length;i++){
            var p=next[i],v=solution[p[0]][p[1]],k=key(p);seenValues[v]=1;seenCells[k]=1;path.push(p);
            var found=walk(path,seenValues,seenCells);if(found)return found;
            path.pop();delete seenValues[v];delete seenCells[k];if(nodes>maxNodes)return null;
          }
          return null;
        }
        for(var ci=0;ci<cells.length&&nodes<=maxNodes;ci++){
          var start=cells[ci],sv=solution[start[0]][start[1]],seenValues={},seenCells={};seenValues[sv]=1;seenCells[key(start)]=1;
          var found=walk([start],seenValues,seenCells);if(found&&core.validateSimplePath(found,{minLength:length,maxLength:length}))return {path:found,low:low,high:high,nodes:totalNodes};
        }
      }
    }
    throw new Error(EXHAUSTED+': Renban topology');
  }

  function makeRenbanPilot(generator,variant,seed,difficulty,options){
    options=options||{};
    var targets=options.targets||{gentle:40,focused:32,expert:27},target=targets[difficulty]||targets.focused,maxTopologyAttempts=options.maxTopologyAttempts||8,maxLines=options.maxLines||4;
    for(var attempt=0;attempt<maxTopologyAttempts;attempt++){
      var attemptSeed=((seed>>>0)^Math.imul(attempt+1,0x27D4EB2D))>>>0,fresh=core.freshStandardSolution(attemptSeed,options.solutionOptions),solution=fresh.grid,lines=[],seenTopology={};
      for(var lineIndex=0;lineIndex<maxLines;lineIndex++){
        var built;
        try{built=buildRenbanPath(solution,(attemptSeed^Math.imul(lineIndex+1,0x165667B1))>>>0,{minLength:options.minLength||4,maxLength:options.maxLength||6,maxNodes:options.pathNodeLimit||5000});}
        catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)break;throw error;}
        var fp=core.topologyFingerprint([built.path],{directed:false});if(seenTopology[fp])continue;seenTopology[fp]=1;lines.push(built.path);
        var candidate=JSON.parse(JSON.stringify(variant));candidate.solution=core.cloneGrid(solution);candidate.data=Object.assign({},candidate.data||{},{lines:lines.map(function(line){return line.map(function(p){return p.slice();});})});
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
        candidate.puzzle=grid;candidate.generation={seed:seed>>>0,clues:clues,unique:true,verification:'solver-verified',generatorFamily:'line-renban-fresh-fill-mrv',solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:(stats.nodes||0)+(stats.branches||0)*3+(stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,topologyFingerprint:core.topologyFingerprint(lines,{directed:false}),lineCount:lines.length,pilot:true};
        return candidate;
      }
    }
    throw new Error(EXHAUSTED+': Renban pilot');
  }

  root.LineGeneratorWholeSet={buildRenbanPath:buildRenbanPath,makeRenbanPilot:makeRenbanPilot};
})(globalThis);
