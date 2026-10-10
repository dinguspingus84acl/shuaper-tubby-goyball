(()=>{
'use strict';

const CURRENT_SEASON=2026;
const LATEST_COMPLETED=CURRENT_SEASON-1;
const MIN_SEASON=2000;
const PRIMARY_DEFAULT_ID=3;
const FALLBACK_DEFAULT_IDS=[1,4];
const POSITION_BY_ID={1:'QB',2:'RB',3:'WR',4:'TE'};
const SLOT_IDS=[0,2,4,6];
const identityCache=new Map();
const playerSeasonCache=new Map();
const seasonBoardCache=new Map();
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
function rawStat(season,id){
  const v=season?.stats?.[id] ?? season?.stats?.[String(id)] ?? 0;
  const n=Number(v);
  return Number.isFinite(n)?n:0;
}
function computedPpr(season){
  if(!season)return null;
  const specializedTwoPt=rawStat(season,19)+rawStat(season,26)+rawStat(season,44);
  const genericTwoPt=specializedTwoPt===0?rawStat(season,62):0;
  return rawStat(season,3)*0.04+
    rawStat(season,4)*4-
    rawStat(season,20)*2+
    rawStat(season,24)*0.1+
    rawStat(season,25)*6+
    rawStat(season,42)*0.1+
    rawStat(season,43)*6+
    rawStat(season,53)+
    (specializedTwoPt+genericTwoPt)*2-
    rawStat(season,72)*2;
}
function hasPlayedSeason(season){
  if(!season)return false;
  if(Number.isFinite(Number(season.appliedTotal))&&Number(season.appliedTotal)!==0)return true;
  const stats=season.stats||{};
  return Object.values(stats).some(v=>Number(v)!==0);
}
function toSeasonRow(entry,year){
  const p=deepPlayer(entry);
  if(!p)return null;
  const position=POSITION_BY_ID[Number(p.defaultPositionId)];
  const name=p.fullName || p.displayName || p.name;
  const id=String(p.id ?? entry?.id ?? '');
  const season=seasonStat(deepStats(entry),year);
  if(!position||!name||!id||!hasPlayedSeason(season))return null;
  const applied=Number(season?.appliedTotal);
  const points=Number.isFinite(applied)?applied:computedPpr(season);
  return {id,name,position,points:Number.isFinite(Number(points))?Number(points):0};
}
function identityFromEntry(entry){
  const p=deepPlayer(entry);
  if(!p)return null;
  const position=POSITION_BY_ID[Number(p.defaultPositionId)];
  const name=p.fullName || p.displayName || p.name;
  const id=String(p.id ?? entry?.id ?? '');
  if(!position||!name||!id)return null;
  return {id,name,position};
}
function playerFilter(playerId,year){
  return JSON.stringify({players:{
    filterIds:{value:[Number(playerId)]},
    filterStatsForSourceIds:{value:[0]},
    filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['00'+year]},
    limit:10,
    offset:0
  }});
}
function universeFilter(){
  return JSON.stringify({players:{
    filterSlotIds:{value:SLOT_IDS},
    sortPercOwned:{sortPriority:1,sortAsc:false},
    limit:3000,
    offset:0
  }});
}
function boardFilter(year){
  return JSON.stringify({players:{
    filterSlotIds:{value:SLOT_IDS},
    filterStatsForSourceIds:{value:[0]},
    filterStatsForSplitTypeIds:{value:[0]},
    sortAppliedStatTotal:{sortAsc:false,sortPriority:1,value:'00'+year},
    sortPercOwned:{sortPriority:2,sortAsc:false},
    limit:3000,
    offset:0,
    filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['00'+year]}
  }});
}
function rawBoardFilter(year){
  return JSON.stringify({players:{
    filterSlotIds:{value:SLOT_IDS},
    filterStatsForSourceIds:{value:[0]},
    filterStatsForSplitTypeIds:{value:[0]},
    sortPercOwned:{sortPriority:1,sortAsc:false},
    limit:3000,
    offset:0,
    filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['00'+year]}
  }});
}
async function fetchList(url,filter){
  const res=await fetch(url,{cache:'no-store',mode:'cors',headers:{
    'Accept':'application/json',
    'X-Fantasy-Filter':filter,
    'X-Fantasy-Source':'kona'
  }});
  if(!res.ok)throw new Error('ESPN returned '+res.status);
  const data=await res.json();
  return Array.isArray(data)?data:(data.players||[]);
}
async function tryUrls(urls,filter,accept){
  let lastError=null;
  for(const url of urls){
    try{
      const list=await fetchList(url,filter);
      if(!accept||accept(list))return list;
    }catch(e){lastError=e}
  }
  if(lastError)throw lastError;
  return [];
}
function defaultIds(){return [PRIMARY_DEFAULT_ID,...FALLBACK_DEFAULT_IDS]}
function defaultUrls(year,view='kona_player_info',scoringPeriodId=0){
  const urls=[];
  for(const id of defaultIds()){
    for(const host of ['https://lm-api-reads.fantasy.espn.com','https://fantasy.espn.com']){
      urls.push(host+'/apis/v3/games/ffl/seasons/'+year+'/segments/0/leaguedefaults/'+id+'?scoringPeriodId='+scoringPeriodId+'&view='+view);
    }
  }
  return urls;
}
function publicPlayerUrls(year,view='kona_player_info'){
  return [
    'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/'+year+'/players?scoringPeriodId=0&view='+view,
    'https://fantasy.espn.com/apis/v3/games/ffl/seasons/'+year+'/players?scoringPeriodId=0&view='+view
  ];
}
async function resolvePlayer(name){
  const key=norm(name);
  if(identityCache.has(key))return identityCache.get(key);

  try{
    if(window.ShuaEspnLive?.ensureData){
      await window.ShuaEspnLive.ensureData();
      const live=window.ShuaEspnLive.getPlayerByName?.(name);
      if(live?.id){
        const p={id:String(live.id),name:live.name,position:live.position};
        identityCache.set(key,p);
        return p;
      }
    }
  }catch(e){}

  const aliases={kennethwalkeriii:'kennethwalker',kennethwalker:'kennethwalkeriii'};
  const accept=list=>list.some(x=>{
    const p=identityFromEntry(x);
    if(!p)return false;
    const pn=norm(p.name);
    return pn===key||pn===aliases[key]||aliases[pn]===key;
  });
  const urls=[...publicPlayerUrls(CURRENT_SEASON),...defaultUrls(CURRENT_SEASON)];
  const list=await tryUrls(urls,universeFilter(),accept);
  const found=list.map(identityFromEntry).filter(Boolean).find(p=>{
    const pn=norm(p.name);
    return pn===key||pn===aliases[key]||aliases[pn]===key;
  })||null;
  if(found)identityCache.set(key,found);
  return found;
}
async function fetchPlayerSeason(player,year){
  const cacheKey=String(player.id)+':'+year;
  if(playerSeasonCache.has(cacheKey))return playerSeasonCache.get(cacheKey);
  const promise=(async()=>{
    const filter=playerFilter(player.id,year);
    const urls=[...publicPlayerUrls(year,'kona_player_info'),...defaultUrls(year,'kona_playercard'),...defaultUrls(year,'kona_player_info')];
    for(const url of urls){
      try{
        const list=await fetchList(url,filter);
        const entry=list.find(x=>String(deepPlayer(x)?.id ?? x?.id ?? '')===String(player.id))||list[0];
        const row=entry?toSeasonRow(entry,year):null;
        if(row)return row;
      }catch(e){}
    }
    return null;
  })();
  playerSeasonCache.set(cacheKey,promise);
  return promise;
}
async function fetchAppliedBoard(year){
  const urls=defaultUrls(year,'kona_player_info');
  for(const url of urls){
    try{
      const list=await fetchList(url,boardFilter(year));
      const rows=list.map(x=>toSeasonRow(x,year)).filter(Boolean);
      if(rows.length>=20)return rows;
    }catch(e){}
  }
  return null;
}
async function fetchComputedBoard(year){
  const urls=publicPlayerUrls(year,'kona_player_info');
  for(const url of urls){
    try{
      const list=await fetchList(url,rawBoardFilter(year));
      const rows=list.map(x=>toSeasonRow(x,year)).filter(Boolean);
      if(rows.length>=20)return rows;
    }catch(e){}
  }
  return null;
}
async function fetchSeasonBoard(year){
  if(seasonBoardCache.has(year))return seasonBoardCache.get(year);
  const promise=(async()=>{
    const applied=await fetchAppliedBoard(year);
    if(applied?.length)return applied;
    const computed=await fetchComputedBoard(year);
    if(computed?.length)return computed;
    throw new Error('No ESPN season board for '+year);
  })();
  seasonBoardCache.set(year,promise);
  try{return await promise}catch(e){seasonBoardCache.delete(year);throw e}
}
async function discoverPlayedSeasons(player){
  const years=[];
  for(let y=LATEST_COMPLETED;y>=MIN_SEASON;y--)years.push(y);
  const results=await mapLimited(years,4,async year=>{
    const row=await fetchPlayerSeason(player,year);
    return row?{year,row}:null;
  });
  return results.filter(Boolean);
}
async function rankSeason(playerSeason){
  const {year,row}=playerSeason;
  try{
    const board=await fetchSeasonBoard(year);
    const posRows=board.filter(x=>x.position===row.position)
      .sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
    let i=posRows.findIndex(x=>String(x.id)===String(row.id));
    if(i<0){
      const n=norm(row.name);
      i=posRows.findIndex(x=>norm(x.name)===n);
    }
    if(i>=0)return {year,position:row.position,rank:i+1,points:row.points};
  }catch(e){}

  try{
    const board=await fetchComputedBoard(year);
    if(board?.length){
      const posRows=board.filter(x=>x.position===row.position)
        .sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
      let i=posRows.findIndex(x=>String(x.id)===String(row.id));
      if(i<0){
        const n=norm(row.name);
        i=posRows.findIndex(x=>norm(x.name)===n);
      }
      if(i>=0)return {year,position:row.position,rank:i+1,points:row.points};
    }
  }catch(e){}
  return {year,position:row.position,rank:null,points:row.points};
}
function readPlayerCache(player){
  try{
    const data=JSON.parse(localStorage.getItem('shuaEspnFinishHistory:'+player.id)||'null');
    if(!data||data.version!==3||!Array.isArray(data.rows))return null;
    if(Number(data.latestCompleted)!==LATEST_COMPLETED)return null;
    return data.rows;
  }catch(e){return null}
}
function savePlayerCache(player,rows){
  try{
    localStorage.setItem('shuaEspnFinishHistory:'+player.id,JSON.stringify({
      version:3,
      latestCompleted:LATEST_COMPLETED,
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
      try{out[i]=await fn(items[i],i)}catch(e){out[i]=null}
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
  return out;
}
function renderRows(rows,target){
  const good=rows.filter(Boolean).sort((a,b)=>b.year-a.year);
  if(!good.length){
    target.innerHTML='<div class="player-history-empty">No completed ESPN fantasy seasons found for this player.</div>';
    return;
  }
  target.innerHTML=
    '<div class="player-history-card">'+
      '<div class="player-history-head"><div>Year</div><div>ESPN Finish</div><div style="text-align:right">PPR Pts</div></div>'+
      good.map(r=>
        '<div class="player-history-row">'+
          '<div class="player-history-year">'+r.year+'</div>'+
          '<div class="player-history-finish">'+(r.rank?('#'+r.rank+' '+r.position):('Rank unavailable'))+'</div>'+
          '<div class="player-history-points">'+(Number.isFinite(Number(r.points))?Number(r.points).toFixed(1):'—')+'</div>'+
        '</div>'
      ).join('')+
      '<div class="player-history-note">Completed ESPN fantasy seasons only. Finish is positional rank by full-PPR season points. Historical rows are detected from the player’s actual ESPN season stats, not estimated from experience metadata.</div>'+
    '</div>';
}
async function render(name,target){
  if(!target)return;
  target.innerHTML='<div class="player-history-empty">Loading ESPN career finishes…</div>';
  try{
    const player=await resolvePlayer(name);
    if(!player){
      target.innerHTML='<div class="player-history-empty player-history-error">Could not match this player to ESPN.</div>';
      return;
    }
    const cached=readPlayerCache(player);
    if(cached){
      renderRows(cached,target);
      return;
    }
    const played=await discoverPlayedSeasons(player);
    if(!played.length){
      target.innerHTML='<div class="player-history-empty">No completed ESPN fantasy seasons found for this player.</div>';
      return;
    }
    const rows=await mapLimited(played,2,x=>rankSeason(x));
    const good=rows.filter(Boolean);
    if(good.length&&good.every(r=>r.rank))savePlayerCache(player,good);
    renderRows(good,target);
  }catch(e){
    target.innerHTML='<div class="player-history-empty player-history-error">Could not load ESPN history right now.</div>';
  }
}

window.ShuaPlayerHistory={render};
})();