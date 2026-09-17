(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var supported=[5,6,7,8,9];
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

  function model(puzzle){
    var n=puzzle.length,white=[],idx={},r,c;
    for(r=0;r<n;r++)for(c=0;c<n;c++)if(puzzle[r][c]===false){
      idx[r+','+c]=white.length;
      white.push([r,c]);
    }
    var vis=white.map(function(q){
      var out=[];
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){
        var rr=q[0]+d[0],cc=q[1]+d[1];
        while(rr>=0&&cc>=0&&rr<n&&cc<n&&puzzle[rr][cc]===false){
          out.push(idx[rr+','+cc]);
          rr+=d[0];cc+=d[1];
        }
      });
      return out;
    });
    var walls=[];
    for(r=0;r<n;r++)for(c=0;c<n;c++)if(puzzle[r][c]!==false){
      walls.push({
        r:r,c:c,clue:puzzle[r][c],
        adj:[[r+1,c],[r-1,c],[r,c+1],[r,c-1]]
          .map(function(q){return idx[q[0]+','+q[1]];})
          .filter(function(x){return x!==undefined;})
      });
    }
    return {n:n,white:white,vis:vis,walls:walls};
  }

  function solveFirst(puzzle){
    var m=model(puzzle),vals=Array(m.white.length).fill(-1),answer=null;

    function feasible(){
      var i,j,w,on,unk,cand,has,possible;
      for(i=0;i<vals.length;i++)if(vals[i]===1){
        for(j=0;j<m.vis[i].length;j++)if(vals[m.vis[i][j]]===1)return false;
      }
      for(i=0;i<m.walls.length;i++){
        w=m.walls[i];
        if(w.clue==null)continue;
        on=w.adj.filter(function(k){return vals[k]===1;}).length;
        unk=w.adj.filter(function(k){return vals[k]<0;}).length;
        if(on>w.clue||on+unk<w.clue)return false;
      }
      for(i=0;i<vals.length;i++)if(vals[i]===0){
        cand=[i].concat(m.vis[i]);
        has=cand.some(function(k){return vals[k]===1;});
        possible=cand.some(function(k){return vals[k]<0;});
        if(!has&&!possible)return false;
      }
      return true;
    }

    function choose(){
      var best=-1,score=-1;
      for(var i=0;i<vals.length;i++)if(vals[i]<0){
        var sc=m.vis[i].length;
        for(var j=0;j<m.walls.length;j++)if(m.walls[j].clue!=null&&m.walls[j].adj.indexOf(i)>=0)sc+=6;
        if(sc>score){score=sc;best=i;}
      }
      return best;
    }

    function dfs(){
      if(answer||!feasible())return;
      var k=choose();
      if(k<0){
        for(var i=0;i<vals.length;i++){
          if(![i].concat(m.vis[i]).some(function(j){return vals[j]===1;}))return;
        }
        answer=vals.slice();
        return;
      }
      vals[k]=1;dfs();
      if(!answer){vals[k]=0;dfs();}
      vals[k]=-1;
    }

    dfs();
    if(!answer)return null;
    var sol=Array.from({length:m.n},function(){return Array(m.n).fill(0);});
    m.white.forEach(function(q,i){if(answer[i]===1)sol[q[0]][q[1]]=1;});
    return sol;
  }

  function wallTopology(seed,n,attempt){
    var random=rng(((seed>>>0)^0x5033414B^Math.imul(n,0x85EBCA6B)^Math.imul(attempt+1,0x9E3779B1))>>>0);
    var density=0.30+random()*0.10;
    var puzzle=Array.from({length:n},function(){return Array(n).fill(false);});
    var wallCount=0;

    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      if(random()<density){puzzle[r][c]=null;wallCount++;}
    }

    if(wallCount<Math.max(4,Math.floor(n*n*0.22)))return null;
    if(wallCount>Math.floor(n*n*0.48))return null;

    for(r=0;r<n;r++){
      var whites=0;
      for(c=0;c<n;c++)if(puzzle[r][c]===false)whites++;
      if(whites===0)return null;
    }
    for(c=0;c<n;c++){
      whites=0;
      for(r=0;r<n;r++)if(puzzle[r][c]===false)whites++;
      if(whites===0)return null;
    }

    return {puzzle:puzzle,random:random};
  }

  function numberWalls(puzzle,solution){
    var n=puzzle.length,out=clone(puzzle),spots=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(out[r][c]!==false){
      var count=0;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){
        var rr=r+d[0],cc=c+d[1];
        if(rr>=0&&cc>=0&&rr<n&&cc<n)count+=solution[rr][cc]?1:0;
      });
      out[r][c]=count;
      spots.push(r*n+c);
    }
    return {puzzle:out,spots:spots};
  }

  function removalTarget(wallCount,difficulty){
    if(difficulty==='gentle')return 0;
    if(difficulty==='expert')return wallCount;
    return Math.max(1,Math.round(wallCount*0.14));
  }

  function thinClues(puzzle,spots,random,difficulty){
    var target=removalTarget(spots.length,difficulty),removed=0;
    if(!target)return {puzzle:puzzle,removed:0,locallyIrreducible:false};
    var order=shuffle(spots.slice(),random);
    var expert=difficulty==='expert';
    var maxChecks=expert?order.length:Math.min(order.length,target*3+4);

    for(var i=0;i<maxChecks&&(expert||removed<target);i++){
      var idx=order[i],n=puzzle.length,r=Math.floor(idx/n),c=idx%n,saved=puzzle[r][c];
      puzzle[r][c]=null;
      if(generator.countAkariSolutions(puzzle,2)!==1)puzzle[r][c]=saved;
      else removed++;
    }

    return {puzzle:puzzle,removed:removed,locallyIrreducible:expert};
  }

  function build(seed,n,difficulty){
    var seen={};
    for(var attempt=0;attempt<40;attempt++){
      var topo=wallTopology(seed,n,attempt);
      if(!topo)continue;
      var key=JSON.stringify(topo.puzzle);
      if(seen[key])continue;
      seen[key]=1;

      var rawSolution=solveFirst(topo.puzzle);
      if(!rawSolution)continue;

      var numbered=numberWalls(topo.puzzle,rawSolution);
      if(generator.countAkariSolutions(numbered.puzzle,2)!==1)continue;

      var thinned=thinClues(numbered.puzzle,numbered.spots,topo.random,difficulty);
      if(generator.countAkariSolutions(thinned.puzzle,2)!==1)continue;

      return {
        puzzle:thinned.puzzle,
        solution:rawSolution,
        wallCount:numbered.spots.length,
        removed:thinned.removed,
        locallyIrreducible:thinned.locallyIrreducible,
        topology:key
      };
    }
    return null;
  }

  function makeAkari(variant,seed,difficulty,n){
    var key=[seed>>>0,difficulty,n].join(':');
    if(cache.has(key))return clone(cache.get(key));

    var built=build(seed>>>0,n,difficulty);
    if(!built)throw new Error('Akari multi-size generation failed for seed '+seed+' / '+difficulty+' / '+n+'x'+n);

    var out=clone(variant);
    out.data=Object.assign({},out.data||{}, {p3Size:n,p3SupportedSizes:supported.slice()});
    out.puzzle=built.puzzle;
    out.solution=built.solution;
    out.generation={
      seed:seed>>>0,
      clues:built.wallCount-built.removed,
      unique:true,
      verification:built.locallyIrreducible?'solver-verified-local-irreducible':'solver-verified',
      generatorFamily:'akari-multisize-procedural-wall-layout',
      difficultyScore:built.removed,
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:n,
      locallyIrreducibleUnderProductionContract:built.locallyIrreducible,
      policy:built.locallyIrreducible?'contract-driven-local-irreducibility':'difficulty-targeted-clue-thinning'
    };

    cache.set(key,clone(out));
    return out;
  }

  function countAquariumOptional(puzzle,limit){
    limit=limit||2;
    var n=puzzle.size,reg=puzzle.regions,ids=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(ids.indexOf(reg[r][c])<0)ids.push(reg[r][c]);
    var grid=Array.from({length:n},function(){return Array(n).fill(0);}),states={},found=0;
    for(var ii=0;ii<ids.length;ii++){
      var id=ids[ii],seen={},arr=[];
      for(var lev=0;lev<=n;lev++){
        var cells=[];
        for(r=0;r<n;r++)for(c=0;c<n;c++)if(reg[r][c]===id)cells.push([r,c,(n-r)<=lev?1:0]);
        var stateKey=cells.map(function(q){return q[2];}).join('');
        if(!seen[stateKey]){seen[stateKey]=1;arr.push(cells);}
      }
      states[id]=arr;
    }
    function known(v){return Number.isInteger(v);}
    function feasible(){
      for(var rr=0;rr<n;rr++)if(known(puzzle.rowClues[rr])){
        var rowSum=grid[rr].reduce(function(a,x){return a+x;},0);
        if(rowSum>puzzle.rowClues[rr])return false;
      }
      for(var cc=0;cc<n;cc++)if(known(puzzle.colClues[cc])){
        var colSum=0;for(rr=0;rr<n;rr++)colSum+=grid[rr][cc];
        if(colSum>puzzle.colClues[cc])return false;
      }
      return true;
    }
    function finalValid(){
      for(var rr=0;rr<n;rr++)if(known(puzzle.rowClues[rr])&&grid[rr].reduce(function(a,x){return a+x;},0)!==puzzle.rowClues[rr])return false;
      for(var cc=0;cc<n;cc++)if(known(puzzle.colClues[cc])){
        var colSum=0;for(rr=0;rr<n;rr++)colSum+=grid[rr][cc];
        if(colSum!==puzzle.colClues[cc])return false;
      }
      return true;
    }
    function go(k){
      if(found>=limit)return;
      if(k===ids.length){if(finalValid())found++;return;}
      var options=states[ids[k]];
      for(var z=0;z<options.length;z++){
        var cells=options[z];
        cells.forEach(function(q){grid[q[0]][q[1]]=q[2];});
        if(feasible())go(k+1);
        cells.forEach(function(q){grid[q[0]][q[1]]=0;});
        if(found>=limit)return;
      }
    }
    go(0);
    return found;
  }

  function hardenAquariumExpert(source,seed){
    var out=clone(source),puzzle=out.puzzle,n=puzzle.size;
    if(generator.countAquariumSolutions(puzzle,2,{})!==1||countAquariumOptional(puzzle,2)!==1)throw new Error('Aquarium source parity/uniqueness failure');
    var atoms=[];
    for(var i=0;i<n;i++)atoms.push({axis:'row',index:i});
    for(i=0;i<n;i++)atoms.push({axis:'col',index:i});
    shuffle(atoms,rng(((seed>>>0)^0x41514352)>>>0));
    var accepted=0,rejected=0;
    for(i=0;i<atoms.length;i++){
      var atom=atoms[i],key=atom.axis==='row'?'rowClues':'colClues',saved=puzzle[key][atom.index];
      puzzle[key][atom.index]=null;
      if(countAquariumOptional(puzzle,2)===1)accepted++;
      else{puzzle[key][atom.index]=saved;rejected++;}
    }
    if(countAquariumOptional(puzzle,2)!==1)throw new Error('Aquarium expert carve lost uniqueness');
    var base=clone(puzzle);base.rowClues=Array(n).fill(null);base.colClues=Array(n).fill(null);
    if(countAquariumOptional(base,2)===1)throw new Error('Aquarium expert carve lost variant essentiality');
    var visible=0;
    for(i=0;i<n;i++){if(Number.isInteger(puzzle.rowClues[i]))visible++;if(Number.isInteger(puzzle.colClues[i]))visible++;}
    out.generation=Object.assign({},out.generation||{}, {
      clues:visible,
      unique:true,
      verification:'solver-verified-local-irreducible',
      generatorFamily:'seeded-water-levels-calibrated-regions-expert-local-irreducible',
      mode:'seeded-variant-essential',
      variantEssential:true,
      locallyIrreducibleUnderProductionContract:true,
      localIrreducibilityProof:'monotone-nonuniqueness-from-single-pass',
      policy:'contract-driven-local-irreducibility',
      acceptedRemovals:accepted,
      rejectedRemovals:rejected
    });
    return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='akari';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-akari'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();
    variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:6;
  }

  generator.make=function(variant,seed,difficulty){
    difficulty=difficulty||'focused';
    if(variant&&variant.id==='aquarium'&&difficulty==='expert')return hardenAquariumExpert(baseMake.call(this,variant,seed,difficulty),seed>>>0);
    if(!variant||variant.id!=='akari')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(supported.indexOf(requested)<0)requested=6;
    return makeAkari(variant,seed>>>0,difficulty,requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport.akari=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
