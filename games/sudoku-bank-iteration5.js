(function(root){'use strict';if(!root.SudokuBank)return;var bank=root.SudokuBank;
function add(v){bank.push(v);}function baseSolution(n,bh,bw){var out=[];for(var r=0;r<n;r++){var row=[];for(var c=0;c<n;c++)row.push(((r*bw+Math.floor(r/bh)+c)%n)+1);out.push(row);}return out;}
function blank(n){return Array.from({length:n},function(){return Array(n).fill(0);});}
var s12=baseSolution(12,3,4),s16=baseSolution(16,4,4);
add({id:'sudoku-12x12',title:'12×12 Sudoku',family:'Grid',rule:'Fill 1–12 so every row, column, and 3×4 box contains each symbol exactly once.',kind:'classic',symbolSet:'123456789ABC',data:{},puzzle:blank(12),solution:s12});
add({id:'sudoku-16x16',title:'16×16 Sudoku',family:'Grid',rule:'Fill 1–16 so every row, column, and 4×4 box contains each symbol exactly once.',kind:'classic',symbolSet:'123456789ABCDEFG',data:{},puzzle:blank(16),solution:s16});
var classic=bank.find(function(v){return v.id==='classic';});
add({id:'sukaku',title:'Sukaku',family:'Grid',rule:'Each cell starts with an allowed candidate set rather than ordinary givens. Choose one final digit per cell so rows, columns, and boxes contain 1–9.',kind:'sukaku',data:{},puzzle:blank(9),solution:classic.solution.map(function(r){return r.slice();})});
add({id:'samurai',title:'Samurai / Gattai-5',family:'Grid',rule:'Five overlapping 9×9 Sudokus form one 21×21 cross. Each grid obeys normal Sudoku rules and each shared 3×3 box belongs to both grids.',kind:'samurai',data:{},puzzle:[],solution:[]});
}(typeof window!=='undefined'?window:globalThis));
