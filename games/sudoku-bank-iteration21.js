(function(root){
'use strict';
if(!root.SudokuBank)return;
var N=6;
function visible(line){var max=0,count=0;for(var i=0;i<line.length;i++)if(line[i]>max){max=line[i];count++;}return count;}
function classicSolution(){var out=[];for(var r=0;r<N;r++){var row=[];for(var c=0;c<N;c++)row.push(((r+c)%N)+1);out.push(row);}return out;}
function exactClues(solution){var out=[],specs=[['row','left'],['row','right'],['col','top'],['col','bottom']];for(var i=0;i<N;i++)specs.forEach(function(s){var line=s[0]==='row'?solution[i].slice():solution.map(function(row){return row[i];});if(s[1]==='right'||s[1]==='bottom')line.reverse();out.push({axis:s[0],index:i,side:s[1],count:visible(line)});});return out;}
var classic=classicSolution();
root.SudokuBank.push({
    id:'classic-skyscrapers',title:'Classic Skyscrapers',family:'Outside clues',kind:'dominoskyscrapers',
    rule:'Fill the 6×6 Latin grid with 1–6 so every number appears exactly once in every row and column. Outside clues give the number of skyscrapers visible from that direction; taller buildings hide lower buildings behind them. There are no Sudoku boxes.',
    data:{latinOnly:true,maxDigit:6,inputMax:6,dominoes:[],clues:exactClues(classic),source:'Logic Masters Deutschland Puzzlewiki — Skyscrapers'},
    puzzle:Array.from({length:N},function(){return Array(N).fill(0);}),solution:classic
  });

}(typeof window!=='undefined'?window:globalThis));
