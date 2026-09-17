(function(root){
  'use strict';
  if(!root.SudokuBank)return;
  var N=6;
  function solutionGrid(){var out=[];for(var r=0;r<N;r++){var row=[];for(var c=0;c<N;c++)row.push(((r+c)%N)+1);out.push(row);}return out;}
  function visible(line){var max=0,count=0;for(var i=0;i<line.length;i++)if(line[i]>max){max=line[i];count++;}return count;}
  function clues(solution){var out=[],specs=[['row','left'],['row','right'],['col','top'],['col','bottom']];for(var i=0;i<N;i++)specs.forEach(function(s){var line=s[0]==='row'?solution[i].slice():solution.map(function(row){return row[i];});if(s[1]==='right'||s[1]==='bottom')line.reverse();out.push({axis:s[0],index:i,side:s[1],parity:visible(line)%2?'odd':'even'});});return out;}
  var solution=solutionGrid(),parity=[];
  for(var r=0;r<N;r++)for(var c=0;c<N;c++)parity.push({cell:[r,c],parity:solution[r][c]%2?'odd':'even'});


  root.SudokuBank.push({
    id:'evenodd-skyscrapers',title:'Skyscrapers (Even/Odd)',family:'Outside clues',kind:'evenoddskyscrapers',
    rule:'Fill the 6×6 Latin grid with 1–6 so every number appears exactly once in every row and column. A square marks an even value and a circle marks an odd value, both inside the grid and for outside visibility clues. Outside marker parity describes the number of visible skyscrapers from that direction.',
    data:{latinOnly:true,maxDigit:6,inputMax:6,parityCells:parity,clues:clues(solution),source:'World Puzzle Federation — Puzzle GP 2022 Round 8, Skyscrapers (Even/Odd)'},
    puzzle:Array.from({length:N},function(){return Array(N).fill(0);}),solution:solution
  });
}(typeof window!=='undefined'?window:globalThis));
