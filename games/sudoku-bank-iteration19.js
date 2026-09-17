(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  var PARK=7,N=8;
  function solutionGrid(){
    var base=[1,2,3,4,5,6,PARK,PARK],out=[];
    for(var r=0;r<N;r+=1){var row=[];for(var c=0;c<N;c+=1)row.push(base[(c+r)%N]);out.push(row);}return out;
  }
  function lineAt(grid,axis,index){return axis==='row'?grid[index].slice():grid.map(function(row){return row[index];});}
  function orient(line,side){var out=line.slice();if(side==='right'||side==='bottom')out.reverse();return out;}
  function visibleCount(line){var max=0,count=0;line.forEach(function(v){if(v===PARK)return;if(v>max){max=v;count+=1;}});return count;}
  function clues(solution){
    var out=[],sides=[['row','left'],['row','right'],['col','top'],['col','bottom']];
    for(var i=0;i<N;i+=1)sides.forEach(function(spec){var line=orient(lineAt(solution,spec[0],i),spec[1]);out.push({axis:spec[0],index:i,side:spec[1],count:visibleCount(line)});});
    return out;
  }
  var solution=solutionGrid();
  root.SudokuBank.push({
    id:'skyscraper-parks2',title:'Skyscrapers Parks 2',family:'Grid',
    rule:'Fill the 8×8 grid so every row and column contains building heights 1–6 exactly once plus exactly two parks. Parks are empty ground: they do not count as buildings and do not block the view. Outside clues give the number of visible buildings.',
    kind:'skyscraperparks2',
    data:{parkValue:PARK,inputMax:PARK,maxDigit:6,parksPerLine:2,clues:clues(solution),latinOnly:true,source:'GridPuzzle — Skyscrapers parks2 rules'},
    puzzle:Array.from({length:N},function(){return Array(N).fill(0);}),solution:solution
  });
}(typeof window!=='undefined'?window:globalThis));
