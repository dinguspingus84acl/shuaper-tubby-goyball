'use strict';
/* Count the current ranked-player pool from the same sources and aliases as build-ranked-usage.cjs.
 * This must be dynamic: uploading new ROS rankings legitimately changes player coverage.
 */
const board=require('../big-board.json');
const ros=require('../ros-rankings.json');
const aliases={kennethwalkeriii:'kennethwalker',michaelpittmanjr:'michaelpittman',brianthomasjr:'brianthomas',marvinharrisonjr:'marvinharrison',chigokonkwo:'chigoziemokonkwo',lutherburdeniii:'lutherburden',haroldfanninjr:'haroldfannin',joshpalmer:'joshuapalmer'};
const key=name=>{const k=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');return aliases[k]||k;};
module.exports=function rankedPlayerCount(){
 const ranked=new Set();
 for(const player of board.players||[]){const name=typeof player==='string'?player:player?.name;if(name)ranked.add(key(name));}
 for(const pos of ['QB','RB','WR','TE']){
  const players=ros[pos]||[];
  if(!players.length)throw new Error('Missing ranked '+pos+' players');
  const withinPos=new Set();
  for(let i=0;i<players.length;i++){
   const row=players[i];
   if(row.rank!==i+1||!row.name?.trim())throw new Error('Invalid ROS rank or name in '+pos+' at #'+(i+1));
   const normalized=key(row.name);
   if(withinPos.has(normalized))throw new Error('Duplicate ranked '+pos+' player: '+row.name);
   withinPos.add(normalized);ranked.add(normalized);
  }
 }
 return ranked.size;
};
