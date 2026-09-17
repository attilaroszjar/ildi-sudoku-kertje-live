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

  function whiteConnected(mask){
    var n=mask.length,start=null,count=0;
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(!mask[r][c]){
      count++;
      if(!start)start=[r,c];
    }
    if(!start)return false;
    var q=[start],seen={};seen[start.join(',')]=1;
    while(q.length){
      var p=q.pop();
      var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
      for(var d=0;d<dirs.length;d++){
        var rr=p[0]+dirs[d][0],cc=p[1]+dirs[d][1],k=rr+','+cc;
        if(rr>=0&&cc>=0&&rr<n&&cc<n&&!mask[rr][cc]&&!seen[k]){
          seen[k]=1;q.push([rr,cc]);
        }
      }
    }
    return Object.keys(seen).length===count;
  }

  function validMask(mask){
    var n=mask.length;
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(mask[r][c]){
      if(r+1<n&&mask[r+1][c])return false;
      if(c+1<n&&mask[r][c+1])return false;
    }
    return whiteConnected(mask);
  }

  function buildRooms(n,random){
    var rowChoices=[];
    var colChoices=[];
    for(var i=2;i<=n-2;i++){rowChoices.push(i);colChoices.push(i);}
    var rs=rowChoices[Math.floor(random()*rowChoices.length)];
    var cs=colChoices[Math.floor(random()*colChoices.length)];
    var ids=shuffle([0,1,2,3],random);
    return Array.from({length:n},function(_,r){
      return Array.from({length:n},function(_,c){
        var quadrant=(r<rs?0:2)+(c<cs?0:1);
        return ids[quadrant];
      });
    });
  }

  function buildMask(n,random,difficulty){
    var mask=Array.from({length:n},function(){return Array(n).fill(0);});
    var order=shuffle(Array.from({length:n*n},function(_,i){return i;}),random);
    var density=difficulty==='expert'?0.29:(difficulty==='gentle'?0.18:0.24);
    var target=Math.max(3,Math.round(n*n*density));
    var placed=0;

    for(var oi=0;oi<order.length&&placed<target;oi++){
      var idx=order[oi],r=Math.floor(idx/n),c=idx%n;
      if((r&&mask[r-1][c])||(r+1<n&&mask[r+1][c])||(c&&mask[r][c-1])||(c+1<n&&mask[r][c+1]))continue;
      mask[r][c]=1;
      if(!whiteConnected(mask)){mask[r][c]=0;continue;}
      placed++;
    }

    return placed>=Math.max(3,target-1)&&validMask(mask)?mask:null;
  }

  function roomClues(regions,mask){
    var n=regions.length,clues={};
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      var id=regions[r][c];
      if(clues[id]==null)clues[id]=0;
      clues[id]+=mask[r][c]?1:0;
    }
    return clues;
  }

  function starterOrder(n,random){
    return shuffle(Array.from({length:n*n},function(_,i){return i;}),random);
  }

  function starterFraction(difficulty){
    if(difficulty==='gentle')return 0.88;
    if(difficulty==='expert')return 0.74;
    return 0.81;
  }

  function certifyWithBoundedStarters(puzzle,mask,order,difficulty){
    var n=puzzle.size,total=n*n;
    var initial=Math.min(total,Math.max(1,Math.ceil(total*starterFraction(difficulty))));
    var pos=0;

    while(pos<initial){
      var idx=order[pos++];
      puzzle.starters.push({r:Math.floor(idx/n),c:idx%n,state:mask[Math.floor(idx/n)][idx%n]});
    }

    var stats={};
    var count=generator.countHeyawakeSolutions(puzzle,2,stats);
    var batch=Math.max(2,Math.ceil(n/2));

    while(count!==1&&pos<order.length){
      var stop=Math.min(order.length,pos+batch);
      while(pos<stop){
        var idx2=order[pos++],r=Math.floor(idx2/n),c=idx2%n;
        puzzle.starters.push({r:r,c:c,state:mask[r][c]});
      }
      stats={};
      count=generator.countHeyawakeSolutions(puzzle,2,stats);
    }

    return count===1?stats:null;
  }

  function build(seed,n,difficulty){
    var seen={};

    /*
     * Runtime optimization: the old implementation repeatedly called the exact
     * solver after adding one starter and then again after removing starters.
     * On 8x8/9x9 that explored huge sparse search trees dozens of times.
     *
     * We now begin from a deterministic, difficulty-scaled starter fraction and
     * grow in bounded batches only when uniqueness still needs reinforcement.
     * Every accepted puzzle still receives a final exact solver certificate.
     */
    for(var attempt=0;attempt<24;attempt++){
      var random=rng(((seed>>>0)^0x50334845^Math.imul(n,0x85EBCA6B)^Math.imul(attempt+1,0x9E3779B1))>>>0);
      var regions=buildRooms(n,random);
      var mask=buildMask(n,random,difficulty);
      if(!mask)continue;

      var topology=JSON.stringify(regions)+'|'+JSON.stringify(mask);
      if(seen[topology])continue;
      seen[topology]=1;

      var puzzle={
        size:n,
        regions:regions,
        roomClues:roomClues(regions,mask),
        starters:[]
      };
      var order=starterOrder(n,random);
      var stats=certifyWithBoundedStarters(puzzle,mask,order,difficulty);
      if(!stats)continue;

      return {
        puzzle:puzzle,
        solution:mask,
        score:Number(stats.nodes||0)+Number(stats.branches||0)*2+puzzle.starters.length*3,
        topology:topology
      };
    }

    return null;
  }

  function carveExpert(seed,puzzle){
    puzzle=clone(puzzle);
    var random=rng(((seed>>>0)^0x45585048)>>>0);
    var atoms=puzzle.starters.map(function(starter){return {kind:'starter',value:starter};});
    Object.keys(puzzle.roomClues).forEach(function(id){if(puzzle.roomClues[id]!=null)atoms.push({kind:'room',id:id});});
    shuffle(atoms,random);
    var accepted=0,rejected=0,acceptedStarters=0,acceptedRoomClues=0;
    for(var i=0;i<atoms.length;i++){
      var atom=atoms[i],index,saved;
      if(atom.kind==='starter'){
        index=puzzle.starters.indexOf(atom.value);
        if(index<0)continue;
        puzzle.starters.splice(index,1);
        if(generator.countHeyawakeSolutions(puzzle,2,{})===1){accepted++;acceptedStarters++;}
        else{puzzle.starters.splice(index,0,atom.value);rejected++;}
      }else{
        saved=puzzle.roomClues[atom.id];puzzle.roomClues[atom.id]=null;
        if(generator.countHeyawakeSolutions(puzzle,2,{})===1){accepted++;acceptedRoomClues++;}
        else{puzzle.roomClues[atom.id]=saved;rejected++;}
      }
    }
    return {puzzle:puzzle,accepted:accepted,rejected:rejected,acceptedStarters:acceptedStarters,acceptedRoomClues:acceptedRoomClues};
  }

  function makeHeyawake(variant,seed,difficulty,n){
    var key=[seed>>>0,difficulty,n].join(':');
    if(cache.has(key))return clone(cache.get(key));
    var built=build(seed>>>0,n,difficulty);
    if(!built)throw new Error('Heyawake multi-size generation failed for seed '+seed+' / '+difficulty+' / '+n+'x'+n);
    var expertCarve=difficulty==='expert'?carveExpert(seed,built.puzzle):null;
    var finalPuzzle=expertCarve?expertCarve.puzzle:built.puzzle;
    var visibleRoomClues=Object.keys(finalPuzzle.roomClues).filter(function(id){return finalPuzzle.roomClues[id]!=null;}).length;
    var out=clone(variant);
    out.data=Object.assign({},out.data||{}, {p3Size:n,p3SupportedSizes:supported.slice()});
    out.puzzle=finalPuzzle;
    out.solution=built.solution;
    out.generation={
      seed:seed>>>0,
      clues:visibleRoomClues+finalPuzzle.starters.length,
      unique:true,
      verification:'solver-verified',
      generatorFamily:'heyawake-multisize-room-partition',
      difficultyScore:built.score,
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:n
    };
    if(expertCarve){
      out.generation.verification='solver-verified-local-irreducible';
      out.generation.generatorFamily='heyawake-multisize-room-partition-expert-local-irreducible';
      out.generation.locallyIrreducibleUnderProductionContract=true;
      out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
      out.generation.policy='contract-driven-local-irreducibility';
      out.generation.acceptedRemovals=expertCarve.accepted;
      out.generation.rejectedRemovals=expertCarve.rejected;
      out.generation.acceptedStarterRemovals=expertCarve.acceptedStarters;
      out.generation.acceptedRoomClueRemovals=expertCarve.acceptedRoomClues;
      out.generation.starterCount=finalPuzzle.starters.length;
      out.generation.roomClueCount=visibleRoomClues;
    }
    cache.set(key,clone(out));
    return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='heyawake';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-heyawake'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();
    variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:6;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='heyawake')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(supported.indexOf(requested)<0)requested=6;
    return makeHeyawake(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport.heyawake=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
