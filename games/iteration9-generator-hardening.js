(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function searchStats(source,variant){
    var grid=clone(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),stats={nodes:0,branches:0,deadEnds:0,solutions:0};
    function boxIndex(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
    function axiaValid(){
      var cells=(variant.data&&variant.data.axia)||[];
      for(var i=0;i<cells.length;i++){
        var r=cells[i][0],c=cells[i][1],value=grid[r][c];
        if(!value)continue;
        for(var dr=-1;dr<=1;dr+=2)for(var dc=-1;dc<=1;dc+=2)for(var k=1;;k++){
          var rr=r+dr*k,cc=c+dc*k;if(rr<0||rr>=n||cc<0||cc>=n)break;
          if(grid[rr][cc]===value)return false;
        }
      }
      return true;
    }
    function couplesValid(){
      var pairs=(variant.data&&variant.data.couples)||[];
      for(var i=0;i<pairs.length;i++){
        var cp=pairs[i],a=grid[cp.a[0]][cp.a[1]],b=grid[cp.b[0]][cp.b[1]];
        if(a&&b&&(((a%2)===(b%2))!==cp.same))return false;
      }
      return true;
    }
    function extraValid(){return variant.kind==='axia'?axiaValid():variant.kind==='couples'?couplesValid():true;}
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
  generator.iteration9SearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){
    var out=baseMake.call(this,variant,seed,difficulty);
    if(variant&&(variant.id==='axia'||variant.id==='couples')){
      var stats=searchStats(out.puzzle,variant);
      out.generation.searchStats=stats;
      out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
      out.generation.generatorFamily=(out.generation.generatorFamily||'variant-essential')+'-measured';
    }
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);
