(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function visible(a){var m=0,n=0;for(var i=0;i<a.length;i++)if(a[i]>m){m=a[i];n++;}return n;}
  function solve(source,variant,limit,wantStats,ignoreSpecial){
    var grid=clone(source),n=grid.length,d=variant.data||{},clueValue=d.clueValue||n,maxDigit=d.maxDigit||n-1,full=(1<<maxDigit)-1;
    var rows=Array(n).fill(0),cols=Array(n).fill(0),clueMap={},stats={nodes:0,branches:0,deadEnds:0,solutions:0};
    (d.toroidalClues||[]).forEach(function(cl){clueMap[cl.cell[0]+','+cl.cell[1]]=1;grid[cl.cell[0]][cl.cell[1]]=clueValue;});
    function specialValid(){if(ignoreSpecial)return true;var clues=d.toroidalClues||[];for(var i=0;i<clues.length;i++){var cl=clues[i],line=cl.cells.map(function(p){return grid[p[0]][p[1]];});if(line.every(Boolean)&&visible(line)!==cl.count)return false;}return true;}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){if(clueMap[r+','+c])continue;var v=grid[r][c];if(!v)continue;if(v<1||v>maxDigit)return wantStats?stats:0;var bit=1<<(v-1);if((rows[r]|cols[c])&bit)return wantStats?stats:0;rows[r]|=bit;cols[c]|=bit;}
    if(!specialValid())return wantStats?stats:0;
    var found=0;
    function visit(){
      if(found>=limit)return;
      stats.nodes++;
      var br=-1,bc=-1,bestMask=0,best=maxDigit+1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!clueMap[rr+','+cc]&&!grid[rr][cc]){
        var mask=full&~(rows[rr]|cols[cc]),validMask=0;
        for(var bits=mask;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=digit;if(specialValid())validMask|=one;grid[rr][cc]=0;}
        var count=bitCount(validMask);if(count<best){br=rr;bc=cc;bestMask=validMask;best=count;if(count<=1)break;}
      }
      if(br<0){for(var i=0;i<n;i++)if(rows[i]!==full||cols[i]!==full){stats.deadEnds++;return;}found++;stats.solutions++;return;}
      if(!bestMask){stats.deadEnds++;return;}
      if(best>1)stats.branches++;
      for(var bits=bestMask;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;visit();rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;if(found>=limit)return;}
    }
    visit();return wantStats?stats:found;
  }
  generator.countToroidalSkyscraperSolutions=function(source,variant,limit,ignoreSpecial){return solve(source,variant,limit||2,false,!!ignoreSpecial);};
  generator.iteration22SearchStats=function(source,variant){return solve(source,variant,2,true,false);};
  generator.make=function(variant,seed,difficulty){
    var out=baseMake.call(this,variant,seed,difficulty);
    if(variant&&variant.id==='toroidal-skyscrapers'){
      var measured=Object.assign({},variant,{data:out.data||variant.data,solution:out.solution||variant.solution});
      var stats=generator.iteration22SearchStats(out.puzzle,measured);
      out.generation.searchStats=stats;
      out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
      out.generation.generatorFamily=(out.generation.generatorFamily||'variant-essential')+'-measured';
    }
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);
