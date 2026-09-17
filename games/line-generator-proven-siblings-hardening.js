(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.LineGeneratorProvenSiblings)return;
  var generator=root.SudokuGenerator,siblings=root.LineGeneratorProvenSiblings,baseMake=generator.make,baseCountVariantSolutions=generator.countVariantSolutions;
  var lineIndexCache=typeof WeakMap!=='undefined'?new WeakMap():null;

  function bitCount(x){var count=0;while(x){x&=x-1;count+=1;}return count;}
  function bitToDigit(bit){return 1+Math.round(Math.log(bit)/Math.LN2);}
  function boxDims(n){if(n===4)return[2,2];if(n===6)return[2,3];if(n===9)return[3,3];var h=Math.floor(Math.sqrt(n));return[h,Math.floor(n/h)];}
  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(list,random){for(var i=list.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=list[i];list[i]=list[j];list[j]=t;}return list;}
  function lineIndex(variant,n){
    if(lineIndexCache&&lineIndexCache.has(variant))return lineIndexCache.get(variant);
    var raw=(variant.data&&variant.data.lines)||[],lines=[],cells=Array.from({length:n},function(){return Array.from({length:n},function(){return[];});});
    for(var i=0;i<raw.length;i++){
      var line=Array.isArray(raw[i])?raw[i]:(raw[i]&&raw[i].cells)||[];
      var id=lines.length;lines.push(line);
      for(var j=0;j<line.length;j++){var p=line[j];cells[p[0]][p[1]].push(id);}
    }
    var out={lines:lines,cells:cells};if(lineIndexCache)lineIndexCache.set(variant,out);return out;
  }
  function expandedForbidden(mask,full){return(mask|((mask<<1)&full)|(mask>>>1))&full;}
  function countNabnerSolutions(source,variant,limit,stats){
    stats=stats||{};stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.propagated=0;
    var capture=stats.captureSolutions===true;if(capture)stats.witnesses=[];
    var grid=cloneGrid(source),n=grid.length,dims=boxDims(n),bh=dims[0],bw=dims[1],full=(1<<n)-1,index=lineIndex(variant,n);
    var rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),lineMasks=Array(index.lines.length).fill(0),r,c;
    function boxOf(rr,cc){return Math.floor(rr/bh)*Math.floor(n/bw)+Math.floor(cc/bw);}
    for(r=0;r<n;r++)for(c=0;c<n;c++){
      var value=grid[r][c];if(!value)continue;
      var bit=1<<(value-1),box=boxOf(r,c);
      if((rows[r]|cols[c]|boxes[box])&bit)return 0;
      rows[r]|=bit;cols[c]|=bit;boxes[box]|=bit;
      var memberships=index.cells[r][c]||[];
      for(var mi=0;mi<memberships.length;mi++){
        var lineId=memberships[mi],used=lineMasks[lineId];
        if(expandedForbidden(used,full)&bit)return 0;
        lineMasks[lineId]=used|bit;
      }
    }
    function candidateMask(rr,cc){
      var mask=full&~(rows[rr]|cols[cc]|boxes[boxOf(rr,cc)]),memberships=index.cells[rr][cc]||[];
      for(var i=0;i<memberships.length&&mask;i++)mask&=~expandedForbidden(lineMasks[memberships[i]],full);
      return mask&full;
    }
    function nabnerPressure(rr,cc){
      var memberships=index.cells[rr][cc]||[],score=memberships.length*n;
      for(var i=0;i<memberships.length;i++)score+=bitCount(expandedForbidden(lineMasks[memberships[i]],full));
      return score;
    }
    function placeForced(rr,cc,one,trail){
      var bx=boxOf(rr,cc),memberships=index.cells[rr][cc]||[];
      grid[rr][cc]=bitToDigit(one);rows[rr]|=one;cols[cc]|=one;boxes[bx]|=one;
      for(var mi=0;mi<memberships.length;mi++)lineMasks[memberships[mi]]|=one;
      trail.push([rr,cc,one]);stats.propagated+=1;
    }
    function rollback(trail){
      for(var i=trail.length-1;i>=0;i--){
        var rr=trail[i][0],cc=trail[i][1],one=trail[i][2],bx=boxOf(rr,cc),memberships=index.cells[rr][cc]||[];
        for(var mi=0;mi<memberships.length;mi++)lineMasks[memberships[mi]]^=one;
        rows[rr]^=one;cols[cc]^=one;boxes[bx]^=one;grid[rr][cc]=0;
      }
    }
    function propagate(trail){
      while(true){
        var forced=null;
        outer:for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
          var mask=candidateMask(rr,cc),cnt=bitCount(mask);
          if(cnt===0)return false;
          if(cnt===1){forced=[rr,cc,mask];break outer;}
        }
        if(!forced)return true;
        placeForced(forced[0],forced[1],forced[2],trail);
      }
    }
    var found=0;
    function visit(){
      if(found>=limit)return;
      stats.nodes+=1;
      var forced=[];
      if(!propagate(forced)){stats.deadEnds+=1;rollback(forced);return;}
      var br=-1,bc=-1,bm=0,best=n+1,bestPressure=-1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var mask=candidateMask(rr,cc),cnt=bitCount(mask),pressure=nabnerPressure(rr,cc);
        if(cnt<best||(cnt===best&&pressure>bestPressure)){br=rr;bc=cc;bm=mask;best=cnt;bestPressure=pressure;}
      }
      if(br<0){found+=1;if(capture)stats.witnesses.push(grid.map(function(row){return row.join('');}).join(''));rollback(forced);return;}
      if(bitCount(bm)>1)stats.branches+=1;
      var bx=boxOf(br,bc),memberships=index.cells[br][bc]||[];
      for(var bits=bm;bits&&found<limit;bits&=bits-1){
        var one=bits&-bits;
        grid[br][bc]=bitToDigit(one);rows[br]|=one;cols[bc]|=one;boxes[bx]|=one;
        for(var mi=0;mi<memberships.length;mi++)lineMasks[memberships[mi]]|=one;
        visit();
        for(mi=0;mi<memberships.length;mi++)lineMasks[memberships[mi]]^=one;
        rows[br]^=one;cols[bc]^=one;boxes[bx]^=one;grid[br][bc]=0;
      }
      rollback(forced);
    }
    visit();return found;
  }

  function countLockoutSolutions(source,variant,limit,stats){
    stats=stats||{};stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.propagated=0;
    var capture=stats.captureSolutions===true;if(capture)stats.witnesses=[];
    var grid=cloneGrid(source),n=grid.length,dims=boxDims(n),bh=dims[0],bw=dims[1],full=(1<<n)-1,index=lineIndex(variant,n);
    var rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),r,c;
    function boxOf(rr,cc){return Math.floor(rr/bh)*Math.floor(n/bw)+Math.floor(cc/bw);}
    function baseMask(rr,cc){return full&~(rows[rr]|cols[cc]|boxes[boxOf(rr,cc)]);}
    for(r=0;r<n;r++)for(c=0;c<n;c++){
      var value=grid[r][c];if(!value)continue;
      var bit=1<<(value-1),box=boxOf(r,c);
      if((rows[r]|cols[c]|boxes[box])&bit)return 0;
      rows[r]|=bit;cols[c]|=bit;boxes[box]|=bit;
    }
    function endpointMask(p){var value=grid[p[0]][p[1]];return value?(1<<(value-1)):baseMask(p[0],p[1]);}
    function lineFeasible(line){
      if(!line||line.length<2)return true;
      var leftMask=endpointMask(line[0]),rightMask=endpointMask(line[line.length-1]);
      if(!leftMask||!rightMask)return false;
      for(var lb=leftMask;lb;lb&=lb-1){
        var lbit=lb&-lb,a=bitToDigit(lbit);
        for(var rb=rightMask;rb;rb&=rb-1){
          var rbit=rb&-rb,b=bitToDigit(rbit);if(a===b)continue;
          var lo=Math.min(a,b),hi=Math.max(a,b),ok=true;
          for(var j=1;j<line.length-1;j++){
            var p=line[j],v=grid[p[0]][p[1]];
            if(v&&v>lo&&v<hi){ok=false;break;}
          }
          if(ok)return true;
        }
      }
      return false;
    }
    function affectedFeasible(rr,cc){
      var memberships=index.cells[rr][cc]||[];
      for(var i=0;i<memberships.length;i++)if(!lineFeasible(index.lines[memberships[i]]))return false;
      return true;
    }
    for(var li=0;li<index.lines.length;li++)if(!lineFeasible(index.lines[li]))return 0;
    function candidateMask(rr,cc){
      var mask=baseMask(rr,cc),out=0;
      for(var bits=mask;bits;bits&=bits-1){
        var one=bits&-bits;grid[rr][cc]=bitToDigit(one);
        if(affectedFeasible(rr,cc))out|=one;
        grid[rr][cc]=0;
      }
      return out;
    }
    function lockoutPressure(rr,cc){
      var memberships=index.cells[rr][cc]||[],score=memberships.length*n;
      for(var i=0;i<memberships.length;i++)score+=index.lines[memberships[i]].length;
      return score;
    }
    function place(rr,cc,one,trail,propagated){
      var bx=boxOf(rr,cc);grid[rr][cc]=bitToDigit(one);rows[rr]|=one;cols[cc]|=one;boxes[bx]|=one;
      trail.push([rr,cc,one]);if(propagated)stats.propagated+=1;
    }
    function rollback(trail){
      for(var i=trail.length-1;i>=0;i--){var rr=trail[i][0],cc=trail[i][1],one=trail[i][2],bx=boxOf(rr,cc);rows[rr]^=one;cols[cc]^=one;boxes[bx]^=one;grid[rr][cc]=0;}
    }
    function propagate(trail){
      while(true){
        var forced=null;
        outer:for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
          var mask=candidateMask(rr,cc),cnt=bitCount(mask);
          if(cnt===0)return false;
          if(cnt===1){forced=[rr,cc,mask];break outer;}
        }
        if(!forced)return true;
        place(forced[0],forced[1],forced[2],trail,true);
      }
    }
    var found=0;
    function visit(){
      if(found>=limit)return;
      stats.nodes+=1;
      var forced=[];
      if(!propagate(forced)){stats.deadEnds+=1;rollback(forced);return;}
      var br=-1,bc=-1,bm=0,best=n+1,bestPressure=-1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var mask=candidateMask(rr,cc),cnt=bitCount(mask),pressure=lockoutPressure(rr,cc);
        if(cnt<best||(cnt===best&&pressure>bestPressure)){br=rr;bc=cc;bm=mask;best=cnt;bestPressure=pressure;}
      }
      if(br<0){found+=1;if(capture)stats.witnesses.push(grid.map(function(row){return row.join('');}).join(''));rollback(forced);return;}
      if(bitCount(bm)>1)stats.branches+=1;
      var bx=boxOf(br,bc);
      for(var bits=bm;bits&&found<limit;bits&=bits-1){
        var one=bits&-bits;grid[br][bc]=bitToDigit(one);rows[br]|=one;cols[bc]|=one;boxes[bx]|=one;
        visit();
        rows[br]^=one;cols[bc]^=one;boxes[bx]^=one;grid[br][bc]=0;
      }
      rollback(forced);
    }
    visit();return found;
  }

  function expertCarveSalt(id){return id==='nabner'?0x4E414243:(id==='lockout'?0x4C4F4343:0x45585043);}
  function carveExpertLocallyIrreducible(out,seed){
    var grid=cloneGrid(out.puzzle),order=[],n=grid.length,accepted=0,rejected=0,id=out.id||'variant';
    for(var i=0;i<n*n;i++)if(grid[Math.floor(i/n)][i%n])order.push(i);
    shuffle(order,rng(((seed>>>0)^expertCarveSalt(id))>>>0));
    for(var oi=0;oi<order.length;oi++){
      var idx=order[oi],r=Math.floor(idx/n),c=idx%n,old=grid[r][c];
      if(!old)continue;
      grid[r][c]=0;
      if(generator.countVariantSolutions(grid,out,2)===1)accepted++;
      else{grid[r][c]=old;rejected++;}
    }
    var clues=grid.reduce(function(sum,row){return sum+row.filter(Boolean).length;},0);
    if(generator.countVariantSolutions(grid,out,2)!==1)throw new Error(id+' expert local carve lost uniqueness');
    if(generator.countSolutions(grid,2)<=1)throw new Error(id+' expert local carve lost variant essentiality');
    out.puzzle=grid;
    out.generation.clues=clues;
    out.generation.policy='contract-driven-local-irreducibility';
    out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
    out.generation.locallyIrreducibleUnderProductionContract=true;
    out.generation.acceptedRemovals=accepted;
    out.generation.rejectedRemovals=rejected;
    return out;
  }

  generator.countVariantSolutions=function(source,variant,limit,stats){
    if(variant&&variant.id==='nabner')return countNabnerSolutions(source,variant,limit,stats);
    if(variant&&variant.id==='lockout')return countLockoutSolutions(source,variant,limit,stats);
    return baseCountVariantSolutions.call(this,source,variant,limit,stats);
  };
  generator.make=function(variant,seed,difficulty){
    if(variant&&(variant.id==='nabner'||variant.id==='palindrome'||variant.id==='lockout')){
      var resolvedDifficulty=difficulty||'focused';
      var out=siblings.makeVariantPilot(generator,variant,seed,resolvedDifficulty);
      out.generation.pilot=false;
      out.generation.mode='seeded-variant-essential';
      if(variant.id==='nabner')out.generation.verification='nabner-naked-single-pressure-mrv-exact-v2';
      if(variant.id==='lockout')out.generation.verification='lockout-feasible-endpoint-pressure-mrv-exact-v2';
      if(resolvedDifficulty==='expert'&&(variant.id==='nabner'||variant.id==='lockout'))out=carveExpertLocallyIrreducible(out,seed);
      return out;
    }
    return baseMake.call(this,variant,seed,difficulty);
  };
})(typeof window!=='undefined'?window:globalThis);
