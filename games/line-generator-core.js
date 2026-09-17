(function(root){
  'use strict';
  if(root.LineGeneratorCore)return;

  var EXHAUSTED='GENERATION_EXHAUSTED';

  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(values,random){for(var i=values.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),tmp=values[i];values[i]=values[j];values[j]=tmp;}return values;}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function digitForBit(one){return 1+Math.round(Math.log(one)/Math.LN2);}
  function key(cell){return cell[0]+','+cell[1];}
  function sameCell(a,b){return a[0]===b[0]&&a[1]===b[1];}

  function freshStandardSolution(seed,options){
    options=options||{};
    var maxAttempts=options.maxAttempts||2,nodeLimit=options.nodeLimit||250000,seedXor=(options.seedXor==null?0x4C494E45:options.seedXor)>>>0,attemptMix=(options.attemptMix==null?0x9E3779B1:options.attemptMix)>>>0,totalNodes=0;
    for(var attempt=0;attempt<maxAttempts;attempt++){
      var random=rng(((seed>>>0)^seedXor^Math.imul(attempt+1,attemptMix))>>>0),grid=Array.from({length:9},function(){return Array(9).fill(0);}),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),nodes=0,exhausted=false;
      function fill(){
        if(++nodes>nodeLimit){exhausted=true;return false;}
        var best=10,candidates=[];
        for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(!grid[r][c]){
          var box=Math.floor(r/3)*3+Math.floor(c/3),mask=0x1ff&~(rows[r]|cols[c]|boxes[box]),count=bitCount(mask);
          if(!count)return false;
          if(count<best){best=count;candidates=[{r:r,c:c,mask:mask}];}
          else if(count===best)candidates.push({r:r,c:c,mask:mask});
        }
        if(!candidates.length)return true;
        var pick=candidates[Math.floor(random()*candidates.length)],choices=[];
        for(var bits=pick.mask;bits;bits&=bits-1)choices.push(bits&-bits);
        shuffle(choices,random);
        var box=Math.floor(pick.r/3)*3+Math.floor(pick.c/3);
        for(var i=0;i<choices.length;i++){
          var one=choices[i],digit=digitForBit(one);grid[pick.r][pick.c]=digit;rows[pick.r]|=one;cols[pick.c]|=one;boxes[box]|=one;
          if(fill())return true;
          rows[pick.r]^=one;cols[pick.c]^=one;boxes[box]^=one;grid[pick.r][pick.c]=0;
          if(exhausted)return false;
        }
        return false;
      }
      if(fill())return {grid:grid,nodes:nodes,totalNodes:totalNodes+nodes,attempts:attempt+1};
      totalNodes+=nodes;
    }
    throw new Error(EXHAUSTED+': fresh standard solution');
  }

  function neighbours4(cell){var r=cell[0],c=cell[1],raw=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]];return raw.filter(function(p){return p[0]>=0&&p[0]<9&&p[1]>=0&&p[1]<9;});}
  function validateSimplePath(path,options){
    options=options||{};
    var neighbour=options.neighbour||function(a,b){return Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])===1;},seen={};
    if(!Array.isArray(path)||(options.minLength&&path.length<options.minLength)||(options.maxLength&&path.length>options.maxLength))return false;
    for(var i=0;i<path.length;i++){
      var p=path[i];if(!Array.isArray(p)||p.length!==2||p[0]<0||p[0]>8||p[1]<0||p[1]>8||seen[key(p)])return false;seen[key(p)]=1;
      if(i&&!neighbour(path[i-1],p))return false;
    }
    return true;
  }

  function buildTransitionPath(solution,seed,options){
    options=options||{};
    var minLength=options.minLength||3,maxLength=options.maxLength||7,maxStarts=options.maxStarts||81,maxNodes=options.maxNodes||3000,transition=options.transition;
    if(typeof transition!=='function')throw new Error('Line transition predicate required');
    var random=rng(((seed>>>0)^(options.seedXor==null?0x50415448:options.seedXor))>>>0),starts=Array.from({length:81},function(_,i){return [Math.floor(i/9),i%9];});shuffle(starts,random);
    var nodes=0;
    function walk(path,seen,target){
      if(++nodes>maxNodes)return null;
      if(path.length===target)return path.slice();
      var last=path[path.length-1],next=neighbours4(last).filter(function(p){return !seen[key(p)]&&transition(solution[last[0]][last[1]],solution[p[0]][p[1]],last,p,path);});shuffle(next,random);
      for(var i=0;i<next.length;i++){var p=next[i],k=key(p);seen[k]=1;path.push(p);var found=walk(path,seen,target);if(found)return found;path.pop();delete seen[k];if(nodes>maxNodes)return null;}
      return null;
    }
    var lengths=[];for(var len=minLength;len<=maxLength;len++)lengths.push(len);shuffle(lengths,random);
    for(var si=0;si<Math.min(maxStarts,starts.length);si++)for(var li=0;li<lengths.length;li++){
      var start=starts[si],seen={};seen[key(start)]=1;var found=walk([start],seen,lengths[li]);if(found&&validateSimplePath(found,{minLength:minLength,maxLength:maxLength}))return {path:found,nodes:nodes};
      if(nodes>maxNodes)break;
    }
    throw new Error(EXHAUSTED+': line topology');
  }

  function canonicalPath(path,directed){
    var forward=path.map(key).join(';');if(directed)return forward;var reverse=path.slice().reverse().map(key).join(';');return forward<reverse?forward:reverse;
  }
  function topologyFingerprint(lines,options){options=options||{};var normalized=(lines||[]).map(function(line){var cells=Array.isArray(line)?line:line.cells;return canonicalPath(cells,!!options.directed);}).sort();return normalized.join('|');}

  function makeWhispersPilot(generator,variant,seed,difficulty,options){
    options=options||{};
    var targets=options.targets||{gentle:40,focused:32,expert:27},target=targets[difficulty]||targets.focused,maxTopologyAttempts=options.maxTopologyAttempts||8,maxLines=options.maxLines||4;
    for(var attempt=0;attempt<maxTopologyAttempts;attempt++){
      var attemptSeed=((seed>>>0)^Math.imul(attempt+1,0x85EBCA6B))>>>0,fresh=freshStandardSolution(attemptSeed,options.solutionOptions),solution=fresh.grid,lines=[],seenTopology={};
      for(var lineIndex=0;lineIndex<maxLines;lineIndex++){
        var built;
        try{built=buildTransitionPath(solution,(attemptSeed^Math.imul(lineIndex+1,0xC2B2AE35))>>>0,{minLength:options.minLength||4,maxLength:options.maxLength||7,maxNodes:options.pathNodeLimit||3000,transition:function(a,b){return Math.abs(a-b)>=5;}});}catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)break;throw error;}
        var fp=canonicalPath(built.path,false);if(seenTopology[fp])continue;seenTopology[fp]=1;lines.push(built.path);
        var candidate=JSON.parse(JSON.stringify(variant));candidate.solution=cloneGrid(solution);candidate.data=Object.assign({},candidate.data||{},{lines:lines.map(function(line){return line.map(function(p){return p.slice();});})});
        var grid=cloneGrid(solution),order=Array.from({length:81},function(_,i){return i;}),random=rng((attemptSeed^0x43415256^lineIndex)>>>0),clues=81;shuffle(order,random);
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
        candidate.puzzle=grid;candidate.generation={seed:seed>>>0,clues:clues,unique:true,verification:'solver-verified',generatorFamily:'line-whispers-fresh-fill-mrv',solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:(stats.nodes||0)+(stats.branches||0)*3+(stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,topologyFingerprint:topologyFingerprint(lines,{directed:false}),lineCount:lines.length,pilot:true};
        return candidate;
      }
    }
    throw new Error(EXHAUSTED+': Whispers pilot');
  }

  root.LineGeneratorCore={EXHAUSTED:EXHAUSTED,cloneGrid:cloneGrid,rng:rng,shuffle:shuffle,freshStandardSolution:freshStandardSolution,neighbours4:neighbours4,validateSimplePath:validateSimplePath,buildTransitionPath:buildTransitionPath,topologyFingerprint:topologyFingerprint,makeWhispersPilot:makeWhispersPilot};
})(globalThis);
