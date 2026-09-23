(()=>{
'use strict';

const nav=document.querySelector('.positions');
const main=document.querySelector('main');
if(!nav||!main||document.getElementById('espnLiveSection'))return;

const SEASON=2026;
const PPR_PRESET_ID=3;
const REFRESH_MS=60000;
const POSITION_BY_ID={1:'QB',2:'RB',3:'WR',4:'TE'};
const TEAM_BY_ID={0:'FA',1:'ATL',2:'BUF',3:'CHI',4:'CIN',5:'CLE',6:'DAL',7:'DEN',8:'DET',9:'GNB',10:'TEN',11:'IND',12:'KAN',13:'LVR',14:'LAR',15:'MIA',16:'MIN',17:'NWE',18:'NOR',19:'NYG',20:'NYJ',21:'PHI',22:'ARI',23:'PIT',24:'LAC',25:'SFO',26:'SEA',27:'TAM',28:'WAS',29:'CAR',30:'JAX',33:'BAL',34:'HOU'};
const TEAM_SLUGS={ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GNB:'gb',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KAN:'kc',KC:'kc',LAC:'lac',LAR:'lar',LVR:'lv',LV:'lv',MIA:'mia',MIN:'min',NWE:'ne',NE:'ne',NOR:'no',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SFO:'sf',SF:'sf',TAM:'tb',TB:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'};
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');

const STAT_CONFIG={
  ALL:[
    {key:'points',label:'PPR Pts'},
    {key:'average',label:'PPG'}
  ],
  QB:[
    {key:'points',label:'PPR Pts'},
    {key:'average',label:'PPG'},
    {key:'passYds',label:'Pass Yds'},
    {key:'passTD',label:'Pass TD'},
    {key:'completions',label:'Comp'},
    {key:'passAtt',label:'Pass Att'},
    {key:'rushYds',label:'Rush Yds'},
    {key:'rushTD',label:'Rush TD'}
  ],
  RB:[
    {key:'points',label:'PPR Pts'},
    {key:'average',label:'PPG'},
    {key:'rushAtt',label:'Rush Att'},
    {key:'rushYds',label:'Rush Yds'},
    {key:'rushTD',label:'Rush TD'},
    {key:'targets',label:'Targets'},
    {key:'receptions',label:'Rec'},
    {key:'recYds',label:'Rec Yds'},
    {key:'recTD',label:'Rec TD'}
  ],
  WR:[
    {key:'points',label:'PPR Pts'},
    {key:'average',label:'PPG'},
    {key:'targets',label:'Targets'},
    {key:'receptions',label:'Rec'},
    {key:'recYds',label:'Rec Yds'},
    {key:'recTD',label:'Rec TD'}
  ],
  TE:[
    {key:'points',label:'PPR Pts'},
    {key:'average',label:'PPG'},
    {key:'targets',label:'Targets'},
    {key:'receptions',label:'Rec'},
    {key:'recYds',label:'Rec Yds'},
    {key:'recTD',label:'Rec TD'}
  ]
};

let rows=[];
let activeFilter='ALL';
let activeStat='points';
let loading=false;
let timer=null;
let lastUpdated=null;
let openGameLogId=null;
let proSchedule=null;
const gameLogCache=new Map();
const gameLogModes=new Map();

const style=document.createElement('style');
style.id='espnLiveStyles';
style.textContent=`
#espnLiveSection{margin-top:8px}
.espn-live-shell{display:grid;gap:8px}
.espn-live-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.espn-live-filters,.espn-stat-filters{display:flex;gap:6px;flex-wrap:wrap}
.espn-filter,.espn-stat-btn,.espn-refresh{border:1px solid var(--l);background:transparent;color:var(--m);border-radius:8px;padding:8px 11px;font-weight:900}
.espn-filter.active,.espn-stat-btn.active,.espn-refresh:active{background:#183d63!important;color:#fff!important}
.espn-stat-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 9px;border:1px solid #ffffff16;border-radius:10px;background:#07182a}
.espn-stat-label{color:#7f93aa;font-size:.62rem;font-weight:950;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
.espn-stat-btn{padding:6px 9px;font-size:.65rem}
.espn-live-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:var(--m);font-size:.68rem}
.espn-live-card{border:1px solid var(--l);border-radius:12px;overflow:hidden;background:#091c30e8}
.espn-live-head,.espn-live-row{display:grid;grid-template-columns:48px minmax(230px,1.8fr) 58px 68px 82px 92px;gap:8px;align-items:center}
.espn-live-head{padding:8px 10px;color:var(--m);font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em;background:#07182a}
.espn-live-row{padding:8px 10px;border-top:1px solid #ffffff12;min-height:58px}
.espn-rank{color:var(--r);font-weight:950}
.espn-player{display:flex;align-items:center;gap:7px;min-width:0}
.espn-player-copy{min-width:0}
.espn-player-name{font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.espn-name-btn{border:0;background:transparent;color:inherit;padding:0;font:inherit;font-weight:950;text-align:left;cursor:pointer;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.espn-name-btn:hover{text-decoration:underline}
.espn-profile-gamelog{margin-top:12px;border:1px solid var(--l);border-radius:10px;background:#07182a;overflow:hidden}
.espn-profile-gamelog-btn{width:100%;min-height:42px;border:0;background:#0b2139;color:#d7e6f5;padding:9px 12px;font-weight:950;text-align:left;display:flex;align-items:center;justify-content:space-between}
.espn-profile-gamelog-btn span{color:#8ca0b5;font-size:.66rem;font-weight:800}
.espn-profile-gamelog-panel{padding:0 10px 10px;background:#061522}
.espn-player-block{border-top:1px solid #ffffff12}
.espn-player-block:first-child{border-top:0}
.espn-player-block .espn-live-row{border-top:0}
.espn-game-log{background:#061522;border-top:1px solid #ffffff18;padding:0 10px 10px}
.espn-game-log[hidden]{display:none!important}
.espn-game-log-title{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 0 7px;font-size:.68rem;font-weight:950}
.espn-game-log-title span{color:#7f93aa;font-size:.58rem;font-weight:800}
.espn-game-log-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:0 0 8px}
.espn-game-log-tab{border:1px solid #ffffff20;background:#081a2d;color:#91a4ba;border-radius:8px;padding:6px 10px;font-size:.62rem;font-weight:950}
.espn-game-log-tab.active{background:#183d63;color:#fff;border-color:#ffffff35}
.espn-game-log-table-wrap{overflow-x:auto}
.espn-game-log-table{width:100%;border-collapse:collapse;font-size:.62rem}
.espn-game-log-table th,.espn-game-log-table td{padding:7px 8px;border-top:1px solid #ffffff10;text-align:left}
.espn-game-log-table th{color:#7f93aa;font-size:.56rem;text-transform:uppercase;letter-spacing:.05em}
.espn-game-log-table .gl-pts{text-align:right;font-weight:950}
.espn-game-log-table .gl-stat{color:#b8c7d6}
.espn-game-log-empty{padding:12px 4px;color:#7f93aa;font-size:.62rem}
.espn-team-logo{width:22px;height:22px;object-fit:contain;flex:0 0 22px}
.espn-pos{font-weight:900}
.espn-points,.espn-selected-stat{text-align:right;font-weight:900}
.espn-selected-stat{color:#dbeafe}
.espn-team{color:var(--m);font-size:.68rem}
.espn-status{padding:18px;text-align:center;color:var(--m)}
.espn-error{color:#ff8b9d}
.espn-live-source{font-size:.62rem;color:#73879e}
@media(max-width:700px){
  .espn-live-head,.espn-live-row{grid-template-columns:38px minmax(0,1fr) 54px 66px}
  .espn-live-head>*:nth-child(3),.espn-live-row>*:nth-child(3){display:none}
  .espn-live-head>*:nth-child(4),.espn-live-row>*:nth-child(4){display:none}
  .espn-live-head>*:nth-child(5),.espn-live-row>*:nth-child(5){display:none}
  .espn-live-row{padding:7px 8px;min-height:56px}
  .espn-player-name{font-size:.72rem}
  .espn-selected-stat{font-size:.72rem}
  .espn-stat-bar{align-items:flex-start}
  .espn-stat-label{width:100%}
  .espn-stat-filters{flex-wrap:nowrap;overflow-x:auto;width:100%;padding-bottom:2px}
  .espn-stat-btn{flex:0 0 auto}
  .espn-game-log-table-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
  .espn-game-log-table{display:table!important;width:max-content!important;min-width:100%!important;border-collapse:collapse!important}
  .espn-game-log-table thead{display:table-header-group!important}
  .espn-game-log-table tbody{display:table-row-group!important}
  .espn-game-log-table tr{display:table-row!important;border:0!important}
  .espn-game-log-table th,.espn-game-log-table td{display:table-cell!important;white-space:nowrap!important;padding:7px 8px!important;border-top:1px solid #ffffff10!important}
  .espn-game-log-table th:first-child,.espn-game-log-table td:first-child{position:sticky;left:0;z-index:2;background:#061522}
  .espn-game-log-table th:nth-child(2),.espn-game-log-table td:nth-child(2){min-width:58px}
  .espn-game-log-tabs{flex-wrap:nowrap;overflow-x:auto;width:100%;padding-bottom:6px}
  .espn-game-log-tab{flex:0 0 auto}
}
`;
document.head.appendChild(style);

const section=document.createElement('section');
section.id='espnLiveSection';
section.hidden=true;
section.innerHTML=`
  <div class="espn-live-shell">
    <div class="espn-live-toolbar">
      <div class="espn-live-filters">
        <button type="button" class="espn-filter active" data-espn-filter="ALL">All</button>
        <button type="button" class="espn-filter" data-espn-filter="QB">QB</button>
        <button type="button" class="espn-filter" data-espn-filter="RB">RB</button>
        <button type="button" class="espn-filter" data-espn-filter="WR">WR</button>
        <button type="button" class="espn-filter" data-espn-filter="TE">TE</button>
      </div>
      <div class="espn-live-meta">
        <span id="espnLastUpdated">Not loaded yet</span>
        <button type="button" id="espnRefresh" class="espn-refresh">Refresh</button>
      </div>
    </div>
    <div class="espn-stat-bar">
      <span class="espn-stat-label">Rank by</span>
      <div id="espnStatFilters" class="espn-stat-filters"></div>
    </div>
    <div class="espn-live-source">ESPN 2026 full-PPR actual stats · choose a position, then rank players by any relevant stat · auto-refreshes every 60 seconds while open</div>
    <div class="espn-live-card">
      <div class="espn-live-head">
        <div>Rank</div><div>Player</div><div>Pos</div><div>Team</div><div style="text-align:right">PPR Pts</div><div id="espnSelectedStatHead" style="text-align:right">PPR Pts</div>
      </div>
      <div id="espnLiveRows"><div class="espn-status">Open ESPN Live to load current rankings.</div></div>
    </div>
  </div>
`;

const trade=document.getElementById('tradeSection');
const depth=document.getElementById('depthSection');
if(trade&&trade.parentNode===main)main.insertBefore(section,trade.nextSibling);
else if(depth&&depth.parentNode===main)main.insertBefore(section,depth.nextSibling);
else main.appendChild(section);

function teamLogo(team){
  const slug=TEAM_SLUGS[team];
  return slug?`<img class="espn-team-logo" src="https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png" alt="">`:'';
}
function statSource(s){return Number(s?.statSourceId ?? s?.statTypeId ?? -1)}
function splitType(s){return Number(s?.statSplitTypeId ?? (Number(s?.scoringPeriodId||0)===0?0:1))}
function seasonStat(stats){
  const exact=stats.find(s=>Number(s?.seasonId)===SEASON&&statSource(s)===0&&splitType(s)===0);
  if(exact)return exact;
  return stats.find(s=>Number(s?.seasonId)===SEASON&&statSource(s)===0&&Number(s?.scoringPeriodId||0)===0)||null;
}
function rawStat(season,id){
  const value=season?.stats?.[id] ?? season?.stats?.[String(id)] ?? 0;
  const num=Number(value);
  return Number.isFinite(num)?num:0;
}
function parsePlayer(entry){
  const p=entry?.player || entry?.playerPoolEntry?.player || entry;
  if(!p)return null;
  const position=POSITION_BY_ID[Number(p.defaultPositionId)];
  if(!position)return null;
  const stats=p.stats || entry?.playerPoolEntry?.stats || entry?.stats || [];
  const season=seasonStat(Array.isArray(stats)?stats:[]);
  const total=Number(season?.appliedTotal ?? entry?.appliedStatTotal ?? entry?.playerPoolEntry?.appliedStatTotal ?? 0);
  const avg=Number(season?.appliedAverage);
  const name=p.fullName || p.displayName || p.name;
  if(!name||!Number.isFinite(total))return null;
  return {
    id:String(p.id ?? entry?.id ?? ''),
    name,
    position,
    team:TEAM_BY_ID[Number(p.proTeamId)]||'—',
    proTeamId:Number(p.proTeamId)||0,
    points:total,
    average:Number.isFinite(avg)?avg:null,
    passAtt:rawStat(season,0),
    completions:rawStat(season,1),
    passYds:rawStat(season,3),
    passTD:rawStat(season,4),
    interceptions:rawStat(season,20),
    rushAtt:rawStat(season,23),
    rushYds:rawStat(season,24),
    rushTD:rawStat(season,25),
    recYds:rawStat(season,42),
    recTD:rawStat(season,43),
    receptions:rawStat(season,53),
    targets:rawStat(season,58),
    fumblesLost:rawStat(season,72)
  };
}
function endpointFilter(){
  return JSON.stringify({
    players:{
      filterSlotIds:{value:[0,2,4,6]},
      filterStatsForSourceIds:{value:[0]},
      filterStatsForSplitTypeIds:{value:[0]},
      sortAppliedStatTotal:{sortAsc:false,sortPriority:1,value:'002026'},
      sortPercOwned:{sortPriority:2,sortAsc:false},
      limit:700,
      offset:0,
      filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['002026']}
    }
  });
}
async function fetchEspn(){
  const path=`/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leaguedefaults/${PPR_PRESET_ID}?scoringPeriodId=0&view=kona_player_info`;
  const urls=[
    'https://lm-api-reads.fantasy.espn.com'+path,
    'https://fantasy.espn.com'+path
  ];
  let lastError=null;
  for(const url of urls){
    try{
      const res=await fetch(url,{
        cache:'no-store',
        mode:'cors',
        headers:{
          'Accept':'application/json',
          'X-Fantasy-Filter':endpointFilter(),
          'X-Fantasy-Source':'kona'
        }
      });
      if(!res.ok)throw new Error('ESPN returned '+res.status);
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.players||[]);
      const parsed=list.map(parsePlayer).filter(Boolean).filter(p=>p.points!==0||p.average!==null);
      if(!parsed.length)throw new Error('ESPN returned no fantasy scoring rows');
      return parsed;
    }catch(err){lastError=err}
  }
  throw lastError||new Error('ESPN data request failed');
}
function configForFilter(){
  return STAT_CONFIG[activeFilter]||STAT_CONFIG.ALL;
}
function statLabel(key){
  return (configForFilter().find(x=>x.key===key)||STAT_CONFIG.ALL.find(x=>x.key===key)||{label:key}).label;
}
function statValue(p,key){
  const v=p?.[key];
  if(v===null||v===undefined||!Number.isFinite(Number(v)))return 0;
  return Number(v);
}
function formatStat(p,key){
  if(key==='points'||key==='average')return statValue(p,key).toFixed(1);
  return Number.isInteger(statValue(p,key))?String(statValue(p,key)):statValue(p,key).toFixed(1);
}
function rankRows(list,filter){
  const filtered=filter==='ALL'?list:list.filter(p=>p.position===filter);
  return [...filtered].sort((a,b)=>statValue(b,activeStat)-statValue(a,activeStat)||b.points-a.points||a.name.localeCompare(b.name));
}
function statsSummary(p){
  if(p.position==='QB'){
    return `${formatStat(p,'passYds')} Pass Yds · ${formatStat(p,'passTD')} Pass TD · ${formatStat(p,'rushYds')} Rush Yds · ${formatStat(p,'rushTD')} Rush TD`;
  }
  if(p.position==='RB'){
    return `${formatStat(p,'rushAtt')} Rush · ${formatStat(p,'rushYds')} Rush Yds · ${formatStat(p,'rushTD')} Rush TD · ${formatStat(p,'targets')} Tgt · ${formatStat(p,'receptions')} Rec · ${formatStat(p,'recYds')} Rec Yds`;
  }
  return `${formatStat(p,'targets')} Tgt · ${formatStat(p,'receptions')} Rec · ${formatStat(p,'recYds')} Rec Yds · ${formatStat(p,'recTD')} Rec TD`;
}

function gameLogStatLine(position,s){
  const passAtt=rawStat(s,0),comp=rawStat(s,1),passYds=rawStat(s,3),passTD=rawStat(s,4),ints=rawStat(s,20);
  const rushAtt=rawStat(s,23),rushYds=rawStat(s,24),rushTD=rawStat(s,25);
  const recYds=rawStat(s,42),recTD=rawStat(s,43),rec=rawStat(s,53),targets=rawStat(s,58);
  if(position==='QB')return comp+'/'+passAtt+' CMP, '+passYds+' YDS, '+passTD+' TD, '+ints+' INT · '+rushAtt+' CAR, '+rushYds+' YDS, '+rushTD+' TD';
  if(position==='RB')return rushAtt+' CAR, '+rushYds+' YDS, '+rushTD+' TD · '+rec+'/'+targets+' REC, '+recYds+' YDS, '+recTD+' TD';
  return rec+'/'+targets+' REC, '+recYds+' YDS, '+recTD+' TD'+(rushAtt?' · '+rushAtt+' CAR, '+rushYds+' YDS':'');
}
async function fetchProSchedule(){
  if(proSchedule)return proSchedule;
  const path='/apis/v3/games/ffl/seasons/'+SEASON+'?view=proTeamSchedules_wl';
  const urls=['https://lm-api-reads.fantasy.espn.com'+path,'https://fantasy.espn.com'+path];
  for(const url of urls){
    try{
      const r=await fetch(url,{cache:'no-store',mode:'cors',headers:{'Accept':'application/json'}});
      if(!r.ok)continue;
      const d=await r.json();
      const teams=d?.settings?.proTeams||d?.proTeams||[];
      if(teams.length){proSchedule=teams;return teams}
    }catch(e){}
  }
  return [];
}
function opponentLabel(proTeamId,week){
  if(!proSchedule||!proTeamId)return '—';
  const team=proSchedule.find(t=>Number(t.id)===Number(proTeamId));
  const games=team?.proGamesByScoringPeriod?.[String(week)]||team?.proGamesByScoringPeriod?.[week]||[];
  const g=Array.isArray(games)?games[0]:games;
  if(!g)return 'BYE';
  const home=Number(g.homeProTeamId??g.homeTeamId??g.home?.proTeamId??g.home?.teamId??0);
  const away=Number(g.awayProTeamId??g.awayTeamId??g.away?.proTeamId??g.away?.teamId??0);
  let opp=0,prefix='';
  if(home&&Number(proTeamId)===home){opp=away;prefix='vs '}
  else if(away&&Number(proTeamId)===away){opp=home;prefix='@ '}
  else{
    opp=Number(g.opponentProTeamId??g.opponentId??0);
    prefix='';
  }
  return opp?(prefix+(TEAM_BY_ID[opp]||'OPP')):'—';
}
function deepStats(entry){
  const pool=entry?.playerPoolEntry||entry;
  const p=pool?.player||entry?.player||pool;
  return p?.stats||pool?.stats||entry?.stats||[];
}
async function fetchGameLog(player){
  const cached=gameLogCache.get(String(player.id));
  if(cached&&Date.now()-cached.ts<REFRESH_MS)return cached.rows;
  const filter=JSON.stringify({players:{
    filterIds:{value:[Number(player.id)]},
    filterStatsForSourceIds:{value:[0]},
    filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['00'+SEASON,'10'+SEASON]}
  }});
  const base='/apis/v3/games/ffl/seasons/'+SEASON+'/segments/0/leaguedefaults/'+PPR_PRESET_ID;
  const candidates=[
    ['https://lm-api-reads.fantasy.espn.com'+base+'?view=kona_playercard','kona_playercard'],
    ['https://lm-api-reads.fantasy.espn.com'+base+'?view=kona_player_info','kona_player_info'],
    ['https://fantasy.espn.com'+base+'?view=kona_player_info','kona_player_info']
  ];
  let list=null,lastError=null;
  for(const [url] of candidates){
    try{
      const r=await fetch(url,{cache:'no-store',mode:'cors',headers:{'Accept':'application/json','X-Fantasy-Filter':filter,'X-Fantasy-Source':'kona'}});
      if(!r.ok)throw new Error('ESPN returned '+r.status);
      const d=await r.json();
      const arr=Array.isArray(d)?d:(d.players||[]);
      if(arr.length){list=arr;break}
    }catch(e){lastError=e}
  }
  if(!list)throw lastError||new Error('No game log data');
  await fetchProSchedule();
  const stats=deepStats(list[0]);
  const byWeek=new Map();
  (Array.isArray(stats)?stats:[]).forEach(s=>{
    const week=Number(s?.scoringPeriodId||0);
    if(Number(s?.seasonId)!==SEASON||statSource(s)!==0||week<=0||week>20)return;
    const pts=Number(s?.appliedTotal);
    if(!Number.isFinite(pts)&&!s?.stats)return;
    const prev=byWeek.get(week);
    const size=Object.keys(s?.stats||{}).length;
    const prevSize=Object.keys(prev?.stats||{}).length;
    if(!prev||size>prevSize)byWeek.set(week,s);
  });
  const log=[...byWeek.entries()].sort((a,b)=>a[0]-b[0]).map(([week,s])=>({
    week,
    opponent:opponentLabel(player.proTeamId,week),
    totalPoints:Number.isFinite(Number(s.appliedTotal))?Number(s.appliedTotal):0,
    passAtt:rawStat(s,0),
    completions:rawStat(s,1),
    passYds:rawStat(s,3),
    passTD:rawStat(s,4),
    interceptions:rawStat(s,20),
    rushAtt:rawStat(s,23),
    rushYds:rawStat(s,24),
    rushTD:rawStat(s,25),
    recYds:rawStat(s,42),
    recTD:rawStat(s,43),
    receptions:rawStat(s,53),
    targets:rawStat(s,58),
    fumblesLost:rawStat(s,72)
  }));
  gameLogCache.set(String(player.id),{ts:Date.now(),rows:log});
  return log;
}
function gameLogModesFor(position){
  if(position==='RB')return [{key:'rush',label:'Rushing'},{key:'rec',label:'Receiving'}];
  if(position==='QB')return [{key:'pass',label:'Passing'},{key:'rush',label:'Rushing'}];
  return [{key:'rec',label:'Receiving'}];
}
function defaultGameLogMode(position){
  return position==='QB'?'pass':position==='RB'?'rush':'rec';
}
function categoryPoints(g,mode,position){
  if(mode==='pass')return g.passYds*.04+g.passTD*4-g.interceptions*2-g.fumblesLost*2;
  if(mode==='rush')return g.rushYds*.1+g.rushTD*6;
  if(mode==='rec')return g.receptions+g.recYds*.1+g.recTD*6;
  return g.totalPoints||0;
}
function gameLogColumns(mode,position){
  if(mode==='pass')return [
    {label:'PTS',key:'pts'},
    {label:'YDS',key:'passYds'},
    {label:'TD',key:'passTD'},
    {label:'INT/FUM',key:'turnovers'}
  ];
  if(mode==='rush')return [
    {label:'PTS',key:'pts'},
    {label:'ATT',key:'rushAtt'},
    {label:'YDS',key:'rushYds'},
    {label:'TD',key:'rushTD'}
  ];
  return [
    {label:'PTS',key:'pts'},
    {label:'REC',key:'receptions'},
    {label:'TGT',key:'targets'},
    {label:'YDS',key:'recYds'},
    {label:'TD',key:'recTD'}
  ];
}
function gameLogCell(g,key,mode,position){
  if(key==='pts')return categoryPoints(g,mode,position).toFixed(1);
  if(key==='turnovers')return g.interceptions+'/'+g.fumblesLost;
  const v=Number(g[key]||0);
  return Number.isInteger(v)?String(v):v.toFixed(1);
}
function gameLogHtml(player){
  const cached=gameLogCache.get(String(player.id));
  if(!cached)return '<div class="espn-game-log-empty">Loading game log…</div>';
  if(cached.error)return '<div class="espn-game-log-empty espn-error">Could not load this game log. Tap Game Log to try again.</div>';
  const modes=gameLogModesFor(player.position);
  let mode=gameLogModes.get(String(player.id))||defaultGameLogMode(player.position);
  if(!modes.some(x=>x.key===mode))mode=modes[0].key;
  const tabs='<div class="espn-game-log-tabs">'+modes.map(x=>'<button type="button" class="espn-game-log-tab'+(x.key===mode?' active':'')+'" data-gl-mode="'+x.key+'">'+x.label+'</button>').join('')+'</div>';
  if(!cached.rows.length)return '<div class="espn-game-log-title"><strong>'+player.name+' Game Log</strong><span>2026 · PPR</span></div>'+tabs+'<div class="espn-game-log-empty">No completed game stats yet.</div>';
  const cols=gameLogColumns(mode,player.position);
  return '<div class="espn-game-log-title"><strong>'+player.name+' Game Log</strong><span>2026 · PPR</span></div>'+tabs+
    '<div class="espn-game-log-table-wrap"><table class="espn-game-log-table"><thead><tr><th>WK</th><th>OPP</th>'+
    cols.map(c=>'<th class="'+(c.key==='pts'?'gl-pts':'')+'">'+c.label+'</th>').join('')+
    '</tr></thead><tbody>'+
    cached.rows.map(g=>'<tr><td>'+g.week+'</td><td>'+g.opponent+'</td>'+
      cols.map(c=>'<td class="'+(c.key==='pts'?'gl-pts':'gl-stat')+'">'+gameLogCell(g,c.key,mode,player.position)+'</td>').join('')+
    '</tr>').join('')+
    '</tbody></table></div>';
}
function bindGameLogModeButtons(panel,player){
  panel.querySelectorAll('[data-gl-mode]').forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      gameLogModes.set(String(player.id),btn.dataset.glMode);
      panel.innerHTML=gameLogHtml(player);
      bindGameLogModeButtons(panel,player);
    };
  });
}
async function toggleGameLog(id){
  const player=rows.find(p=>String(p.id)===String(id));
  if(!player)return;
  if(openGameLogId===String(id)){openGameLogId=null;render();return}
  openGameLogId=String(id);
  render();
  try{
    await fetchGameLog(player);
  }catch(e){
    gameLogCache.set(String(id),{ts:Date.now(),rows:[],error:true});
  }
  if(openGameLogId===String(id))render();
}


function ensureProfileGameLogUi(){
  let wrap=document.getElementById('espnProfileGameLogWrap');
  if(wrap)return wrap;
  const profileBox=document.querySelector('#modal .profile');
  const notes=profileBox?.querySelector('.note-box');
  if(!profileBox)return null;
  wrap=document.createElement('div');
  wrap.id='espnProfileGameLogWrap';
  wrap.className='espn-profile-gamelog';
  wrap.hidden=true;
  wrap.innerHTML='<button type="button" id="espnProfileGameLogBtn" class="espn-profile-gamelog-btn">Game Log <span>2026 PPR</span></button><div id="espnProfileGameLogPanel" class="espn-profile-gamelog-panel" hidden></div>';
  if(notes)profileBox.insertBefore(wrap,notes);else profileBox.appendChild(wrap);
  document.getElementById('espnProfileGameLogBtn').onclick=async()=>{
    const id=wrap.dataset.espnId;
    const player=rows.find(p=>String(p.id)===String(id));
    const panel=document.getElementById('espnProfileGameLogPanel');
    if(!player||!panel)return;
    if(!panel.hidden){
      panel.hidden=true;
      document.getElementById('espnProfileGameLogBtn').firstChild.textContent='Game Log ';
      return;
    }
    panel.hidden=false;
    document.getElementById('espnProfileGameLogBtn').firstChild.textContent='Hide Game Log ';
    panel.innerHTML='<div class="espn-game-log-empty">Loading game log…</div>';
    try{
      await fetchGameLog(player);
      panel.innerHTML=gameLogHtml(player);
      bindGameLogModeButtons(panel,player);
    }catch(e){
      gameLogCache.set(String(id),{ts:Date.now(),rows:[],error:true});
      panel.innerHTML=gameLogHtml(player);
      bindGameLogModeButtons(panel,player);
    }
  };
  return wrap;
}
function resetProfileGameLog(player){
  const wrap=ensureProfileGameLogUi();
  if(!wrap)return;
  wrap.hidden=false;
  wrap.dataset.espnId=String(player.id);
  if(!gameLogModes.has(String(player.id)))gameLogModes.set(String(player.id),defaultGameLogMode(player.position));
  const panel=document.getElementById('espnProfileGameLogPanel');
  if(panel){panel.hidden=true;panel.innerHTML=''}
  const btn=document.getElementById('espnProfileGameLogBtn');
  if(btn)btn.firstChild.textContent='Game Log ';
}
function hideProfileGameLog(){
  const wrap=document.getElementById('espnProfileGameLogWrap');
  if(wrap)wrap.hidden=true;
}
function openEspnPlayerProfile(player){
  const localId=localPlayerId(player.name);
  if(localId){
    try{profile(localId)}catch(e){}
  }else{
    const modal=document.getElementById('modal');
    if(!modal)return;
    document.getElementById('pn').textContent=player.name;
    document.getElementById('pn').className='';
    document.getElementById('pm').textContent=player.team+' · '+player.position;
    document.getElementById('profileTop').innerHTML='<div class="person"></div>'+teamLogo(player.team);
    document.getElementById('injuryStatus').innerHTML='';
    const cfg=STAT_CONFIG[player.position]||STAT_CONFIG.ALL;
    document.getElementById('stats').innerHTML=cfg.slice(0,4).map(x=>'<div class="stat"><span>'+x.label+'</span><b>'+formatStat(player,x.key)+'</b></div>').join('');
    document.getElementById('playerNotes').textContent='No notes provided.';
    modal.classList.add('open');
    document.body.style.overflow='hidden';
  }
  resetProfileGameLog(player);
}

function renderStatFilters(){
  const box=document.getElementById('espnStatFilters');
  const cfg=configForFilter();
  if(!cfg.some(x=>x.key===activeStat))activeStat='points';
  box.innerHTML=cfg.map(x=>`<button type="button" class="espn-stat-btn${x.key===activeStat?' active':''}" data-espn-stat="${x.key}">${x.label}</button>`).join('');
  box.querySelectorAll('[data-espn-stat]').forEach(b=>{
    b.onclick=()=>{
      activeStat=b.dataset.espnStat;
      renderStatFilters();
      render();
    };
  });
  const head=document.getElementById('espnSelectedStatHead');
  if(head)head.textContent=statLabel(activeStat);
}
function localPlayerId(name){
  try{
    const aliases={kylepittssr:'kylepitts',orondegadsdenii:'orondegadsden',haroldfanninJr:'haroldfannin'};
    const n=norm(name),key=aliases[n]||n;
    const p=players.find(x=>norm(x.name)===key||norm(x.name)===n);
    return p?.id||'';
  }catch(e){return''}
}
function render(){
  const box=document.getElementById('espnLiveRows');
  if(!rows.length){
    if(!loading)box.innerHTML='<div class="espn-status">No ESPN scoring data loaded.</div>';
    return;
  }
  const ranked=rankRows(rows,activeFilter);
  box.innerHTML=ranked.map((p,i)=>{
    return `<div class="espn-live-row">
      <div class="espn-rank">#${i+1}</div>
      <div class="espn-player">${teamLogo(p.team)}<div class="espn-player-copy"><button type="button" class="espn-name-btn" data-espn-open-player="${p.id}">${p.name}</button></div></div>
      <div class="espn-pos">${p.position}</div>
      <div class="espn-team">${p.team}</div>
      <div class="espn-points">${p.points.toFixed(1)}</div>
      <div class="espn-selected-stat">${formatStat(p,activeStat)}</div>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-espn-open-player]').forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const player=rows.find(p=>String(p.id)===String(btn.dataset.espnOpenPlayer));
      if(player)openEspnPlayerProfile(player);
    };
  });
}
function setUpdatedLabel(message,error=false){
  const el=document.getElementById('espnLastUpdated');
  el.textContent=message;
  el.classList.toggle('espn-error',!!error);
}
async function refresh(){
  if(loading)return;
  loading=true;
  const button=document.getElementById('espnRefresh');
  button.disabled=true;
  button.textContent='Refreshing…';
  if(!rows.length)document.getElementById('espnLiveRows').innerHTML='<div class="espn-status">Loading ESPN PPR stats…</div>';
  try{
    const fresh=await fetchEspn();
    rows=fresh;
    lastUpdated=new Date();
    try{localStorage.setItem('shuaEspnLivePprStats',JSON.stringify({ts:lastUpdated.getTime(),rows}))}catch(e){}
    render();
    setUpdatedLabel('Updated '+lastUpdated.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}));
  }catch(err){
    if(!rows.length){
      try{
        const cached=JSON.parse(localStorage.getItem('shuaEspnLivePprStats')||localStorage.getItem('shuaEspnLivePpr')||'null');
        if(cached?.rows?.length){
          rows=cached.rows;
          lastUpdated=new Date(cached.ts||Date.now());
          render();
          setUpdatedLabel('ESPN refresh failed · showing cached data',true);
        }else{
          document.getElementById('espnLiveRows').innerHTML='<div class="espn-status espn-error">Could not reach ESPN right now. Tap Refresh to try again.</div>';
          setUpdatedLabel('ESPN connection failed',true);
        }
      }catch(e){
        document.getElementById('espnLiveRows').innerHTML='<div class="espn-status espn-error">Could not reach ESPN right now. Tap Refresh to try again.</div>';
        setUpdatedLabel('ESPN connection failed',true);
      }
    }else{
      setUpdatedLabel('Refresh failed · keeping last update',true);
    }
  }finally{
    loading=false;
    button.disabled=false;
    button.textContent='Refresh';
  }
}
function showEspn(){
  try{position='ESPN'}catch(e){}
  document.body.classList.remove('fantasy-home-mode','mobile-menu-open');
  document.querySelectorAll('.positions .pos').forEach(b=>b.classList.toggle('active',b.dataset.pos==='ESPN'));
  const tagged=document.getElementById('taggedControls');if(tagged)tagged.classList.remove('open');
  const ids=['teamControls','overallToggle','positionToggle','board','tableCard','mockSection','depthSection','tradeSection'];
  ids.forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true});
  section.hidden=false;
  document.getElementById('title').textContent='ESPN Live PPR';
  document.getElementById('sub').textContent='2026 scoring leaders — filter by position and rank by stat';
  renderStatFilters();
  if(!rows.length)refresh();
  if(timer)clearInterval(timer);
  timer=setInterval(()=>{if(!section.hidden)refresh()},REFRESH_MS);
}
function hideEspn(){
  section.hidden=true;
  if(timer){clearInterval(timer);timer=null}
}

const button=document.createElement('button');
button.className='pos espn-live-btn';
button.dataset.pos='ESPN';
button.textContent='ESPN Live';
const tradeBtn=nav.querySelector('[data-pos="TRADE"]');
const depthBtn=nav.querySelector('[data-pos="DEPTH"]');
if(tradeBtn)tradeBtn.insertAdjacentElement('afterend',button);
else if(depthBtn)depthBtn.insertAdjacentElement('afterend',button);
else nav.appendChild(button);
button.onclick=e=>{e.preventDefault();showEspn()};

document.querySelectorAll('[data-espn-filter]').forEach(b=>{
  b.onclick=()=>{
    activeFilter=b.dataset.espnFilter;
    activeStat='points';
    document.querySelectorAll('[data-espn-filter]').forEach(x=>x.classList.toggle('active',x===b));
    renderStatFilters();
    render();
  };
});
document.getElementById('espnRefresh').onclick=refresh;
document.getElementById('close')?.addEventListener('click',hideProfileGameLog);
document.getElementById('modal')?.addEventListener('click',e=>{if(e.target===document.getElementById('modal'))hideProfileGameLog()});

document.addEventListener('click',e=>{
  const navBtn=e.target.closest('.positions .pos');
  if(navBtn&&navBtn.dataset.pos!=='ESPN')hideEspn();
});

renderStatFilters();
})();