(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var supported=[4,5,6,7,8];
  var cache=new Map();

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

  function makeRectTiling(n,random,profile){
    var solution=Array.from({length:n},function(){return Array(n).fill(-1);});
    var rects=[],nextId=0;

    function split(r0,c0,h,w,depth){
      var area=h*w;
      var cap=2+Math.floor(profile*5);
      var stop=area<=2||(area<=cap&&random()<(0.18+profile*0.42));

      if(stop||(!((h>1)||(w>1)))){
        var id=nextId++;
        for(var r=r0;r<r0+h;r++)for(var c=c0;c<c0+w;c++)solution[r][c]=id;
        rects.push({r:r0,c:c0,h:h,w:w,id:id});
        return;
      }

      var canH=h>1,canV=w>1;
      var horizontal=canH&&(!canV||random()<0.5);

      if(horizontal){
        var cutH=1+Math.floor(random()*(h-1));
        split(r0,c0,cutH,w,depth+1);
        split(r0+cutH,c0,h-cutH,w,depth+1);
      }else{
        var cutV=1+Math.floor(random()*(w-1));
        split(r0,c0,h,cutV,depth+1);
        split(r0,c0+cutV,h,w-cutV,depth+1);
      }
    }

    split(0,0,n,n,0);

    return {
      solution:solution,
      centers:rects.map(function(x){return {r:x.r+x.h/2,c:x.c+x.w/2,id:x.id};})
    };
  }

  function score(stats){return Number(stats.nodes||0)+Number(stats.branches||0)*2+Number(stats.deadEnds||0)*2;}
  function regionComplexity(solution){
    var counts={};
    for(var r=0;r<solution.length;r++)for(var c=0;c<solution[r].length;c++)counts[solution[r][c]]=(counts[solution[r][c]]||0)+1;
    var ids=Object.keys(counts),sum=0;
    ids.forEach(function(id){var area=counts[id];sum+=Math.max(0,area-1)*Math.max(0,area-1);});
    return {regions:ids.length,score:sum};
  }

  function candidates(seed,n,difficulty){
    var out=[],seen={};
    var expert=difficulty==='expert';
    var wanted=expert?(n>=8?32:20):9;
    var attemptLimit=expert?(n>=8?1600:960):320;

    for(var attempt=0;attempt<attemptLimit&&out.length<wanted;attempt++){
      var random=rng(((seed>>>0)^0x47334C58^Math.imul(n,0x85EBCA6B)^Math.imul(attempt+1,0x9E3779B1))>>>0);
      var profile=expert?(0.62+((attempt%12)/40)):(((attempt%7)+1)/8);
      var made=makeRectTiling(n,random,profile);
      var puzzle={size:n,centers:made.centers};
      var topology=JSON.stringify(made.centers);
      if(seen[topology])continue;
      seen[topology]=1;

      var stats={};
      if(generator.countGalaxiesSolutions(puzzle,2,stats)!==1)continue;
      var geometry=regionComplexity(stats.firstSolution||made.solution);
      var solverScore=score(stats);
      var playScore=solverScore+(expert?geometry.score*3:geometry.score);

      out.push({
        puzzle:puzzle,
        solution:stats.firstSolution||made.solution,
        stats:stats,
        score:playScore,
        solverScore:solverScore,
        geometryScore:geometry.score,
        regionCount:geometry.regions,
        topology:topology
      });
    }

    out.sort(function(a,b){if(a.score!==b.score)return a.score-b.score;return a.topology<b.topology?-1:(a.topology>b.topology?1:0);});
    return out;
  }

  function choose(list,difficulty){
    if(!list.length)return null;
    if(difficulty==='gentle')return list[0];
    if(difficulty==='expert')return list[list.length-1];
    return list[Math.floor((list.length-1)/2)];
  }

  function makeGalaxies(variant,seed,difficulty,size){
    var key=[variant.id,seed>>>0,difficulty,size].join(':');
    if(cache.has(key))return clone(cache.get(key));

    var list=candidates(seed>>>0,size,difficulty);
    var picked=choose(list,difficulty);
    if(!picked)throw new Error('Galaxies multi-size generation failed for seed '+seed+' / '+difficulty+' / '+size+'x'+size);

    var out=clone(variant);
    out.data=Object.assign({},out.data||{}, {p3Size:size,p3SupportedSizes:supported.slice()});
    out.puzzle=clone(picked.puzzle);
    out.solution=clone(picked.solution);
    out.generation={
      seed:seed>>>0,
      clues:picked.puzzle.centers.length,
      unique:true,
      verification:'solver-verified',
      generatorFamily:'galaxies-multisize-rectangular-tiling',
      difficultyScore:picked.score,
      searchStats:clone(picked.stats),
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:size,
      solverDifficultyScore:picked.solverScore,
      regionGeometryScore:picked.geometryScore,
      regionCount:picked.regionCount,
      candidatePool:list.length
    };
    if(difficulty==='expert'){
      out.generation.expertCalibration='expanded-candidate-search-plus-region-complexity';
      out.generation.expertCandidateTarget=size>=8?32:20;
    }

    cache.set(key,clone(out));
    return out;
  }

  var galaxyVariant=root.SudokuBank.find(function(v){return v.id==='tentai-show';});
  if(galaxyVariant){
    galaxyVariant.data=galaxyVariant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-tentai-show'));}catch(e){}
    galaxyVariant.data.p3SupportedSizes=supported.slice();
    galaxyVariant.data.p3Size=supported.indexOf(remembered)>=0?remembered:5;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='tentai-show')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(supported.indexOf(requested)<0)requested=5;
    return makeGalaxies(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport['tentai-show']=supported.slice();

  if(typeof document==='undefined')return;

  var field=null,select=null,currentId=null;

  function language(){
    var hu=!root.SudokuI18n||root.SudokuI18n.lang==='hu';
    if(field){var label=field.querySelector('span');if(label)label.textContent=hu?'Méret':'Size';}
    if(select)select.setAttribute('aria-label',hu?'Csillaggalaxisok táblaméret':'Galaxies board size');
  }

  function ensureControl(){
    if(field)return field;
    var difficultyField=document.querySelector('.difficulty-field');
    if(!difficultyField||!difficultyField.parentNode)return null;

    field=document.createElement('label');
    field.className='deck-field size-field galaxies-size-field';
    field.hidden=true;
    var label=document.createElement('span');
    select=document.createElement('select');
    select.id='galaxies-size-select';

    supported.forEach(function(n){var option=document.createElement('option');option.value=String(n);option.textContent=n+'×'+n;select.appendChild(option);});
    field.append(label,select);
    difficultyField.parentNode.insertBefore(field,difficultyField);

    select.addEventListener('change',function(){
      if(currentId!=='tentai-show')return;
      var variant=root.SudokuBank.find(function(v){return v.id==='tentai-show';});
      if(!variant)return;
      var size=Number(select.value);
      if(supported.indexOf(size)<0)return;
      variant.data=variant.data||{};
      variant.data.p3Size=size;
      try{root.localStorage&&root.localStorage.setItem('ildi-size-tentai-show',String(size));}catch(e){}
      var newButton=document.getElementById('new-button');
      if(newButton&&typeof newButton.click==='function')newButton.click();
    });

    language();
    return field;
  }

  function syncVariant(id){
    currentId=id;
    ensureControl();
    if(!field||!select)return;
    field.hidden=id!=='tentai-show';
    if(id==='tentai-show'){
      var variant=root.SudokuBank.find(function(v){return v.id==='tentai-show';});
      var size=Number(variant&&variant.data&&variant.data.p3Size);
      if(supported.indexOf(size)<0)size=5;
      select.value=String(size);
    }
  }

  document.addEventListener('sudoku:variantchange',function(event){syncVariant(event&&event.detail&&event.detail.id);});
  document.addEventListener('sudoku:languagechange',language);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureControl,{once:true});else ensureControl();
})(typeof window!=='undefined'?window:globalThis);
