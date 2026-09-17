(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function lineAt(grid,cl){var a=cl.axis==='row'?grid[cl.index].slice():grid.map(function(row){return row[cl.index];});if(cl.side==='right'||cl.side==='bottom')a.reverse();return a;}
  function visibleCount(a){var m=0,n=0;for(var i=0;i<a.length;i++)if(a[i]>m){m=a[i];n++;}return n;}
  function visibleSum(a){var m=0,n=0;for(var i=0;i<a.length;i++)if(a[i]>m){m=a[i];n+=a[i];}return n;}
  function searchStats(source,variant){
    var grid=clone(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),stats={nodes:0,branches:0,deadEnds:0,solutions:0};
    function boxIndex(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
    function extraValid(){
      if(variant.kind==='skyscrapernontouching'){
        for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]){
          if(r+1<n&&c+1<n&&grid[r+1][c+1]===grid[r][c])return false;
          if(r+1<n&&c>0&&grid[r+1][c-1]===grid[r][c])return false;
        }
      }
      var clues=(variant.data&&variant.data.clues)||[];
      for(var i=0;i<clues.length;i++){
        var cl=clues[i],line=lineAt(grid,cl);
        if(!line.every(Boolean))continue;
        if(variant.kind==='skyscrapersums'&&visibleSum(line)!==cl.sum)return false;
        if(variant.kind==='skyscrapermixed'&&cl.value!==visibleCount(line)&&cl.value!==line[0])return false;
        if(variant.kind==='skyscrapernontouching'&&visibleCount(line)!==cl.count)return false;
      }
      return true;
    }
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]){var value=grid[r][c],bit=1<<(value-1),box=boxIndex(r,c);if((rows[r]|cols[c]|boxes[box])&bit)return stats;rows[r]|=bit;cols[c]|=bit;boxes[box]|=bit;}
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
  generator.iteration14SearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){
    var out=baseMake.call(this,variant,seed,difficulty);
    if(variant&&(variant.id==='skyscraper-sums'||variant.id==='skyscraper-mixed'||variant.id==='skyscraper-nontouching')){
      var stats=searchStats(out.puzzle,variant);
      out.generation.searchStats=stats;
      out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
      out.generation.generatorFamily=(out.generation.generatorFamily||'variant-essential')+'-measured';
    }
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);
