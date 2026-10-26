#!/usr/bin/env node
/* Import HeatRadar's explicitly permitted, publicly charted NFL routes.
 * One page request; no internal/private API, credentials, or route estimates.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');

const URL='https://heatradar.app/nfl/routes';
const destination=path.resolve(__dirname,'../analytics/data/heatradar-routes-2026.json');
const allowed=new Set(['RB','WR','TE']);

function finite(value){return typeof value==='number'&&Number.isFinite(value);}
function whole(value){return finite(value)&&Math.abs(value-Math.round(value))<0.000001;}
function parsePage(html){
 const match=html.match(/<script\b[^>]*\bid=["']routes-data["'][^>]*>([\s\S]*?)<\/script\s*>/i);
 if(!match)throw new Error('HeatRadar page is missing its routes-data JSON');
 let data;
 try{data=JSON.parse(match[1]);}catch(e){throw new Error('Invalid HeatRadar routes-data JSON: '+e.message);}
 if(data.season!==2026||!Array.isArray(data.weeks)||!Array.isArray(data.players))throw new Error('HeatRadar 2026 weekly route schema changed');
 const weeks=[...new Set(data.weeks)].sort((a,b)=>a-b);
 if(!weeks.length||weeks.some((week,i)=>!Number.isInteger(week)||week<1||week>18||(i&&week!==weeks[i-1]+1)))throw new Error('HeatRadar weeks are missing, invalid or nonconsecutive');
 const rows=[],seen=new Set();let countIssues=0;
 for(const player of data.players){
  if(!allowed.has(player.position))continue;
  const {position,team,week,routes,targets,yards}=player;
  const name=String(player.player||'').trim();
  const routeShare=player.route_share;
  if(!name||!/^([A-Z]{2,3})$/.test(team||'')||!weeks.includes(week)||!finite(routes)||routes<0||!finite(targets)||targets<0||!finite(yards)||!finite(routeShare)||routeShare<0||routeShare>100){
   throw new Error('Invalid HeatRadar route row for '+(name||'unnamed player'));
  }
  const identity=[name,team,position,week].join('|');
  if(seen.has(identity))throw new Error('Duplicate HeatRadar player/team/week: '+identity);
  seen.add(identity);
  // Route, target and receiving-yard counts must be whole numbers. Some early
  // HeatRadar rows contain fractions; retain them for audit but never treat
  // them as fully verified observations in the website aggregates.
  const uncertain=![routes,targets,yards].every(whole);
  if(uncertain)countIssues++;
  rows.push({name,team,position,week,routes,targets,yards,routeShare,...(uncertain?{uncertain:true}:{})});
 }
 if(rows.length<200)throw new Error('HeatRadar returned too few charted player-week rows; keeping the last verified snapshot');
 rows.sort((a,b)=>a.week-b.week||a.name.localeCompare(b.name)||a.team.localeCompare(b.team)||a.position.localeCompare(b.position));
 return {schema:1,season:2026,source:URL,throughWeek:weeks[weeks.length-1],weeks,countIssues,rows};
}

async function download(){
 const response=await fetch(URL,{headers:{'Accept':'text/html','User-Agent':'ShuaFantasyUsage/1.0 (approved personal-use weekly routes import)'},signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error('HeatRadar returned HTTP '+response.status);
 const text=await response.text();
 if(text.length>8_000_000)throw new Error('HeatRadar page exceeds allowed import size');
 return text;
}

async function main(){
 const arg=process.argv.indexOf('--input');
 if(arg!==-1&&!process.argv[arg+1])throw new Error('--input requires an HTML file path');
 const previous=fs.existsSync(destination)?JSON.parse(fs.readFileSync(destination,'utf8')):null;
 try{
  const page=arg===-1?await download():fs.readFileSync(process.argv[arg+1],'utf8');
  const fresh=parsePage(page);
  if(previous&&previous.throughWeek>fresh.throughWeek)throw new Error('HeatRadar returned an older week than the verified snapshot');
  const stripTime=source=>{const {fetchedAt,...rest}=source;return rest;};
  if(previous&&JSON.stringify(stripTime(previous))===JSON.stringify(fresh)){
   console.log('HeatRadar routes unchanged: Week '+fresh.throughWeek+', '+fresh.rows.length+' charted rows');
   return;
  }
  fresh.fetchedAt=new Date().toISOString();
  fs.writeFileSync(destination,JSON.stringify(fresh));
  console.log('Saved HeatRadar Week 1–'+fresh.throughWeek+': '+fresh.rows.length+' source rows; '+fresh.countIssues+' fractional-count rows flagged');
 }catch(error){
  if(previous&&previous.schema===1&&previous.rows?.length){
   console.warn('HeatRadar refresh unavailable; keeping verified Week '+previous.throughWeek+' snapshot: '+error.message);
   return;
  }
  throw error;
 }
}

if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={parsePage};
