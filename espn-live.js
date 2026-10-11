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
let statsRows=[];
let statsSeason=SEASON;
let statsLastUpdated=null;
let activeFilter='ALL';
let activeStat='points';
let statView='TOTAL';
let loading=false;
let timer=null;
let lastUpdated=null;
let openGameLogId=null;
const proSchedules=new Map();
const gameLogCache=new Map();
const gameLogModes=new Map();
const gameLogYears=new Map();
const careerYearsCache=new Map();

const style=document.createElement('style');
style.id='espnLiveStyles';
style.textContent=`
#espnLiveSection{margin-top:8px}
.espn-live-shell{display:grid;gap:8px}
.espn-live-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.espn-live-filters,.espn-stat-filters{display:flex;gap:6px;flex-wrap:wrap}
.espn-filter,.espn-stat-btn,.espn-view-btn,.espn-refresh,.espn-year-select{border:1px solid var(--l);background:transparent;color:var(--m);border-radius:8px;padding:8px 11px;font-weight:900}
.espn-filter.active,.espn-stat-btn.active,.espn-view-btn.active,.espn-refresh:active{background:#183d63!important;color:#fff!important}.espn-year-select{background:#081a2d;color:#fff;min-width:82px}
.espn-stat-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 9px;border:1px solid #ffffff16;border-radius:10px;background:#07182a}
.espn-stat-label{color:#7f93aa;font-size:.62rem;font-weight:950;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
.espn-stat-btn,.espn-view-btn{padding:6px 9px;font-size:.65rem}
.espn-live-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:var(--m);font-size:.68rem}
.espn-live-card{border:1px solid var(--l);border-radius:12px;overflow:hidden;background:#091c30e8}
.espn-live-head,.espn-live-row{display:grid;grid-template-columns:48px minmax(230px,1.8fr) 58px 68px 82px 92px;gap:8px;align-items:center}
.espn-live-head{padding:8px 10px;color:var(--m);font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em;background:#07182a}
.espn-live-row{padding:8px 10px;border-top:1px solid #ffffff12;min-height:58px}
.espn-rank{color:var(--r);font-weight:950}
.espn-player{display:flex;align-items:center;gap:9px;min-width:0}.espn-headshot{width:38px;height:38px;border-radius:50%;object-fit:cover;object-position:center 15%;background:#17314a;border:1px solid #ffffff30;flex:0 0 38px}
.espn-player-copy{min-width:0;display:grid;gap:3px}.espn-player-meta{display:flex;align-items:center;gap:4px;color:#8ca0b5;font-size:.58rem;font-weight:850;line-height:1}.espn-player-meta .espn-team-logo{width:16px;height:16px;flex-basis:16px}
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
.espn-game-log-year-row{display:flex;align-items:center;gap:7px;padding:0 0 8px}
.espn-game-log-year-label{color:#7f93aa;font-size:.58rem;font-weight:950;text-transform:uppercase;letter-spacing:.06em}
.espn-game-log-year-select{min-width:92px;border:1px solid #ffffff20;background:#081a2d;color:#fff;border-radius:8px;padding:6px 28px 6px 9px;font-size:.65rem;font-weight:950}
.espn-game-log-tab{border:1px solid #ffffff20;background:#081a2d;color:#91a4ba;border-radius:8px;padding:6px 10px;font-size:.62rem;font-weight:950}
.espn-game-log-tab.active{background:#183d63;color:#fff;border-color:#ffffff35}
.espn-game-log-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:0 0 8px}
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
  .espn-live-head,.espn-live-row{grid-template-columns:34px minmax(0,1fr) 64px;gap:5px}
  .espn-live-head>*:nth-child(3),.espn-live-row>*:nth-child(3){display:none}
  .espn-live-head>*:nth-child(4),.espn-live-row>*:nth-child(4){display:none}
  .espn-live-head>*:nth-child(5),.espn-live-row>*:nth-child(5){display:none}
  .espn-live-row{padding:7px 6px;min-height:58px}
  .espn-player-name{font-size:.72rem}.espn-player{gap:7px}.espn-player-meta{font-size:.54rem}.espn-player-meta .espn-team-logo{width:14px;height:14px;flex-basis:14px}
  .espn-headshot{width:34px;height:34px;flex-basis:34px}
  .espn-selected-stat{font-size:.72rem}
  .espn-live-toolbar{display:grid;grid-template-columns:1fr;gap:7px}.espn-live-filters{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;width:100%}.espn-filter{padding:7px 3px;font-size:.62rem;min-width:0}.espn-live-meta{display:grid;grid-template-columns:84px minmax(0,1fr) auto;gap:6px;width:100%;align-items:center}.espn-year-select,.espn-refresh{min-height:38px;padding:6px 8px}.espn-live-meta #espnLastUpdated{font-size:.58rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.espn-stat-bar{align-items:flex-start;padding:7px}
  .espn-stat-label{width:100%}
  .espn-stat-filters{flex-wrap:nowrap;overflow-x:auto;width:100%;padding-bottom:2px;-webkit-overflow-scrolling:touch;scrollbar-width:none}.espn-stat-filters::-webkit-scrollbar{display:none}
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
  .espn-game-log-year-row{justify-content:flex-start}
  .espn-game-log-year-select{font-size:.7rem;min-height:36px}
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
        <select id="espnStatsYear" class="espn-year-select" aria-label="Stats year"></select>
        <span id="espnLastUpdated">Not loaded yet</span>
        <button type="button" id="espnRefresh" class="espn-refresh">Refresh</button>
      </div>
    </div>
    <div class="espn-stat-bar">
      <span class="espn-stat-label">Stats</span>
      <div class="espn-stat-filters">
        <button type="button" class="espn-view-btn active" data-espn-view="TOTAL">Season</button>
        <button type="button" class="espn-view-btn" data-espn-view="PERGAME">Per Game</button>
      </div>
      <span class="espn-stat-label">Rank by</span>
      <div id="espnStatFilters" class="espn-stat-filters"></div>
    </div>
    <div id="espnLiveSource" class="espn-live-source">ESPN 2026 full-PPR stats · choose a position, then rank players by any relevant stat</div>
    <div class="espn-live-card">
      <div class="espn-live-head">
        <div>Rank</div><div>Player</div><div>Pos</div><div>Team</div><div id="espnPointsHead" style="text-align:right">PPR Pts</div><div id="espnSelectedStatHead" style="text-align:right">PPR Pts</div>
      </div>
      <div id="espnLiveRows"><div class="espn-status">Open Stats to load rankings.</div></div>
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
function playerHeadshot(player){
  const id=String(player?.id||'');
  if(!id)return '';
  return '<img class="espn-headshot" src="https://a.espncdn.com/i/headshots/nfl/players/full/'+id+'.png" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
}
function statSource(s){return Number(s?.statSourceId ?? s?.statTypeId ?? -1)}
function splitType(s){return Number(s?.statSplitTypeId ?? (Number(s?.scoringPeriodId||0)===0?0:1))}
function seasonStat(stats,year=SEASON){
  const exact=stats.find(s=>Number(s?.seasonId)===year&&statSource(s)===0&&splitType(s)===0);
  if(exact)return exact;
  return stats.find(s=>Number(s?.seasonId)===year&&statSource(s)===0&&Number(s?.scoringPeriodId||0)===0)||null;
}
function rawStat(season,id){
  const value=season?.stats?.[id] ?? season?.stats?.[String(id)] ?? 0;
  const num=Number(value);
  return Number.isFinite(num)?num:0;
}
function parsePlayer(entry,year=SEASON){
  const p=entry?.player || entry?.playerPoolEntry?.player || entry;
  if(!p)return null;
  const position=POSITION_BY_ID[Number(p.defaultPositionId)];
  if(!position)return null;
  const stats=p.stats || entry?.playerPoolEntry?.stats || entry?.stats || [];
  const season=seasonStat(Array.isArray(stats)?stats:[],year);
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
    experienceYears:Number(p.proExperience ?? p.experience?.years ?? p.experience ?? 0)||0,
    points:total,
    average:Number.isFinite(avg)?avg:null,
    gamesPlayed:rawStat(season,210)||((Number.isFinite(avg)&&avg>0)?Math.max(1,Math.round(total/avg)):0),
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
function endpointFilter(year=SEASON){
  return JSON.stringify({
    players:{
      filterSlotIds:{value:[0,2,4,6]},
      filterStatsForSourceIds:{value:[0]},
      filterStatsForSplitTypeIds:{value:[0]},
      sortAppliedStatTotal:{sortAsc:false,sortPriority:1,value:'00'+year},
      sortPercOwned:{sortPriority:2,sortAsc:false},
      limit:700,
      offset:0,
      filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['00'+year]}
    }
  });
}
async function fetchEspn(year=SEASON){
  const path=`/apis/v3/games/ffl/seasons/${year}/segments/0/leaguedefaults/${PPR_PRESET_ID}?scoringPeriodId=0&view=kona_player_info`;
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
          'X-Fantasy-Filter':endpointFilter(year),
          'X-Fantasy-Source':'kona'
        }
      });
      if(!res.ok)throw new Error('ESPN returned '+res.status);
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.players||[]);
      const parsed=list.map(x=>parsePlayer(x,year)).filter(Boolean).filter(p=>p.points!==0||p.average!==null);
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
function rawPlayerStatValue(p,key){
  const v=p?.[key];
  if(v===null||v===undefined||!Number.isFinite(Number(v)))return 0;
  return Number(v);
}
function statValue(p,key){
  const raw=rawPlayerStatValue(p,key);
  if(statView!=='PERGAME')return raw;
  if(key==='average')return raw;
  if(key==='points'&&Number.isFinite(Number(p?.average)))return Number(p.average);
  const gp=Number(p?.gamesPlayed)||0;
  return gp>0?raw/gp:raw;
}
function displayStatLabel(key){
  const label=statLabel(key);
  if(statView!=='PERGAME'||key==='average')return label;
  if(key==='points')return 'PPR/G';
  return label+'/G';
}
function formatStat(p,key){
  const v=statValue(p,key);
  if(statView==='PERGAME')return v.toFixed(1);
  if(key==='points'||key==='average')return v.toFixed(1);
  return Number.isInteger(v)?String(v):v.toFixed(1);
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
async function fetchProSchedule(year=SEASON){
  if(proSchedules.has(year))return proSchedules.get(year);
  const path='/apis/v3/games/ffl/seasons/'+year+'?view=proTeamSchedules_wl';
  const urls=['https://lm-api-reads.fantasy.espn.com'+path,'https://fantasy.espn.com'+path];
  for(const url of urls){
    try{
      const r=await fetch(url,{cache:'no-store',mode:'cors',headers:{'Accept':'application/json'}});
      if(!r.ok)continue;
      const d=await r.json();
      const teams=d?.settings?.proTeams||d?.proTeams||[];
      if(teams.length){proSchedules.set(year,teams);return teams}
    }catch(e){}
  }
  proSchedules.set(year,[]);
  return [];
}
function opponentLabel(proTeamId,week,year=SEASON){
  const schedule=proSchedules.get(year)||[];
  if(!schedule.length||!proTeamId)return '—';
  const team=schedule.find(t=>Number(t.id)===Number(proTeamId));
  const games=team?.proGamesByScoringPeriod?.[String(week)]||team?.proGamesByScoringPeriod?.[week]||[];
  const g=Array.isArray(games)?games[0]:games;
  if(!g)return 'BYE';
  const home=Number(g.homeProTeamId??g.homeTeamId??g.home?.proTeamId??g.home?.teamId??0);
  const away=Number(g.awayProTeamId??g.awayTeamId??g.away?.proTeamId??g.away?.teamId??0);
  let opp=0,prefix='';
  if(home&&Number(proTeamId)===home){opp=away;prefix='vs '}
  else if(away&&Number(proTeamId)===away){opp=home;prefix='@ '}
  else{opp=Number(g.opponentProTeamId??g.opponentId??0)}
  return opp?(prefix+(TEAM_BY_ID[opp]||'OPP')):'—';
}
function deepStats(entry){
  const pool=entry?.playerPoolEntry||entry;
  const p=pool?.player||entry?.player||pool;
  return p?.stats||pool?.stats||entry?.stats||[];
}
function gameLogCacheKey(player,year){return String(player.id)+':'+year}
function availableGameLogYears(player){
  const cached=careerYearsCache.get(String(player.id));
  if(cached?.length)return cached;
  const exp=Math.max(0,Number(player?.experienceYears)||0);
  const first=Math.max(2010,SEASON-exp);
  const years=[];
  for(let y=SEASON;y>=first;y--)years.push(y);
  return years.length?years:[SEASON];
}
async function discoverGameLogYears(player){
  const key=String(player.id);
  const cached=careerYearsCache.get(key);
  if(cached?.length)return cached;

  let firstYear=null;
  const exp=Math.max(0,Number(player?.experienceYears)||0);
  if(exp>0)firstYear=Math.max(2010,SEASON-exp);

  try{
    const r=await fetch('https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/'+player.id,{cache:'no-store',mode:'cors'});
    if(r.ok){
      const d=await r.json();
      const a=d?.athlete||d;
      const debut=Number(a?.debutYear||a?.debut?.year||0);
      const draft=Number(a?.draft?.year||a?.draftYear||0);
      const yearsExp=Number(a?.experience?.years||a?.experience||0);
      if(debut)firstYear=debut;
      else if(draft)firstYear=draft;
      else if(yearsExp>0)firstYear=Math.max(2010,SEASON-yearsExp);
    }
  }catch(e){}

  // Fallback for players where ESPN omits career metadata:
  // look backward until we find the first season with actual weekly stats.
  if(!firstYear||firstYear>=SEASON){
    let oldestFound=SEASON,misses=0,foundOlder=false;
    for(let y=SEASON-1;y>=Math.max(2010,SEASON-15);y--){
      try{
        const rows=await fetchGameLog(player,y);
        if(rows.length){
          oldestFound=y;
          foundOlder=true;
          misses=0;
        }else{
          misses++;
          if(foundOlder&&misses>=2)break;
        }
      }catch(e){
        misses++;
        if(foundOlder&&misses>=2)break;
      }
    }
    if(foundOlder)firstYear=oldestFound;
  }

  firstYear=Math.max(2010,Math.min(SEASON,firstYear||SEASON));
  const years=[];
  for(let y=SEASON;y>=firstYear;y--)years.push(y);
  careerYearsCache.set(key,years);
  return years;
}
async function fetchGameLog(player,year=SEASON){
  const cacheKey=gameLogCacheKey(player,year);
  const cached=gameLogCache.get(cacheKey);
  const ttl=year===SEASON?REFRESH_MS:86400000;
  if(cached&&Date.now()-cached.ts<ttl)return cached.rows;

  const schedulePromise=fetchProSchedule(year);
  const filter=JSON.stringify({players:{
    filterIds:{value:[Number(player.id)]},
    filterStatsForSourceIds:{value:[0]},
    filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['00'+year,'10'+year]}
  }});
  const base='/apis/v3/games/ffl/seasons/'+year+'/segments/0/leaguedefaults/'+PPR_PRESET_ID;
  const candidates=[
    'https://lm-api-reads.fantasy.espn.com'+base+'?view=kona_playercard',
    'https://lm-api-reads.fantasy.espn.com'+base+'?view=kona_player_info',
    'https://fantasy.espn.com'+base+'?view=kona_player_info'
  ];
  let list=null,lastError=null;
  for(const url of candidates){
    try{
      const r=await fetch(url,{cache:year===SEASON?'no-store':'force-cache',mode:'cors',headers:{'Accept':'application/json','X-Fantasy-Filter':filter,'X-Fantasy-Source':'kona'}});
      if(!r.ok)throw new Error('ESPN returned '+r.status);
      const d=await r.json();
      const arr=Array.isArray(d)?d:(d.players||[]);
      const exact=arr.find(x=>String((x?.playerPoolEntry?.player||x?.player||x)?.id||'')===String(player.id));
      if(exact){list=[exact];break}
      if(arr.length===1){list=arr;break}
    }catch(e){lastError=e}
  }
  if(!list)throw lastError||new Error('No game log data');

  await schedulePromise;
  const pool=list[0]?.playerPoolEntry||list[0];
  const histPlayer=pool?.player||list[0]?.player||pool;
  const historicalTeamId=Number(histPlayer?.proTeamId)||player.proTeamId;
  const stats=deepStats(list[0]);
  const byWeek=new Map();
  (Array.isArray(stats)?stats:[]).forEach(s=>{
    const week=Number(s?.scoringPeriodId||0);
    if(Number(s?.seasonId)!==year||statSource(s)!==0||week<=0||week>20)return;
    const pts=Number(s?.appliedTotal);
    if(!Number.isFinite(pts)&&!s?.stats)return;
    const prev=byWeek.get(week);
    const size=Object.keys(s?.stats||{}).length;
    const prevSize=Object.keys(prev?.stats||{}).length;
    if(!prev||size>prevSize)byWeek.set(week,s);
  });

  const makeRow=(week,s)=>({
    week,
    opponent:opponentLabel(historicalTeamId,week,year),
    hasStats:!!s,
    totalPoints:s&&Number.isFinite(Number(s.appliedTotal))?Number(s.appliedTotal):null,
    passAtt:s?rawStat(s,0):null,
    completions:s?rawStat(s,1):null,
    passYds:s?rawStat(s,3):null,
    passTD:s?rawStat(s,4):null,
    interceptions:s?rawStat(s,20):null,
    rushAtt:s?rawStat(s,23):null,
    rushYds:s?rawStat(s,24):null,
    rushTD:s?rawStat(s,25):null,
    recYds:s?rawStat(s,42):null,
    recTD:s?rawStat(s,43):null,
    receptions:s?rawStat(s,53):null,
    targets:s?rawStat(s,58):null,
    fumblesLost:s?rawStat(s,72):null
  });

  let log;
  if(year===SEASON){
    log=[];
    for(let week=1;week<=18;week++)log.push(makeRow(week,byWeek.get(week)||null));
  }else{
    log=[...byWeek.entries()].sort((a,b)=>a[0]-b[0]).map(([week,s])=>makeRow(week,s));
  }
  gameLogCache.set(cacheKey,{ts:Date.now(),rows:log});
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
  if(!g?.hasStats)return null;
  return Number(g.totalPoints)||0;
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
  if(!g?.hasStats)return '—';
  if(key==='pts'){
    const pts=categoryPoints(g,mode,position);
    return pts===null?'—':Number(pts).toFixed(1);
  }
  if(key==='turnovers')return Number(g.interceptions||0)+'/'+Number(g.fumblesLost||0);
  const v=Number(g[key]||0);
  return Number.isInteger(v)?String(v):v.toFixed(1);
}
function gameLogHtml(player,opts={}){
  const years=availableGameLogYears(player);
  let year=Number(opts.year)||gameLogYears.get(String(player.id))||SEASON;
  if(!opts.year&&!years.includes(year))year=years[0]||SEASON;
  const cacheKey=gameLogCacheKey(player,year);
  const cached=gameLogCache.get(cacheKey);
  const modes=gameLogModesFor(player.position);
  let mode=gameLogModes.get(String(player.id))||defaultGameLogMode(player.position);
  if(!modes.some(x=>x.key===mode))mode=modes[0].key;
  const showYearSelect=opts.showYearSelect!==false;
  const yearSelect=showYearSelect?'<div class="espn-game-log-year-row"><span class="espn-game-log-year-label">Years</span><select class="espn-game-log-year-select" data-gl-year-select>'+
    years.map(y=>'<option value="'+y+'"'+(y===year?' selected':'')+'>'+y+'</option>').join('')+
    '</select></div>':'';
  const tabs='<div class="espn-game-log-tabs">'+modes.map(x=>'<button type="button" class="espn-game-log-tab'+(x.key===mode?' active':'')+'" data-gl-mode="'+x.key+'">'+x.label+'</button>').join('')+'</div>';
  const title='<div class="espn-game-log-title"><strong>'+player.name+' Game Log</strong><span>'+year+' · PPR</span></div>';
  if(!cached)return title+yearSelect+tabs+'<div class="espn-game-log-empty">Loading '+year+' game log…</div>';
  if(cached.error)return title+yearSelect+tabs+'<div class="espn-game-log-empty espn-error">Could not load '+year+' game log.</div>';
  if(!cached.rows.length)return title+yearSelect+tabs+'<div class="espn-game-log-empty">No game stats found for '+year+'.</div>';
  const cols=gameLogColumns(mode,player.position);
  return title+yearSelect+tabs+
    '<div class="espn-game-log-table-wrap"><table class="espn-game-log-table"><thead><tr><th>WK</th><th>OPP</th>'+
    cols.map(c=>'<th class="'+(c.key==='pts'?'gl-pts':'')+'">'+c.label+'</th>').join('')+
    '</tr></thead><tbody>'+
    cached.rows.map(g=>'<tr class="'+(!g.hasStats?'gl-unplayed':'')+'"><td>'+g.week+'</td><td>'+g.opponent+'</td>'+
      cols.map(c=>'<td class="'+(c.key==='pts'?'gl-pts':'gl-stat')+'">'+gameLogCell(g,c.key,mode,player.position)+'</td>').join('')+
    '</tr>').join('')+
    '</tbody></table></div>';
}
function bindGameLogModeButtons(panel,player,opts={}){
  panel.querySelectorAll('[data-gl-mode]').forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();e.stopPropagation();
      gameLogModes.set(String(player.id),btn.dataset.glMode);
      panel.innerHTML=gameLogHtml(player,opts);
      bindGameLogModeButtons(panel,player,opts);
    };
  });
  const select=panel.querySelector('[data-gl-year-select]');
  if(select){
    select.onchange=async e=>{
      const year=Number(e.target.value);
      gameLogYears.set(String(player.id),year);
      const nextOpts={...opts,year};
      panel.innerHTML=gameLogHtml(player,nextOpts);
      bindGameLogModeButtons(panel,player,nextOpts);
      try{
        await fetchGameLog(player,year);
      }catch(err){
        gameLogCache.set(gameLogCacheKey(player,year),{ts:Date.now(),rows:[],error:true});
      }
      if(gameLogYears.get(String(player.id))===year){
        panel.innerHTML=gameLogHtml(player,nextOpts);
        bindGameLogModeButtons(panel,player,nextOpts);
      }
    };
  }
}
async function toggleGameLog(id){
  const player=rows.find(p=>String(p.id)===String(id));
  if(!player)return;
  if(openGameLogId===String(id)){openGameLogId=null;render();return}
  openGameLogId=String(id);
  render();
  try{
    const year=gameLogYears.get(String(player.id))||SEASON;
    await fetchGameLog(player,year);
  }catch(e){
    const year=gameLogYears.get(String(player.id))||SEASON;
    gameLogCache.set(gameLogCacheKey(player,year),{ts:Date.now(),rows:[],error:true});
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
  if(window.openUnifiedPlayerProfileByName){
    window.openUnifiedPlayerProfileByName(player.name);
    return;
  }
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
  box.innerHTML=cfg.map(x=>`<button type="button" class="espn-stat-btn${x.key===activeStat?' active':''}" data-espn-stat="${x.key}">${displayStatLabel(x.key)}</button>`).join('');
  box.querySelectorAll('[data-espn-stat]').forEach(b=>{
    b.onclick=()=>{
      activeStat=b.dataset.espnStat;
      renderStatFilters();
      render();
    };
  });
  const head=document.getElementById('espnSelectedStatHead');
  if(head)head.textContent=displayStatLabel(activeStat);
  const pointsHead=document.getElementById('espnPointsHead');
  if(pointsHead)pointsHead.textContent=statView==='PERGAME'?'PPR/G':'PPR Pts';
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
  if(!statsRows.length){
    if(!loading)box.innerHTML='<div class="espn-status">No ESPN scoring data loaded.</div>';
    return;
  }
  const ranked=rankRows(statsRows,activeFilter);
  box.innerHTML=ranked.map((p,i)=>{
    return `<div class="espn-live-row">
      <div class="espn-rank">#${i+1}</div>
      <div class="espn-player">${playerHeadshot(p)}<div class="espn-player-copy"><button type="button" class="espn-name-btn" data-espn-open-player="${p.id}">${p.name}</button><div class="espn-player-meta">${teamLogo(p.team)}<span>${p.team}</span></div></div></div>
      <div class="espn-pos">${p.position}</div>
      <div class="espn-team">${p.team}</div>
      <div class="espn-points">${formatStat(p,'points')}</div>
      <div class="espn-selected-stat">${formatStat(p,activeStat)}</div>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-espn-open-player]').forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const player=statsRows.find(p=>String(p.id)===String(btn.dataset.espnOpenPlayer));
      if(player)openEspnPlayerProfile(player);
    };
  });
}
function setUpdatedLabel(message,error=false){
  const el=document.getElementById('espnLastUpdated');
  el.textContent=message;
  el.classList.toggle('espn-error',!!error);
}
function currentCacheKey(){return 'shuaEspnLivePprStats'}
function statsCacheKey(year){return 'shuaEspnStats:'+year}
function hydrateRowsFromCache(){
  if(rows.length)return true;
  try{
    const cached=JSON.parse(localStorage.getItem(currentCacheKey())||localStorage.getItem('shuaEspnLivePpr')||'null');
    if(cached?.rows?.length){
      rows=cached.rows;
      lastUpdated=new Date(cached.ts||Date.now());
      if(statsSeason===SEASON&&!statsRows.length){statsRows=[...rows];statsLastUpdated=lastUpdated}
      return true;
    }
  }catch(e){}
  return false;
}
async function ensureCurrentRows(){
  if(rows.length)return rows;
  if(hydrateRowsFromCache()){
    fetchEspn(SEASON).then(fresh=>{
      if(!fresh.length)return;
      rows=fresh;
      lastUpdated=new Date();
      try{localStorage.setItem(currentCacheKey(),JSON.stringify({ts:lastUpdated.getTime(),rows}))}catch(e){}
      if(statsSeason===SEASON){statsRows=[...rows];statsLastUpdated=lastUpdated;if(!section.hidden){render();updateStatsLabels()}}
    }).catch(()=>{});
    return rows;
  }
  const fresh=await fetchEspn(SEASON);
  rows=fresh;
  lastUpdated=new Date();
  try{localStorage.setItem(currentCacheKey(),JSON.stringify({ts:lastUpdated.getTime(),rows}))}catch(e){}
  return rows;
}
function hydrateStatsCache(year){
  try{
    const key=year===SEASON?currentCacheKey():statsCacheKey(year);
    const cached=JSON.parse(localStorage.getItem(key)||'null');
    if(cached?.rows?.length){
      statsRows=cached.rows;
      statsLastUpdated=new Date(cached.ts||Date.now());
      if(year===SEASON&&!rows.length){rows=[...cached.rows];lastUpdated=statsLastUpdated}
      return true;
    }
  }catch(e){}
  return false;
}
function updateStatsLabels(){
  const sub=document.getElementById('sub');
  const src=document.getElementById('espnLiveSource');
  const updated=document.getElementById('espnLastUpdated');
  const refreshBtn=document.getElementById('espnRefresh');
  if(sub)sub.textContent=statsSeason+' ESPN full-PPR scoring leaders — filter by position and rank by stat';
  if(src)src.textContent='ESPN '+statsSeason+' full-PPR stats · choose a position, then rank players by any relevant stat'+(statsSeason===SEASON?' · current season auto-refreshes every 60 seconds':'');
  if(updated){
    if(statsLastUpdated)updated.textContent=(statsSeason===SEASON?'Updated ':'Loaded ')+statsLastUpdated.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
    else updated.textContent='Not loaded yet';
    updated.classList.remove('espn-error');
  }
  if(refreshBtn)refreshBtn.textContent=statsSeason===SEASON?'Refresh':'Reload';
}
async function loadStatsSeason(year,{force=false}={}){
  year=Number(year)||SEASON;
  statsSeason=year;
  const select=document.getElementById('espnStatsYear');
  if(select&&Number(select.value)!==year)select.value=String(year);
  statsRows=[];
  statsLastUpdated=null;
  updateStatsLabels();

  if(!force&&hydrateStatsCache(year)){
    render();
    updateStatsLabels();
    if(year===SEASON){
      ensureCurrentRows().catch(()=>{});
    }
    return statsRows;
  }

  const box=document.getElementById('espnLiveRows');
  if(box)box.innerHTML='<div class="espn-status">Loading '+year+' ESPN stats…</div>';
  loading=true;
  const button=document.getElementById('espnRefresh');
  if(button){button.disabled=true;button.textContent='Loading…'}
  try{
    const fresh=year===SEASON?(force?await fetchEspn(SEASON):await ensureCurrentRows()):await fetchEspn(year);
    if(statsSeason!==year)return statsRows;
    statsRows=[...fresh];
    statsLastUpdated=new Date();
    if(year===SEASON){rows=[...fresh];lastUpdated=statsLastUpdated}
    try{
      localStorage.setItem(year===SEASON?currentCacheKey():statsCacheKey(year),JSON.stringify({ts:statsLastUpdated.getTime(),rows:statsRows}));
    }catch(e){}
    render();
    updateStatsLabels();
  }catch(err){
    if(statsSeason===year){
      if(!statsRows.length&&hydrateStatsCache(year)){
        render();
        updateStatsLabels();
        const el=document.getElementById('espnLastUpdated');if(el){el.textContent='Refresh failed · showing cached data';el.classList.add('espn-error')}
      }else if(!statsRows.length&&box){
        box.innerHTML='<div class="espn-status espn-error">Could not load '+year+' ESPN stats.</div>';
        const el=document.getElementById('espnLastUpdated');if(el){el.textContent='ESPN connection failed';el.classList.add('espn-error')}
      }
    }
  }finally{
    loading=false;
    if(button){button.disabled=false;button.textContent=statsSeason===SEASON?'Refresh':'Reload'}
  }
  return statsRows;
}
async function refresh(){
  return loadStatsSeason(statsSeason,{force:true});
}
function showEspn(){
  try{position='ESPN'}catch(e){}
  document.body.classList.remove('fantasy-home-mode','mobile-menu-open');
  document.querySelectorAll('.positions .pos').forEach(b=>b.classList.toggle('active',b.dataset.pos==='ESPN'));
  const tagged=document.getElementById('taggedControls');if(tagged)tagged.classList.remove('open');
  const ids=['teamControls','overallToggle','positionToggle','board','tableCard','mockSection','depthSection','tradeSection'];
  ids.forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true});
  section.hidden=false;
  document.getElementById('title').textContent='Stats';
  renderStatFilters();
  updateStatsLabels();
  if(!statsRows.length)loadStatsSeason(statsSeason);
  else render();
  if(timer)clearInterval(timer);
  timer=setInterval(()=>{if(!section.hidden&&statsSeason===SEASON)loadStatsSeason(SEASON,{force:true})},REFRESH_MS);
}
function hideEspn(){
  section.hidden=true;
  if(timer){clearInterval(timer);timer=null}
}

const button=document.createElement('button');
button.className='pos espn-live-btn';
button.dataset.pos='ESPN';
button.textContent='Stats';
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
document.querySelectorAll('[data-espn-view]').forEach(b=>{
  b.onclick=()=>{
    statView=b.dataset.espnView==='PERGAME'?'PERGAME':'TOTAL';
    document.querySelectorAll('[data-espn-view]').forEach(x=>x.classList.toggle('active',x===b));
    renderStatFilters();
    render();
  };
});
const statsYearSelect=document.getElementById('espnStatsYear');
if(statsYearSelect){
  const years=[];
  for(let y=SEASON;y>=2010;y--)years.push(y);
  statsYearSelect.innerHTML=years.map(y=>'<option value="'+y+'">'+y+'</option>').join('');
  statsYearSelect.value=String(statsSeason);
  statsYearSelect.onchange=e=>{
    activeStat='points';
    statView='TOTAL';
    document.querySelectorAll('[data-espn-view]').forEach(x=>x.classList.toggle('active',x.dataset.espnView==='TOTAL'));
    renderStatFilters();
    loadStatsSeason(Number(e.target.value));
    if(timer){clearInterval(timer);timer=null}
    if(Number(e.target.value)===SEASON)timer=setInterval(()=>{if(!section.hidden&&statsSeason===SEASON)loadStatsSeason(SEASON,{force:true})},REFRESH_MS);
  };
}
document.getElementById('espnRefresh').onclick=refresh;
document.getElementById('close')?.addEventListener('click',hideProfileGameLog);
document.getElementById('modal')?.addEventListener('click',e=>{if(e.target===document.getElementById('modal'))hideProfileGameLog()});

document.addEventListener('click',e=>{
  const navBtn=e.target.closest('.positions .pos');
  if(navBtn&&navBtn.dataset.pos!=='ESPN')hideEspn();
});

window.ShuaEspnLive={
  async ensureData(){
    return ensureCurrentRows();
  },
  getPlayerByName(name){
    return rows.find(p=>norm(p.name)===norm(name))||null;
  },
  getPositionRank(name){
    const p=rows.find(x=>norm(x.name)===norm(name));
    if(!p)return null;
    const ranked=rows.filter(x=>x.position===p.position)
      .sort((a,b)=>b.points-a.points||((b.average??-Infinity)-(a.average??-Infinity))||a.name.localeCompare(b.name));
    const i=ranked.findIndex(x=>String(x.id)===String(p.id));
    return i>=0?i+1:null;
  },
  async renderPlayerStats(name,target){
    if(!target)return;
    target.innerHTML='<div class="espn-game-log-empty">Loading ESPN data…</div>';
    try{
      await ensureCurrentRows();
      const p=rows.find(x=>norm(x.name)===norm(name));
      if(!p){target.innerHTML='<div class="espn-game-log-empty">No ESPN data found for this player.</div>';return}
      const posRows=rows.filter(x=>x.position===p.position).sort((a,b)=>b.points-a.points||((b.average??-Infinity)-(a.average??-Infinity)));
      const rank=posRows.findIndex(x=>String(x.id)===String(p.id))+1;
      const cfg=STAT_CONFIG[p.position]||STAT_CONFIG.ALL;
      target.innerHTML='<div class="unified-rank-grid">'+
        '<div class="unified-rank-card"><span>ESPN '+p.position+' Rank</span><b>#'+(rank||'—')+'</b></div>'+
        '<div class="unified-rank-card"><span>PPR Points</span><b>'+p.points.toFixed(1)+'</b></div>'+
        '<div class="unified-rank-card"><span>PPG</span><b>'+(p.average===null?'—':p.average.toFixed(1))+'</b></div>'+
      '</div><div class="unified-stat-grid">'+
        cfg.filter(x=>!['points','average'].includes(x.key)).map(x=>'<div class="unified-stat-item"><span>'+x.label+'</span><b>'+formatStat(p,x.key)+'</b></div>').join('')+
      '</div>';
    }catch(e){
      target.innerHTML='<div class="espn-game-log-empty espn-error">Could not load ESPN data right now.</div>';
    }
  },
  async renderGameLog(name,target){
    if(!target)return;
    target.innerHTML='<div class="espn-game-log-empty">Loading game log…</div>';
    try{
      await this.ensureData();
      const p=rows.find(x=>norm(x.name)===norm(name));
      if(!p){target.innerHTML='<div class="espn-game-log-empty">No ESPN game log found for this player.</div>';return}
      if(!gameLogYears.has(String(p.id)))gameLogYears.set(String(p.id),SEASON);
      const year=gameLogYears.get(String(p.id))||SEASON;
      await fetchGameLog(p,year);
      target.innerHTML=gameLogHtml(p);
      bindGameLogModeButtons(target,p);
      discoverGameLogYears(p).then(()=>{
        if(gameLogYears.get(String(p.id))===year){
          target.innerHTML=gameLogHtml(p);
          bindGameLogModeButtons(target,p);
        }
      }).catch(()=>{});
    }catch(e){
      target.innerHTML='<div class="espn-game-log-empty espn-error">Could not load this game log right now.</div>';
    }
  },
  async renderGameLogYear(name,year,target){
    if(!target)return;
    target.innerHTML='<div class="espn-game-log-empty">Loading '+year+' game log…</div>';
    try{
      await this.ensureData();
      const p=rows.find(x=>norm(x.name)===norm(name));
      if(!p){target.innerHTML='<div class="espn-game-log-empty">No ESPN game log found for this player.</div>';return}
      await fetchGameLog(p,Number(year));
      const opts={year:Number(year),showYearSelect:false};
      target.innerHTML=gameLogHtml(p,opts);
      bindGameLogModeButtons(target,p,opts);
    }catch(e){
      target.innerHTML='<div class="espn-game-log-empty espn-error">Could not load '+year+' game log right now.</div>';
    }
  }
};
hydrateRowsFromCache();
if(rows.length){statsRows=[...rows];statsLastUpdated=lastUpdated}
renderStatFilters();
})();