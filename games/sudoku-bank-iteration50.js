(function(root){'use strict';if(!root.SudokuBank)return;
root.SudokuBank.push(
{id:'star-battle',title:'Star Battle',family:'Japanese logic',kind:'starbattle',rule:'Place exactly one star in every row, column and outlined region. Stars may not touch, even diagonally.',data:{inputMode:'starbattle'},puzzle:[],solution:[]},
{id:'aquarium',title:'Aquarium',family:'Japanese logic',kind:'aquarium',rule:'Shade water cells so every aquarium fills from the bottom up to one level. The numbers outside the grid give the number of water cells in each row and column.',data:{inputMode:'aquarium'},puzzle:[],solution:[]},
{id:'tentai-show',title:'Tentai Show',family:'Japanese logic',kind:'galaxies',rule:'Divide the grid into galaxies. Every galaxy contains exactly one marked center and is 180-degree rotationally symmetric around that center.',data:{inputMode:'galaxies'},puzzle:[],solution:[]}
);}(typeof window!=='undefined'?window:globalThis));
