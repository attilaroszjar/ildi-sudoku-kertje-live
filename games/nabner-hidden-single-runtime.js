(function(root){
  'use strict';
  if(!root.SudokuGenerator||root.NabnerHiddenSingleRuntime)return;
  var generator=root.SudokuGenerator,baseCount=generator.countVariantSolutions;
  if(typeof baseCount!=='function')return;

  var lineIndexCache=typeof WeakMap!=='undefined'?new WeakMap():null;
  function bitCount(x){var count=0;while(x){x&=x-1;count++;}return count;}
  function bitToDigit(bit){return 1+Math.round(Math.log(bit)/Math.LN2);}
  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function lineIndex(variant,n){
    if(lineIndexCache&&lineIndexCache.has(variant))return lineIndexCache.get(variant);
    var raw=(variant.data&&variant.data.lines)||[],lines=[],cells=Array.from({length:n},function(){return Array.from({length:n},function(){return[];});});
    for(var i=0;i<raw.length;i++){
      var line=Array.isArray(raw[i])?raw[i]:(raw[i]&&raw[i].cells)||[],id=lines.length;
      lines.push(line);
      for(var j=0;j<line.length;j++){var p=line[j];cells[p[0]][p[1]].push(id);}
    }
    var out={lines:lines,cells:cells};if(lineIndexCache)lineIndexCache.set(variant,out);return out;
  }
  function expandedForbidden(mask,full){return(mask|((mask<<1)&full)|(mask>>>1))&full;}

  function countNabnerSolutions(source,variant,limit,stats){
    stats=stats||{};stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.propagated=0;stats.nakedSingles=0;stats.hiddenSingles=0;
    var capture=stats.captureSolutions===true;if(capture)stats.witnesses=[];
    var grid=cloneGrid(source),n=grid.length,full=(1<<n)-1,index=lineIndex(variant,n),bh=3,bw=3;
    var rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),lineMasks=Array(index.lines.length).fill(0);
    function boxOf(r,c){return Math.floor(r/bh)*3+Math.floor(c/bw);}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
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
    function pressure(rr,cc){
      var memberships=index.cells[rr][cc]||[],score=memberships.length*n;
      for(var i=0;i<memberships.length;i++)score+=bitCount(expandedForbidden(lineMasks[memberships[i]],full));
      return score;
    }
    function place(rr,cc,one,trail,kind){
      var box=boxOf(rr,cc),memberships=index.cells[rr][cc]||[];
      grid[rr][cc]=bitToDigit(one);rows[rr]|=one;cols[cc]|=one;boxes[box]|=one;
      for(var i=0;i<memberships.length;i++)lineMasks[memberships[i]]|=one;
      trail.push([rr,cc,one]);stats.propagated++;
      if(kind==='naked')stats.nakedSingles++;else if(kind==='hidden')stats.hiddenSingles++;
    }
    function rollback(trail){
      for(var i=trail.length-1;i>=0;i--){
        var rr=trail[i][0],cc=trail[i][1],one=trail[i][2],box=boxOf(rr,cc),memberships=index.cells[rr][cc]||[];
        for(var j=0;j<memberships.length;j++)lineMasks[memberships[j]]^=one;
        rows[rr]^=one;cols[cc]^=one;boxes[box]^=one;grid[rr][cc]=0;
      }
    }
    function hiddenInRow(rr){
      var missing=full&~rows[rr];
      for(var bits=missing;bits;bits&=bits-1){
        var one=bits&-bits,hit=-1,count=0;
        for(var cc=0;cc<n;cc++)if(!grid[rr][cc]&&(candidateMask(rr,cc)&one)){hit=cc;if(++count>1)break;}
        if(count===0)return[-1,-1,0];
        if(count===1)return[rr,hit,one];
      }
      return null;
    }
    function hiddenInCol(cc){
      var missing=full&~cols[cc];
      for(var bits=missing;bits;bits&=bits-1){
        var one=bits&-bits,hit=-1,count=0;
        for(var rr=0;rr<n;rr++)if(!grid[rr][cc]&&(candidateMask(rr,cc)&one)){hit=rr;if(++count>1)break;}
        if(count===0)return[-1,-1,0];
        if(count===1)return[hit,cc,one];
      }
      return null;
    }
    function hiddenInBox(box){
      var missing=full&~boxes[box],r0=Math.floor(box/3)*3,c0=(box%3)*3;
      for(var bits=missing;bits;bits&=bits-1){
        var one=bits&-bits,hr=-1,hc=-1,count=0;
        outer:for(var dr=0;dr<3;dr++)for(var dc=0;dc<3;dc++){
          var rr=r0+dr,cc=c0+dc;if(!grid[rr][cc]&&(candidateMask(rr,cc)&one)){hr=rr;hc=cc;if(++count>1)break outer;}
        }
        if(count===0)return[-1,-1,0];
        if(count===1)return[hr,hc,one];
      }
      return null;
    }
    function propagate(trail){
      while(true){
        var forced=null;
        outer:for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
          var mask=candidateMask(rr,cc),cnt=bitCount(mask);
          if(cnt===0)return false;
          if(cnt===1){forced=[rr,cc,mask,'naked'];break outer;}
        }
        if(forced){place(forced[0],forced[1],forced[2],trail,forced[3]);continue;}
        for(rr=0;rr<n&&!forced;rr++){var h=hiddenInRow(rr);if(h){if(!h[2])return false;forced=[h[0],h[1],h[2],'hidden'];}}
        for(cc=0;cc<n&&!forced;cc++){h=hiddenInCol(cc);if(h){if(!h[2])return false;forced=[h[0],h[1],h[2],'hidden'];}}
        for(var b=0;b<n&&!forced;b++){h=hiddenInBox(b);if(h){if(!h[2])return false;forced=[h[0],h[1],h[2],'hidden'];}}
        if(!forced)return true;
        place(forced[0],forced[1],forced[2],trail,forced[3]);
      }
    }
    var found=0,cap=limit||2;
    function visit(){
      if(found>=cap)return;
      stats.nodes++;
      var forced=[];
      if(!propagate(forced)){stats.deadEnds++;rollback(forced);return;}
      var br=-1,bc=-1,bm=0,best=n+1,bestPressure=-1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var mask=candidateMask(rr,cc),cnt=bitCount(mask),p=pressure(rr,cc);
        if(cnt<best||(cnt===best&&p>bestPressure)){br=rr;bc=cc;bm=mask;best=cnt;bestPressure=p;}
      }
      if(br<0){found++;if(capture)stats.witnesses.push(grid.map(function(row){return row.join('');}).join(''));rollback(forced);return;}
      if(bitCount(bm)>1)stats.branches++;
      var box=boxOf(br,bc),memberships=index.cells[br][bc]||[];
      for(var bits=bm;bits&&found<cap;bits&=bits-1){
        var one=bits&-bits;grid[br][bc]=bitToDigit(one);rows[br]|=one;cols[bc]|=one;boxes[box]|=one;
        for(var i=0;i<memberships.length;i++)lineMasks[memberships[i]]|=one;
        visit();
        for(i=0;i<memberships.length;i++)lineMasks[memberships[i]]^=one;
        rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;
      }
      rollback(forced);
    }
    visit();return found;
  }

  generator.countVariantSolutions=function(source,variant,limit,stats){
    if(variant&&variant.id==='nabner')return countNabnerSolutions(source,variant,limit,stats);
    return baseCount.call(this,source,variant,limit,stats);
  };
  root.NabnerHiddenSingleRuntime={count:countNabnerSolutions,baseCount:baseCount,verification:'nabner-hidden-single-mrv-exact-v3'};
})(typeof window!=='undefined'?window:globalThis);
