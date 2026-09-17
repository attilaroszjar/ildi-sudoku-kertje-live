(function(root){'use strict';if(!root.SudokuBank)return;
root.SudokuBank.push(
{id:'lits',title:'LITS',family:'Japanese logic',kind:'lits',rule:'Shade exactly four orthogonally connected cells in every region, forming an L, I, T or S tetromino. Equal shapes in different regions may not touch by an edge; all shaded cells must connect, and no 2x2 block may be fully shaded.',data:{inputMode:'shade'},puzzle:[],solution:[]},
{id:'battleships',title:'Battleships',family:'Japanese logic',kind:'battleships',rule:'Place the indicated fleet. Ships run horizontally or vertically and never touch another ship, even diagonally. Edge clues give the number of ship cells in each row and column.',data:{inputMode:'shade'},puzzle:[],solution:[]},
{id:'heyawake',title:'Heyawake',family:'Japanese logic',kind:'heyawake',rule:'Shade cells so each numbered room contains exactly that many shaded cells. Shaded cells may not touch orthogonally, white cells stay connected, and a straight white run may not pass through three rooms.',data:{inputMode:'shade'},puzzle:[],solution:[]}
);}(typeof window!=='undefined'?window:globalThis));
