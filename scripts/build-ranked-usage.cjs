#!/usr/bin/env node
/* Generate a small, source-backed usage snapshot for players in site rankings.
 * Reads the existing ESPN/nflverse season snapshot; never infers charted routes.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(base,name),'utf8'));
const season=read('analytics/data/season-2026.json');
const board=read('big-board.json');
const ros=read('ros-rankings.json');
const aliases={kennethwalkeriii:'kennethwalker',michaelpittmanjr:'michaelpittman',brianthomasjr:'brianthomas',marvinharrisonjr:'marvinharrison',chigokonkwo:'chigoziemokonkwo',lutherburdeniii:'lutherburden',haroldfanninjr:'haroldfannin',joshpalmer:'joshuapalmer'};
const key=name=>{const k=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');return aliases[k]||k;};
const number=value=>value===null||value===undefined||value===''?null:Number.isFinite(+value)?+value:null;
const sum=values=>{const known=values.map(number).filter(x=>x!==null);return known.length?known.reduce((a,b)=>a+b,0):null;};
const percent=(numerator,denominator)=>number(numerator)!==null&&number(denominator)>0?100*numerator/denominator:null;
const rounded=(n,digits=2)=>n===null?null:Number(n.toFixed(digits));
const selections=new Map();
for(const p of board.players||[]){const name=typeof p==='string'?p:p.name;if(name)selections.set(key(name),name);}
for(const pos of ['QB','RB','WR','TE'])for(const p of ros[pos]||[]){if(p.name&&!selections.has(key(p.name)))selections.set(key(p.name),p.name);}
const byKey=new Map((season.players||[]).map(p=>[key(p.name),p]));
const teamTargets=new Map(),teamPositionOpps=new Map();
for(const player of season.players||[]){
 for(const g of player.games||[]){
  if(g.hasStats===false||!(g.week>=1&&g.week<=18)||!g.team)continue;
  const teamWeek=g.team+'|'+g.week,targets=number(g.targets),carries=number(g.rushAtt);
  if(targets!==null)teamTargets.set(teamWeek,(teamTargets.get(teamWeek)||0)+targets);
  if(['RB','WR','TE'].includes(player.position)&&targets!==null&&carries!==null){
   const k=teamWeek+'|'+player.position;
   teamPositionOpps.set(k,(teamPositionOpps.get(k)||0)+targets+carries);
  }
 }
}
const result={};let matched=0,withSnaps=0,withTargets=0;
for(const [playerKey,rankName] of selections){
 const p=byKey.get(playerKey),valid=p?(p.games||[]).filter(g=>g.hasStats!==false&&g.week>=1&&g.week<=18):[];
 const team=p?.team||null;
 const paired=valid.filter(g=>number(g.snaps)!==null&&number(g.teamSnaps)>0);
 const snaps=sum(paired.map(g=>g.snaps)),teamSnaps=sum(paired.map(g=>g.teamSnaps));
 const recorded=valid.filter(g=>number(g.targets)!==null);
 const targets=sum(recorded.map(g=>g.targets));
 const teamTargetTotal=sum(recorded.map(g=>teamTargets.get(g.team+'|'+g.week)));
 const rushes=sum(valid.map(g=>g.rushAtt));
 const opps=p&&['RB','WR','TE'].includes(p.position)?sum(valid.map(g=>number(g.targets)!==null&&number(g.rushAtt)!==null?+g.targets+(+g.rushAtt):null)):null;
 const posTotal=opps!==null?sum(valid.map(g=>teamPositionOpps.get(g.team+'|'+g.week+'|'+p.position))):null;
 const redZone=sum(valid.map(g=>g.redZone));
 const snapShare=rounded(percent(snaps,teamSnaps));
 const targetShare=rounded(percent(targets,teamTargetTotal));
 if(p)matched++;
 if(snapShare!==null)withSnaps++;
 if(targetShare!==null)withTargets++;
 result[playerKey]={name:rankName,id:p?String(p.id||''):null,position:p?.position||null,team,
  games:valid.length,snapShare,targetShare,opportunityShare:rounded(percent(opps,posTotal)),
  redZoneOpportunities:redZone,targets,teamTargets:teamTargetTotal,
  // Source does not contain charted route/air-yard records. Keep missing values null.
  routeParticipation:null,targetsPerRouteRun:null,yardsPerRouteRun:null,airYardsShare:null};
}
const latestWeek=Math.max(0,...(season.players||[]).flatMap(p=>(p.games||[]).map(g=>Number(g.week)||0)));
const output={schema:1,season:2026,throughWeek:latestWeek,sourceGeneratedAt:season.generatedAt||null,
 source:'Existing 2026 ESPN player-game stats with nflverse/PFR snaps and usage enrichment',
 definitions:{snapShare:'Player offensive snaps / team offensive snaps across games with both counts',targetShare:'Player recorded targets / all recorded targets for the same team in those weeks',opportunityShare:'Player targets plus carries / recorded targets plus carries of teammates at the same position over the same weeks',redZoneOpportunities:'Recorded red-zone carries plus targets'},
 limitations:['2026 completed games only; incomplete game coverage can affect shares','Team target totals are reconstructed from the snapshot, not an official team-level total','Route participation, targets per route, yards per route and air-yards share require unavailable route/air-yards charting. Null means unavailable, never zero'],
 rankedPlayers:selections.size,matchedPlayers:matched,playersWithSnapShare:withSnaps,playersWithTargetShare:withTargets,players:result};
const target=path.join(base,'analytics/data/ranked-usage-2026.json');
fs.writeFileSync(target,JSON.stringify(output));
process.stdout.write(`Ranked ${selections.size}, matched ${matched}; snap ${withSnaps}, targets ${withTargets}; ${fs.statSync(target).size} bytes\n`);
