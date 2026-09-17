(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  var F=root.ClassicHumanFish;
  if(!F&&typeof require==='function')F=require('./fish.js');
  var P=root.ClassicHumanSingleDigitPatterns;
  if(!P&&typeof require==='function')P=require('./single-digit-patterns.js');

  var FULL=C.FULL_MASK,bitForDigit=C.bitForDigit,bitCount=C.bitCount,digitsFromMask=C.digitsFromMask;
  var boxIndex=C.boxIndex,cellIndex=C.cellIndex,rowCol=C.rowCol,normalizeDeduction=C.normalizeDeduction,compareDeductions=C.compareDeductions;

  function buildHouses(){
    var houses=[],r,c,br,bc,cells;
    for(r=0;r<9;r++){cells=[];for(c=0;c<9;c++)cells.push(cellIndex(r,c));houses.push({id:'r'+(r+1),type:'row',index:r,cells:cells});}
    for(c=0;c<9;c++){cells=[];for(r=0;r<9;r++)cells.push(cellIndex(r,c));houses.push({id:'c'+(c+1),type:'column',index:c,cells:cells});}
    for(br=0;br<3;br++)for(bc=0;bc<3;bc++){
      cells=[];for(r=br*3;r<br*3+3;r++)for(c=bc*3;c<bc*3+3;c++)cells.push(cellIndex(r,c));
      houses.push({id:'b'+(br*3+bc+1),type:'box',index:br*3+bc,cells:cells});
    }
    return Object.freeze(houses.map(function(h){return Object.freeze({id:h.id,type:h.type,index:h.index,cells:Object.freeze(h.cells)});}));
  }
  var HOUSES=buildHouses();

  function peerIndexes(index){
    var rc=rowCol(index),r=rc[0],c=rc[1],b=boxIndex(r,c),seen={},out=[];
    for(var i=0;i<9;i++){seen[cellIndex(r,i)]=1;seen[cellIndex(i,c)]=1;}
    var br=Math.floor(b/3)*3,bc=(b%3)*3;
    for(var rr=br;rr<br+3;rr++)for(var cc=bc;cc<bc+3;cc++)seen[cellIndex(rr,cc)]=1;
    delete seen[index];Object.keys(seen).map(Number).sort(function(a,b){return a-b;}).forEach(function(x){out.push(x);});return out;
  }
  var PEERS=Object.freeze(Array.from({length:81},function(_,i){return Object.freeze(peerIndexes(i));}));

  function ClassicHumanState(source){
    var base=new C.ClassicCandidateState(source);
    this.grid=base.cloneGrid();
    this.masks=new Uint16Array(base.masks);
    this.valid=base.valid;
    this.steps=[];
  }
  ClassicHumanState.prototype.cloneGrid=function(){return this.grid.map(function(row){return row.slice();});};
  ClassicHumanState.prototype.candidateMask=function(index){return this.masks[index];};
  ClassicHumanState.prototype.candidates=function(index){return digitsFromMask(this.masks[index]);};
  ClassicHumanState.prototype.isSolved=function(){if(!this.valid)return false;for(var i=0;i<81;i++){var rc=rowCol(i);if(!this.grid[rc[0]][rc[1]])return false;}return true;};
  ClassicHumanState.prototype.restrictMask=function(index,mask){
    if(!this.valid)throw new Error('cannot restrict invalid state');
    var rc=rowCol(index),r=rc[0],c=rc[1];if(this.grid[r][c])throw new Error('cannot restrict solved cell');
    mask&=FULL;if(!mask||(mask&~this.masks[index]))throw new Error('restriction must be a non-empty subset of current candidates');
    this.masks[index]=mask;return this;
  };
  ClassicHumanState.prototype.place=function(index,digit){
    if(!this.valid)return false;
    var rc=rowCol(index),r=rc[0],c=rc[1],bit=bitForDigit(digit);
    if(this.grid[r][c]||!(this.masks[index]&bit)){this.valid=false;return false;}
    this.grid[r][c]=digit;this.masks[index]=bit;
    var peers=PEERS[index];
    for(var i=0;i<peers.length;i++){
      var p=peers[i],prc=rowCol(p);if(this.grid[prc[0]][prc[1]])continue;
      if(this.masks[p]&bit){this.masks[p]&=~bit;if(!this.masks[p]){this.valid=false;return false;}}
    }
    return true;
  };
  ClassicHumanState.prototype.eliminate=function(index,digit){
    if(!this.valid)return false;
    var rc=rowCol(index),r=rc[0],c=rc[1],bit=bitForDigit(digit);if(this.grid[r][c])return true;
    if(!(this.masks[index]&bit))return true;
    this.masks[index]&=~bit;if(!this.masks[index]){this.valid=false;return false;}return true;
  };
  ClassicHumanState.prototype.apply=function(raw){
    var d=normalizeDeduction(raw),i;
    for(i=0;i<d.eliminations.length;i++)if(!this.eliminate(d.eliminations[i].cell,d.eliminations[i].digit))return false;
    for(i=0;i<d.placements.length;i++)if(!this.place(d.placements[i].cell,d.placements[i].digit))return false;
    if(this.valid)this.steps.push(d);return this.valid;
  };

  function houseMissingDigit(state,house){
    var used=0,empty=[];
    for(var i=0;i<house.cells.length;i++){
      var idx=house.cells[i],rc=rowCol(idx),v=state.grid[rc[0]][rc[1]];
      if(v)used|=bitForDigit(v);else empty.push(idx);
    }
    if(empty.length!==1)return null;
    var missing=FULL&~used;if(bitCount(missing)!==1||!(state.masks[empty[0]]&missing))return null;
    return {cell:empty[0],digit:digitsFromMask(missing)[0]};
  }

  function findFullHouse(state){
    var out=[];
    for(var h=0;h<HOUSES.length;h++){
      var x=houseMissingDigit(state,HOUSES[h]);if(!x)continue;
      out.push(normalizeDeduction({techniqueId:'full-house',placements:[x],houses:[HOUSES[h].id],anchors:HOUSES[h].cells,explanationData:{house:HOUSES[h].id}}));
    }
    return out;
  }
  function findNakedSingle(state){
    var out=[];
    for(var idx=0;idx<81;idx++){
      var rc=rowCol(idx);if(state.grid[rc[0]][rc[1]])continue;var mask=state.masks[idx];
      if(bitCount(mask)===1)out.push(normalizeDeduction({techniqueId:'naked-single',placements:[{cell:idx,digit:digitsFromMask(mask)[0]}],anchors:[idx],explanationData:{candidates:digitsFromMask(mask)}}));
    }
    return out;
  }
  function findHiddenSingle(state){
    var out=[];
    for(var h=0;h<HOUSES.length;h++){
      var house=HOUSES[h];
      for(var digit=1;digit<=9;digit++){
        var bit=bitForDigit(digit),places=[];
        for(var i=0;i<house.cells.length;i++){var idx=house.cells[i],rc=rowCol(idx);if(!state.grid[rc[0]][rc[1]]&&(state.masks[idx]&bit))places.push(idx);}
        if(places.length===1)out.push(normalizeDeduction({techniqueId:'hidden-single',placements:[{cell:places[0],digit:digit}],houses:[house.id],anchors:[places[0]],explanationData:{house:house.id,digit:digit}}));
      }
    }
    return out;
  }
  function findLockedPointing(state){
    var out=[];
    for(var b=0;b<9;b++){
      var house=HOUSES[18+b];
      for(var digit=1;digit<=9;digit++){
        var bit=bitForDigit(digit),cells=[];
        for(var i=0;i<house.cells.length;i++){var idx=house.cells[i],rc=rowCol(idx);if(!state.grid[rc[0]][rc[1]]&&(state.masks[idx]&bit))cells.push(idx);}
        if(cells.length<2)continue;
        var first=rowCol(cells[0]),sameRow=cells.every(function(x){return rowCol(x)[0]===first[0];}),sameCol=cells.every(function(x){return rowCol(x)[1]===first[1];}),elims=[];
        if(sameRow){for(var c=0;c<9;c++){var target=cellIndex(first[0],c);if(boxIndex(first[0],c)===b)continue;var trc=rowCol(target);if(!state.grid[trc[0]][trc[1]]&&(state.masks[target]&bit))elims.push({cell:target,digit:digit});}}
        if(sameCol){for(var r=0;r<9;r++){var target2=cellIndex(r,first[1]);if(boxIndex(r,first[1])===b)continue;var trc2=rowCol(target2);if(!state.grid[trc2[0]][trc2[1]]&&(state.masks[target2]&bit))elims.push({cell:target2,digit:digit});}}
        if(elims.length)out.push(normalizeDeduction({techniqueId:'locked-candidate-pointing',eliminations:elims,houses:[house.id].concat(sameRow?['r'+(first[0]+1)]:[],sameCol?['c'+(first[1]+1)]:[]),anchors:cells,explanationData:{box:house.id,digit:digit}}));
      }
    }
    return out;
  }
  function findLockedClaiming(state){
    var out=[];
    for(var h=0;h<18;h++){
      var house=HOUSES[h];
      for(var digit=1;digit<=9;digit++){
        var bit=bitForDigit(digit),cells=[];
        for(var i=0;i<house.cells.length;i++){var idx=house.cells[i],rc=rowCol(idx);if(!state.grid[rc[0]][rc[1]]&&(state.masks[idx]&bit))cells.push(idx);}
        if(cells.length<2)continue;
        var rc0=rowCol(cells[0]),b=boxIndex(rc0[0],rc0[1]);if(!cells.every(function(x){var rc=rowCol(x);return boxIndex(rc[0],rc[1])===b;}))continue;
        var box=HOUSES[18+b],elims=[];
        for(i=0;i<box.cells.length;i++){
          var target=box.cells[i],trc=rowCol(target),onLine=house.type==='row'?trc[0]===house.index:trc[1]===house.index;
          if(onLine||state.grid[trc[0]][trc[1]])continue;if(state.masks[target]&bit)elims.push({cell:target,digit:digit});
        }
        if(elims.length)out.push(normalizeDeduction({techniqueId:'locked-candidate-claiming',eliminations:elims,houses:[house.id,box.id],anchors:cells,explanationData:{line:house.id,box:box.id,digit:digit}}));
      }
    }
    return out;
  }

  function unsolvedCellsInHouse(state,house){
    var out=[];
    for(var i=0;i<house.cells.length;i++){var idx=house.cells[i],rc=rowCol(idx);if(!state.grid[rc[0]][rc[1]])out.push(idx);}
    return out;
  }
  function combinations(items,size,start,pick,out){
    if(pick.length===size){out.push(pick.slice());return;}
    for(var i=start;i<=items.length-(size-pick.length);i++){pick.push(items[i]);combinations(items,size,i+1,pick,out);pick.pop();}
  }
  function subsetEliminations(state,house,selected,unionMask){
    var chosen={};selected.forEach(function(x){chosen[x]=1;});var elims=[];
    for(var i=0;i<house.cells.length;i++){
      var idx=house.cells[i],rc=rowCol(idx);if(chosen[idx]||state.grid[rc[0]][rc[1]])continue;
      var remove=state.masks[idx]&unionMask;
      if(remove&&remove===state.masks[idx])return null;
      for(var bits=remove;bits;bits&=bits-1){var one=bits&-bits;elims.push({cell:idx,digit:digitsFromMask(one)[0]});}
    }
    return elims;
  }
  function findNakedSubset(state,size,techniqueId){
    var out=[];
    for(var h=0;h<HOUSES.length;h++){
      var house=HOUSES[h],cells=unsolvedCellsInHouse(state,house).filter(function(idx){var n=bitCount(state.masks[idx]);return n>=2&&n<=size;});
      if(cells.length<size)continue;var combos=[];combinations(cells,size,0,[],combos);
      for(var ci=0;ci<combos.length;ci++){
        var selected=combos[ci],union=0;for(var si=0;si<selected.length;si++)union|=state.masks[selected[si]];
        if(bitCount(union)!==size)continue;var elims=subsetEliminations(state,house,selected,union);if(!elims||!elims.length)continue;
        out.push(normalizeDeduction({techniqueId:techniqueId,eliminations:elims,houses:[house.id],anchors:selected,explanationData:{house:house.id,cells:selected.slice(),digits:digitsFromMask(union)}}));
      }
    }
    return out;
  }
  function findHiddenSubset(state,size,techniqueId){
    var out=[];
    for(var h=0;h<HOUSES.length;h++){
      var house=HOUSES[h],digitPlaces=Array.from({length:10},function(){return [];});
      for(var i=0;i<house.cells.length;i++){
        var idx=house.cells[i],rc=rowCol(idx);if(state.grid[rc[0]][rc[1]])continue;
        for(var bits=state.masks[idx];bits;bits&=bits-1){var one=bits&-bits,d=digitsFromMask(one)[0];digitPlaces[d].push(idx);}
      }
      var digits=[];for(var d=1;d<=9;d++)if(digitPlaces[d].length>0&&digitPlaces[d].length<=size)digits.push(d);
      if(digits.length<size)continue;var combos=[];combinations(digits,size,0,[],combos);
      for(var ci=0;ci<combos.length;ci++){
        var selectedDigits=combos[ci],cellSet={};for(var di=0;di<selectedDigits.length;di++)digitPlaces[selectedDigits[di]].forEach(function(idx){cellSet[idx]=1;});
        var selectedCells=Object.keys(cellSet).map(Number).sort(function(a,b){return a-b;});if(selectedCells.length!==size)continue;
        var keepMask=0;selectedDigits.forEach(function(x){keepMask|=bitForDigit(x);});var elims=[];
        for(var si=0;si<selectedCells.length;si++){
          var target=selectedCells[si],remove=state.masks[target]&~keepMask;
          for(var rem=remove;rem;rem&=rem-1){var one=rem&-rem;elims.push({cell:target,digit:digitsFromMask(one)[0]});}
        }
        if(!elims.length)continue;
        out.push(normalizeDeduction({techniqueId:techniqueId,eliminations:elims,houses:[house.id],anchors:selectedCells,explanationData:{house:house.id,cells:selectedCells,digits:selectedDigits.slice()}}));
      }
    }
    return out;
  }
  function findNakedPair(state){return findNakedSubset(state,2,'naked-pair');}
  function findHiddenPair(state){return findHiddenSubset(state,2,'hidden-pair');}
  function findNakedTriple(state){return findNakedSubset(state,3,'naked-triple');}
  function findHiddenTriple(state){return findHiddenSubset(state,3,'hidden-triple');}

  var FINDERS=Object.freeze([
    {id:'full-house',fn:findFullHouse},
    {id:'naked-single',fn:findNakedSingle},
    {id:'hidden-single',fn:findHiddenSingle},
    {id:'locked-candidate-pointing',fn:findLockedPointing},
    {id:'locked-candidate-claiming',fn:findLockedClaiming},
    {id:'naked-pair',fn:findNakedPair},
    {id:'hidden-pair',fn:findHiddenPair},
    {id:'naked-triple',fn:findNakedTriple},
    {id:'hidden-triple',fn:findHiddenTriple},
    {id:'x-wing',fn:F.findXWing},
    {id:'skyscraper',fn:P.findSkyscraper},
    {id:'two-string-kite',fn:P.findTwoStringKite},
    {id:'turbot-fish',fn:P.findTurbotFish},
    {id:'empty-rectangle',fn:P.findEmptyRectangle},
    {id:'swordfish',fn:F.findSwordfish},
    {id:'jellyfish',fn:F.findJellyfish}
  ]);
  function findNext(state,options){
    if(!state.valid)return null;options=options||{};var enabled=options.techniques?new Set(options.techniques):null,all=[];
    for(var i=0;i<FINDERS.length;i++){if(enabled&&!enabled.has(FINDERS[i].id))continue;var found=FINDERS[i].fn(state);for(var j=0;j<found.length;j++)all.push(found[j]);}
    if(!all.length)return null;all.sort(compareDeductions);return all[0];
  }
  function solve(source,options){
    var state=source instanceof ClassicHumanState?source:new ClassicHumanState(source),maxSteps=(options&&options.maxSteps)||10000;
    if(!state.valid)return {status:'INVALID',steps:[],finalState:state.cloneGrid(),guessRequired:false};
    var count=0;
    while(!state.isSolved()&&count<maxSteps){var d=findNext(state,options);if(!d)break;if(!state.apply(d))break;count++;}
    return {status:state.valid?(state.isSolved()?'SOLVED_LOGICALLY':'STALLED'):'INVALID',steps:state.steps.slice(),finalState:state.cloneGrid(),guessRequired:false};
  }

  var api={HOUSES:HOUSES,PEERS:PEERS,ClassicHumanState:ClassicHumanState,findFullHouse:findFullHouse,findNakedSingle:findNakedSingle,findHiddenSingle:findHiddenSingle,findLockedPointing:findLockedPointing,findLockedClaiming:findLockedClaiming,findNakedPair:findNakedPair,findHiddenPair:findHiddenPair,findNakedTriple:findNakedTriple,findHiddenTriple:findHiddenTriple,findXWing:F.findXWing,findSkyscraper:P.findSkyscraper,findTwoStringKite:P.findTwoStringKite,findTurbotFish:P.findTurbotFish,findEmptyRectangle:P.findEmptyRectangle,findSwordfish:F.findSwordfish,findJellyfish:F.findJellyfish,findNext:findNext,solve:solve};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanSolver=api;
})(typeof globalThis!=='undefined'?globalThis:this);
