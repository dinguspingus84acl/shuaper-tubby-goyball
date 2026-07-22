/**
 * SHUA free live ranking updater — no credentials required.
 * Sources:
 *  - Sleeper: current NFL player/team/status + 72-hour add/drop trends
 *  - nflverse: latest published season-level player stats CSV
 *
 * Node 20+, no packages required.
 */
const fs=require("node:fs/promises");
const path=require("node:path");
const ROOT=path.resolve(__dirname,"..");
const PLAYERS=path.join(ROOT,"players.json");
const OUTPUT=path.join(ROOT,"rankings-live.json");
const HISTORY=path.join(ROOT,"ranking-history.json");

const FORMATS=["standard","half_ppr","ppr"];
const REPLACEMENT={QB:18,RB:36,WR:48,TE:18};
const POS_SCARCITY={QB:.86,RB:1.12,WR:1.00,TE:1.08};

function norm(v=""){return String(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\b(jr|sr|ii|iii|iv)\b/g,"").replace(/[^a-z0-9]/g,"")}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function csvParse(text){
  const rows=[];let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
    if(c=='"'&&q&&n=='"'){cell+='"';i++}
    else if(c=='"'){q=!q}
    else if(c==","&&!q){row.push(cell);cell=""}
    else if((c=="\n"||c=="\r")&&!q){if(c=="\r"&&n=="\n")i++;row.push(cell);cell="";if(row.some(x=>x!==""))rows.push(row);row=[]}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row)}
  const head=rows.shift().map(x=>x.trim());
  return rows.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]??""])));
}
async function getJson(url){const r=await fetch(url);if(!r.ok)throw Error(`${r.status} ${url}`);return r.json()}
async function getText(url){const r=await fetch(url);if(!r.ok)throw Error(`${r.status} ${url}`);return r.text()}
function pct(values,value){
  const a=values.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length)return 50;let below=0;for(const v of a)if(v<=value)below++;
  return 100*(below-1)/Math.max(1,a.length-1);
}
function fantasy(row,fmt){
  const pass=num(row.passing_yards)/25+num(row.passing_tds)*4-num(row.interceptions)*2;
  const rush=num(row.rushing_yards)/10+num(row.rushing_tds)*6;
  const rec=num(row.receiving_yards)/10+num(row.receiving_tds)*6;
  const catches=num(row.receptions)*(fmt==="ppr"?1:fmt==="half_ppr"?.5:0);
  const misc=num(row.fantasy_points)-num(row.fantasy_points_ppr); // harmless fallback, generally 0
  return pass+rush+rec+catches+misc;
}
function baseline(p){
  const rep=REPLACEMENT[p.position],strength=clamp((rep+12-p.positionRank)/(rep+11),0,1);
  return clamp(44+48*strength,1,99);
}
function injuryPenalty(status=""){
  const s=String(status).toLowerCase();
  if(/out|ir|pup|suspend|inactive/.test(s))return -14;
  if(/doubtful/.test(s))return -8;
  if(/questionable/.test(s))return -3;
  return 0;
}
async function main(){
  const board=JSON.parse(await fs.readFile(PLAYERS,"utf8"));
  let previous={};try{previous=JSON.parse(await fs.readFile(OUTPUT,"utf8"))}catch{}
  const [directory,adds,drops,csv]=await Promise.all([
    getJson("https://api.sleeper.app/v1/players/nfl"),
    getJson("https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=72&limit=200"),
    getJson("https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=72&limit=200"),
    getText("https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats.csv")
  ]);
  const allStats=csvParse(csv).filter(r=>["REG","POST",""].includes(r.season_type||""));
  const seasons=allStats.map(r=>num(r.season)).filter(Boolean);
  let latestSeason=0;
  for (const season of seasons) {
    if (season > latestSeason) latestSeason = season;
  }
  const stats=allStats.filter(r=>num(r.season)===latestSeason && (r.season_type==="REG"||!r.season_type));
  const statsByName=new Map(stats.map(r=>[norm(r.player_display_name||r.player_name),r]));
  const sleeperByName=new Map();
  for(const [id,r] of Object.entries(directory)){const key=norm(r.full_name||`${r.first_name||""} ${r.last_name||""}`);if(key)sleeperByName.set(key,{...r,id})}
  const trend=new Map();for(const x of adds)trend.set(x.player_id,(trend.get(x.player_id)||0)+num(x.count));for(const x of drops)trend.set(x.player_id,(trend.get(x.player_id)||0)-num(x.count));
  const result={generatedAt:new Date().toISOString(),status:"live-free",dataSeason:latestSeason,
    message:`Live free-data model: current Sleeper roster/status/trends plus ${latestSeason} nflverse production. No API credentials required.`,formats:{}};
  for(const fmt of FORMATS){
    const pool=stats.map(r=>fantasy(r,fmt));
    const perGamePool=stats.map(r=>fantasy(r,fmt)/Math.max(1,num(r.games)));
    const trendPool=[...trend.values()];
    let rows=board.map(p=>{
      const sr=sleeperByName.get(norm(p.name));
      const st=statsByName.get(norm(p.name));
      const total=st?fantasy(st,fmt):null;
      const games=st?Math.max(1,num(st.games)):null;
      const pg=st?total/games:null;
      const production=st?pct(pool,total):baseline(p);
      const perGame=st?pct(perGamePool,pg):baseline(p);
      const t=sr?num(trend.get(sr.id)||0):0;
      const market=pct(trendPool,t);
      const avail=injuryPenalty(sr?.injury_status||sr?.status||"");
      const editorial=baseline(p);
      const score=clamp((.35*production+.25*perGame+.25*editorial+.10*market+.05*50)*POS_SCARCITY[p.position]+avail,1,99.9);
      return {...p,team:sr?.team||p.team,overallScore:+score.toFixed(1),scoreMode:"live-free",
        liveStatus:sr?.injury_status||sr?.status||null,statsSeason:latestSeason,
        stats:st?{games:num(st.games),fantasyPoints:+total.toFixed(1),fantasyPointsPerGame:+pg.toFixed(1),
          passingYards:num(st.passing_yards),passingTD:num(st.passing_tds),rushingYards:num(st.rushing_yards),
          rushingTD:num(st.rushing_tds),receptions:num(st.receptions),receivingYards:num(st.receiving_yards),receivingTD:num(st.receiving_tds)}:null,
        components:{seasonProduction:+production.toFixed(1),perGameProduction:+perGame.toFixed(1),editorialBaseline:+editorial.toFixed(1),sleeperTrend:+market.toFixed(1),injuryAdjustment:avail},movement:0};
    });
    rows.sort((a,b)=>b.overallScore-a.overallScore||a.positionRank-b.positionRank||a.name.localeCompare(b.name));
    const old=new Map((previous.formats?.[fmt]||[]).map(x=>[x.id,x.overallRank]));
    rows.forEach((p,i)=>{p.overallRank=i+1;p.movement=old.has(p.id)?old.get(p.id)-p.overallRank:0});
    result.formats[fmt]=rows;
  }
  await fs.writeFile(OUTPUT,JSON.stringify(result,null,2));
  let history=[];try{history=JSON.parse(await fs.readFile(HISTORY,"utf8"))}catch{}
  history.push({generatedAt:result.generatedAt,dataSeason:latestSeason,ranks:Object.fromEntries(FORMATS.map(f=>[f,result.formats[f].map(p=>({id:p.id,rank:p.overallRank,score:p.overallScore}))]))});
  await fs.writeFile(HISTORY,JSON.stringify(history.slice(-120),null,2));
  console.log(`Done: ${board.length} players, ${latestSeason} stats, free live data.`);
}
main().catch(e=>{console.error(e);process.exit(1)});
