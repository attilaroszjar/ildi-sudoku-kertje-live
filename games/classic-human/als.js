(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');

  var bitCount=C.bitCount,digitsFromMask=C.digitsFromMask,rowCol=C.rowCol,cellIndex=C.cellIndex;

  function rowCells(r){var out=[];for(var c=0;c<9;c++)out.push(cellIndex(r,c));return out;}
  function colCells(c){var out=[];for(var r=0;r<9;r++)out.push(cellIndex(r,c));return out;}
  function boxCells(b){var out=[],br=Math.floor(b/3)*3,bc=(b%3)*3;for(var r=br;r<br+3;r++)for(var c=bc;c<bc+3;c++)out.push(cellIndex(r,c));return out;}
  function houses(){var out=[];for(var i=0;i<9;i++)out.push({id:'r'+(i+1),cells:rowCells(i)});for(i=0;i<9;i++)out.push({id:'c'+(i+1),cells:colCells(i)});for(i=0;i<9;i++)out.push({id:'b'+(i+1),cells:boxCells(i)});return out;}
  var HOUSES=houses();

  function unsolved(state,cell){var rc=rowCol(cell);return !state.grid[rc[0]][rc[1]];}
  function unionMask(state,cells){var m=0;for(var i=0;i<cells.length;i++)m|=state.masks[cells[i]];return m;}
  function alsKey(cells,mask){return cells.slice().sort(function(a,b){return a-b;}).join('.')+'|'+mask;}

  function combinations(items,size,visit){
    var chosen=[];
    function rec(start){
      if(chosen.length===size){visit(chosen.slice());return;}
      for(var i=start;i<=items.length-(size-chosen.length);i++){chosen.push(items[i]);rec(i+1);chosen.pop();}
    }
    rec(0);
  }

  function enumerateAls(state,options){
    options=options||{};var maxCells=options.maxCells==null?4:options.maxCells;
    if(!Number.isInteger(maxCells)||maxCells<1||maxCells>4)throw new RangeError('ALS maxCells must be 1..4');
    var out=[],seen={};
    for(var h=0;h<HOUSES.length;h++){
      var pool=HOUSES[h].cells.filter(function(cell){return unsolved(state,cell)&&bitCount(state.masks[cell])>=2;});
      for(var size=1;size<=Math.min(maxCells,pool.length);size++){
        combinations(pool,size,function(cells){
          var mask=unionMask(state,cells);if(bitCount(mask)!==cells.length+1)return;
          var key=alsKey(cells,mask);if(seen[key])return;seen[key]=1;
          out.push(Object.freeze({key:key,cells:Object.freeze(cells.slice().sort(function(a,b){return a-b;})),mask:mask,digits:Object.freeze(digitsFromMask(mask)),size:cells.length,houseId:HOUSES[h].id}));
        });
      }
    }
    out.sort(function(a,b){return a.size-b.size||a.cells[0]-b.cells[0]||a.key.localeCompare(b.key);});
    return out;
  }

  function digitCells(state,als,digit){return als.cells.filter(function(cell){return L.hasCandidate(state,cell,digit);});}
  function overlaps(a,b){var set=new Set(a.cells);for(var i=0;i<b.cells.length;i++)if(set.has(b.cells[i]))return true;return false;}
  function allSee(aCells,bCells){for(var i=0;i<aCells.length;i++)for(var j=0;j<bCells.length;j++)if(!L.sees(aCells[i],bCells[j]))return false;return true;}

  function restrictedCommonCandidates(state,a,b){
    if(overlaps(a,b))return [];
    var shared=a.mask&b.mask,out=[];
    for(var digit=1;digit<=9;digit++){
      var bit=C.bitForDigit(digit);if(!(shared&bit))continue;
      var ac=digitCells(state,a,digit),bc=digitCells(state,b,digit);
      if(ac.length&&bc.length&&allSee(ac,bc))out.push(Object.freeze({digit:digit,aCells:Object.freeze(ac.slice()),bCells:Object.freeze(bc.slice())}));
    }
    return out;
  }

  function enumerateRccPairs(state,options){
    options=options||{};var als=options.als||enumerateAls(state,options),out=[];
    for(var i=0;i<als.length;i++)for(var j=i+1;j<als.length;j++){
      var rcc=restrictedCommonCandidates(state,als[i],als[j]);if(!rcc.length)continue;
      out.push(Object.freeze({a:als[i],b:als[j],rcc:Object.freeze(rcc)}));
    }
    out.sort(function(x,y){return x.a.key.localeCompare(y.a.key)||x.b.key.localeCompare(y.b.key);});
    return out;
  }

  var api={enumerateAls:enumerateAls,restrictedCommonCandidates:restrictedCommonCandidates,enumerateRccPairs:enumerateRccPairs};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanALS=api;
})(typeof globalThis!=='undefined'?globalThis:this);
