(function(root){
  'use strict';
  if(!root.SudokuBank||!root.SudokuBank.length)return;
  var bank=root.SudokuBank,base=bank.find(function(v){return v.id==='classic';});
  if(!base)return;
  function blank(){return Array.from({length:9},function(){return Array(9).fill(0);});}
  function lineAt(grid,axis,index,side){
    var line=axis==='row'?grid[index].slice():grid.map(function(row){return row[index];});
    if(side==='right'||side==='bottom')line.reverse();
    return line;
  }
  function numberedRoomsClues(solution){
    var clues=[],sides=[['row','left'],['row','right'],['col','top'],['col','bottom']];
    sides.forEach(function(def){for(var i=0;i<9;i+=1){var line=lineAt(solution,def[0],i,def[1]),n=line[0];clues.push({axis:def[0],index:i,side:def[1],digit:line[n-1]});}});
    return clues;
  }
  function nextToNineClues(solution){
    var clues=[];
    ['row','col'].forEach(function(axis){for(var i=0;i<9;i+=1){var line=lineAt(solution,axis,i,axis==='row'?'left':'top'),p=line.indexOf(9),digits=[];if(p>0)digits.push(line[p-1]);if(p<8)digits.push(line[p+1]);digits.sort(function(a,b){return a-b;});clues.push({axis:axis,index:i,side:axis==='row'?'left':'top',digits:digits});}});
    return clues;
  }
  var solution=base.solution.map(function(row){return row.slice();});
  bank.push({
    id:'numbered-rooms',title:'Numbered Rooms Sudoku',family:'Outside clues',
    rule:'Normal Sudoku rules apply. Each outside clue gives the digit that must appear in the Nth cell looking into that row or column, where N is the digit in the first cell from that side.',
    kind:'numberedrooms',data:{clues:numberedRoomsClues(solution)},puzzle:blank(),solution:solution
  });
  bank.push({
    id:'next-to-nine',title:'Next to Nine Sudoku',family:'Outside clues',
    rule:'Normal Sudoku rules apply. Each outside clue lists all digits directly adjacent to 9 in that row or column. The listed digits are unordered.',
    kind:'nexttonine',data:{clues:nextToNineClues(solution)},puzzle:blank(),solution:solution
  });
}(typeof window!=='undefined'?window:globalThis));
