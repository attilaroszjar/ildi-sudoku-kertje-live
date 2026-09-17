(function(root){
  'use strict';
  if(!root.SudokuGenerator||root.ArgyleRuntimeHardening)return;
  var generator=root.SudokuGenerator,baseCount=generator.countVariantSolutions;
  function lineCells(item){return Array.isArray(item)?item:item.cells;}
  function uniqueLinesValid(variant,grid,r,c){
    var lines=(variant.data&&variant.data.lines)||[];
    for(var i=0;i<lines.length;i++){
      var line=lineCells(lines[i]);if(!line||!line.some(function(p){return p[0]===r&&p[1]===c;}))continue;
      var seen={};for(var j=0;j<line.length;j++){var v=grid[line[j][0]][line[j][1]];if(v&&seen[v])return false;if(v)seen[v]=1;}
    }
    return true;
  }
  function countUniqueLineSolutions(source,variant,limit,stats){
    stats=stats||{};stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.solutions=0;
    var grid=source.map(function(row){return row.slice();}),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0);
    function bitCount(x){var c=0;while(x){x&=x-1;c++;}return c;}
    function box(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){var v=grid[r][c];if(!v)continue;var bit=1<<(v-1),b=box(r,c);if((rows[r]|cols[c]|boxes[b])&bit)return 0;rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;if(!uniqueLinesValid(variant,grid,r,c))return 0;}
    var found=0;
    function visit(){
      if(found>=limit)return;stats.nodes++;
      var br=-1,bc=-1,bm=0,best=n+1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var mask=full&~(rows[rr]|cols[cc]|boxes[box(rr,cc)]),allowed=0;
        for(var bits=mask;bits;bits&=bits-1){var one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=d;if(uniqueLinesValid(variant,grid,rr,cc))allowed|=one;grid[rr][cc]=0;}
        var cnt=bitCount(allowed);if(cnt<best){br=rr;bc=cc;bm=allowed;best=cnt;if(best<=1)break;}
      }
      if(br<0){found++;stats.solutions=found;return;}if(!bm){stats.deadEnds++;return;}if(bitCount(bm)>1)stats.branches++;
      var bx=box(br,bc);for(var bits=bm;bits;bits&=bits-1){var one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;boxes[bx]|=one;visit();rows[br]^=one;cols[bc]^=one;boxes[bx]^=one;grid[br][bc]=0;if(found>=limit)return;}
    }
    visit();return found;
  }
  generator.countUniqueLineSolutions=countUniqueLineSolutions;
  generator.countVariantSolutions=function(source,variant,limit,stats){if(variant&&variant.kind==='uniqueline')return countUniqueLineSolutions(source,variant,limit,stats);return baseCount.call(this,source,variant,limit,stats);};
  root.ArgyleRuntimeHardening={uniqueLinesValid:uniqueLinesValid,countUniqueLineSolutions:countUniqueLineSolutions};
})(typeof window!=='undefined'?window:globalThis);
