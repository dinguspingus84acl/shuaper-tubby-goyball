/* Data adapters. Same-season data only; archived seasons are always explicitly labelled. */
(function(){
'use strict';
const S=globalThis.ShuaStudio,{num,key,canonicalTeam:T}=S,cache=new Map();
const YEAR=2026,REPO='dinguspingus84acl/shuaper-tubby-goyball';
const ids={1:'ATL',2:'BUF',3:'CHI',4:'CIN',5:'CLE',6:'DAL',7:'DEN',8:'DET',9:'GB',10:'TEN',11:'IND',12:'KC',13:'LV',14:'LAR',15:'MIA',16:'MIN',17:'NE',18:'NO',19:'NYG',20:'NYJ',21:'PHI',22:'ARI',23:'PIT',24:'LAC',25:'SF',26:'SEA',27:'TB',28:'WAS',29:'CAR',30:'JAX',33:'BAL',34:'HOU'};
const fields={passAtt:0,passYds:3,passTD:4,interceptions:20,rushAtt:23,rushYds:24,rushTD:25,recYds:42,recTD:43,receptions:53,targets:58,fumblesLost:72};
async function json(url,options={}){const c=new AbortController(),timeout=setTimeout(()=>c.abort(),18000);try{const r=await fetch(url,{...options,signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status+' from '+new URL(url,location.href).hostname);return await r.json();}finally{clearTimeout(timeout);}}
async function memo(k,fn){if(cache.has(k))return cache.get(k);const p=fn();cache.set(k,p);try{return await p;}catch(e){cache.delete(k);throw e;}}
function readSaved(k){try{return JSON.parse(localStorage.getItem('shua-studio:'+k)||'null');}catch(e){return null;}}
function save(k,v){try{localStorage.setItem('shua-studio:'+k,JSON.stringify(v));}catch(e){/* Private mode/storage quota: in-memory data remains available. */}}
async function schedule(year){return memo('schedule:'+year,async()=>{
 let list=[];if(year===YEAR&&window.ShuaEspnLive?.getAnalyticsSchedule){try{list=await window.ShuaEspnLive.getAnalyticsSchedule();}catch(e){}}
 const result={};
 if(list.length&&list.some(t=>t.weeks)){for(const t of list){const team=T(t.team);if(!S.teams[team])continue;result[team]={};for(const [w,o] of Object.entries(t.weeks)){result[team][w]={week:+w,opponent:T(o),home:/^vs/.test(o),bye:o==='BYE',known:!!S.teams[T(o)]||o==='BYE'};}}return result;}
 let raw;for(const host of ['https://lm-api-reads.fantasy.espn.com','https://fantasy.espn.com']){try{raw=await json(host+'/apis/v3/games/ffl/seasons/'+year+'?view=proTeamSchedules_wl');if((raw?.settings?.proTeams||raw?.proTeams)?.length)break;}catch(e){}}
 const ts=raw?.settings?.proTeams||raw?.proTeams||[];for(const t of ts){const team=ids[t.id];if(!team)continue;result[team]={};for(let w=1;w<=18;w++){let g=t.proGamesByScoringPeriod?.[w];g=Array.isArray(g)?g[0]:g;const home=g&&(g.homeProTeamId??g.homeTeamId),away=g&&(g.awayProTeamId??g.awayTeamId);const opp=g?(+home===+t.id?ids[away]:+away===+t.id?ids[home]:ids[g.opponentProTeamId]):null;result[team][w]={week:w,opponent:opp||(!g?'BYE':'—'),home:+home===+t.id,bye:!g,known:!!opp||!g};}}
 return result;
 });}
function normalise(p,sched){const team=T(p.team||ids[p.proTeamId]),gms=(p.games||[]).filter(g=>g.hasStats!==false&&num(g.totalPoints??g.points)!==null&&g.week>0&&g.week<=18).map(g=>{const opponent=T(g.opponent),inferred=sched[opponent]?.[g.week]?.opponent;return {...g,week:+g.week,points:num(g.totalPoints??g.points),team:T(g.team||((S.teams[inferred])?inferred:team)),opponent};}).sort((a,b)=>a.week-b.week);return {...p,key:key(p.name),id:String(p.id||''),name:p.name,team,position:String(p.position||'').toUpperCase(),headshot:p.headshot||p.headshots?.[0]||(/^\d+$/.test(String(p.id||''))?'https://a.espncdn.com/i/headshots/nfl/players/full/'+p.id+'.png':''),games:gms};}
function parseEspn(entries,year,sched){return entries.map(e=>{const p=e.playerPoolEntry?.player||e.player||e;if(!S.positions.includes(({1:'QB',2:'RB',3:'WR',4:'TE'})[p.defaultPositionId]))return null;const best=new Map();for(const stat of p.stats||[]){const w=+stat.scoringPeriodId;if(+stat.seasonId!==year||+stat.statSourceId!==0||w<1||w>18||(+stat.seasonTypeId&&+stat.seasonTypeId!==2))continue;if(num(stat.appliedTotal)===null||!stat.stats||!Object.keys(stat.stats).length)continue;const old=best.get(w);if(!old||Object.keys(stat.stats).length>Object.keys(old.stats).length)best.set(w,stat);}
 const team=ids[p.proTeamId],gs=[...best].map(([week,x])=>{const g={week,hasStats:true,totalPoints:+x.appliedTotal,opponent:sched[team]?.[week]?.opponent||'—',team};for(const [k,id] of Object.entries(fields))g[k]=Object.prototype.hasOwnProperty.call(x.stats,id)?num(x.stats[id]):0;return g;});return normalise({id:p.id,name:p.fullName,position:({1:'QB',2:'RB',3:'WR',4:'TE'})[p.defaultPositionId],team,games:gs,injuryStatus:p.injuryStatus||'',injured:!!p.injured},sched);}).filter(Boolean);}
async function load(year){return memo('season:'+year,async()=>{
 let manifest={};try{manifest=await json('analytics/manifest.json',{cache:'no-store'});}catch(e){}
 const stored=manifest.datasets?.[year]?await json(manifest.datasets[year],{cache:'no-store'}).catch(()=>null):null;
 const sched=stored?.schedule||await schedule(year).catch(()=>({}));let players=[],source='ESPN actual statistics',warnings=[];
 if(stored?.players?.length){players=stored.players.map(p=>normalise(p,sched));source=stored.source;warnings=stored.warnings||[];}
 else
 if(year<YEAR){const local=await json('legacy-stats/'+year+'.json',{cache:'force-cache'});players=(Array.isArray(local)?local:local.rows||[]).map(p=>normalise(p,sched));source='nflverse · site historical archive';}
 else{
 const filter=JSON.stringify({players:{limit:2000,filterSlotIds:{value:[0,2,4,6]},filterStatsForSourceIds:{value:[0]},filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['00'+year,'10'+year]}}});let error;
 for(const host of ['https://lm-api-reads.fantasy.espn.com','https://fantasy.espn.com']){try{const d=await json(host+'/apis/v3/games/ffl/seasons/'+year+'/segments/0/leaguedefaults/3?view=kona_player_info',{headers:{'Accept':'application/json','X-Fantasy-Filter':filter,'X-Fantasy-Source':'kona'},cache:'no-store'});players=parseEspn(Array.isArray(d)?d:d.players||[],year,sched);if(players.some(p=>p.games.length))break;}catch(e){error=e;}}
 if(!players.some(p=>p.games.length)){throw error||new Error('The '+year+' feed has not returned completed weekly statistics. Choose an archived season to inspect the dashboards.');}
 }
 players=players.filter(p=>S.positions.includes(p.position)&&p.name);
 let enrichment=null;try{const path=manifest.seasons?.[year];if(path)enrichment=await json(path);}catch(e){warnings.push('Supplemental usage feed could not be loaded.');}
 if(enrichment){const rows=enrichment.players||{};for(const p of players){const extra=rows[p.id]||rows[p.key];if(!extra)continue;for(const g of p.games){Object.assign(g,extra.weeks?.[g.week]||{});}p.availability=extra.availability||{};}source+=' · '+(enrichment.source||'supplemental usage');}
 const weeks=[...new Set(players.flatMap(p=>p.games.map(g=>g.week)))].sort((a,b)=>a-b);if(!weeks.length)throw new Error('No completed games in the selected season.');
 const rankData=await currentRanks().catch(()=>({overall:[],position:{}}));for(const p of players){const i=rankData.overall.findIndex(x=>key(x)===p.key);p.customRank=i<0?null:i+1;p.customPositionRank=rankData.position[p.position]?.find(x=>key(x.name)===p.key)?.rank??null;}
 return {year,players,schedule:sched,weeks,latestWeek:Math.max(...weeks),source,warnings,fetchedAt:new Date().toISOString(),snapshotAt:stored?.generatedAt||null,rankData,enrichment:!!enrichment||!!stored};
 });}
async function currentRanks(){return memo('currentRanks',async()=>{const [b,r]=await Promise.all([json('big-board.json',{cache:'no-store'}),json('ros-rankings.json',{cache:'no-store'})]);return {overall:(b.players||[]).map(x=>typeof x==='string'?x:x.name),position:r};});}
function rankMap(data,path){const result={};if(path==='big-board.json'){(data.players||[]).forEach((v,i)=>{const name=typeof v==='string'?v:v.name;if(!result[key(name)])result[key(name)]={name,rank:i+1};});}else{for(const pos of S.positions){for(const p of data[pos]||[])result[key(p.name)]={name:p.name,rank:+p.rank,position:pos};}}return result;}
async function rankHistory(path='big-board.json'){
 return memo('history:'+path,async()=>{try{const staticHistory=await json('analytics/rank-history.json',{cache:'no-store'});if(staticHistory[path]?.snapshots?.length)return staticHistory[path];}catch(e){}const old=readSaved('history:'+path);if(old&&Date.now()-old.ts<3600000)return old.value;let snapshots=[],failure='';
 try{const commits=await json('https://api.github.com/repos/'+REPO+'/commits?path='+encodeURIComponent(path)+'&per_page=12');if(!Array.isArray(commits))throw new Error('History unavailable');for(let i=0;i<commits.length;i+=3){const batch=await Promise.all(commits.slice(i,i+3).map(async c=>{try{const d=await json('https://raw.githubusercontent.com/'+REPO+'/'+c.sha+'/'+path,{cache:'force-cache'});return {date:c.commit.committer.date,sha:c.sha,message:c.commit.message.split('\n')[0],ranks:rankMap(d,path)};}catch(e){return null;}}));snapshots.push(...batch.filter(Boolean));}}
 catch(e){failure=e.message;if(old?.value?.snapshots?.length)return {...old.value,cached:true};}
 snapshots.sort((a,b)=>a.date.localeCompare(b.date));const current=await json(path,{cache:'no-store'});const ranks=rankMap(current,path);if(!snapshots.length||JSON.stringify(snapshots.at(-1).ranks)!==JSON.stringify(ranks))snapshots.push({date:new Date().toISOString(),sha:null,message:'Current published rankings',ranks});
 const value={snapshots,source:path,failure};save('history:'+path,{ts:Date.now(),value});return value;
 });
}
S.Data={load,schedule,rankHistory,currentRanks,json,normalise,parseEspn,clear(){cache.clear();},YEAR};
})();
