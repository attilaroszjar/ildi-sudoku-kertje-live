(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  if(!C&&typeof require==='function')C=require('./contracts.js');

  var bitForDigit=C.bitForDigit,rowCol=C.rowCol,boxIndex=C.boxIndex,cellIndex=C.cellIndex;

  function buildHouses(){
    var out=[],r,c,b,br,bc,cells;
    for(r=0;r<9;r++){cells=[];for(c=0;c<9;c++)cells.push(cellIndex(r,c));out.push({id:'r'+(r+1),type:'row',index:r,cells:cells});}
    for(c=0;c<9;c++){cells=[];for(r=0;r<9;r++)cells.push(cellIndex(r,c));out.push({id:'c'+(c+1),type:'column',index:c,cells:cells});}
    for(b=0;b<9;b++){
      br=Math.floor(b/3)*3;bc=(b%3)*3;cells=[];
      for(r=br;r<br+3;r++)for(c=bc;c<bc+3;c++)cells.push(cellIndex(r,c));
      out.push({id:'b'+(b+1),type:'box',index:b,cells:cells});
    }
    return Object.freeze(out.map(function(h){return Object.freeze({id:h.id,type:h.type,index:h.index,cells:Object.freeze(h.cells.slice())});}));
  }
  var HOUSES=buildHouses();

  function isUnsolved(state,cell){var rc=rowCol(cell);return !state.grid[rc[0]][rc[1]];}
  function hasCandidate(state,cell,digit){return isUnsolved(state,cell)&&!!(state.masks[cell]&bitForDigit(digit));}
  function sees(a,b){
    if(a===b)return false;
    var ra=rowCol(a),rb=rowCol(b);
    return ra[0]===rb[0]||ra[1]===rb[1]||boxIndex(ra[0],ra[1])===boxIndex(rb[0],rb[1]);
  }
  function sharedHouseTypes(a,b){
    var ra=rowCol(a),rb=rowCol(b),out=[];
    if(ra[0]===rb[0])out.push('row');
    if(ra[1]===rb[1])out.push('column');
    if(boxIndex(ra[0],ra[1])===boxIndex(rb[0],rb[1]))out.push('box');
    return out;
  }
  function candidateCellsInHouse(state,house,digit){
    var out=[];
    for(var i=0;i<house.cells.length;i++)if(hasCandidate(state,house.cells[i],digit))out.push(house.cells[i]);
    return out;
  }
  function conjugateLinks(state,digit,types){
    var allow=types?new Set(types):null,out=[];
    for(var i=0;i<HOUSES.length;i++){
      var h=HOUSES[i];if(allow&&!allow.has(h.type))continue;
      var cells=candidateCellsInHouse(state,h,digit);if(cells.length!==2)continue;
      out.push(Object.freeze({digit:digit,houseId:h.id,houseType:h.type,houseIndex:h.index,a:cells[0],b:cells[1]}));
    }
    return out;
  }
  function commonCandidatePeers(state,a,b,digit,exclude){
    var blocked=new Set(exclude||[]),out=[];
    for(var cell=0;cell<81;cell++){
      if(blocked.has(cell)||!hasCandidate(state,cell,digit))continue;
      if(sees(cell,a)&&sees(cell,b))out.push(cell);
    }
    return out;
  }

  var api={HOUSES:HOUSES,hasCandidate:hasCandidate,sees:sees,sharedHouseTypes:sharedHouseTypes,candidateCellsInHouse:candidateCellsInHouse,conjugateLinks:conjugateLinks,commonCandidatePeers:commonCandidatePeers};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanLinks=api;
})(typeof globalThis!=='undefined'?globalThis:this);
