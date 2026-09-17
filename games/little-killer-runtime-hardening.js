(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var baseCountVariantSolutions=generator.countVariantSolutions;
  var BIT_COUNT=Array(512),LOW_DIGIT=Array(512),HIGH_DIGIT=Array(512),DIGIT_FOR_BIT=Array(512),TAIL_PAIR_MASK=Array.from({length:19},function(){return Array(512).fill(0);});
  for(var pm=0;pm<512;pm++){
    var pc=0,px=pm;while(px){px&=px-1;pc++;}BIT_COUNT[pm]=pc;
    var lo=0,hi=0;for(var pd=1;pd<=9;pd++)if(pm&(1<<(pd-1))){if(!lo)lo=pd;hi=pd;}LOW_DIGIT[pm]=lo;HIGH_DIGIT[pm]=hi;
  }
  for(pd=1;pd<=9;pd++)DIGIT_FOR_BIT[1<<(pd-1)]=pd;
  for(var ps=2;ps<=18;ps++)for(pm=0;pm<512;pm++){
    var allowed=0;for(pd=1;pd<=9;pd++){var other=ps-pd;if(other>=1&&other<=9&&(pm&(1<<(other-1))))allowed|=1<<(pd-1);}TAIL_PAIR_MASK[ps][pm]=allowed;
  }

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function gridClone(g){return g.map(function(row){return row.slice();});}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}

  function sudokuAutomorphism(base,seed){
    var n=base.length,random=rng(seed>>>0),digits=Array.from({length:n},function(_,i){return i+1;}),bands=[0,1,2],stacks=[0,1,2],rows=[],cols=[];
    shuffle(digits,random);shuffle(bands,random);shuffle(stacks,random);
    bands.forEach(function(b){var within=[0,1,2];shuffle(within,random);within.forEach(function(x){rows.push(b*3+x);});});
    stacks.forEach(function(s){var within=[0,1,2];shuffle(within,random);within.forEach(function(x){cols.push(s*3+x);});});
    var rowInverse=Array(n),colInverse=Array(n);
    rows.forEach(function(oldRow,newRow){rowInverse[oldRow]=newRow;});
    cols.forEach(function(oldCol,newCol){colInverse[oldCol]=newCol;});
    return{solution:rows.map(function(r){return cols.map(function(c){return digits[base[r][c]-1];});}),rowInverse:rowInverse,colInverse:colInverse};
  }

  function transformedCloneVariant(variant,seed){
    var transformed=sudokuAutomorphism(variant.solution,(seed^0x434C4F4E)>>>0),out=clone(variant);
    out.solution=transformed.solution;
    if(out.data&&Array.isArray(out.data.clones))out.data.clones=out.data.clones.map(function(region){return region.map(function(p){return[transformed.rowInverse[p[0]],transformed.colInverse[p[1]]];});});
    return out;
  }
  function makeClone(variant,seed,difficulty){var working=transformedCloneVariant(variant,seed>>>0),out=baseMake.call(generator,working,seed>>>0,difficulty||'focused');out.generation=Object.assign({},out.generation||{},{generatorFamily:'clone-seeded-sudoku-automorphism',structuralDiversity:'row-column-band-stack-permutation',topologyTransformed:true});return out;}

  function diagonalCells(r,c,dr,dc,n){var cells=[];while(r>=0&&r<n&&c>=0&&c<n){cells.push([r,c]);r+=dr;c+=dc;}return cells;}
  function diagonalKey(cells){var a=cells.map(function(p){return p[0]+','+p[1];}).join(';'),b=cells.slice().reverse().map(function(p){return p[0]+','+p[1];}).join(';');return a<b?a:b;}
  function sideCandidates(side,n){var out=[];function add(r,c,dr,dc){var cells=diagonalCells(r,c,dr,dc,n);if(cells.length>=3)out.push({side:side,cells:cells,key:diagonalKey(cells)});}var i;if(side==='top')for(i=0;i<n;i++){add(0,i,1,-1);add(0,i,1,1);}else if(side==='bottom')for(i=0;i<n;i++){add(n-1,i,-1,-1);add(n-1,i,-1,1);}else if(side==='left')for(i=0;i<n;i++){add(i,0,-1,1);add(i,0,1,1);}else if(side==='right')for(i=0;i<n;i++){add(i,n-1,-1,-1);add(i,n-1,1,-1);}return out;}

  function freshTopology(solution,seed,targetCount){
    var n=solution.length,random=rng((seed^0x544F504F)>>>0),allSides=['top','right','bottom','left'];shuffle(allSides,random);
    var activeCount=2+Math.floor(random()*3),sides=allSides.slice(0,activeCount),pools={},used={},chosen=[],sideCounts={top:0,right:0,bottom:0,left:0};
    sides.forEach(function(side){pools[side]=shuffle(sideCandidates(side,n),random);});
    var cursor=0,misses=0;while(chosen.length<targetCount&&misses<sides.length*3){var side=sides[cursor%sides.length],pool=pools[side],picked=false;while(pool.length){var cand=pool.shift();if(used[cand.key])continue;used[cand.key]=true;chosen.push(cand);sideCounts[side]++;picked=true;break;}misses=picked?0:misses+1;cursor++;}
    if(chosen.length<targetCount)throw new Error('Little Killer topology pool exhausted');shuffle(chosen,random);
    var clues=chosen.map(function(cand){return{sum:cand.cells.reduce(function(total,p){return total+solution[p[0]][p[1]];},0),cells:cand.cells};});
    return{clues:clues,sideCounts:sideCounts,sideOrder:sides.slice(),activeSideCount:activeCount};
  }

  function compileClues(clues,n){
    var cellClues=Array.from({length:n*n},function(){return[];}),cellRows=Array(n*n),cellCols=Array(n*n),compiled=[];
    for(var idx=0;idx<n*n;idx++){cellRows[idx]=Math.floor(idx/n);cellCols[idx]=idx%n;}
    clues.forEach(function(cl,ci){var cells=cl.cells.map(function(p){var idx=p[0]*n+p[1];cellClues[idx].push(ci);return idx;});compiled.push({sum:cl.sum,cells:cells});});
    return{raw:clues,n:n,clues:compiled,cellClues:cellClues,cellRows:cellRows,cellCols:cellCols};
  }

  function makeSolverState(source,cluesOrCompiled){
    var n=source.length,compiled=cluesOrCompiled&&cluesOrCompiled.cellClues?cluesOrCompiled:compileClues(cluesOrCompiled,n),clues=compiled.clues,cellClues=compiled.cellClues,cellRows=compiled.cellRows,cellCols=compiled.cellCols;
    if(!cellRows||!cellCols){cellRows=Array(n*n);cellCols=Array(n*n);for(var pre=0;pre<n*n;pre++){cellRows[pre]=Math.floor(pre/n);cellCols[pre]=pre%n;}}
    var full=(1<<n)-1,grid=gridClone(source),rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),clueSums=Array(clues.length).fill(0),clueEmpty=clues.map(function(cl){return cl.cells.length;}),exactTailChecks=0,tailMaskChecks=0;
    function box(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
    function baseMask(r,c){return full&~(rows[r]|cols[c]|boxes[box(r,c)]);}
    function tailRestrictedMask(idx,mask){
      var list=cellClues[idx];
      for(var li=0;li<list.length&&mask;li++){
        var ci=list[li],cl=clues[ci],empty=clueEmpty[ci],need=cl.sum-clueSums[ci];
        if(need<0)return 0;
        if(empty===1){
          tailMaskChecks++;
          if(need<1||need>n)return 0;
          mask&=1<<(need-1);
        }else if(empty===2){
          tailMaskChecks++;
          var partner=-1;
          for(var k=0;k<cl.cells.length;k++){var otherIdx=cl.cells[k];if(otherIdx!==idx&&!grid[cellRows[otherIdx]][cellCols[otherIdx]]){partner=otherIdx;break;}}
          if(partner<0||need<2||need>18)return 0;
          var partnerMask=baseMask(cellRows[partner],cellCols[partner]);if(!partnerMask)return 0;
          mask&=TAIL_PAIR_MASK[need][partnerMask];
        }
      }
      return mask;
    }
    function clueFeasible(ci){
      var cl=clues[ci],sum=clueSums[ci],empty=clueEmpty[ci],need=cl.sum-sum;
      if(need<0)return false;if(!empty)return need===0;
      if(empty===1){
        exactTailChecks++;
        for(var ek=0;ek<cl.cells.length;ek++){
          var eidx=cl.cells[ek],er=cellRows[eidx],ec=cellCols[eidx];if(grid[er][ec])continue;
          return need>=1&&need<=n&&!!(baseMask(er,ec)&(1<<(need-1)));
        }
        return false;
      }
      if(empty===2){
        exactTailChecks++;
        var a=-1,b=-1;
        for(var tk=0;tk<cl.cells.length;tk++){
          var tidx=cl.cells[tk],tr=cellRows[tidx],tc=cellCols[tidx];if(grid[tr][tc])continue;
          if(a<0)a=tidx;else{b=tidx;break;}
        }
        if(a<0||b<0)return false;
        var ma=baseMask(cellRows[a],cellCols[a]),mb=baseMask(cellRows[b],cellCols[b]);if(!ma||!mb)return false;
        return need>=2&&need<=18&&!!(ma&TAIL_PAIR_MASK[need][mb]);
      }
      var min=0,max=0;
      for(var k=0;k<cl.cells.length;k++){
        var idx=cl.cells[k],r=cellRows[idx],c=cellCols[idx];if(grid[r][c])continue;
        var mask=baseMask(r,c);if(!mask)return false;min+=LOW_DIGIT[mask];max+=HIGH_DIGIT[mask];
      }
      return min<=need&&need<=max;
    }
    function touchedFeasible(idx){var list=cellClues[idx];for(var i=0;i<list.length;i++)if(!clueFeasible(list[i]))return false;return true;}
    function applyClues(idx,d,delta){var list=cellClues[idx];for(var i=0;i<list.length;i++){clueSums[list[i]]+=delta*d;clueEmpty[list[i]]-=delta;}}
    function allowedMask(r,c){
      var idx=r*n+c,mask=tailRestrictedMask(idx,baseMask(r,c)),b=box(r,c),allowed=0;
      for(var bits=mask;bits;bits&=bits-1){
        var one=bits&-bits,d=DIGIT_FOR_BIT[one];grid[r][c]=d;rows[r]|=one;cols[c]|=one;boxes[b]|=one;applyClues(idx,d,1);
        if(touchedFeasible(idx))allowed|=one;
        applyClues(idx,d,-1);rows[r]^=one;cols[c]^=one;boxes[b]^=one;grid[r][c]=0;
      }
      return allowed;
    }
    function put(r,c,one){var d=DIGIT_FOR_BIT[one],b=box(r,c),idx=r*n+c;grid[r][c]=d;rows[r]|=one;cols[c]|=one;boxes[b]|=one;applyClues(idx,d,1);}
    function unput(r,c,one){var d=DIGIT_FOR_BIT[one],b=box(r,c),idx=r*n+c;applyClues(idx,d,-1);rows[r]^=one;cols[c]^=one;boxes[b]^=one;grid[r][c]=0;}
    function getExactTailChecks(){return exactTailChecks;}
    function getTailMaskChecks(){return tailMaskChecks;}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      var v=grid[r][c];if(!v)continue;var bit=1<<(v-1),b=box(r,c),idx=r*n+c;
      if((rows[r]|cols[c]|boxes[b])&bit)return null;
      rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;applyClues(idx,v,1);
    }
    for(var ci=0;ci<clues.length;ci++)if(!clueFeasible(ci))return null;
    return{n:n,grid:grid,rows:rows,cols:cols,boxes:boxes,box:box,baseMask:baseMask,tailRestrictedMask:tailRestrictedMask,touchedFeasible:touchedFeasible,allowedMask:allowedMask,put:put,unput:unput,cellClues:cellClues,getExactTailChecks:getExactTailChecks,getTailMaskChecks:getTailMaskChecks};
  }

  function solveCount(source,cluesOrCompiled,limit,nodeBudget){
    limit=limit||2;nodeBudget=nodeBudget||120000;
    var state=makeSolverState(source,cluesOrCompiled);if(!state)return{count:0,nodes:0,exhausted:false};
    var n=state.n,grid=state.grid,rows=state.rows,cols=state.cols,boxes=state.boxes,box=state.box,baseMask=state.baseMask,touchedFeasible=state.touchedFeasible;
    var found=0,nodes=0,exhausted=false;
    function visit(){
      if(found>=limit||exhausted)return;if(++nodes>nodeBudget){exhausted=true;return;}
      var br=-1,bc=-1,bm=0,best=n+1;
      for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(!grid[r][c]){
        var mask=baseMask(r,c),count=BIT_COUNT[mask];if(!count)return;
        if(count<best){br=r;bc=c;bm=mask;best=count;if(count===1)break;}
      }
      if(br<0){found++;return;}
      var idx=br*n+bc,b=box(br,bc),allowed=0;
      for(var bits=bm;bits;bits&=bits-1){
        var one=bits&-bits,d=DIGIT_FOR_BIT[one];state.put(br,bc,one);
        if(touchedFeasible(idx))allowed|=one;
        state.unput(br,bc,one);
      }
      if(!allowed)return;
      for(bits=allowed;bits;bits&=bits-1){
        one=bits&-bits;state.put(br,bc,one);visit();state.unput(br,bc,one);
        if(found>=limit||exhausted)return;
      }
    }
    visit();return{count:found,nodes:nodes,exhausted:exhausted};
  }

  function findAlternativeSolution(source,cluesOrCompiled,knownSolution,nodeBudget){
    nodeBudget=nodeBudget||120000;
    var state=makeSolverState(source,cluesOrCompiled);if(!state)return{alternative:false,nodes:0,exhausted:false,forced:0,exactTailChecks:0,tailMaskChecks:0};
    var n=state.n,grid=state.grid,baseMask=state.baseMask,tailRestrictedMask=state.tailRestrictedMask,allowedMask=state.allowedMask,put=state.put,unput=state.unput,cellClues=state.cellClues,touchedFeasible=state.touchedFeasible;
    var found=false,nodes=0,exhausted=false,forcedCount=0;
    function visit(differs){
      if(found||exhausted)return;
      if(++nodes>nodeBudget){exhausted=true;return;}
      var forced=[],changed=true,contradiction=false;
      while(changed&&!contradiction){
        changed=false;
        for(var r=0;r<n&&!changed;r++)for(var c=0;c<n;c++)if(!grid[r][c]){
          var forcedIdx=r*n+c,forcedMask=tailRestrictedMask(forcedIdx,baseMask(r,c)),forcedN=BIT_COUNT[forcedMask];
          if(!forcedN){contradiction=true;break;}
          if(forcedN===1){
            var forcedBit=forcedMask&-forcedMask;put(r,c,forcedBit);
            if(cellClues[forcedIdx].length&&!touchedFeasible(forcedIdx)){unput(r,c,forcedBit);contradiction=true;break;}
            forced.push([r,c,forcedBit]);forcedCount++;
            if(DIGIT_FOR_BIT[forcedBit]!==knownSolution[r][c])differs=true;
            changed=true;break;
          }
        }
      }
      if(!contradiction){
        var br=-1,bc=-1,bm=0,best=n+1;
        for(r=0;r<n;r++)for(c=0;c<n;c++)if(!grid[r][c]){
          var mask=allowedMask(r,c),count=BIT_COUNT[mask];if(!count){contradiction=true;break;}
          if(count<best){br=r;bc=c;bm=mask;best=count;if(count===1)break;}
        }
        if(!contradiction){
          if(br<0){if(differs)found=true;}
          else{
            var knownBit=1<<(knownSolution[br][bc]-1),nonKnown=bm&~knownBit;
            for(var bits=nonKnown;bits&&!found&&!exhausted;bits&=bits-1){var one=bits&-bits;put(br,bc,one);visit(true);unput(br,bc,one);}
            if(!found&&!exhausted&&(bm&knownBit)){put(br,bc,knownBit);visit(differs);unput(br,bc,knownBit);}
          }
        }
      }
      for(var i=forced.length-1;i>=0;i--){var f=forced[i];unput(f[0],f[1],f[2]);}
    }
    visit(false);return{alternative:found,nodes:nodes,exhausted:exhausted,forced:forcedCount,exactTailChecks:state.getExactTailChecks(),tailMaskChecks:state.getTailMaskChecks()};
  }

  function countLittleKillerSolutions(source,variantOrClues,limit){var clues=Array.isArray(variantOrClues)?variantOrClues:((variantOrClues&&variantOrClues.data&&variantOrClues.data.clues)||[]);var result=solveCount(source,clues,limit||2,180000);return result.exhausted?(limit||2):result.count;}
  function targetFor(difficulty){return difficulty==='gentle'?44:(difficulty==='focused'?36:0);}

  function makeLittleKiller(variant,seed,difficulty){
    difficulty=difficulty||'focused';var densityTarget=targetFor(difficulty),expert=difficulty==='expert';
    for(var attempt=0;attempt<5;attempt++){
      var actual=((seed>>>0)^0x4C4B4745^Math.imul(attempt+1,0x9E3779B1))>>>0,solution=sudokuAutomorphism(variant.solution,(actual^0x4C4B5355)>>>0).solution,topology=freshTopology(solution,actual,12),clues=topology.clues,compiled=compileClues(clues,9);
      var grid=gridClone(solution),order=shuffle(Array.from({length:81},function(_,i){return i;}),rng(actual^0x524D564C)),clueCount=81,totalNodes=0,totalForced=0,totalExactTailChecks=0,totalTailMaskChecks=0,budgetHit=false,essentialReached=false,postEssentialChecks=0,postEssentialBudgetHits=0;
      for(var oi=0;oi<order.length;oi++){
        if(essentialReached&&!expert&&densityTarget&&clueCount<=densityTarget)break;
        var idx=order[oi],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;
        var check=findAlternativeSolution(grid,compiled,solution,9000);totalNodes+=check.nodes;totalForced+=check.forced||0;totalExactTailChecks+=check.exactTailChecks||0;totalTailMaskChecks+=check.tailMaskChecks||0;
        if(check.exhausted){grid[r][c]=old;budgetHit=true;if(essentialReached)postEssentialBudgetHits++;continue;}
        if(check.alternative){grid[r][c]=old;continue;}clueCount--;
        if(!essentialReached&&clueCount<=45&&generator.countSolutions(grid,2)>1){essentialReached=true;continue;}
        if(essentialReached)postEssentialChecks++;
      }
      var exact=findAlternativeSolution(grid,compiled,solution,30000);totalNodes+=exact.nodes;totalForced+=exact.forced||0;totalExactTailChecks+=exact.exactTailChecks||0;totalTailMaskChecks+=exact.tailMaskChecks||0;var classic=generator.countSolutions(grid,2);
      if(essentialReached&&!exact.exhausted&&!exact.alternative&&classic>1&&(!densityTarget||clueCount<=densityTarget)){
        var out=clone(variant);out.solution=solution;out.puzzle=grid;out.data=Object.assign({},out.data||{},{clues:clues});
        out.generation={seed:seed>>>0,clues:clueCount,unique:true,variantEssential:true,verification:'little-killer-tail-mask-proof',generatorFamily:'little-killer-bounded-structural-sum-aware',mode:'seeded-variant-essential',topology:{clueCount:clues.length,sideCounts:topology.sideCounts,usedSides:topology.sideOrder,activeSideCount:topology.activeSideCount},search:{nodes:totalNodes,forced:totalForced,exactTailChecks:totalExactTailChecks,tailMaskChecks:totalTailMaskChecks,budgetHit:budgetHit,attempt:attempt,postEssentialChecks:postEssentialChecks,postEssentialBudgetHits:postEssentialBudgetHits},playabilityCarving:{policy:expert?'optimized-tail-mask-local-irreducibility-pass':'difficulty-density-target',targetGivens:densityTarget||null,locallyIrreducible:expert&&postEssentialBudgetHits===0,irreducibilityDeferred:null}};
        return out;
      }
    }
    throw new Error('Little Killer bounded generation failed for seed '+seed+' / '+difficulty);
  }

  generator.countLittleKillerSolutions=countLittleKillerSolutions;generator._littleKillerSolveCount=solveCount;generator._compileLittleKillerClues=compileClues;generator._littleKillerFindAlternative=findAlternativeSolution;
  generator.countVariantSolutions=function(grid,variant,limit,stats){if(variant&&variant.kind==='littlekiller')return countLittleKillerSolutions(grid,variant,limit);return baseCountVariantSolutions.call(this,grid,variant,limit,stats);};
  generator.make=function(variant,seed,difficulty){if(variant&&variant.kind==='littlekiller')return makeLittleKiller(variant,seed,difficulty);if(variant&&variant.kind==='clone')return makeClone(variant,seed,difficulty);return baseMake.call(this,variant,seed,difficulty);};
})(typeof window!=='undefined'?window:globalThis);
