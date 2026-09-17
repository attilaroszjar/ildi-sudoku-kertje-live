(function(root){'use strict';if(!root.SudokuBank)return;
root.SudokuBank.push(
{id:'shakashaka',title:'Shakashaka',family:'Japanese logic',kind:'shakashaka',rule:'Place black triangles in white cells so the remaining white areas form rectangles. Numbered black cells tell how many adjacent triangles touch them.',data:{inputMode:'shakashaka'},puzzle:[],solution:[]},
{id:'ripple-effect',title:'Ripple Effect',family:'Japanese logic',kind:'rippleeffect',rule:'Fill every room of size N with 1..N. Equal numbers in the same row or column must be farther apart than their value.',data:{inputMode:'rippleeffect'},puzzle:[],solution:[]},
{id:'yajilin',title:'Yajilin',family:'Japanese logic',kind:'yajilin',rule:'Draw one loop through the white cells. Arrow clues count black cells in their direction; black cells may not touch orthogonally.',data:{inputMode:'yajilin'},puzzle:[],solution:[]}
);}(typeof window!=='undefined'?window:globalThis));
