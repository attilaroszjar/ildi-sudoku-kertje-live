(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var supported=[4,5,6,7,8];
  var cache=new Map();

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}

  function latinSolution(n,random){
    var rows=shuffle(Array.from({length:n},function(_,i){return i;}),random);
    var cols=shuffle(Array.from({length:n},function(_,i){return i;}),random);
    var symbols=shuffle(Array.from({length:n},function(_,i){return i+1;}),random);
    var offset=Math.floor(random()*n);
    return Array.from({length:n},function(_,r){
      return Array.from({length:n},function(_,c){
        return symbols[(rows[r]+cols[c]+offset)%n];
      });
    });
  }

  function allInequalities(solution){
    var n=solution.length,out=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      if(c+1<n)out.push({a:[r,c],b:[r,c+1],op:solution[r][c]<solution[r][c+1]?'<':'>'});
      if(r+1<n)out.push({a:[r,c],b:[r+1,c],op:solution[r][c]<solution[r+1][c]?'<':'>'});
    }
    return out;
  }

  function profile(n,difficulty){
    var cells=n*n,edges=2*n*(n-1);
    if(difficulty==='gentle')return {givens:Math.max(3,Math.round(cells*.28)),ineq:Math.max(n,Math.round(edges*.58))};
    if(difficulty==='expert')return {givens:Math.max(1,Math.round(cells*.14)),ineq:Math.max(n,Math.round(edges*.40))};
    return {givens:Math.max(2,Math.round(cells*.19)),ineq:Math.max(n,Math.round(edges*.48))};
  }

  function buildCandidate(seed,n,difficulty,attempt){
    var random=rng(((seed>>>0)^0x4633544f^Math.imul(n,0x85EBCA6B)^Math.imul(attempt+1,0x9E3779B1))>>>0);
    var solution=latinSolution(n,random);
    var inequalities=allInequalities(solution);
    shuffle(inequalities,random);
    var p=profile(n,difficulty);
    inequalities=inequalities.slice(0,p.ineq);

    var puzzle=clone(solution),order=shuffle(Array.from({length:n*n},function(_,i){return i;}),random),clues=n*n;
    for(var oi=0;oi<order.length&&clues>p.givens;oi++){
      var idx=order[oi],r=Math.floor(idx/n),c=idx%n,saved=puzzle[r][c];
      puzzle[r][c]=0;
      if(generator.countFutoshikiSolutions(puzzle,inequalities,2,{})!==1)puzzle[r][c]=saved;
      else clues--;
    }

    var stats={};
    if(generator.countFutoshikiSolutions(puzzle,inequalities,2,stats)!==1)return null;
    var score=Number(stats.nodes||0)+Number(stats.branches||0)*3+Number(stats.deadEnds||0)*2;

    return {
      puzzle:puzzle,
      solution:solution,
      inequalities:inequalities,
      clues:clues,
      stats:stats,
      score:score,
      topology:JSON.stringify(inequalities)
    };
  }

  function carveExpert(seed,puzzle,inequalities){
    puzzle=clone(puzzle);inequalities=clone(inequalities);
    var random=rng(((seed>>>0)^0x45585054)>>>0);
    var clues=[];
    for(var r=0;r<puzzle.length;r++)for(var c=0;c<puzzle.length;c++)if(puzzle[r][c])clues.push({kind:'given',r:r,c:c});
    for(var i=0;i<inequalities.length;i++)clues.push({kind:'inequality',value:inequalities[i]});
    shuffle(clues,random);
    var accepted=0,rejected=0,acceptedGivens=0,acceptedInequalities=0;
    for(i=0;i<clues.length;i++){
      var clue=clues[i],saved,index;
      if(clue.kind==='given'){
        saved=puzzle[clue.r][clue.c];puzzle[clue.r][clue.c]=0;
        if(generator.countFutoshikiSolutions(puzzle,inequalities,2,{})===1){accepted++;acceptedGivens++;}
        else{puzzle[clue.r][clue.c]=saved;rejected++;}
      }else{
        index=inequalities.indexOf(clue.value);
        if(index<0)continue;
        inequalities.splice(index,1);
        if(generator.countFutoshikiSolutions(puzzle,inequalities,2,{})===1){accepted++;acceptedInequalities++;}
        else{inequalities.splice(index,0,clue.value);rejected++;}
      }
    }
    return {puzzle:puzzle,inequalities:inequalities,accepted:accepted,rejected:rejected,acceptedGivens:acceptedGivens,acceptedInequalities:acceptedInequalities};
  }

  function makeFutoshiki(variant,seed,difficulty,size){
    var key=[variant.id,seed>>>0,difficulty,size].join(':');
    if(cache.has(key))return clone(cache.get(key));

    var candidates=[],seen={};
    for(var attempt=0;attempt<24&&candidates.length<5;attempt++){
      var made=buildCandidate(seed,size,difficulty,attempt);
      if(!made||seen[made.topology])continue;
      seen[made.topology]=1;
      candidates.push(made);
    }
    if(!candidates.length)throw new Error('Futoshiki multi-size generation failed for seed '+seed+' / '+difficulty+' / '+size+'x'+size);
    candidates.sort(function(a,b){if(a.score!==b.score)return a.score-b.score;return a.topology<b.topology?-1:(a.topology>b.topology?1:0);});
    var picked=difficulty==='gentle'?candidates[0]:(difficulty==='expert'?candidates[candidates.length-1]:candidates[Math.floor((candidates.length-1)/2)]);

    var expertCarve=difficulty==='expert'?carveExpert(seed,picked.puzzle,picked.inequalities):null;
    var finalPuzzle=expertCarve?expertCarve.puzzle:picked.puzzle;
    var finalInequalities=expertCarve?expertCarve.inequalities:picked.inequalities;
    var finalClues=0;for(var r=0;r<size;r++)for(var c=0;c<size;c++)if(finalPuzzle[r][c])finalClues++;
    var out=clone(variant);
    out.data=Object.assign({},out.data||{}, {
      inequalities:clone(finalInequalities),
      inputMax:size,
      p3Size:size,
      p3SupportedSizes:supported.slice()
    });
    out.puzzle=clone(finalPuzzle);
    out.solution=clone(picked.solution);
    out.generation={
      seed:seed>>>0,
      clues:finalClues,
      unique:true,
      verification:'solver-verified',
      generatorFamily:'futoshiki-multisize-latin-inequality-removal',
      difficultyScore:picked.score,
      searchStats:clone(picked.stats),
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:size,
      inequalityCount:finalInequalities.length
    };
    if(expertCarve){
      out.generation.verification='solver-verified-local-irreducible';
      out.generation.generatorFamily='futoshiki-multisize-latin-inequality-removal-expert-local-irreducible';
      out.generation.locallyIrreducibleUnderProductionContract=true;
      out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
      out.generation.policy='contract-driven-local-irreducibility';
      out.generation.acceptedRemovals=expertCarve.accepted;
      out.generation.rejectedRemovals=expertCarve.rejected;
      out.generation.acceptedGivenRemovals=expertCarve.acceptedGivens;
      out.generation.acceptedInequalityRemovals=expertCarve.acceptedInequalities;
    }

    cache.set(key,clone(out));
    return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='futoshiki';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-futoshiki'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();
    variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:6;
  }

  generator.make=function(v,seed,difficulty){
    if(!v||v.id!=='futoshiki')return baseMake.call(this,v,seed,difficulty);
    var size=Number(v.data&&v.data.p3Size);
    if(supported.indexOf(size)<0)size=6;
    return makeFutoshiki(v,seed>>>0,difficulty||'focused',size);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport.futoshiki=supported.slice();

  if(typeof document==='undefined')return;
  var field=null,select=null,currentId=null;

  function language(){
    var hu=!root.SudokuI18n||root.SudokuI18n.lang==='hu';
    if(field){var label=field.querySelector('span');if(label)label.textContent=hu?'Méret':'Size';}
    if(select)select.setAttribute('aria-label',hu?'Futoshiki táblaméret':'Futoshiki board size');
  }

  function ensureControl(){
    if(field)return field;
    var difficultyField=document.querySelector('.difficulty-field');
    if(!difficultyField||!difficultyField.parentNode)return null;
    field=document.createElement('label');field.className='deck-field size-field futoshiki-size-field';field.hidden=true;
    var label=document.createElement('span');select=document.createElement('select');select.id='futoshiki-size-select';
    supported.forEach(function(n){var option=document.createElement('option');option.value=String(n);option.textContent=n+'×'+n;select.appendChild(option);});
    field.append(label,select);difficultyField.parentNode.insertBefore(field,difficultyField);
    select.addEventListener('change',function(){
      if(currentId!=='futoshiki')return;
      var v=root.SudokuBank.find(function(x){return x.id==='futoshiki';});if(!v)return;
      var size=Number(select.value);if(supported.indexOf(size)<0)return;
      v.data=v.data||{};v.data.p3Size=size;
      try{root.localStorage&&root.localStorage.setItem('ildi-size-futoshiki',String(size));}catch(e){}
      var newButton=document.getElementById('new-button');if(newButton&&typeof newButton.click==='function')newButton.click();
    });
    language();return field;
  }

  function syncVariant(id){
    currentId=id;ensureControl();if(!field||!select)return;field.hidden=id!=='futoshiki';
    if(id==='futoshiki'){
      var v=root.SudokuBank.find(function(x){return x.id==='futoshiki';});
      var size=Number(v&&v.data&&v.data.p3Size);if(supported.indexOf(size)<0)size=6;select.value=String(size);
    }
  }

  document.addEventListener('sudoku:variantchange',function(e){syncVariant(e&&e.detail&&e.detail.id);});
  document.addEventListener('sudoku:languagechange',language);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureControl,{once:true});else ensureControl();
})(typeof window!=='undefined'?window:globalThis);
