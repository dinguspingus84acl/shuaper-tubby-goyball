'use strict';
const assert=require('node:assert/strict');
const {parsePage}=require('../scripts/refresh-heatradar-routes.cjs');
const {enrich}=require('../scripts/enrich-ranked-heatradar-routes.cjs');

const player=(name,position,week,routes,targets,yards,routeShare)=>({player:name,team:'DET',position,week,routes,targets,yards,route_share:routeShare});
const liveRows=Array.from({length:205},(_,i)=>player('Extra Player '+i,'WR',1,10,1,10,50));
const page={season:2026,weeks:[1,2],players:[
 ...liveRows,
 player('Wide Receiver','WR',1,20,4,40,50),
 player('Wide Receiver','WR',2,30,6,60,75),
 player('Tight End','TE',1,9.5,2,10,40),
 player('Tight End','TE',2,15,3,30,50),
 player('Quarterback','QB',1,5,1,10,10)
]};
const html='<script id="routes-data" type="application/json">'+JSON.stringify(page)+'</script>';
const imported=parsePage(html);
assert.equal(imported.rows.length,209);
assert.equal(imported.countIssues,1);
assert.equal(imported.rows.find(x=>x.name==='Tight End'&&x.week===1).uncertain,true);
assert.equal(imported.rows.some(x=>x.position==='QB'),false);
assert.throws(()=>parsePage(html.replace('"season":2026','"season":2025')),/2026 weekly route/);

const usage={schema:1,season:2026,throughWeek:2,rankedPlayers:3,definitions:{},limitations:['Route participation, targets per route and yards per route require independently charted routes; unavailable values remain null'],players:{
 widereceiver:{name:'Wide Receiver',position:'WR',airYardsShare:37,targetShare:25},
 tightend:{name:'Tight End',position:'TE'},
 quarterback:{name:'Quarterback',position:'QB'}
}};
const summary=enrich(usage,imported);
const wr=usage.players.widereceiver,te=usage.players.tightend,qb=usage.players.quarterback;
assert.equal(summary.matched,2);
assert.equal(wr.routesRun,50);
assert.equal(wr.routeParticipation,62.5);  // 50 routes / (40+40 team pass plays)
assert.equal(wr.targetsPerRouteRun,20);    // 10 targets / 50 routes, in percent
assert.equal(wr.yardsPerRouteRun,2);
assert.equal(wr.airYardsShare,37);          // Separate nflverse metric is retained
assert.equal(wr.routeCoverage.chartedWeeks,2);
assert.equal(wr.routeWeeks['1'].routeParticipation,50);
assert.equal(te.routesRun,15);             // Fractional Week 1 excluded, not rounded
assert.equal(te.routeCoverage.chartedWeeks,1);
assert.deepEqual(te.routeCoverage.excludedWeeks,[1]);
assert.equal(qb.routesRun,null);
assert.equal(qb.targetsPerRouteRun,null);
assert.equal(usage.routeThroughWeek,2);
assert.ok(usage.limitations.some(text=>text.includes('fractional-count')));
console.log('PASS: HeatRadar source parsing, count integrity, weekly coverage, weighted rates and missing data');
