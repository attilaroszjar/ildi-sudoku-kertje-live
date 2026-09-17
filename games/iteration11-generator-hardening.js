(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function deepClone(x){return JSON.parse(JSON.stringify(x));}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function transformedSudokuSolution(source,seed){
    var random=rng(seed>>>0),digits=shuffle([1,2,3,4,5,6,7,8,9],random),digitMap={},bands=shuffle([0,1,2],random),stacks=shuffle([0,1,2],random),rows=[],cols=[];
    for(var d=1;d<=9;d++)digitMap[d]=digits[d-1];
    bands.forEach(function(b){shuffle([0,1,2],random).forEach(function(x){rows.push(b*3+x);});});
    stacks.forEach(function(s){shuffle([0,1,2],random).forEach(function(x){cols.push(s*3+x);});});
    var out=rows.map(function(r){return cols.map(function(c){return digitMap[source[r][c]];});});
    if(random()<0.5)out=Array.from({length:9},function(_,r){return Array.from({length:9},function(_,c){return out[c][r];});});
    return out;
  }
  function extremaFor(solution){var out=[],dirs=[[-1,0],[1,0],[0,-1],[0,1]];for(var r=0;r<9;r++)for(var c=0;c<9;c++){var neighbours=[];dirs.forEach(function(d){var rr=r+d[0],cc=c+d[1];if(rr>=0&&rr<9&&cc>=0&&cc<9)neighbours.push(solution[rr][cc]);});if(neighbours.every(function(x){return solution[r][c]<x;}))out.push({cell:[r,c],type:'min'});else if(neighbours.every(function(x){return solution[r][c]>x;}))out.push({cell:[r,c],type:'max'});}return out;}
  function searchStats(source,variant){
    var grid=clone(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),stats={nodes:0,branches:0,deadEnds:0,solutions:0};
    function boxIndex(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
    function bishopsgateValid(){var parity=(variant.data&&variant.data.parity)||0;for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(((r+c)&1)===parity&&grid[r][c]){var value=grid[r][c];for(var dr=-1;dr<=1;dr+=2)for(var dc=-1;dc<=1;dc+=2)for(var k=1;;k++){var rr=r+dr*k,cc=c+dc*k;if(rr<0||rr>=n||cc<0||cc>=n)break;if(grid[rr][cc]===value)return false;}}return true;}
    function minmaxValid(){var extrema=(variant.data&&variant.data.extrema)||[],dirs=[[1,0],[-1,0],[0,1],[0,-1]];for(var i=0;i<extrema.length;i++){var ex=extrema[i],r=ex.cell[0],c=ex.cell[1],value=grid[r][c];if(!value)continue;for(var j=0;j<dirs.length;j++){var rr=r+dirs[j][0],cc=c+dirs[j][1];if(rr<0||rr>=n||cc<0||cc>=n)continue;var other=grid[rr][cc];if(!other)continue;if(ex.type==='min'&&value>=other)return false;if(ex.type==='max'&&value<=other)return false;}}return true;}
    function extraValid(){return variant.kind==='bishopsgate'?bishopsgateValid():variant.kind==='minmax'?minmaxValid():true;}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]){var value=grid[r][c],bit=1<<(value-1),box=boxIndex(r,c);if((rows[r]|cols[c]|boxes[box])&bit)return stats;rows[r]|=bit;cols[c]|=bit;boxes[box]|=bit;}
    if(!extraValid())return stats;
    function visit(){if(stats.solutions>=2)return;stats.nodes++;var br=-1,bc=-1,bm=0,best=n+1;for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){var mask=full&~(rows[rr]|cols[cc]|boxes[boxIndex(rr,cc)]),validMask=0;for(var bits=mask;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=digit;if(extraValid())validMask|=one;grid[rr][cc]=0;}var count=bitCount(validMask);if(count<best){br=rr;bc=cc;bm=validMask;best=count;if(count<=1)break;}}if(br<0){stats.solutions++;return;}if(!bm){stats.deadEnds++;return;}if(best>1)stats.branches++;var box=boxIndex(br,bc);for(var bits=bm;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;boxes[box]|=one;visit();rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;if(stats.solutions>=2)return;}}
    visit();return stats;
  }
  function makeMinMax(variant,seed,difficulty){for(var attempt=0;attempt<12;attempt++){var actualSeed=((seed>>>0)^0x4d4d4158^Math.imul(attempt+1,0x9E3779B1))>>>0,working=deepClone(variant),solution=transformedSudokuSolution(variant.solution,(actualSeed^0x534f4c56)>>>0);working.solution=solution;working.data=Object.assign({},working.data||{},{extrema:extremaFor(solution)});var out=baseMake.call(generator,working,actualSeed,difficulty||'focused');if(!out.generation||out.generation.unique!==true||out.generation.variantEssential!==true)continue;out.solution=solution;out.data=working.data;out.generation.seed=seed>>>0;out.generation.transformationSeed=actualSeed;out.generation.generatorFamily='minmax-fresh-solution-derived-extrema';return out;}throw new Error('MinMax bounded generation failed for seed '+seed+' / '+(difficulty||'focused'));}
  generator.iteration11SearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){var out=variant&&variant.id==='minmax'?makeMinMax(variant,seed,difficulty):baseMake.call(this,variant,seed,difficulty);if(variant&&(variant.id==='bishopsgate'||variant.id==='minmax')){var stats=searchStats(out.puzzle,out);out.generation.searchStats=stats;out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;if(variant.id==='bishopsgate')out.generation.generatorFamily=(out.generation.generatorFamily||'variant-essential')+'-measured';else out.generation.measured=true;}return out;};
})(typeof window!=='undefined'?window:globalThis);
