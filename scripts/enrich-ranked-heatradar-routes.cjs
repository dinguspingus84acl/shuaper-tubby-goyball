#!/usr/bin/env node
/* Add charted weekly route metrics to the ranked-player Usage snapshot.
 * Uses only HeatRadar rows with integral count statistics. Rates are weighted
 * from summed numerators/denominators, never averaged across weeks.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');

const base=path.resolve(__dirname,'..');
const usageFile=path.join(base,'analytics/data/ranked-usage-2026.json');
const routesFile=path.join(base,'analytics/data/heatradar-routes-2026.json');
const aliases={kennethwalkeriii:'kennethwalker',michaelpittmanjr:'michaelpittman',brianthomasjr:'brianthomas',marvinharrisonjr:'marvinharrison',chigokonkwo:'chigoziemokonkwo',lutherburdeniii:'lutherburden',haroldfanninjr:'haroldfannin',joshpalmer:'joshuapalmer',jamescookiii:'jamescook'};
const key=name=>{const n=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');return aliases[n]||n;};
const round=(value,places=2)=>Number(value.toFixed(places));
const routeFields=['routesRun','routeParticipation','targetsPerRouteRun','yardsPerRouteRun'];

function enrich(usage,source){
 if(usage.schema!==1||usage.season!==2026||!usage.players||source.schema!==1||source.season!==2026||!Array.isArray(source.rows))throw new Error('Usage or HeatRadar data schema changed');
 const maxWeek=Math.min(usage.throughWeek,source.throughWeek),indexed=new Map();
 for(const row of source.rows){
  if(row.week>maxWeek||!['RB','WR','TE'].includes(row.position))continue;
  const identity=key(row.name)+'|'+row.position;
  if(!indexed.has(identity))indexed.set(identity,[]);
  indexed.get(identity).push(row);
 }
 let matched=0,uncertainPlayers=0,usedWeeks=0;
 for(const [playerKey,player] of Object.entries(usage.players)){
  for(const field of routeFields)player[field]=null;
  delete player.routeWeeks;
  delete player.routeCoverage;
  const candidates=indexed.get(key(player.name||playerKey)+'|'+player.position)||[];
  const excluded=candidates.filter(row=>row.uncertain);
  const accepted=candidates.filter(row=>!row.uncertain&&Number.isFinite(row.routes)&&Number.isFinite(row.targets)&&Number.isFinite(row.yards));
  if(!candidates.length)continue;
  if(excluded.length)uncertainPlayers++;
  player.routeCoverage={chartedWeeks:new Set(accepted.map(row=>row.week)).size,excludedWeeks:[...new Set(excluded.map(row=>row.week))].sort((a,b)=>a-b),throughWeek:maxWeek};
  if(!accepted.length)continue;
  const weeks={};
  let routes=0,targets=0,yards=0,teamPasses=0,missingDenominator=false;
  for(const row of accepted){
   const passPlays=row.routeShare>0?row.routes/(row.routeShare/100):null;
   if(passPlays===null||!Number.isFinite(passPlays))missingDenominator=true;
   else teamPasses+=passPlays;
   routes+=row.routes;targets+=row.targets;yards+=row.yards;
   const w=weeks[row.week]||{routes:0,targets:0,yards:0,teamPasses:0,missingDenominator:false};
   w.routes+=row.routes;w.targets+=row.targets;w.yards+=row.yards;
   if(passPlays===null||!Number.isFinite(passPlays))w.missingDenominator=true;
   else w.teamPasses+=passPlays;
   weeks[row.week]=w;
  }
  for(const w of Object.values(weeks)){
   w.routeParticipation=!w.missingDenominator&&w.teamPasses>0?round(100*w.routes/w.teamPasses):null;
   w.targetsPerRouteRun=w.routes>=8?round(100*w.targets/w.routes):null;
   w.yardsPerRouteRun=w.routes>=8?round(w.yards/w.routes):null;
   delete w.teamPasses;delete w.missingDenominator;
  }
  player.routeWeeks=weeks;
  if(routes<=0)continue;
  player.routesRun=round(routes,0);
  player.routeParticipation=!missingDenominator&&teamPasses>0?round(100*routes/teamPasses):null;
  // TPRR is displayed as a percentage, matching HeatRadar's scale.
  player.targetsPerRouteRun=routes>=8?round(100*targets/routes):null;
  player.yardsPerRouteRun=routes>=8?round(yards/routes):null;
  matched++;usedWeeks+=player.routeCoverage.chartedWeeks;
 }
 usage.routeSource=source.source;
 usage.routeThroughWeek=maxWeek;
 usage.playersWithRoutes=matched;
 usage.playersWithUncertainRouteWeeks=uncertainPlayers;
 usage.definitions={...usage.definitions,
  routesRun:'Sum of HeatRadar charted routes from available valid weekly rows; missing or fractional-count rows are excluded',
  routeParticipation:'Player charted routes / sum of team passing-play denominators across the same valid weeks (percent)',
  targetsPerRouteRun:'Sum of charted targets / sum of charted routes over valid weeks, expressed as a percentage; suppressed below eight routes',
  yardsPerRouteRun:'Sum of charted receiving yards / sum of charted routes over valid weeks; suppressed below eight routes'};
 usage.limitations=(usage.limitations||[]).filter(s=>!/^Route participation, targets per route/.test(s)&&!/^Route participation, targets per route,/.test(s));
 usage.limitations.push('HeatRadar source through Week '+maxWeek+'; incomplete charting and fractional-count rows are excluded, never estimated. A player can have fewer valid route weeks than the league.');
 return {matched,uncertainPlayers,usedWeeks};
}

if(require.main===module){
 const usage=JSON.parse(fs.readFileSync(usageFile,'utf8'));
 const source=JSON.parse(fs.readFileSync(routesFile,'utf8'));
 const result=enrich(usage,source);
 fs.writeFileSync(usageFile,JSON.stringify(usage));
 console.log('HeatRadar charts merged for '+result.matched+'/'+usage.rankedPlayers+' ranked players; '+result.uncertainPlayers+' with excluded fractional-count weeks');
}
module.exports={enrich,key};
