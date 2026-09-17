(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var supported=[5,6,7,8];
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
  function key(r,c){return r+','+c;}
  function known(v){return Number.isInteger(v);}

  function fleetFor(n){
    if(n===5)return [3,2,1,1];
    if(n===6)return [3,2,2,1,1,1];
    if(n===7)return [4,3,2,2,1,1,1];
    return [4,3,3,2,2,1,1,1];
  }

  function placements(n,len){
    var out=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      if(c+len<=n)out.push(Array.from({length:len},function(_,i){return [r,c+i];}));
      if(len>1&&r+len<=n)out.push(Array.from({length:len},function(_,i){return [r+i,c];}));
    }
    return out;
  }

  function canTouch(occ,cells){
    var own={};cells.forEach(function(p){own[key(p[0],p[1])]=1;});
    for(var i=0;i<cells.length;i++){
      var p=cells[i];
      for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){
        var z=key(p[0]+dr,p[1]+dc);
        if(occ[z]&&!own[z])return true;
      }
    }
    return false;
  }

  function buildSolution(n,fleet,random){
    var occ={},ships=[],all={};
    fleet.forEach(function(len){if(!all[len])all[len]=placements(n,len);});
    function rec(k){
      if(k===fleet.length)return true;
      var len=fleet[k],opts=shuffle(all[len].slice(),random);
      for(var i=0;i<opts.length;i++){
        var cells=opts[i],overlap=cells.some(function(p){return !!occ[key(p[0],p[1])];});
        if(overlap||canTouch(occ,cells))continue;
        cells.forEach(function(p){occ[key(p[0],p[1])]=1;});
        ships.push(cells);
        if(rec(k+1))return true;
        ships.pop();
        cells.forEach(function(p){delete occ[key(p[0],p[1])];});
      }
      return false;
    }
    if(!rec(0))return null;
    var grid=Array.from({length:n},function(){return Array(n).fill(0);});
    Object.keys(occ).forEach(function(z){var p=z.split(',').map(Number);grid[p[0]][p[1]]=1;});
    return {grid:grid,ships:ships.map(function(s){return s.map(function(p){return p.slice();});})};
  }

  // Exact fleet-placement verifier. Null row/column totals are intentionally omitted
  // constraints so the same verifier can certify sparse Expert clue sets.
  function countFast(puzzle,limit,stats){
    limit=limit||2;stats=stats||{};
    stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.solutions=0;
    if(!puzzle||!puzzle.size||!Array.isArray(puzzle.fleet))return 0;
    var n=puzzle.size,fleet=puzzle.fleet.slice().sort(function(a,b){return b-a;});
    var rows=Array(n).fill(0),cols=Array(n).fill(0),occ={},found=0,all={};
    var givens=puzzle.givens||[],water={},mustShip={};
    givens.forEach(function(g){(g.state===1?mustShip:water)[key(g.r,g.c)]=1;});
    fleet.forEach(function(len){
      if(all[len])return;
      all[len]=placements(n,len).filter(function(cells){
        return !cells.some(function(p){return water[key(p[0],p[1])];});
      });
    });

    function canPlace(cells){
      var own={};cells.forEach(function(p){own[key(p[0],p[1])]=1;});
      for(var i=0;i<cells.length;i++){
        var p=cells[i],r=p[0],c=p[1];
        if(occ[key(r,c)])return false;
        if(known(puzzle.rowClues[r])&&rows[r]>=puzzle.rowClues[r])return false;
        if(known(puzzle.colClues[c])&&cols[c]>=puzzle.colClues[c])return false;
        for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){
          var z=key(r+dr,c+dc);
          if(occ[z]&&!own[z])return false;
        }
      }
      return true;
    }

    function deficitsPossible(k){
      var remaining=0;
      for(var i=k;i<fleet.length;i++)remaining+=fleet[i];
      var rowNeed=0,colNeed=0,rowUnknown=false,colUnknown=false;
      for(var r=0;r<n;r++){
        if(known(puzzle.rowClues[r])){
          if(rows[r]>puzzle.rowClues[r])return false;
          rowNeed+=puzzle.rowClues[r]-rows[r];
        }else rowUnknown=true;
        if(known(puzzle.colClues[r])){
          if(cols[r]>puzzle.colClues[r])return false;
          colNeed+=puzzle.colClues[r]-cols[r];
        }else colUnknown=true;
      }
      if(rowNeed>remaining||colNeed>remaining)return false;
      if(!rowUnknown&&rowNeed!==remaining)return false;
      if(!colUnknown&&colNeed!==remaining)return false;
      return true;
    }

    function mustShipsReachable(k){
      var pending=Object.keys(mustShip).filter(function(z){return !occ[z];});
      if(!pending.length)return true;
      for(var pi=0;pi<pending.length;pi++){
        var z=pending[pi],possible=false;
        for(var fi=k;fi<fleet.length&&!possible;fi++){
          var list=all[fleet[fi]];
          for(var j=0;j<list.length;j++){
            if(list[j].some(function(p){return key(p[0],p[1])===z;})&&canPlace(list[j])){possible=true;break;}
          }
        }
        if(!possible)return false;
      }
      return true;
    }

    function finalOk(){
      for(var i=0;i<n;i++){
        if(known(puzzle.rowClues[i])&&rows[i]!==puzzle.rowClues[i])return false;
        if(known(puzzle.colClues[i])&&cols[i]!==puzzle.colClues[i])return false;
      }
      var required=Object.keys(mustShip);
      for(i=0;i<required.length;i++)if(!occ[required[i]])return false;
      return true;
    }

    function rec(k,start){
      stats.nodes++;
      if(found>=limit)return;
      if(!deficitsPossible(k)||!mustShipsReachable(k)){stats.deadEnds++;return;}
      if(k===fleet.length){
        if(finalOk()){found++;stats.solutions=found;}else stats.deadEnds++;
        return;
      }
      var len=fleet[k],list=all[len],same=k>0&&fleet[k-1]===len,from=same?start:0,opts=[];
      for(var i=from;i<list.length;i++)if(canPlace(list[i]))opts.push(i);
      if(opts.length>1)stats.branches++;
      for(i=0;i<opts.length;i++){
        var ix=opts[i],cells=list[ix];
        cells.forEach(function(p){occ[key(p[0],p[1])]=1;rows[p[0]]++;cols[p[1]]++;});
        rec(k+1,(k+1<fleet.length&&fleet[k+1]===len)?ix+1:0);
        cells.forEach(function(p){delete occ[key(p[0],p[1])];rows[p[0]]--;cols[p[1]]--;});
        if(found>=limit)return;
      }
    }

    rec(0,0);return found;
  }

  generator.countBattleshipSolutions=countFast;

  function extraGivenCount(difficulty,n){
    var f=difficulty==='gentle'?0.24:(difficulty==='focused'?0.12:0.04);
    return Math.max(0,Math.round(n*n*f));
  }

  function carveExpert(puzzle,seed){
    var n=puzzle.size,atoms=[],accepted=0,rejected=0,acceptedGivens=0,acceptedOutside=0;
    for(var i=0;i<puzzle.givens.length;i++)atoms.push({type:'given',given:clone(puzzle.givens[i])});
    for(i=0;i<n;i++)atoms.push({type:'outside',axis:'row',index:i});
    for(i=0;i<n;i++)atoms.push({type:'outside',axis:'col',index:i});
    shuffle(atoms,rng(((seed>>>0)^0x42544352)>>>0));
    for(i=0;i<atoms.length;i++){
      var atom=atoms[i],restore;
      if(atom.type==='given'){
        var gi=puzzle.givens.findIndex(function(g){return g.r===atom.given.r&&g.c===atom.given.c&&g.state===atom.given.state;});
        if(gi<0)continue;
        restore={idx:gi,value:puzzle.givens[gi]};puzzle.givens.splice(gi,1);
      }else{
        var clueKey=atom.axis==='row'?'rowClues':'colClues';
        restore={key:clueKey,value:puzzle[clueKey][atom.index]};puzzle[clueKey][atom.index]=null;
      }
      if(countFast(puzzle,2,{})===1){
        accepted++;
        if(atom.type==='given')acceptedGivens++;else acceptedOutside++;
      }else{
        rejected++;
        if(atom.type==='given')puzzle.givens.splice(restore.idx,0,restore.value);
        else puzzle[restore.key][atom.index]=restore.value;
      }
    }
    return {accepted:accepted,rejected:rejected,acceptedGivens:acceptedGivens,acceptedOutside:acceptedOutside};
  }

  function makeBattleships(variant,seed,difficulty,n){
    var cacheKey=[seed>>>0,difficulty,n].join(':');
    if(cache.has(cacheKey))return clone(cache.get(cacheKey));
    var fleet=fleetFor(n),made=null,random=null;
    for(var attempt=0;attempt<16&&!made;attempt++){
      random=rng(((seed>>>0)^0x42415454^Math.imul(n,0x85EBCA6B)^Math.imul(attempt+1,0x9E3779B1))>>>0);
      made=buildSolution(n,fleet,random);
    }
    if(!made)throw new Error('Battleships fleet generation failed for '+n+'x'+n);

    var rows=made.grid.map(function(row){return row.reduce(function(a,x){return a+x;},0);});
    var cols=Array.from({length:n},function(_,c){return made.grid.reduce(function(a,row){return a+row[c];},0);});
    var puzzle={size:n,fleet:fleet.slice(),rowClues:rows,colClues:cols,givens:[]};
    var cells=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)cells.push([r,c]);
    shuffle(cells,random);

    var pos=0,count=countFast(puzzle,2,{}),batch=Math.max(1,Math.floor(n/3));
    while(count!==1&&pos<cells.length){
      var stop=Math.min(cells.length,pos+batch);
      while(pos<stop){
        var p=cells[pos++];
        puzzle.givens.push({r:p[0],c:p[1],state:made.grid[p[0]][p[1]]});
      }
      count=countFast(puzzle,2,{});
    }
    if(count!==1)throw new Error('Battleships uniqueness certification failed for '+n+'x'+n);

    var required=puzzle.givens.length,extra=extraGivenCount(difficulty,n);
    while(pos<cells.length&&puzzle.givens.length<required+extra){
      p=cells[pos++];
      puzzle.givens.push({r:p[0],c:p[1],state:made.grid[p[0]][p[1]]});
    }

    var expertCarve=null;
    if(difficulty==='expert')expertCarve=carveExpert(puzzle,seed>>>0);

    var stats={};
    if(countFast(puzzle,2,stats)!==1)throw new Error('Battleships final uniqueness regression for '+n+'x'+n);
    var visibleOutside=puzzle.rowClues.filter(known).length+puzzle.colClues.filter(known).length;
    var out=clone(variant);
    out.data=Object.assign({},out.data||{}, {p3Size:n,p3SupportedSizes:supported.slice()});
    out.puzzle=puzzle;
    out.solution=made.grid;
    out.generation={
      seed:seed>>>0,
      clues:visibleOutside+puzzle.givens.length,
      unique:true,
      verification:expertCarve?'solver-verified-local-irreducible':'solver-verified',
      generatorFamily:expertCarve?'battleships-multisize-bounded-fleet-expert-local-irreducible':'battleships-multisize-bounded-fleet',
      difficultyScore:Number(stats.nodes||0)+Number(stats.branches||0)*3+Number(stats.deadEnds||0)*2,
      searchStats:clone(stats),
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:n
    };
    if(expertCarve){
      out.generation.locallyIrreducibleUnderProductionContract=true;
      out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
      out.generation.policy='contract-driven-local-irreducibility';
      out.generation.acceptedRemovals=expertCarve.accepted;
      out.generation.rejectedRemovals=expertCarve.rejected;
      out.generation.acceptedGivenRemovals=expertCarve.acceptedGivens;
      out.generation.acceptedOutsideRemovals=expertCarve.acceptedOutside;
    }
    cache.set(cacheKey,clone(out));
    return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='battleships';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-battleships'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();
    variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:6;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='battleships')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(supported.indexOf(requested)<0)requested=6;
    return makeBattleships(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport.battleships=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
