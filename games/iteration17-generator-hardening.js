(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(r){return r.slice();});}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function lineAt(grid,cl){var a=cl.axis==='row'?grid[cl.index].slice():grid.map(function(r){return r[cl.index];});if(cl.side==='right'||cl.side==='bottom')a.reverse();return a;}
  function visibleCount(a){var m=0,n=0;for(var i=0;i<a.length;i++)if(a[i]>m){m=a[i];n++;}return n;}
  function visibleProduct(a){var m=0,p=1;for(var i=0;i<a.length;i++)if(a[i]>m){m=a[i];p*=a[i];}return p;}
  function searchStats(source,variant){
    var grid=clone(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),stats={nodes:0,branches:0,deadEnds:0,solutions:0};
    function boxIndex(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
    function extraValid(){
      var clues=(variant.data&&variant.data.clues)||[];
      for(var i=0;i<clues.length;i++){
        var cl=clues[i],line=lineAt(grid,cl);
        if(!line.every(Boolean))continue;
        if(variant.kind==='skyscraperproduct'&&visibleProduct(line)!==cl.product)return false;
        if(variant.kind==='killerskyscrapers'&&visibleCount(line)!==cl.count)return false;
      }
      if(variant.kind==='killerskyscrapers'){
        var cages=(variant.data&&variant.data.cages)||[];
        for(var ci=0;ci<cages.length;ci++){
          var cage=cages[ci],vals=[],sum=0,filled=true;
          for(var j=0;j<cage.cells.length;j++){
            var p=cage.cells[j],v=grid[p[0]][p[1]];
            if(!v){filled=false;continue;}
            if(vals.indexOf(v)!==-1)return false;
            vals.push(v);sum+=v;
          }
          if(sum>cage.sum)return false;
          if(filled&&sum!==cage.sum)return false;
        }
      }
      return true;
    }
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]){var value=grid[r][c],bit=1<<(value-1),b=boxIndex(r,c);if((rows[r]|cols[c]|boxes[b])&bit)return stats;rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;}
    if(!extraValid())return stats;
    function visit(){
      if(stats.solutions>=2)return;
      stats.nodes++;
      var br=-1,bc=-1,bm=0,best=n+1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var mask=full&~(rows[rr]|cols[cc]|boxes[boxIndex(rr,cc)]),validMask=0;
        for(var bits=mask;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=digit;if(extraValid())validMask|=one;grid[rr][cc]=0;}
        var count=bitCount(validMask);if(count<best){br=rr;bc=cc;bm=validMask;best=count;if(count<=1)break;}
      }
      if(br<0){stats.solutions++;return;}
      if(!bm){stats.deadEnds++;return;}
      if(best>1)stats.branches++;
      var box=boxIndex(br,bc);
      for(var bits=bm;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;boxes[box]|=one;visit();rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;if(stats.solutions>=2)return;}
    }
    visit();return stats;
  }
  generator.iteration17SearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){
    var out=baseMake.call(this,variant,seed,difficulty);
    if(variant&&(variant.id==='product-skyscrapers'||variant.id==='killer-skyscrapers')){
      var measured=Object.assign({},variant,{data:out.data||variant.data,solution:out.solution||variant.solution}),stats=searchStats(out.puzzle,measured);
      out.generation.searchStats=stats;
      out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
      out.generation.generatorFamily=(out.generation.generatorFamily||'variant-essential')+'-measured';
    }
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);
