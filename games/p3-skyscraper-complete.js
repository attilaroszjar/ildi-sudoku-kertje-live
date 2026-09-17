(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var supported=[7,8,9];
  var cache=new Map();

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function rng(seed){
    var x=seed>>>0;
    return function(){
      x=(x+0x6D2B79F5)>>>0;
      var t=x;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function shuffle(a,random){
    for(var i=a.length-1;i>0;i--){
      var j=Math.floor(random()*(i+1));
      var t=a[i];a[i]=a[j];a[j]=t;
    }
    return a;
  }
  function visible(line){
    var high=0,count=0;
    for(var i=0;i<line.length;i++)if(line[i]>high){high=line[i];count++;}
    return count;
  }
  function oriented(grid,axis,index,side){
    var line=axis==='row'?grid[index].slice():grid.map(function(row){return row[index];});
    if(side==='right'||side==='bottom')line.reverse();
    return line;
  }
  function allClues(solution){
    var n=solution.length,out=[];
    for(var i=0;i<n;i++){
      [['row','left'],['row','right'],['col','top'],['col','bottom']].forEach(function(spec){
        out.push({axis:spec[0],index:i,side:spec[1],count:visible(oriented(solution,spec[0],i,spec[1]))});
      });
    }
    return out;
  }
  function makeLatin(n,random){
    var symbols=shuffle(Array.from({length:n},function(_,i){return i+1;}),random);
    var rows=shuffle(Array.from({length:n},function(_,i){return i;}),random);
    var cols=shuffle(Array.from({length:n},function(_,i){return i;}),random);
    var grid=Array.from({length:n},function(){return Array(n).fill(0);});
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)grid[r][c]=symbols[(rows[r]+cols[c])%n];
    if(random()<0.5){
      grid=grid[0].map(function(_,c){return grid.map(function(row){return row[c];});});
    }
    return grid;
  }

  function countSolutions(puzzle,clues,limit,stats,ignoreClues){
    stats=stats||null;
    if(stats){stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.solutions=0;}
    limit=limit||2;
    var n=puzzle.length,full=(1<<n)-1,grid=puzzle.map(function(row){return row.slice();});
    var rows=Array(n).fill(0),cols=Array(n).fill(0),found=0;
    var byRow=Array.from({length:n},function(){return[];}),byCol=Array.from({length:n},function(){return[];});
    (clues||[]).forEach(function(cl){(cl.axis==='row'?byRow[cl.index]:byCol[cl.index]).push(cl);});

    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]){
      var bit=1<<(grid[r][c]-1);
      if((rows[r]&bit)||(cols[c]&bit))return 0;
      rows[r]|=bit;cols[c]|=bit;
    }

    function lineFeasible(cl){
      if(ignoreClues)return true;
      var line=oriented(grid,cl.axis,cl.index,cl.side);
      for(var i=0;i<n;i++)if(!line[i])return true;
      return visible(line)===cl.count;
    }
    function affectedOk(r,c){
      if(ignoreClues)return true;
      var a=byRow[r],b=byCol[c],i;
      for(i=0;i<a.length;i++)if(!lineFeasible(a[i]))return false;
      for(i=0;i<b.length;i++)if(!lineFeasible(b[i]))return false;
      return true;
    }
    function domain(r,c){
      var mask=full&~(rows[r]|cols[c]),out=[];
      for(var bits=mask;bits;bits&=bits-1){
        var one=bits&-bits,v=1+Math.round(Math.log(one)/Math.LN2);
        grid[r][c]=v;
        if(affectedOk(r,c))out.push(v);
        grid[r][c]=0;
      }
      return out;
    }
    function visit(){
      if(found>=limit)return;
      if(stats)stats.nodes++;
      var br=-1,bc=-1,best=null;
      for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(!grid[r][c]){
        var d=domain(r,c);
        if(!d.length){if(stats)stats.deadEnds++;return;}
        if(best===null||d.length<best.length){br=r;bc=c;best=d;if(d.length===1)break;}
      }
      if(br<0){
        if(!ignoreClues){
          for(var i=0;i<(clues||[]).length;i++)if(!lineFeasible(clues[i])){if(stats)stats.deadEnds++;return;}
        }
        found++;if(stats)stats.solutions=found;return;
      }
      if(stats&&best.length>1)stats.branches++;
      for(var j=0;j<best.length;j++){
        var v=best[j],bit=1<<(v-1);
        grid[br][bc]=v;rows[br]|=bit;cols[bc]|=bit;
        visit();
        rows[br]^=bit;cols[bc]^=bit;grid[br][bc]=0;
        if(found>=limit)return;
      }
    }
    visit();
    if(stats)stats.solutions=found;
    return found;
  }

  function carveCells(solution,clues,random,difficulty){
    var n=solution.length;
    var targetPerLine=difficulty==='gentle'?2:(difficulty==='focused'?3:4);
    var targetBlanks=n*targetPerLine;
    var puzzle=solution.map(function(row){return row.slice();});
    var rowBlanks=Array(n).fill(0),colBlanks=Array(n).fill(0),blankCells=[];

    function tryRemove(r,c){
      if(!puzzle[r][c])return false;
      if(rowBlanks[r]>=n-1||colBlanks[c]>=n-1)return false;
      var keep=puzzle[r][c];
      puzzle[r][c]=0;
      if(countSolutions(puzzle,clues,2,null,false)!==1){puzzle[r][c]=keep;return false;}
      rowBlanks[r]++;colBlanks[c]++;blankCells.push([r,c]);
      return true;
    }

    // First carve a seeded transversal so every row and every column has an
    // empty cell. This prevents the visually broken all-given rows/columns.
    var firstCols=shuffle(Array.from({length:n},function(_,i){return i;}),random);
    for(var r=0;r<n;r++){
      if(!tryRemove(r,firstCols[r]))return null;
    }

    var order=[];
    for(r=0;r<n;r++)for(var c=0;c<n;c++)if(puzzle[r][c])order.push([r,c]);
    shuffle(order,random);

    var essential=countSolutions(puzzle,clues,2,null,true)>1;
    for(var i=0;i<order.length&&(blankCells.length<targetBlanks||!essential);i++){
      var cell=order[i];
      if(!tryRemove(cell[0],cell[1]))continue;
      if(blankCells.length>=targetBlanks)essential=countSolutions(puzzle,clues,2,null,true)>1;
    }
    if(!essential)return null;

    var stats={};
    if(countSolutions(puzzle,clues,2,stats,false)!==1)return null;
    return {
      puzzle:puzzle,
      stats:stats,
      blankCells:blankCells,
      rowBlankCounts:rowBlanks,
      colBlankCounts:colBlanks,
      targetBlanks:targetBlanks
    };
  }

  function makeSized(variant,seed,difficulty,n){
    var key=[seed>>>0,difficulty,n].join(':');
    if(cache.has(key))return clone(cache.get(key));
    var random=rng(((seed>>>0)^0x534B5950^Math.imul(n,0x9E3779B1))>>>0);
    var built=null,solution=null,clues=null;
    for(var attempt=0;attempt<12&&!built;attempt++){
      solution=makeLatin(n,random);
      clues=allClues(solution);
      built=carveCells(solution,clues,random,difficulty);
    }
    if(!built)throw new Error('Classic Skyscraper size generation failed for '+seed+' / '+difficulty+' / '+n+'x'+n);

    var out=clone(variant);
    out.solution=solution;
    out.puzzle=built.puzzle;
    out.data=Object.assign({},out.data||{}, {
      clues:clues,
      latinOnly:true,
      p3Size:n,
      p3SupportedSizes:supported.slice()
    });
    var givens=built.puzzle.reduce(function(a,row){return a+row.filter(Boolean).length;},0);
    out.generation={
      seed:seed>>>0,
      clues:givens+clues.length,
      unique:true,
      verification:'solver-verified',
      generatorFamily:'skyscraper-p3-latin-visibility',
      difficultyScore:Number(built.stats.nodes||0)+Number(built.stats.branches||0)*3+Number(built.stats.deadEnds||0),
      searchStats:clone(built.stats),
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:n,
      targetBlanks:built.targetBlanks,
      rowBlankCounts:built.rowBlankCounts.slice(),
      colBlankCounts:built.colBlankCounts.slice(),
      blankCells:built.blankCells.map(function(cell){return cell.slice();})
    };
    cache.set(key,clone(out));
    return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='skyscraper';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-skyscraper'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();
    variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:9;
  }

  generator.countP3SkyscraperSolutions=countSolutions;
  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='skyscraper')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(supported.indexOf(requested)<0)requested=9;
    if(requested===9)return baseMake.call(this,variant,seed,difficulty);
    return makeSized(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport.skyscraper=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
