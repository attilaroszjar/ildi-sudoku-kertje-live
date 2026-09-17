(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function lineAt(grid,cl){var a=cl.axis==='row'?grid[cl.index].slice():grid.map(function(row){return row[cl.index];});if(cl.side==='right'||cl.side==='bottom')a.reverse();return a;}
  function visibleCount(line,park){var max=0,count=0;for(var i=0;i<line.length;i++){var v=line[i];if(v===park)continue;if(v>max){max=v;count++;}}return count;}
  function visibleSum(line,park){var max=0,sum=0;for(var i=0;i<line.length;i++){var v=line[i];if(v===park)continue;if(v>max){max=v;sum+=v;}}return sum;}
  function searchStats(source,variant){
    var grid=clone(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),stats={nodes:0,branches:0,deadEnds:0,solutions:0},park=(variant.data&&variant.data.parkValue)||n;
    function cluesValid(r,c){
      var clues=(variant.data&&variant.data.clues)||[];
      for(var i=0;i<clues.length;i++){
        var cl=clues[i];
        if((cl.axis==='row'&&cl.index!==r)||(cl.axis==='col'&&cl.index!==c))continue;
        var line=lineAt(grid,cl);if(!line.every(Boolean))continue;
        if(variant.kind==='skyscraperparks'&&visibleCount(line,park)!==cl.count)return false;
        if(variant.kind==='sumskyscraperparks'&&visibleSum(line,park)!==cl.sum)return false;
      }
      return true;
    }
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]){
      var value=grid[r][c],bit=1<<(value-1);if((rows[r]|cols[c])&bit)return stats;rows[r]|=bit;cols[c]|=bit;if(!cluesValid(r,c))return stats;
    }
    function visit(){
      if(stats.solutions>=2)return;
      stats.nodes++;
      var br=-1,bc=-1,bm=0,best=n+1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var mask=full&~(rows[rr]|cols[cc]),valid=0;
        for(var bits=mask;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=digit;if(cluesValid(rr,cc))valid|=one;grid[rr][cc]=0;}
        var count=bitCount(valid);if(count<best){br=rr;bc=cc;bm=valid;best=count;if(count<=1)break;}
      }
      if(br<0){stats.solutions++;return;}
      if(!bm){stats.deadEnds++;return;}
      if(best>1)stats.branches++;
      for(var bits=bm;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;visit();rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;if(stats.solutions>=2)return;}
    }
    visit();return stats;
  }
  generator.iteration15SearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){
    var out=baseMake.call(this,variant,seed,difficulty);
    if(variant&&(variant.id==='skyscraper-parks'||variant.id==='sum-skyscraper-parks')){
      var measured=Object.assign({},variant,{data:out.data||variant.data,solution:out.solution||variant.solution});
      var stats=searchStats(out.puzzle,measured);
      out.generation.searchStats=stats;
      out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
      out.generation.generatorFamily=(out.generation.generatorFamily||'variant-essential')+'-measured';
    }
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);
