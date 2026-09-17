(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.SudokuBank)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  var runtime=root.QuadrupleRuntimeHardening||{};

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function gridClone(g){return g.map(function(row){return row.slice();});}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function permuteSolution(base,seed){
    var random=rng((seed^0x51554144)>>>0),digits=[1,2,3,4,5,6,7,8,9],bands=[0,1,2],stacks=[0,1,2],rows=[],cols=[];
    shuffle(digits,random);shuffle(bands,random);shuffle(stacks,random);
    bands.forEach(function(b){var within=[0,1,2];shuffle(within,random);within.forEach(function(x){rows.push(b*3+x);});});
    stacks.forEach(function(s){var within=[0,1,2];shuffle(within,random);within.forEach(function(x){cols.push(s*3+x);});});
    return rows.map(function(r){return cols.map(function(c){return digits[base[r][c]-1];});});
  }
  function deriveQuads(solution,seed,difficulty){
    var candidates=[];
    for(var r=1;r<9;r++)for(var c=1;c<9;c++){
      var cells=[[r-1,c-1],[r-1,c],[r,c-1],[r,c]],digits=cells.map(function(p){return solution[p[0]][p[1]];}).sort(function(a,b){return a-b;});
      candidates.push({at:[r,c],cells:cells,digits:digits});
    }
    shuffle(candidates,rng((seed^0x51434c55)>>>0));
    return candidates.slice(0,difficulty==='gentle'?10:(difficulty==='expert'?6:8));
  }
  function countSolutions(source,quads,limit){
    limit=limit||2;var grid=gridClone(source),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),full=511,found=0;
    function box(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
    function quadPossible(q){
      var need={},used={},empty=0;
      q.digits.forEach(function(v){need[v]=(need[v]||0)+1;});
      for(var i=0;i<q.cells.length;i++){var p=q.cells[i],v=grid[p[0]][p[1]];if(!v){empty++;continue;}used[v]=(used[v]||0)+1;if(!need[v]||used[v]>need[v])return false;}
      var missing=0;Object.keys(need).forEach(function(k){missing+=Math.max(0,need[k]-(used[k]||0));});
      return missing<=empty;
    }
    function validAt(r,c){for(var i=0;i<quads.length;i++)if(quads[i].cells.some(function(p){return p[0]===r&&p[1]===c;})&&!quadPossible(quads[i]))return false;return true;}
    for(var r=0;r<9;r++)for(var c=0;c<9;c++){var v=grid[r][c];if(!v)continue;var bit=1<<(v-1),b=box(r,c);if((rows[r]|cols[c]|boxes[b])&bit)return 0;rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;if(!validAt(r,c))return 0;}
    function visit(){
      if(found>=limit)return;var br=-1,bc=-1,bm=0,best=10;
      for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(!grid[r][c]){
        var mask=full&~(rows[r]|cols[c]|boxes[box(r,c)]),allowed=0;
        for(var bits=mask;bits;bits&=bits-1){var one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);grid[r][c]=d;if(validAt(r,c))allowed|=one;grid[r][c]=0;}
        var count=0;for(var m=allowed;m;m&=m-1)count++;if(count<best){br=r;bc=c;bm=allowed;best=count;if(count<=1)break;}
      }
      if(br<0){found++;return;}if(!bm)return;var b=box(br,bc);
      for(var bits=bm;bits;bits&=bits-1){var one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;boxes[b]|=one;visit();rows[br]^=one;cols[bc]^=one;boxes[b]^=one;grid[br][bc]=0;if(found>=limit)return;}
    }
    visit();return found;
  }
  function makeQuadruple(variant,seed,difficulty){
    difficulty=difficulty||'focused';var target=difficulty==='gentle'?40:(difficulty==='expert'?27:32);
    for(var attempt=0;attempt<24;attempt++){
      var actual=((seed>>>0)^Math.imul(attempt+1,0x9E3779B1))>>>0,solution=permuteSolution(variant.solution,actual),quads=deriveQuads(solution,actual,difficulty),grid=gridClone(solution),order=shuffle(Array.from({length:81},function(_,i){return i;}),rng(actual^0x51474956)),clues=81;
      for(var oi=0;oi<order.length&&clues>target;oi++){var idx=order[oi],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;if(countSolutions(grid,quads,2)!==1)grid[r][c]=old;else clues--;}
      var classic=generator.countSolutions(grid,2),unique=countSolutions(grid,quads,2)===1;
      if(unique&&classic!==1){var out=clone(variant);out.solution=solution;out.puzzle=grid;out.data=Object.assign({},out.data||{},{quads:quads});out.generation={seed:seed>>>0,clues:clues,unique:true,verification:'quadruple-solver-verified',generatorFamily:'quadruple-fresh-solution-derived-clues',difficultyScore:null,mode:'seeded-variant-essential',variantEssential:true};return out;}
    }
    throw new Error('Quadruple generation failed for seed '+seed+' / '+difficulty);
  }
  generator.countQuadrupleSolutions=countSolutions;
  generator.make=function(variant,seed,difficulty){
    if(variant&&variant.id==='quadruple'){
      var out=makeQuadruple(variant,seed,difficulty);
      runtime.lastGenerated=clone(out);
      runtime.lastSeed=seed>>>0;
      runtime.lastDifficulty=difficulty||'focused';
      return out;
    }
    return baseMake.call(this,variant,seed,difficulty);
  };
  runtime.makeQuadruple=makeQuadruple;
  runtime.deriveQuads=deriveQuads;
  runtime.countQuadrupleSolutions=countSolutions;
  root.QuadrupleRuntimeHardening=runtime;
})(typeof window!=='undefined'?window:globalThis);
