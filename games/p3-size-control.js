(function(root){
  'use strict';

  if(typeof document==='undefined')return;

  var field=null;
  var select=null;
  var label=null;
  var currentId=null;

  function variantById(id){
    return root.SudokuBank&&root.SudokuBank.find(function(v){return v.id===id;});
  }

  function supportedFor(id){
    var map=root.IldiP3SizeSupport||{};
    var list=map[id];
    return Array.isArray(list)?list.slice():[];
  }

  function language(){
    var hu=!root.SudokuI18n||root.SudokuI18n.lang==='hu';
    if(label)label.textContent=hu?'Méret':'Size';
    if(select)select.setAttribute('aria-label',hu?'Táblaméret':'Board size');
  }

  function removeLegacyControls(){
    document.querySelectorAll('.size-field').forEach(function(node){
      if(node!==field)node.remove();
    });
  }

  function controlDeck(){
    return field&&field.closest?field.closest('.control-deck'):document.querySelector('.control-deck');
  }

  function setSizeLayout(active){
    var deck=controlDeck();
    if(deck)deck.classList.toggle('has-p3-size',!!active);
  }

  function ensureControl(){
    if(field&&field.isConnected)return field;
    removeLegacyControls();
    var difficulty=document.querySelector('.difficulty-field');
    if(!difficulty||!difficulty.parentNode)return null;
    field=document.createElement('label');
    field.className='deck-field size-field p3-size-field';
    field.hidden=true;
    label=document.createElement('span');
    label.id='size-label';
    select=document.createElement('select');
    select.id='size-select';
    field.append(label,select);
    difficulty.parentNode.insertBefore(field,difficulty);
    select.addEventListener('change',function(){
      if(!currentId)return;
      var supported=supportedFor(currentId);
      var size=Number(select.value);
      if(supported.indexOf(size)<0)return;
      var variant=variantById(currentId);
      if(!variant)return;
      variant.data=variant.data||{};
      variant.data.p3Size=size;
      try{root.localStorage&&root.localStorage.setItem('ildi-size-'+currentId,String(size));}catch(e){}
      var button=document.getElementById('new-button');
      if(button&&typeof button.click==='function')button.click();
    });
    language();
    return field;
  }

  function sync(id){
    currentId=id||null;
    ensureControl();
    removeLegacyControls();
    if(!field||!select)return;
    var supported=supportedFor(currentId);
    if(!supported.length){field.hidden=true;setSizeLayout(false);select.replaceChildren();return;}
    var variant=variantById(currentId);
    var wanted=Number(variant&&variant.data&&variant.data.p3Size);
    if(supported.indexOf(wanted)<0)wanted=supported[0];
    select.replaceChildren.apply(select,supported.map(function(n){
      var option=document.createElement('option');
      option.value=String(n);option.textContent=n+'×'+n;return option;
    }));
    select.value=String(wanted);field.hidden=false;setSizeLayout(true);
  }

  function init(){
    ensureControl();removeLegacyControls();
    document.addEventListener('sudoku:variantchange',function(event){sync(event&&event.detail&&event.detail.id);});
    document.addEventListener('sudoku:languagechange',language);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})(typeof window!=='undefined'?window:globalThis);

// Exact large-board playability hardening. 16x16 expert uniqueness is represented
// as an exact-cover problem. Given assignments are pre-covered before the sparse
// candidate matrix is built, so the search contains only genuinely open cells and
// candidates compatible with the fixed givens. There is no timeout or clue floor.
(function(root){
  'use strict';
  if(!root.SudokuGenerator||typeof root.SudokuGenerator.make!=='function'||typeof root.SudokuGenerator.countSolutions!=='function')return;
  var baseMake=root.SudokuGenerator.make;
  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function mulberry32(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(list,random){for(var i=list.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),tmp=list[i];list[i]=list[j];list[j]=tmp;}return list;}
  function countGivens(grid){var total=0;for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c])total++;return total;}
  function hybridOrder64(grid,seed){
    var n=16,seeded=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c])seeded.push(r*n+c);
    shuffle(seeded,mulberry32(((seed>>>0)^0x16E4A7C5)>>>0));
    var groups=Array.from({length:16},function(){return[];});
    for(var i=0;i<seeded.length;i++){
      var idx=seeded[i],rr=Math.floor(idx/n),cc=idx%n,b=((rr>>2)<<2)+(cc>>2);
      groups[b].push(idx);
    }
    var balanced=[],pos=0,remaining=true;
    while(remaining){
      remaining=false;
      for(var b=0;b<16;b++)if(pos<groups[b].length){balanced.push(groups[b][pos]);remaining=true;}
      pos++;
    }
    var prefix=balanced.slice(0,Math.min(64,balanced.length)),used=new Set(prefix),order=prefix.slice();
    for(i=0;i<seeded.length;i++)if(!used.has(seeded[i]))order.push(seeded[i]);
    return order;
  }

  function count16SolutionsExact(source,limit,stats){
    limit=Math.max(1,Number(limit)||2);
    if(!Array.isArray(source)||source.length!==16)return 0;
    var rowMask=new Uint32Array(16),colMask=new Uint32Array(16),boxMask=new Uint32Array(16);
    var active=new Uint8Array(1024);active.fill(1);
    var empties=[];var full=0xFFFF;
    function boxIndex(r,c){return ((r>>2)<<2)+(c>>2);}
    function cellCol(r,c){return r*16+c;}
    function rowDigitCol(r,d){return 256+r*16+(d-1);}
    function colDigitCol(c,d){return 512+c*16+(d-1);}
    function boxDigitCol(b,d){return 768+b*16+(d-1);}
    for(var r=0;r<16;r++){
      if(!Array.isArray(source[r])||source[r].length!==16)return 0;
      for(var c=0;c<16;c++){
        var d=Number(source[r][c])||0;
        if(!d){empties.push(r*16+c);continue;}
        if(d<1||d>16)return 0;
        var bit=1<<(d-1),b=boxIndex(r,c);
        if((rowMask[r]&bit)||(colMask[c]&bit)||(boxMask[b]&bit))return 0;
        rowMask[r]|=bit;colMask[c]|=bit;boxMask[b]|=bit;
        active[cellCol(r,c)]=0;active[rowDigitCol(r,d)]=0;active[colDigitCol(c,d)]=0;active[boxDigitCol(b,d)]=0;
      }
    }
    var root={L:null,R:null};root.L=root;root.R=root;
    var cols=new Array(1024);
    for(var ci=0;ci<1024;ci++){
      var col={L:null,R:null,U:null,D:null,size:0,index:ci};col.U=col;col.D=col;cols[ci]=col;
      if(!active[ci]){col.L=col;col.R=col;continue;}
      col.L=root.L;col.R=root;root.L.R=col;root.L=col;
    }
    function addRow(indices){
      var first=null,last=null;
      for(var k=0;k<indices.length;k++){
        var col=cols[indices[k]],node={L:null,R:null,U:col.U,D:col,C:col};
        col.U.D=node;col.U=node;col.size++;
        if(!first){first=node;node.L=node;node.R=node;last=node;}
        else{node.L=last;node.R=first;last.R=node;first.L=node;last=node;}
      }
    }
    for(var ei=0;ei<empties.length;ei++){
      var idx=empties[ei],rr=idx>>4,cc=idx&15,bx=boxIndex(rr,cc);
      var mask=full&~(rowMask[rr]|colMask[cc]|boxMask[bx]);
      if(!mask){if(stats){stats.nodes=0;stats.branches=0;stats.deadEnds=1;stats.propagated=0;stats.solutions=0;}return 0;}
      while(mask){var bit=mask&-mask;mask^=bit;var d=32-Math.clz32(bit);addRow([cellCol(rr,cc),rowDigitCol(rr,d),colDigitCol(cc,d),boxDigitCol(bx,d)]);}
    }
    function cover(c){c.R.L=c.L;c.L.R=c.R;for(var i=c.D;i!==c;i=i.D)for(var j=i.R;j!==i;j=j.R){j.D.U=j.U;j.U.D=j.D;j.C.size--;}}
    function uncover(c){for(var i=c.U;i!==c;i=i.U)for(var j=i.L;j!==i;j=j.L){j.C.size++;j.D.U=j;j.U.D=j;}c.R.L=c;c.L.R=c;}
    var solutions=0,nodes=0,branches=0,deadEnds=0;
    function search(){
      if(solutions>=limit)return;nodes++;
      if(root.R===root){solutions++;return;}
      var chosen=null,min=1e9;
      for(var c=root.R;c!==root;c=c.R){if(c.size<min){min=c.size;chosen=c;if(min<=1)break;}}
      if(!chosen||chosen.size===0){deadEnds++;return;}
      branches++;cover(chosen);
      for(var r=chosen.D;r!==chosen&&solutions<limit;r=r.D){for(var j=r.R;j!==r;j=j.R)cover(j.C);search();for(var u=r.L;u!==r;u=u.L)uncover(u.C);}
      uncover(chosen);
    }
    search();
    if(stats){stats.nodes=nodes;stats.branches=branches;stats.deadEnds=deadEnds;stats.propagated=0;stats.solutions=solutions;stats.openCells=empties.length;}
    return solutions;
  }

  root.SudokuGenerator.countLargeClassicSolutionsExact=count16SolutionsExact;
  root.SudokuGenerator.make=function(variant,seed,difficulty){
    var out=baseMake.apply(this,arguments);
    if(!variant||variant.id!=='sudoku-16x16'||difficulty!=='expert'||!out||!Array.isArray(out.puzzle))return out;
    if(out.generation&&out.generation.locallyIrreducibleUnderProductionContract===true)return out;
    var grid=cloneGrid(out.puzzle),n=grid.length;if(n!==16)return out;
    var order=hybridOrder64(grid,seed);
    var accepted=0,rejected=0;
    for(var i=0;i<order.length;i++){
      var idx=order[i],rr=Math.floor(idx/n),cc=idx%n,old=grid[rr][cc];if(!old)continue;
      grid[rr][cc]=0;if(count16SolutionsExact(grid,2)===1)accepted++;else{grid[rr][cc]=old;rejected++;}
    }
    var finalCount=countGivens(grid),finalStats={};
    out.puzzle=grid;out.generation=out.generation||{};out.generation.clues=finalCount;
    out.generation.unique=count16SolutionsExact(grid,2,finalStats)===1;
    out.generation.verification='classic16-dlx-precovered-exact-v2';
    out.generation.generatorFamily='large-unique-removal-expert-local-irreducible';
    out.generation.policy='contract-driven-local-irreducibility';
    out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
    out.generation.locallyIrreducibleUnderProductionContract=true;
    out.generation.removalOrder='hybrid-box-prefix-64-seeded';
    out.generation.acceptedRemovals=accepted;out.generation.rejectedRemovals=rejected;out.generation.exactSearchStats=finalStats;
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);

// 12x12 expert playability hardening. The existing exact Classic counter is already
// cheap enough on this board size, so use it directly for a deterministic full pass.
(function(root){
  'use strict';
  if(!root.SudokuGenerator||typeof root.SudokuGenerator.make!=='function'||typeof root.SudokuGenerator.countSolutions!=='function')return;
  var baseMake=root.SudokuGenerator.make;
  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function mulberry32(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(list,random){for(var i=list.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),tmp=list[i];list[i]=list[j];list[j]=tmp;}return list;}
  function countGivens(grid){var total=0;for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c])total++;return total;}
  root.SudokuGenerator.make=function(variant,seed,difficulty){
    var out=baseMake.apply(this,arguments);
    if(!variant||variant.id!=='sudoku-12x12'||difficulty!=='expert'||!out||!Array.isArray(out.puzzle))return out;
    if(out.generation&&out.generation.locallyIrreducibleUnderProductionContract===true)return out;
    var grid=cloneGrid(out.puzzle),n=grid.length;if(n!==12)return out;
    var order=[];for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c])order.push(r*n+c);
    shuffle(order,mulberry32(((seed>>>0)^0x12E4A7C5)>>>0));
    var accepted=0,rejected=0;
    for(var i=0;i<order.length;i++){
      var idx=order[i],rr=Math.floor(idx/n),cc=idx%n,old=grid[rr][cc];if(!old)continue;
      grid[rr][cc]=0;if(root.SudokuGenerator.countSolutions(grid,2)===1)accepted++;else{grid[rr][cc]=old;rejected++;}
    }
    var finalCount=countGivens(grid);
    out.puzzle=grid;out.generation=out.generation||{};out.generation.clues=finalCount;
    out.generation.unique=root.SudokuGenerator.countSolutions(grid,2)===1;
    out.generation.verification='rotation-safe-solver-verified-local-irreducible';
    out.generation.generatorFamily='sudoku12-rotation-safe-expert-local-irreducible';
    out.generation.policy='contract-driven-local-irreducibility';
    out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
    out.generation.locallyIrreducibleUnderProductionContract=true;
    out.generation.acceptedRemovals=accepted;out.generation.rejectedRemovals=rejected;
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);

// Mini-6 expert playability hardening. The trusted generic exact counter is very
// cheap on 6x6, so use it directly for a deterministic full irreducibility pass.
(function(root){
  'use strict';
  if(!root.SudokuGenerator||typeof root.SudokuGenerator.make!=='function'||typeof root.SudokuGenerator.countSolutions!=='function')return;
  var baseMake=root.SudokuGenerator.make;
  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function mulberry32(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(list,random){for(var i=list.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),tmp=list[i];list[i]=list[j];list[j]=tmp;}return list;}
  function countGivens(grid){var total=0;for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c])total++;return total;}
  root.SudokuGenerator.make=function(variant,seed,difficulty){
    var out=baseMake.apply(this,arguments);
    if(!variant||variant.id!=='mini-6'||difficulty!=='expert'||!out||!Array.isArray(out.puzzle))return out;
    if(out.generation&&out.generation.locallyIrreducibleUnderProductionContract===true)return out;
    var grid=cloneGrid(out.puzzle),n=grid.length;if(n!==6)return out;
    var order=[];for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c])order.push(r*n+c);
    shuffle(order,mulberry32(((seed>>>0)^0x06E4A7C5)>>>0));
    var accepted=0,rejected=0;
    for(var i=0;i<order.length;i++){
      var idx=order[i],rr=Math.floor(idx/n),cc=idx%n,old=grid[rr][cc];if(!old)continue;
      grid[rr][cc]=0;if(root.SudokuGenerator.countSolutions(grid,2)===1)accepted++;else{grid[rr][cc]=old;rejected++;}
    }
    var finalCount=countGivens(grid);
    out.puzzle=grid;out.generation=out.generation||{};out.generation.clues=finalCount;
    out.generation.unique=root.SudokuGenerator.countSolutions(grid,2)===1;
    out.generation.verification='rotation-safe-solver-verified-local-irreducible';
    out.generation.generatorFamily='mini6-rotation-safe-expert-local-irreducible';
    out.generation.policy='contract-driven-local-irreducibility';
    out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
    out.generation.locallyIrreducibleUnderProductionContract=true;
    out.generation.acceptedRemovals=accepted;out.generation.rejectedRemovals=rejected;
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);

// Mini 4x4 expert playability hardening. Exact Classic verification is trivial at
// this size, so perform one deterministic full removal pass with no clue floor.
(function(root){
  'use strict';
  if(!root.SudokuGenerator||typeof root.SudokuGenerator.make!=='function'||typeof root.SudokuGenerator.countSolutions!=='function')return;
  var baseMake=root.SudokuGenerator.make;
  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function mulberry32(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(list,random){for(var i=list.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),tmp=list[i];list[i]=list[j];list[j]=tmp;}return list;}
  function countGivens(grid){var total=0;for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c])total++;return total;}
  root.SudokuGenerator.make=function(variant,seed,difficulty){
    var out=baseMake.apply(this,arguments);
    if(!variant||variant.id!=='mini'||difficulty!=='expert'||!out||!Array.isArray(out.puzzle))return out;
    if(out.generation&&out.generation.locallyIrreducibleUnderProductionContract===true)return out;
    var grid=cloneGrid(out.puzzle),n=grid.length;if(n!==4)return out;
    var order=[];for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c])order.push(r*n+c);
    shuffle(order,mulberry32(((seed>>>0)^0x04E4A7C5)>>>0));
    var accepted=0,rejected=0;
    for(var i=0;i<order.length;i++){
      var idx=order[i],rr=Math.floor(idx/n),cc=idx%n,old=grid[rr][cc];if(!old)continue;
      grid[rr][cc]=0;if(root.SudokuGenerator.countSolutions(grid,2)===1)accepted++;else{grid[rr][cc]=old;rejected++;}
    }
    var finalCount=countGivens(grid);
    out.puzzle=grid;out.generation=out.generation||{};out.generation.clues=finalCount;
    out.generation.unique=root.SudokuGenerator.countSolutions(grid,2)===1;
    out.generation.verification='solver-verified-local-irreducible';
    out.generation.generatorFamily='mini4-expert-local-irreducible';
    out.generation.policy='contract-driven-local-irreducibility';
    out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
    out.generation.locallyIrreducibleUnderProductionContract=true;
    out.generation.acceptedRemovals=accepted;out.generation.rejectedRemovals=rejected;
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);

// Samurai expert playability hardening. Exact uniqueness is the conjunction of the
// five overlapping 9x9 component contracts. A deterministic full pass is sufficient
// for local irreducibility because removing more clues cannot restore uniqueness.
(function(root){
  'use strict';
  if(!root.SudokuGenerator||typeof root.SudokuGenerator.make!=='function'||typeof root.SudokuGenerator.countSolutions!=='function')return;
  var baseMake=root.SudokuGenerator.make;
  var FALLBACK_OFFSETS=[[0,0],[0,12],[6,6],[12,0],[12,12]];
  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function mulberry32(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(list,random){for(var i=list.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),tmp=list[i];list[i]=list[j];list[j]=tmp;}return list;}
  function countGivens(grid){var total=0;for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c])total++;return total;}
  function normalizeOffset(off){
    if(Array.isArray(off)&&off.length===2)return [Number(off[0]),Number(off[1])];
    if(off&&Number.isFinite(Number(off.r))&&Number.isFinite(Number(off.c)))return [Number(off.r),Number(off.c)];
    return null;
  }
  function resolveOffsets(out,variant){
    var sources=[out&&out.data&&out.data.grids,variant&&variant.data&&variant.data.grids];
    for(var i=0;i<sources.length;i++){
      var grids=sources[i];if(!Array.isArray(grids)||grids.length!==5)continue;
      var offsets=grids.map(function(grid){return normalizeOffset(grid&&grid.off);});
      if(offsets.every(function(off){return off&&off.every(Number.isFinite);}))return offsets;
    }
    return FALLBACK_OFFSETS.map(function(off){return off.slice();});
  }
  function extractComponent(grid,off){
    var r0=off[0],c0=off[1],component=[];
    for(var r=0;r<9;r++){
      var row=[];for(var c=0;c<9;c++)row.push(Number(grid[r0+r]&&grid[r0+r][c0+c])||0);
      component.push(row);
    }
    return component;
  }
  function countContract(grid,offsets){
    var counts=offsets.map(function(off){return root.SudokuGenerator.countSolutions(extractComponent(grid,off),2);});
    return {solutions:counts.some(function(count){return count===0;})?0:(counts.every(function(count){return count===1;})?1:2),componentCounts:counts};
  }
  root.SudokuGenerator.make=function(variant,seed,difficulty){
    var out=baseMake.apply(this,arguments);
    if(!variant||variant.id!=='samurai'||difficulty!=='expert'||!out||!Array.isArray(out.puzzle))return out;
    if(out.generation&&out.generation.locallyIrreducibleUnderProductionContract===true)return out;
    var grid=cloneGrid(out.puzzle),offsets=resolveOffsets(out,variant),order=[];
    for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c])order.push([r,c]);
    shuffle(order,mulberry32(((seed>>>0)^0x5A4D5552)>>>0));
    var accepted=0,rejected=0;
    for(var i=0;i<order.length;i++){
      var rr=order[i][0],cc=order[i][1],old=grid[rr][cc];if(!old)continue;
      grid[rr][cc]=0;
      if(countContract(grid,offsets).solutions===1)accepted++;else{grid[rr][cc]=old;rejected++;}
    }
    var finalContract=countContract(grid,offsets),finalCount=countGivens(grid);
    out.puzzle=grid;out.generation=out.generation||{};out.generation.clues=finalCount;
    out.generation.unique=finalContract.solutions===1;
    out.generation.verification='component-solver-verified-local-irreducible';
    out.generation.generatorFamily='five-overlapping-unique-sudokus-expert-local-irreducible';
    out.generation.policy='contract-driven-local-irreducibility';
    out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
    out.generation.locallyIrreducibleUnderProductionContract=true;
    out.generation.acceptedRemovals=accepted;out.generation.rejectedRemovals=rejected;
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);


// Toroidal Skyscraper expert playability hardening. Run after the P2 calibration
// wrappers so no later target-based layer can restore givens after the exact carve.
(function(root){
  'use strict';
  if(!root.SudokuGenerator||typeof root.SudokuGenerator.make!=='function'||typeof root.SudokuGenerator.countToroidalSkyscraperSolutions!=='function')return;
  var baseMake=root.SudokuGenerator.make;
  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function mulberry32(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(list,random){for(var i=list.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),tmp=list[i];list[i]=list[j];list[j]=tmp;}return list;}
  function clueMapFor(out){var map={};var clues=out&&out.data&&out.data.toroidalClues||[];for(var i=0;i<clues.length;i++){var cell=clues[i]&&clues[i].cell;if(cell)map[cell[0]+','+cell[1]]=1;}return map;}
  function countPlayerGivens(grid,clueMap){var total=0;for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c]&&!clueMap[r+','+c])total++;return total;}
  root.SudokuGenerator.make=function(variant,seed,difficulty){
    var out=baseMake.apply(this,arguments);
    if(!variant||variant.id!=='toroidal-skyscrapers'||difficulty!=='expert'||!out||!Array.isArray(out.puzzle))return out;
    if(out.generation&&out.generation.locallyIrreducibleUnderProductionContract===true)return out;
    var grid=cloneGrid(out.puzzle),clueMap=clueMapFor(out),order=[];
    for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c]&&!clueMap[r+','+c])order.push([r,c]);
    shuffle(order,mulberry32(((seed>>>0)^0x70A01DA1^0x1A2B3C4D)>>>0));
    var accepted=0,rejected=0;
    for(var i=0;i<order.length;i++){
      var rr=order[i][0],cc=order[i][1],old=grid[rr][cc];if(!old)continue;
      grid[rr][cc]=0;
      if(root.SudokuGenerator.countToroidalSkyscraperSolutions(grid,out,2,false)===1){accepted++;}
      else{grid[rr][cc]=old;rejected++;}
    }
    var unique=root.SudokuGenerator.countToroidalSkyscraperSolutions(grid,out,2,false)===1;
    var essential=root.SudokuGenerator.countToroidalSkyscraperSolutions(grid,out,2,true)!==1;
    out.puzzle=grid;out.generation=out.generation||{};
    out.generation.clues=countPlayerGivens(grid,clueMap);
    out.generation.unique=unique;out.generation.variantEssential=essential;
    out.generation.verification='solver-verified-local-irreducible';
    out.generation.generatorFamily='seeded-symbol-permutation-expert-local-irreducible';
    out.generation.policy='contract-driven-local-irreducibility';
    out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
    out.generation.locallyIrreducibleUnderProductionContract=unique&&essential;
    out.generation.acceptedRemovals=accepted;out.generation.rejectedRemovals=rejected;
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);
