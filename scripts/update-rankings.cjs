/**
 * SHUA live ranking updater
 * Node 20+. Intended for GitHub Actions, Vercel Cron, Render Cron, or a VPS.
 *
 * Free live inputs:
 * - Sleeper player directory/status/team
 * - Sleeper adds/drops trend
 *
 * Optional projection/consensus input:
 * - Set PROJECTION_FEED_URL and PROJECTION_FEED_API_KEY.
 *   The endpoint must return JSON player rows containing:
 *   name, team, position, projected_standard, projected_half_ppr,
 *   projected_ppr, consensus_rank, injury_status (fields may be null).
 *
 * This deliberately does not scrape websites.
 */
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PLAYERS_PATH = path.join(ROOT, "players.json");
const OUTPUT_PATH = path.join(ROOT, "rankings-live.json");
const HISTORY_PATH = path.join(ROOT, "ranking-history.json");

const FORMATS = ["standard","half_ppr","ppr"];
const REPLACEMENT = {QB:18,RB:36,WR:48,TE:18};
const SCARCITY = {QB:0.90,RB:1.12,WR:1.00,TE:1.08};
const FORMAT_ADJ = {
  standard:{QB:1.04,RB:1.08,WR:0.96,TE:0.94},
  half_ppr:{QB:1.00,RB:1.04,WR:1.00,TE:1.00},
  ppr:{QB:0.96,RB:1.00,WR:1.05,TE:1.06}
};

function normalizeName(value=""){
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g,"").replace(/[^a-z0-9]/g,"");
}
function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
function percentile(values,value){
  const sorted=[...values].filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length || !Number.isFinite(value)) return null;
  let below=0; for(const v of sorted) if(v<=value) below++;
  return 100*(below-1)/Math.max(1,sorted.length-1);
}
async function getJson(url,options={}){
  const res=await fetch(url,options);
  if(!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}`);
  return res.json();
}
async function sleeperData(){
  const [directory,adds,drops]=await Promise.all([
    getJson("https://api.sleeper.app/v1/players/nfl"),
    getJson("https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=72&limit=100"),
    getJson("https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=72&limit=100")
  ]);
  const trend=new Map();
  for(const row of adds) trend.set(row.player_id,(trend.get(row.player_id)||0)+Number(row.count||0));
  for(const row of drops) trend.set(row.player_id,(trend.get(row.player_id)||0)-Number(row.count||0));
  return {directory,trend};
}
async function projectionFeed(){
  const url=process.env.PROJECTION_FEED_URL;
  if(!url) return [];
  const headers={accept:"application/json"};
  if(process.env.PROJECTION_FEED_API_KEY) headers.authorization=`Bearer ${process.env.PROJECTION_FEED_API_KEY}`;
  const json=await getJson(url,{headers});
  return Array.isArray(json)?json:(json.players||json.data||[]);
}
function baselineScore(p,format){
  const rankStrength=Math.max(0,(REPLACEMENT[p.position]+12-p.positionRank)/(REPLACEMENT[p.position]+11));
  const topBonus=p.positionRank<=12?Math.max(0,(13-p.positionRank)/12):0;
  return clamp((48+40*rankStrength+7*topBonus)*SCARCITY[p.position]*FORMAT_ADJ[format][p.position],1,99.9);
}
function injuryPenalty(status=""){
  const s=String(status).toLowerCase();
  if(/ir|out|pup|suspend/.test(s)) return -18;
  if(/doubtful/.test(s)) return -11;
  if(/questionable/.test(s)) return -5;
  return 0;
}
function projectionField(format){
  return format==="standard"?"projected_standard":format==="half_ppr"?"projected_half_ppr":"projected_ppr";
}
function scorePlayer({player,format,projection,projectionPercentile,trendPercentile,sleeper}){
  const baseline=baselineScore(player,format);
  const projectionScore=projectionPercentile ?? baseline;
  const consensus=Number.isFinite(Number(projection?.consensus_rank))
    ? clamp(101-(Number(projection.consensus_rank)*1.15),0,100) : baseline;
  const trendScore=trendPercentile ?? 50;
  const status=projection?.injury_status || sleeper?.injury_status || sleeper?.status || "";
  const penalty=injuryPenalty(status);
  // During offseason/live-light mode the editorial board remains a meaningful stabilizer.
  const raw=
    0.42*projectionScore+
    0.23*consensus+
    0.20*baseline+
    0.10*trendScore+
    0.05*50+
    penalty;
  return {
    score:clamp(raw,1,99.9),
    components:{
      editorialBaseline:+baseline.toFixed(1),
      liveProjection:projectionPercentile==null?null:+projectionPercentile.toFixed(1),
      marketConsensus:projection?+consensus.toFixed(1):null,
      usageTrend:trendPercentile==null?null:+trendPercentile.toFixed(1),
      injuryAdjustment:penalty
    },
    status
  };
}
async function main(){
  const players=JSON.parse(await fs.readFile(PLAYERS_PATH,"utf8"));
  let previous=null; try{ previous=JSON.parse(await fs.readFile(OUTPUT_PATH,"utf8")); }catch{}
  const [{directory,trend},feed]=await Promise.all([sleeperData(),projectionFeed()]);
  const sleeperRows=Object.entries(directory);
  const sleeperByName=new Map();
  for(const [id,row] of sleeperRows){
    const key=normalizeName(row.full_name || `${row.first_name||""}${row.last_name||""}`);
    if(key) sleeperByName.set(key,{id,...row});
  }
  const projectionByName=new Map(feed.map(row=>[normalizeName(row.name),row]));
  const result={generatedAt:new Date().toISOString(),status:feed.length?"live":"partial-live",
    message:feed.length?"Live projection, consensus, Sleeper status and trend inputs applied.":
      "Sleeper status and trend are live. Configure PROJECTION_FEED_URL for projections and consensus.",
    formats:{}};
  for(const format of FORMATS){
    const projField=projectionField(format);
    const projectionValues=feed.map(x=>Number(x[projField])).filter(Number.isFinite);
    const trendValues=[...trend.values()].filter(Number.isFinite);
    let rows=players.map(player=>{
      const projection=projectionByName.get(normalizeName(player.name));
      const sleeper=sleeperByName.get(normalizeName(player.name));
      const projected=projection?Number(projection[projField]):NaN;
      const t=sleeper?Number(trend.get(sleeper.id)||0):NaN;
      const scored=scorePlayer({
        player,format,projection,sleeper,
        projectionPercentile:Number.isFinite(projected)?percentile(projectionValues,projected):null,
        trendPercentile:Number.isFinite(t)?percentile(trendValues,t):null
      });
      return {...player,team:sleeper?.team||player.team,overallScore:+scored.score.toFixed(1),
        scoreMode:feed.length?"live":"partial-live",components:scored.components,
        liveStatus:scored.status||null,movement:0};
    }).sort((a,b)=>b.overallScore-a.overallScore || a.positionRank-b.positionRank || a.name.localeCompare(b.name));
    const oldMap=new Map((previous?.formats?.[format]||[]).map(x=>[x.id,x.overallRank]));
    rows.forEach((p,i)=>{p.overallRank=i+1;p.movement=oldMap.has(p.id)?oldMap.get(p.id)-p.overallRank:0});
    result.formats[format]=rows;
  }
  await fs.writeFile(OUTPUT_PATH,JSON.stringify(result,null,2));
  let history=[];try{history=JSON.parse(await fs.readFile(HISTORY_PATH,"utf8"));}catch{}
  history.push({generatedAt:result.generatedAt,status:result.status,
    ranks:Object.fromEntries(FORMATS.map(f=>[f,result.formats[f].map(p=>({id:p.id,rank:p.overallRank,score:p.overallScore}))]))});
  await fs.writeFile(HISTORY_PATH,JSON.stringify(history.slice(-120),null,2));
  console.log(`Updated ${players.length} players across ${FORMATS.length} formats: ${result.status}`);
}
main().catch(err=>{console.error(err);process.exit(1)});
