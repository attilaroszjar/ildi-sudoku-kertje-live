(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function searchStats(source,variant){
    var grid=clone(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),stats={nodes:0,branches:0,deadEnds:0,solutions:0};
    function boxIndex(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
    function reflectionValid(){
      var groups=(variant.data&&variant.data.reflectionGroups)||[];
      for(var gi=0;gi<groups.length;gi++){
        var lines=groups[gi].lines||[];
        for(var a=0;a<lines.length;a++)for(var b=a+1;b<lines.length;b++){
          var lim=Math.min(lines[a].length,lines[b].length);
          for(var j=0;j<lim;j++){
            var pa=lines[a][j],pb=lines[b][j],va=grid[pa[0]][pa[1]],vb=grid[pb[0]][pb[1]];
            if(va&&vb&&va!==vb)return false;
          }
        }
      }
      return true;
    }
    function slingshotValid(){
      var shots=(variant.data&&variant.data.slingshots)||[];
      for(var i=0;i<shots.length;i++){
        var sh=shots[i],r=sh.cell[0],c=sh.cell[1],d=grid[r][c];
        if(!d)continue;
        var tr=r+sh.dir[0]*d,tc=c+sh.dir[1]*d;
        if(tr<0||tr>=n||tc<0||tc>=n)return false;
        var sv=grid[sh.source[0]][sh.source[1]],tv=grid[tr][tc];
        if(sv&&tv&&sv!==tv)return false;
      }
      return true;
    }
    function extraValid(){return variant.kind==='reflection'?reflectionValid():variant.kind==='slingshot'?slingshotValid():true;}
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
  generator.iteration8SearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){
    var out=baseMake.call(this,variant,seed,difficulty);
    if(variant&&(variant.id==='reflection'||variant.id==='slingshot')){
      var stats=searchStats(out.puzzle,variant);
      out.generation.searchStats=stats;
      out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
      out.generation.generatorFamily=(out.generation.generatorFamily||'variant-essential')+'-measured';
    }
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);
