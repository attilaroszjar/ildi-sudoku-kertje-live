(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var supported=[5,6,7,8,9];
  var cache=new Map();

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}

  function whiteConnected(mask){
    var n=mask.length,start=null,total=0,r,c;
    for(r=0;r<n;r++)for(c=0;c<n;c++)if(!mask[r][c]){total++;if(!start)start=[r,c];}
    if(!start)return false;
    var seen={},q=[start],count=0;seen[start[0]+','+start[1]]=1;
    while(q.length){
      var p=q.shift();count++;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){
        var rr=p[0]+d[0],cc=p[1]+d[1],k=rr+','+cc;
        if(rr>=0&&cc>=0&&rr<n&&cc<n&&!mask[rr][cc]&&!seen[k]){seen[k]=1;q.push([rr,cc]);}
      });
    }
    return count===total;
  }

  function validMask(puzzle,mask){
    var n=puzzle.length,r,c,seen;
    for(r=0;r<n;r++)for(c=0;c<n;c++)if(mask[r][c]){
      if(r+1<n&&mask[r+1][c])return false;
      if(c+1<n&&mask[r][c+1])return false;
    }
    for(r=0;r<n;r++){
      seen={};
      for(c=0;c<n;c++)if(!mask[r][c]){if(seen[puzzle[r][c]])return false;seen[puzzle[r][c]]=1;}
    }
    for(c=0;c<n;c++){
      seen={};
      for(r=0;r<n;r++)if(!mask[r][c]){if(seen[puzzle[r][c]])return false;seen[puzzle[r][c]]=1;}
    }
    return whiteConnected(mask);
  }

  function buildCandidate(seed,n,attempt){
    var random=rng(((seed>>>0)^0x48335452^Math.imul(n,0x85EBCA6B)^Math.imul(attempt+1,0x9E3779B1))>>>0);
    var digits=shuffle(Array.from({length:n},function(_,i){return i+1;}),random);
    var rowPerm=shuffle(Array.from({length:n},function(_,i){return i;}),random);
    var colPerm=shuffle(Array.from({length:n},function(_,i){return i;}),random);
    var offset=Math.floor(random()*n);
    var base=Array.from({length:n},function(_,r){
      return Array.from({length:n},function(_,c){
        return digits[(rowPerm[r]+colPerm[c]+offset)%n];
      });
    });

    var mask=Array.from({length:n},function(){return Array(n).fill(false);});
    var order=shuffle(Array.from({length:n*n},function(_,i){return i;}),random);

    /*
     * 9x9 needs a denser constraint graph than the original 6x6-oriented
     * generator. Smaller sizes retain the already-proven density policy.
     */
    var target=n>=9
      ?Math.max(16,Math.min(23,Math.round(n*n*(0.20+random()*0.08))))
      :Math.max(4,Math.min(Math.floor(n*n/3),Math.round(n*(1.10+random()*0.75))));

    var black=0;

    for(var oi=0;oi<order.length&&black<target;oi++){
      var idx=order[oi],r=Math.floor(idx/n),c=idx%n;

      if(
        (r&&mask[r-1][c])||
        (r+1<n&&mask[r+1][c])||
        (c&&mask[r][c-1])||
        (c+1<n&&mask[r][c+1])
      )continue;

      mask[r][c]=true;

      if(!whiteConnected(mask)){
        mask[r][c]=false;
        continue;
      }

      black++;
    }

    if(black<target)return null;

    var puzzle=base.map(function(row){return row.slice();});

    function otherBlackAdjacent(rr,cc,exceptR,exceptC){
      var dirs=[[1,0],[-1,0],[0,1],[0,-1]];

      for(var di=0;di<dirs.length;di++){
        var ar=rr+dirs[di][0];
        var ac=cc+dirs[di][1];

        if(ar<0||ac<0||ar>=n||ac>=n)continue;
        if(ar===exceptR&&ac===exceptC)continue;

        if(mask[ar][ac])return true;
      }

      return false;
    }

    for(r=0;r<n;r++)for(c=0;c<n;c++)if(mask[r][c]){
      /*
       * On 9x9, make the black cell duplicate the SAME value against
       * one white cell in its row and one white cell in its column.
       *
       * Prefer witnesses that cannot themselves safely turn black while
       * neighbouring another intended black cell. This gives the Hitori
       * solver a much stronger, deterministic constraint graph.
       */
      if(n>=9){
        var strong=[];
        var weak=[];

        for(var value=1;value<=n;value++){
          var rowPeer=-1;
          var colPeer=-1;

          for(var j=0;j<n;j++){
            if(j!==c&&base[r][j]===value){
              rowPeer=j;
              break;
            }
          }

          for(var i=0;i<n;i++){
            if(i!==r&&base[i][c]===value){
              colPeer=i;
              break;
            }
          }

          if(rowPeer<0||colPeer<0)continue;
          if(mask[r][rowPeer]||mask[colPeer][c])continue;

          var protection=
            (otherBlackAdjacent(r,rowPeer,r,c)?1:0)+
            (otherBlackAdjacent(colPeer,c,r,c)?1:0);

          var q={
            value:value,
            rowPeer:rowPeer,
            colPeer:colPeer,
            protection:protection
          };

          if(protection===2)strong.push(q);
          else weak.push(q);
        }

        var choices9=strong.length?strong:weak;

        if(!choices9.length)return null;

        choices9.sort(function(a,b){
          if(a.protection!==b.protection)return b.protection-a.protection;
          if(a.value!==b.value)return a.value-b.value;
          if(a.rowPeer!==b.rowPeer)return a.rowPeer-b.rowPeer;
          return a.colPeer-b.colPeer;
        });

        var bestProtection=choices9[0].protection;
        var best=choices9.filter(function(q){
          return q.protection===bestProtection;
        });

        var chosen=best[Math.floor(random()*best.length)];

        /*
         * For a genuine production 9x9 candidate require at least one
         * protected witness. Completely unprotected duplicate pairs are
         * exactly the weak topology that caused the previous failures.
         */
        if(chosen.protection<1)return null;

        puzzle[r][c]=chosen.value;
      }else{
        var choices=[];

        for(var jj=0;jj<n;jj++){
          if(jj!==c&&!mask[r][jj])choices.push(base[r][jj]);
        }

        for(var ii=0;ii<n;ii++){
          if(ii!==r&&!mask[ii][c])choices.push(base[ii][c]);
        }

        if(!choices.length)return null;

        puzzle[r][c]=choices[Math.floor(random()*choices.length)];
      }
    }

    if(!validMask(puzzle,mask))return null;

    var stats={};

    if(generator.countHitoriSolutions(puzzle,2,stats)!==1){
      return null;
    }

    return {
      puzzle:puzzle,
      solution:mask.map(function(row){
        return row.map(function(x){return x?1:0;});
      }),
      stats:stats,
      score:
        Number(stats.nodes||0)+
        Number(stats.branches||0)*2+
        Number(stats.deadEnds||0)*2,
      topology:JSON.stringify(mask)
    };
  }

  function candidates(seed,n){
    var out=[],seen={};
    for(var attempt=0;attempt<900&&out.length<9;attempt++){
      var made=buildCandidate(seed,n,attempt);
      if(!made||seen[made.topology])continue;
      seen[made.topology]=1;
      out.push(made);
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

  function makeHitori(variant,seed,difficulty,size){
    var key=[variant.id,seed>>>0,difficulty,size].join(':');
    if(cache.has(key))return clone(cache.get(key));
    var list=candidates(seed>>>0,size),picked=choose(list,difficulty);
    if(!picked)throw new Error('Hitori multi-size generation failed for seed '+seed+' / '+difficulty+' / '+size+'x'+size);

    var out=clone(variant);
    out.data=Object.assign({},out.data||{}, {p3Size:size,p3SupportedSizes:supported.slice()});
    out.puzzle=clone(picked.puzzle);
    out.solution=clone(picked.solution);
    out.generation={
      seed:seed>>>0,
      clues:size*size,
      unique:true,
      verification:'solver-verified',
      generatorFamily:'hitori-multisize-latin-duplicate-mask',
      difficultyScore:picked.score,
      searchStats:clone(picked.stats),
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:size
    };
    if(difficulty==='expert'){
      out.generation.policy='complete-grid-symbol-topology';
      out.generation.playabilityMetric='solution-state-exposure-and-exact-search-effort';
      out.generation.removableAtomPolicy='none-complete-grid-is-puzzle-definition';
      out.generation.localIrreducibilityApplicability='not-applicable-complete-grid-definition';
      out.generation.startingAnswerCount=0;
      out.generation.clueDensityInterpretation='full-grid-symbols-are-not-prefilled-answers';
    }
    cache.set(key,clone(out));
    return out;
  }

  var hitoriVariant=root.SudokuBank.find(function(v){return v.id==='hitori';});
  if(hitoriVariant){
    hitoriVariant.data=hitoriVariant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-hitori'));}catch(e){}
    hitoriVariant.data.p3SupportedSizes=supported.slice();
    hitoriVariant.data.p3Size=supported.indexOf(remembered)>=0?remembered:6;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='hitori')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(supported.indexOf(requested)<0)requested=6;
    return makeHitori(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport.hitori=supported.slice();

  if(typeof document==='undefined')return;

  var field=null,select=null,currentId=null;
  function language(){
    var hu=!root.SudokuI18n||root.SudokuI18n.lang==='hu';
    if(field){var label=field.querySelector('span');if(label)label.textContent=hu?'Méret':'Size';}
    if(select)select.setAttribute('aria-label',hu?'Hitori táblaméret':'Hitori board size');
  }
  function ensureControl(){
    if(field)return field;
    var difficultyField=document.querySelector('.difficulty-field');
    if(!difficultyField||!difficultyField.parentNode)return null;
    field=document.createElement('label');field.className='deck-field size-field hitori-size-field';field.hidden=true;
    var label=document.createElement('span');select=document.createElement('select');select.id='hitori-size-select';
    supported.forEach(function(n){var option=document.createElement('option');option.value=String(n);option.textContent=n+'×'+n;select.appendChild(option);});
    field.append(label,select);difficultyField.parentNode.insertBefore(field,difficultyField);
    select.addEventListener('change',function(){
      if(currentId!=='hitori')return;
      var variant=root.SudokuBank.find(function(v){return v.id==='hitori';});if(!variant)return;
      var size=Number(select.value);if(supported.indexOf(size)<0)return;
      variant.data=variant.data||{};variant.data.p3Size=size;
      try{root.localStorage&&root.localStorage.setItem('ildi-size-hitori',String(size));}catch(e){}
      var newButton=document.getElementById('new-button');if(newButton&&typeof newButton.click==='function')newButton.click();
    });
    language();return field;
  }
  function syncVariant(id){
    currentId=id;ensureControl();if(!field||!select)return;field.hidden=id!=='hitori';
    if(id==='hitori'){
      var variant=root.SudokuBank.find(function(v){return v.id==='hitori';});
      var size=Number(variant&&variant.data&&variant.data.p3Size);if(supported.indexOf(size)<0)size=6;select.value=String(size);
    }
  }
  document.addEventListener('sudoku:variantchange',function(event){syncVariant(event&&event.detail&&event.detail.id);});
  document.addEventListener('sudoku:languagechange',language);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureControl,{once:true});else ensureControl();
})(typeof window!=='undefined'?window:globalThis);
