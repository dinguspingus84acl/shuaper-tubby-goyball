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

let rows=[];
let activeFilter='ALL';
let loading=false;
let timer=null;
let lastUpdated=null;

const style=document.createElement('style');
style.id='espnLiveStyles';
style.textContent=`
#espnLiveSection{margin-top:8px}
.espn-live-shell{display:grid;gap:8px}
.espn-live-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.espn-live-filters{display:flex;gap:6px;flex-wrap:wrap}
.espn-filter,.espn-refresh{border:1px solid var(--l);background:transparent;color:var(--m);border-radius:8px;padding:8px 11px;font-weight:900}
.espn-filter.active,.espn-refresh:active{background:#183d63!important;color:#fff!important}
.espn-live-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:var(--m);font-size:.68rem}
.espn-live-card{border:1px solid var(--l);border-radius:12px;overflow:hidden;background:#091c30e8}
.espn-live-head,.espn-live-row{display:grid;grid-template-columns:48px minmax(190px,1.7fr) 68px 72px 82px 78px;gap:8px;align-items:center}
.espn-live-head{padding:8px 10px;color:var(--m);font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em;background:#07182a}
.espn-live-row{padding:8px 10px;border-top:1px solid #ffffff12;min-height:48px}
.espn-rank{color:var(--r);font-weight:950}
.espn-player{display:flex;align-items:center;gap:7px;min-width:0}
.espn-player-name{font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.espn-team-logo{width:22px;height:22px;object-fit:contain;flex:0 0 22px}
.espn-pos{font-weight:900}
.espn-points,.espn-avg{text-align:right;font-weight:900}
.espn-team{color:var(--m);font-size:.68rem}
.espn-status{padding:18px;text-align:center;color:var(--m)}
.espn-error{color:#ff8b9d}
.espn-live-source{font-size:.62rem;color:#73879e}
@media(max-width:700px){
  .espn-live-head,.espn-live-row{grid-template-columns:38px minmax(0,1fr) 48px 64px}
  .espn-live-head>*:nth-child(4),.espn-live-row>*:nth-child(4){display:none}
  .espn-live-head>*:nth-child(6),.espn-live-row>*:nth-child(6){display:none}
  .espn-live-row{padding:7px 8px}
  .espn-player-name{font-size:.72rem}
  .espn-points{font-size:.72rem}
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
    <div class="espn-live-source">ESPN 2026 full-PPR actual fantasy points · auto-refreshes every 60 seconds while this tab is open</div>
    <div class="espn-live-card">
      <div class="espn-live-head">
        <div>Rank</div><div>Player</div><div>Pos</div><div>Team</div><div style="text-align:right">PPR Pts</div><div style="text-align:right">PPG</div>
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
    points:total,
    average:Number.isFinite(avg)?avg:null
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
function rankRows(list,filter){
  const filtered=filter==='ALL'?list:list.filter(p=>p.position===filter);
  return [...filtered].sort((a,b)=>b.points-a.points||((b.average??-Infinity)-(a.average??-Infinity))||a.name.localeCompare(b.name));
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
    const id=localPlayerId(p.name);
    return `<div class="espn-live-row"${id?` data-espn-player-id="${id}"`:''}>
      <div class="espn-rank">#${i+1}</div>
      <div class="espn-player">${teamLogo(p.team)}<div class="espn-player-name">${p.name}</div></div>
      <div class="espn-pos">${p.position}</div>
      <div class="espn-team">${p.team}</div>
      <div class="espn-points">${p.points.toFixed(1)}</div>
      <div class="espn-avg">${p.average===null?'—':p.average.toFixed(1)}</div>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-espn-player-id]').forEach(el=>{
    el.style.cursor='pointer';
    el.onclick=()=>{try{profile(el.dataset.espnPlayerId)}catch(e){}};
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
  if(!rows.length)document.getElementById('espnLiveRows').innerHTML='<div class="espn-status">Loading ESPN PPR rankings…</div>';
  try{
    const fresh=await fetchEspn();
    rows=fresh;
    lastUpdated=new Date();
    try{localStorage.setItem('shuaEspnLivePpr',JSON.stringify({ts:lastUpdated.getTime(),rows}))}catch(e){}
    render();
    setUpdatedLabel('Updated '+lastUpdated.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}));
  }catch(err){
    if(!rows.length){
      try{
        const cached=JSON.parse(localStorage.getItem('shuaEspnLivePpr')||'null');
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
  document.getElementById('sub').textContent='2026 scoring leaders — actual full-PPR points';
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
    document.querySelectorAll('[data-espn-filter]').forEach(x=>x.classList.toggle('active',x===b));
    render();
  };
});
document.getElementById('espnRefresh').onclick=refresh;

document.addEventListener('click',e=>{
  const navBtn=e.target.closest('.positions .pos');
  if(navBtn&&navBtn.dataset.pos!=='ESPN')hideEspn();
});

})();