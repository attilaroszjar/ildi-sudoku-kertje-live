(function(root){
'use strict';
if(!root.SudokuBank)return;
var N=6,MAX=3;
function visible(line){var max=0,count=0;for(var i=0;i<line.length;i++)if(line[i]>max){max=line[i];count++;}return count;}
function solutionGrid(){var out=[];for(var r=0;r<N;r++){var row=[];for(var c=0;c<N;c++)row.push(((r+c)%MAX)+1);out.push(row);}return out;}
function exactClues(solution){var out=[],specs=[['row','left'],['row','right'],['col','top'],['col','bottom']];for(var i=0;i<N;i++)specs.forEach(function(s){var line=s[0]==='row'?solution[i].slice():solution.map(function(row){return row[i];});if(s[1]==='right'||s[1]==='bottom')line.reverse();out.push({axis:s[0],index:i,side:s[1],count:visible(line)});});return out;}
var solution=solutionGrid();
root.SudokuBank.push({
 id:'double-skyscrapers',title:'Double Skyscrapers',family:'Grid',kind:'doubleskyscrapers',
 rule:'Fill the 6×6 grid with heights 1–3 so each height appears exactly twice in every row and column. Outside clues give the number of visible skyscrapers from that direction. A skyscraper is hidden by any earlier building of equal or greater height.',
 data:{latinOnly:true,inputMax:3,maxDigit:3,copiesPerLine:2,clues:exactClues(solution),source:'World Puzzle Federation — Puzzle GP 2022 Round 5, Puzzle 10: Skyscrapers (Double)'},
 puzzle:Array.from({length:N},function(){return Array(N).fill(0);}),solution:solution
});
}(typeof window!=='undefined'?window:globalThis));
