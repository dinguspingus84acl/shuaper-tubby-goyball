#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('analytics/data/receiver-efficiency-2026.json'));
const fields=['routeShare','yprr','tprr','yacPerReception','firstDownsPerRoute','explosivePlayRate','epaPerTarget','fantasyPointsPerRoute'];
const clubs='ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LAC LAR LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS'.split(' ');
assert.equal(data.schema,1);assert.equal(data.season,2026);
assert.ok(data.throughWeek>=1&&data.throughWeek<=18);
assert.deepEqual(Object.keys(data.teams).sort(),clubs.sort());
assert.ok(data.source.routes.includes('heatradar.app'));
const count={};
let total=0;
for(const club of clubs){
 const players=data.teams[club];
 assert.ok(Array.isArray(players));
 players.forEach((p,i)=>{
  total++;assert.equal(p.team,club);assert.ok(['WR','TE'].includes(p.position));
  assert.ok(p.routes>0);assert.ok(p.weeks.length);
  if(i)assert.ok(players[i-1].routes>=p.routes);
  for(const field of fields){
   assert.ok(Object.hasOwn(p.metrics,field),club+'/'+p.name+'/'+field);
   const v=p.metrics[field];
   assert.ok(v===null||(typeof v==='number'&&Number.isFinite(v)),club+'/'+field);
   if(v!==null)count[field]=(count[field]||0)+1;
  }
 });
}
assert.ok(total>=200,'Include charted players beyond the 332 ranked Usage players');
for(const field of fields){
 assert.ok(Object.hasOwn(data.leagueAverage,field));
 assert.ok(Object.hasOwn(data.coverage,field));
 assert.equal(data.coverage[field],count[field]||0,field+' coverage');
}
const studio=read('analytics/ui.js'),loader=read('analytics-dashboard.js'),work=read('.github/workflows/analytics-studio-data.yml');
const chart=read('analytics/receiver-efficiency.js');
assert.ok(studio.includes('stReceiverEfficiencyMount'));
assert.ok(studio.includes('ReceiverEfficiency.mount(state.team)'));
assert.ok(loader.includes('analytics/receiver-efficiency.js'));
assert.ok(chart.includes('data-re-sort')&&chart.includes('reEfficiencyTeam'));
assert.ok(work.includes('build-receiver-efficiency.py'));
assert.ok(work.indexOf('enrich-ranked-next-usage.py')<work.indexOf('build-receiver-efficiency.py'));
assert.ok(work.includes('node tests/receiver-efficiency.cjs'));
console.log('PASS:',Object.keys(data.teams).length,'teams',total,'WR/TE players',JSON.stringify(count));
