(()=>{
'use strict';

const CURRENT_SEASON=2026;
const PPR_PRESET_ID=3;
const MIN_SEASON=2010;
const POSITION_BY_ID={1:'QB',2:'RB',3:'WR',4:'TE'};
const SLOT_BY_POSITION={QB:0,RB:2,WR:4,TE:6};
const boardCache=new Map();
const careerCache=new Map();
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');

const style=document.createElement('style');
style.id='playerHistoryStyles';
style.textContent=
'.player-history-card{border:1px solid #ffffff16;border-radius:10px;overflow:hidden;background:#07182a}'+
'.player-history-head,.player-history-row{display:grid;grid-template-columns:82px 1fr 100px;gap:10px;align-items:center;padding:10px 12px}'+
'.player-history-head{color:#7f93aa;font-size:.58rem;font-weight:950;text-transform:uppercase;letter-spacing:.06em;background:#061522}'+
'.player-history-row{border-top:1px solid #ffffff10;min-height:48px}'+
'.player-history-year{font-weight:950}'+
'.player-history-finish{font-weight:950;font-size:.95rem}'+
'.player-history-points{text-align:right;color:#b8c7d6;font-weight:800}'+
'.player-history-note{padding:10px 12px;color:#7f93aa;font-size:.58rem;line-height:1.45;border-top:1px solid #ffffff10}'+
'.player-history-empty{padding:14px 4px;color:#7f93aa;font-size:.66rem}'+
'.player-history-error{color:#ff8b9d}'+
'@media(max-width:520px){.player-history-head,.player-history-row{grid-template-columns:64px 1fr 82px;padding:9px 8px;gap:6px}.player-history-points{font-size:.68rem}}';
document.head.appendChild(style);

function statSource(s){return Number(s?.statSourceId ?? s?.statTypeId ?? -1)}
function splitType(s){return Number(s?.statSplitTypeId ?? (Number(s?.scoringPeriodId||0)===0?0:1))}
function deepPlayer(entry){return entry?.player || entry?.playerPoolEntry?.player || entry?.playerPoolEntry || entry}
function deepStats(entry){
  const p=deepPlayer(entry);
  return p?.stats || entry?.playerPoolEntry?.stats || entry?.stats || [];
}
function seasonStat(stats,year){
  const list=Array.isArray(stats)?stats:[];
  return list.find(s=>Number(s?.seasonId)===year&&statSource(s)===0&&splitType(s)===0) ||
    list.find(s=>Number(s?.seasonId)===year&&statSource(s)===0&&Number(s?.scoringPeriodId||0)===0) || null;
}
function parseEntry(entry,year){
  const p=deepPlayer(entry);
  if(!p)return null;
  const position=POSITION_BY_ID[Number(p.defaultPositionId)];
  if(!position)return null;
  const season=seasonStat(deepStats(entry),year);
  const points=Number(season?.appliedTotal ?? entry?.appliedStatTotal ?? entry?.playerPoolEntry?.appliedStatTotal);
  if(!Number.isFinite(points))return null;
  const name=p.fullName || p.displayName || p.name;
  const id=String(p.id ?? entry?.id ?? '');
  if(!name||!id)return null;
  return {id,name,position,points};
}
function filterFor(year,position){
  return JSON.stringify({players:{
    filterSlotIds:{value:[SLOT_BY_POSITION[position]]},
    filterStatsForSourceIds:{value:[0]},
    filterStatsForSplitTypeIds:{value:[0]},
    sortAppliedStatTotal:{sortAsc:false,sortPriority:1,value:'00'+year},
    sortPercOwned:{sortPriority:2,sortAsc:false},
    limit:300,
    offset:0,
    filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['00'+year]}
  }});
}
async function fetchPositionBoard(year,position){
  const key=year+':'+position;
  if(boardCache.has(key))return boardCache.get(key);
  const promise=(async()=>{
    const path='/apis/v3/games/ffl/seasons/'+year+'/segments/0/leaguedefaults/'+PPR_PRESET_ID+'?scoringPeriodId=0&view=kona_player_info';
    const urls=[
      'https://lm-api-reads.fantasy.espn.com'+path,
      'https://fantasy.espn.com'+path
    ];
    let lastError=null;
    for(const url of urls){
      try{
        const res=await fetch(url,{cache:'force-cache',mode:'cors',headers:{
          'Accept':'application/json',
          'X-Fantasy-Filter':filterFor(year,position),
          'X-Fantasy-Source':'kona'
        }});
        if(!res.ok)throw new Error('ESPN returned '+res.status);
        const data=await res.json();
        const list=Array.isArray(data)?data:(data.players||[]);
        const parsed=list.map(x=>parseEntry(x,year)).filter(Boolean).filter(x=>x.position===position&&(x.points!==0));
        parsed.sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
        if(!parsed.length)throw new Error('No '+position+' data for '+year);
        return parsed;
      }catch(e){lastError=e}
    }
    throw lastError||new Error('ESPN history request failed');
  })();
  boardCache.set(key,promise);
  try{return await promise}catch(e){boardCache.delete(key);throw e}
}
async function firstCareerYear(player){
  const key=String(player.id);
  if(careerCache.has(key))return careerCache.get(key);
  let first=null;
  const exp=Math.max(0,Number(player.experienceYears)||0);
  if(exp>0)first=Math.max(MIN_SEASON,CURRENT_SEASON-exp);
  try{
    const r=await fetch('https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/'+player.id,{cache:'force-cache',mode:'cors'});
    if(r.ok){
      const d=await r.json();
      const a=d?.athlete||d;
      const debut=Number(a?.debutYear||a?.debut?.year||0);
      const draft=Number(a?.draft?.year||a?.draftYear||0);
      const yearsExp=Number(a?.experience?.years||a?.experience||0);
      if(debut)first=debut;
      else if(draft)first=draft;
      else if(yearsExp>0)first=Math.max(MIN_SEASON,CURRENT_SEASON-yearsExp);
    }
  }catch(e){}
  first=Math.max(MIN_SEASON,Math.min(CURRENT_SEASON-1,first||CURRENT_SEASON-1));
  careerCache.set(key,first);
  return first;
}
async function findSeasonFinish(player,year){
  const preferred=player.position;
  const order=[preferred].concat(Object.keys(SLOT_BY_POSITION).filter(x=>x!==preferred));
  for(const position of order){
    try{
      const board=await fetchPositionBoard(year,position);
      const i=board.findIndex(x=>String(x.id)===String(player.id));
      if(i>=0)return {year,position,rank:i+1,points:board[i].points};
    }catch(e){}
  }
  return {year,position:preferred,rank:null,points:null};
}
function readPlayerCache(player){
  try{
    const data=JSON.parse(localStorage.getItem('shuaEspnFinishHistory:'+player.id)||'null');
    if(!data||data.version!==1||!Array.isArray(data.rows))return null;
    if(Number(data.latestCompleted)!==CURRENT_SEASON-1)return null;
    return data.rows;
  }catch(e){return null}
}
function savePlayerCache(player,rows){
  try{
    localStorage.setItem('shuaEspnFinishHistory:'+player.id,JSON.stringify({
      version:1,
      latestCompleted:CURRENT_SEASON-1,
      rows
    }));
  }catch(e){}
}
async function mapLimited(items,limit,fn){
  const out=new Array(items.length);
  let next=0;
  async function worker(){
    while(true){
      const i=next++;
      if(i>=items.length)return;
      out[i]=await fn(items[i],i);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
  return out;
}
function renderRows(player,rows,target){
  const good=rows.filter(Boolean).sort((a,b)=>b.year-a.year);
  if(!good.length){
    target.innerHTML='<div class="player-history-empty">No completed ESPN seasons found for this player.</div>';
    return;
  }
  target.innerHTML=
    '<div class="player-history-card">'+
      '<div class="player-history-head"><div>Year</div><div>ESPN Finish</div><div style="text-align:right">PPR Pts</div></div>'+
      good.map(r=>
        '<div class="player-history-row">'+
          '<div class="player-history-year">'+r.year+'</div>'+
          '<div class="player-history-finish">'+(r.rank?('#'+r.rank+' '+r.position):'—')+'</div>'+
          '<div class="player-history-points">'+(Number.isFinite(Number(r.points))?Number(r.points).toFixed(1):'—')+'</div>'+
        '</div>'
      ).join('')+
      '<div class="player-history-note">ESPN full-PPR season totals. Finish is the player’s final positional rank by PPR points for that completed season.</div>'+
    '</div>';
}
async function render(name,target){
  if(!target)return;
  target.innerHTML='<div class="player-history-empty">Loading ESPN career finishes…</div>';
  try{
    if(!window.ShuaEspnLive?.ensureData)throw new Error('ESPN data module unavailable');
    await window.ShuaEspnLive.ensureData();
    const player=window.ShuaEspnLive.getPlayerByName?.(name);
    if(!player){
      target.innerHTML='<div class="player-history-empty">No ESPN player match found.</div>';
      return;
    }
    const cached=readPlayerCache(player);
    if(cached){
      renderRows(player,cached,target);
      return;
    }
    const first=await firstCareerYear(player);
    const years=[];
    for(let y=CURRENT_SEASON-1;y>=first;y--)years.push(y);
    const rows=await mapLimited(years,3,y=>findSeasonFinish(player,y));
    savePlayerCache(player,rows);
    renderRows(player,rows,target);
  }catch(e){
    target.innerHTML='<div class="player-history-empty player-history-error">Could not load ESPN history right now.</div>';
  }
}

window.ShuaPlayerHistory={render};
})();