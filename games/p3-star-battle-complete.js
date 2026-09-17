(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var cache=new Map();
  var supported=[5,6,7,8,9];

  function clone(x){
    return JSON.parse(JSON.stringify(x));
  }

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
      var t=a[i];
      a[i]=a[j];
      a[j]=t;
    }
    return a;
  }

  function starSolution(n,random){
    var cols=Array(n).fill(false);
    var out=Array(n).fill(-1);

    function visit(r){
      if(r===n)return true;

      var choices=shuffle(
        Array.from({length:n},function(_,i){return i;}),
        random
      );

      for(var i=0;i<choices.length;i++){
        var c=choices[i];

        if(cols[c])continue;
        if(r>0&&Math.abs(c-out[r-1])<=1)continue;

        cols[c]=true;
        out[r]=c;

        if(visit(r+1))return true;

        cols[c]=false;
        out[r]=-1;
      }

      return false;
    }

    return visit(0)?out:null;
  }

  var solutionUniverseCache={};

  function allStarSolutions(n){
    if(solutionUniverseCache[n]){
      return solutionUniverseCache[n];
    }

    var out=[];
    var cols=Array(n).fill(false);
    var placement=Array(n).fill(-1);

    function visit(r){
      if(r===n){
        out.push(placement.slice());
        return;
      }

      for(var c=0;c<n;c++){
        if(cols[c])continue;
        if(r>0&&Math.abs(c-placement[r-1])<=1)continue;

        cols[c]=true;
        placement[r]=c;

        visit(r+1);

        cols[c]=false;
        placement[r]=-1;
      }
    }

    visit(0);

    solutionUniverseCache[n]=out;
    return out;
  }

  function growRegions(n,solution,random,universe){
    var owners=Array.from(
      {length:n},
      function(){return Array(n).fill(-1);}
    );

    var regionSizes=Array(n).fill(1);

    for(var r=0;r<n;r++){
      owners[r][solution[r]]=r;
    }

    var total=universe.length;
    var counts=new Uint8Array(total*n);
    var alive=new Uint8Array(total);
    var aliveCount=0;

    var byCell=Array.from(
      {length:n},
      function(){
        return Array.from(
          {length:n},
          function(){return[];}
        );
      }
    );

    for(var ai=0;ai<total;ai++){
      var alt=universe[ai];

      var same=true;

      for(r=0;r<n;r++){
        if(alt[r]!==solution[r]){
          same=false;
        }

        byCell[r][alt[r]].push(ai);

        if(alt[r]===solution[r]){
          counts[ai*n+r]++;
        }
      }

      if(!same){
        alive[ai]=1;
        aliveCount++;
      }
    }

    var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    var left=n*n-n;

    function frontier(){
      var seen={};
      var out=[];

      for(var rr=0;rr<n;rr++){
        for(var cc=0;cc<n;cc++){
          if(owners[rr][cc]<0)continue;

          var owner=owners[rr][cc];

          for(var d=0;d<dirs.length;d++){
            var nr=rr+dirs[d][0];
            var nc=cc+dirs[d][1];

            if(
              nr<0||nr>=n||
              nc<0||nc>=n||
              owners[nr][nc]>=0
            ){
              continue;
            }

            var key=nr+','+nc+','+owner;

            if(seen[key])continue;
            seen[key]=1;

            out.push({
              r:nr,
              c:nc,
              owner:owner
            });
          }
        }
      }

      return out;
    }

    function candidateScore(q){
      var ids=byCell[q.r][q.c];
      var kills=0;
      var firstHits=0;

      for(var i=0;i<ids.length;i++){
        var idx=ids[i];

        if(!alive[idx])continue;

        var current=counts[idx*n+q.owner];

        if(current>=1)kills++;
        else firstHits++;
      }

      return (
        kills*100000-
        firstHits*10-
        regionSizes[q.owner]+
        random()
      );
    }

    while(left>0){
      var options=frontier();

      if(!options.length){
        return null;
      }

      shuffle(options,random);

      var inspect=Math.min(
        options.length,
        aliveCount>5000?18:
        aliveCount>1000?24:
        aliveCount>100?36:
        options.length
      );

      var best=options[0];
      var bestScore=-Infinity;

      for(var oi=0;oi<inspect;oi++){
        var q=options[oi];
        var sc=candidateScore(q);

        if(sc>bestScore){
          best=q;
          bestScore=sc;
        }
      }

      owners[best.r][best.c]=best.owner;
      regionSizes[best.owner]++;
      left--;

      var affected=byCell[best.r][best.c];

      for(var j=0;j<affected.length;j++){
        var altIndex=affected[j];

        if(!alive[altIndex])continue;

        var offset=altIndex*n+best.owner;
        counts[offset]++;

        if(counts[offset]>1){
          alive[altIndex]=0;
          aliveCount--;
        }
      }
    }

    return owners;
  }

  function score(stats){
    return (
      Number(stats&&stats.nodes||0)+
      Number(stats&&stats.branches||0)*3+
      Number(stats&&stats.deadEnds||0)*2
    );
  }

  function generateCandidates(seed,n){
    var candidates=[];
    var seen={};
    var universe=allStarSolutions(n);
    var wanted=3;

    for(
      var attempt=0;
      attempt<240&&candidates.length<wanted;
      attempt++
    ){
      var random=rng(
        (
          (seed>>>0)^
          0x50335342^
          Math.imul(attempt+1,0x9E3779B1)^
          Math.imul(n,0x85EBCA6B)
        )>>>0
      );

      var targetIndex=Math.floor(
        random()*universe.length
      );

      var solution=universe[targetIndex].slice();

      var regions=growRegions(
        n,
        solution,
        random,
        universe
      );

      if(!regions)continue;

      var topology=JSON.stringify(regions);

      if(seen[topology])continue;
      seen[topology]=1;

      var puzzle={
        size:n,
        regions:regions,
        starsPerUnit:1
      };

      var stats={};

      if(
        generator.countStarBattleSolutions(
          puzzle,
          2,
          stats
        )!==1
      ){
        continue;
      }

      candidates.push({
        puzzle:puzzle,
        solution:solution,
        stats:stats,
        score:score(stats),
        topology:topology
      });
    }

    candidates.sort(function(a,b){
      if(a.score!==b.score)return a.score-b.score;

      return a.topology<b.topology
        ?-1
        :(a.topology>b.topology?1:0);
    });

    return candidates;
  }

  function chooseCandidate(candidates,difficulty){
    if(!candidates.length)return null;

    if(difficulty==='gentle'){
      return candidates[0];
    }

    if(difficulty==='expert'){
      return candidates[candidates.length-1];
    }

    return candidates[Math.floor((candidates.length-1)/2)];
  }

  function makeStarBattle(variant,seed,difficulty,size){
    var key=[
      variant.id,
      seed>>>0,
      difficulty,
      size
    ].join(':');

    if(cache.has(key)){
      return clone(cache.get(key));
    }

    var candidates=generateCandidates(seed>>>0,size);
    var chosen=chooseCandidate(candidates,difficulty);

    if(!chosen){
      throw new Error(
        'Star Battle multi-size generation failed for seed '+
        seed+' / '+difficulty+' / '+size+'x'+size
      );
    }

    var out=clone(variant);

    out.data=Object.assign({},out.data||{},{
      p3Size:size,
      p3SupportedSizes:supported.slice()
    });

    out.puzzle=clone(chosen.puzzle);
    out.solution=chosen.solution.slice();

    out.generation={
      seed:seed>>>0,
      clues:size,
      unique:true,
      verification:'solver-verified',
      generatorFamily:'starbattle-multisize-region-growth',
      difficultyScore:chosen.score,
      searchStats:clone(chosen.stats),
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:size
    };

    cache.set(key,clone(out));
    return out;
  }

  var starVariant=root.SudokuBank.find(function(v){
    return v.id==='star-battle';
  });

  if(starVariant){
    starVariant.data=starVariant.data||{};

    var remembered=null;

    try{
      remembered=Number(
        root.localStorage&&
        root.localStorage.getItem('ildi-size-star-battle')
      );
    }catch(e){}

    starVariant.data.p3SupportedSizes=supported.slice();
    starVariant.data.p3Size=
      supported.indexOf(remembered)>=0
        ?remembered
        :6;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='star-battle'){
      return baseMake.call(this,variant,seed,difficulty);
    }

    var requested=Number(
      variant.data&&variant.data.p3Size
    );

    if(supported.indexOf(requested)<0){
      requested=6;
    }

    return makeStarBattle(
      variant,
      seed>>>0,
      difficulty||'focused',
      requested
    );
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport['star-battle']=supported.slice();

  if(typeof document==='undefined')return;

  var field=null;
  var select=null;
  var currentId=null;

  function language(){
    var hu=!root.SudokuI18n||root.SudokuI18n.lang==='hu';

    if(field){
      var label=field.querySelector('span');
      if(label)label.textContent=hu?'Méret':'Size';
    }

    if(select){
      select.setAttribute(
        'aria-label',
        hu?'Csillagkert táblaméret':'Star Battle board size'
      );
    }
  }

  function ensureControl(){
    if(field)return field;

    var difficultyField=document.querySelector('.difficulty-field');
    if(!difficultyField||!difficultyField.parentNode)return null;

    field=document.createElement('label');
    field.className='deck-field size-field';
    field.hidden=true;

    var label=document.createElement('span');
    select=document.createElement('select');
    select.id='size-select';

    supported.forEach(function(n){
      var option=document.createElement('option');
      option.value=String(n);
      option.textContent=n+'×'+n;
      select.appendChild(option);
    });

    field.append(label,select);

    difficultyField.parentNode.insertBefore(
      field,
      difficultyField
    );

    select.addEventListener('change',function(){
      if(currentId!=='star-battle')return;

      var variant=root.SudokuBank.find(function(v){
        return v.id==='star-battle';
      });

      if(!variant)return;

      var size=Number(select.value);
      if(supported.indexOf(size)<0)return;

      variant.data=variant.data||{};
      variant.data.p3Size=size;

      try{
        root.localStorage&&
        root.localStorage.setItem(
          'ildi-size-star-battle',
          String(size)
        );
      }catch(e){}

      var newButton=document.getElementById('new-button');
      if(newButton&&typeof newButton.click==='function'){
        newButton.click();
      }
    });

    language();
    return field;
  }

  function syncVariant(id){
    currentId=id;

    ensureControl();
    if(!field||!select)return;

    field.hidden=id!=='star-battle';

    if(id==='star-battle'){
      var variant=root.SudokuBank.find(function(v){
        return v.id==='star-battle';
      });

      var size=Number(
        variant&&variant.data&&variant.data.p3Size
      );

      if(supported.indexOf(size)<0)size=6;
      select.value=String(size);
    }
  }

  document.addEventListener(
    'sudoku:variantchange',
    function(event){
      syncVariant(
        event&&event.detail&&event.detail.id
      );
    }
  );

  document.addEventListener(
    'sudoku:languagechange',
    language
  );

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      ensureControl,
      {once:true}
    );
  }else{
    ensureControl();
  }
})(typeof window!=='undefined'?window:globalThis);
