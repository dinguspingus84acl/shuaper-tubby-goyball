'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const read=name=>require(path.join(__dirname,'..',name));
const usage=read('analytics/data/ranked-usage-2026.json');
const season=read('analytics/data/season-2026.json');
const normalized=name=>String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const byKey=new Map(season.players.map(p=>[normalized(p.name),p]));
const teamCarries=new Map();
for(const p of season.players)for(const g of p.games||[]){
 if(g.hasStats===false||g.rushAtt==null)continue;
 const id=g.team+'|'+g.week;
 teamCarries.set(id,(teamCarries.get(id)||0)+g.rushAtt);
}
const round=(x,n=2)=>Number(x.toFixed(n));
const counts={};
const names=['targetsPerGame','carriesPerGame','carryShare','highValueTouches',
 'recentOpportunityChange','aDOT','wopr','receivingYardsShare','yacPerReception','receivingFirstDowns'];
for(const name of names)counts[name]=0;
for(const [id,row] of Object.entries(usage.players)){
 for(const metric of names){
  assert.ok(Object.hasOwn(row,metric),'Missing '+metric+' for '+id);
  const value=row[metric];
  assert.ok(value===null||(typeof value==='number'&&Number.isFinite(value)),id+' '+metric+' is not a finite number or null');
  if(value!==null)counts[metric]++;
 }
 if(row.position==='QB'){
  for(const metric of ['aDOT','wopr','receivingYardsShare','yacPerReception','receivingFirstDowns'])
   assert.equal(row[metric],null,'QB receiving-only metric should not be ranked: '+id+' '+metric);
 }
 const p=byKey.get(normalized(row.name));
 if(!p)continue;
 const games=(p.games||[]).filter(g=>g.hasStats!==false&&g.week>=1&&g.week<=18);
 if(!games.length)continue;
 const targets=games.reduce((s,g)=>s+(g.targets||0),0);
 const carries=games.reduce((s,g)=>s+(g.rushAtt||0),0);
 assert.equal(row.targetsPerGame,round(targets/games.length,1),id+' target average');
 assert.equal(row.carriesPerGame,round(carries/games.length,1),id+' carry average');
 const teamTotal=games.reduce((s,g)=>s+(teamCarries.get(g.team+'|'+g.week)||0),0);
 assert.equal(row.carryShare,teamTotal>0?round(100*carries/teamTotal):null,id+' carry share');
 const inside10=games.every(g=>g.inside10!=null)?games.reduce((s,g)=>s+g.inside10,0):null;
 assert.equal(row.highValueTouches,inside10,id+' verified inside-10 touches');
 const eligible=games.filter(g=>g.targets!=null&&g.rushAtt!=null);
 const recent=eligible.filter(g=>g.week>=usage.throughWeek-2&&g.week<=usage.throughWeek);
 const prior=eligible.filter(g=>g.week>=usage.throughWeek-5&&g.week<=usage.throughWeek-3);
 const perGame=rows=>rows.reduce((s,g)=>s+g.targets+g.rushAtt,0)/rows.length;
 const delta=recent.length>=2&&prior.length>=2?round(perGame(recent)-perGame(prior),1):null;
 assert.equal(row.recentOpportunityChange,delta,id+' recent opportunity change');
 if(row.nflverseCoverage)assert.ok(row.nflverseCoverage.matchedWeeks<=row.nflverseCoverage.espnWeeks,id+' coverage');
}
assert.equal(usage.rankedPlayers,Object.keys(usage.players).length);
assert.equal(usage.additionalUsageCoverage.aDOT,counts.aDOT);
assert.equal(usage.additionalUsageCoverage.wopr,counts.wopr);
assert.ok(usage.playersWithRoutes>=200,'Previously verified HeatRadar routes were lost');
for(const metric of names)assert.ok(counts[metric]>=150,'Low coverage for '+metric+': '+counts[metric]);
console.log('PASS: 10 new usage metrics, ESPN workloads, nflverse coverage, red-zone integrity and prior route data',counts);
