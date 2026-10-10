(()=>{
'use strict';

const CURRENT_SEASON=2026;
const LATEST_COMPLETED=CURRENT_SEASON-1;
const MIN_SEASON=2000;
const PRIMARY_DEFAULT_ID=3;
const FALLBACK_DEFAULT_IDS=[1,4];
const POSITION_BY_ID={1:'QB',2:'RB',3:'WR',4:'TE'};
const SLOT_BY_POSITION={QB:0,RB:2,WR:4,TE:6};
const TEAM_BY_ID={0:{abbr:'FA',name:'Free Agent'},1:{abbr:'ATL',name:'Falcons'},2:{abbr:'BUF',name:'Bills'},3:{abbr:'CHI',name:'Bears'},4:{abbr:'CIN',name:'Bengals'},5:{abbr:'CLE',name:'Browns'},6:{abbr:'DAL',name:'Cowboys'},7:{abbr:'DEN',name:'Broncos'},8:{abbr:'DET',name:'Lions'},9:{abbr:'GB',name:'Packers'},10:{abbr:'TEN',name:'Titans'},11:{abbr:'IND',name:'Colts'},12:{abbr:'KC',name:'Chiefs'},13:{abbr:'LV',name:'Raiders'},14:{abbr:'LAR',name:'Rams'},15:{abbr:'MIA',name:'Dolphins'},16:{abbr:'MIN',name:'Vikings'},17:{abbr:'NE',name:'Patriots'},18:{abbr:'NO',name:'Saints'},19:{abbr:'NYG',name:'Giants'},20:{abbr:'NYJ',name:'Jets'},21:{abbr:'PHI',name:'Eagles'},22:{abbr:'ARI',name:'Cardinals'},23:{abbr:'PIT',name:'Steelers'},24:{abbr:'LAC',name:'Chargers'},25:{abbr:'SF',name:'49ers'},26:{abbr:'SEA',name:'Seahawks'},27:{abbr:'TB',name:'Buccaneers'},28:{abbr:'WAS',name:'Commanders'},29:{abbr:'CAR',name:'Panthers'},30:{abbr:'JAX',name:'Jaguars'},33:{abbr:'BAL',name:'Ravens'},34:{abbr:'HOU',name:'Texans'}};
const SLOT_IDS=[0,2,4,6];
const TEAM_SLUGS={ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KC:'kc',LAC:'lac',LAR:'lar',LV:'lv',MIA:'mia',MIN:'min',NE:'ne',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SF:'sf',TB:'tb',TEN:'ten',WAS:'wsh'};
const identityCache=new Map();
const playerSeasonCache=new Map();
const seasonBoardCache=new Map();
const playerWeekCache=new Map();
const weekBoardCache=new Map();
const snapSeasonCache=new Map();
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');

const style=document.createElement('style');
style.id='playerHistoryStyles';
style.textContent=
'.player-history-card{border:1px solid #ffffff16;border-radius:10px;overflow:hidden;background:#07182a}'+
'.player-history-head,.player-history-row{display:grid;grid-template-columns:70px minmax(118px,1.35fr) 58px 48px 68px 86px;gap:8px;align-items:center;padding:10px 12px}'+
'.player-history-head{color:#7f93aa;font-size:.58rem;font-weight:950;text-transform:uppercase;letter-spacing:.06em;background:#061522}'+
'.player-history-row{border-top:1px solid #ffffff10;min-height:48px;cursor:pointer;transition:background .12s ease}.player-history-row:hover,.player-history-row.open{background:#0b2139}'+
'.player-history-year{font-weight:950}'+
'.player-history-team{display:flex;align-items:center;gap:7px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.player-history-team-logo{width:22px;height:22px;object-fit:contain;flex:0 0 22px}.player-history-team .abbr{display:none}.player-history-finish{font-weight:950;font-size:.95rem}.player-history-games{text-align:center;font-weight:950;color:#fff}.player-history-ppg,.player-history-points{text-align:right;color:#fff;font-weight:950}.player-history-year{display:flex;align-items:center;gap:6px}.player-history-chevron{display:inline-block;color:#7f93aa;transition:transform .14s ease}.player-history-row.open .player-history-chevron{transform:rotate(90deg)}'+

'.player-history-detail{display:none;border-top:1px solid #ffffff12;background:#061522;padding:12px}.player-history-detail.open{display:block}.player-history-detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.player-history-detail-stat{border:1px solid #ffffff12;background:#07182a;border-radius:8px;padding:9px}.player-history-detail-stat span{display:block;color:#7f93aa;font-size:.56rem;font-weight:850;text-transform:uppercase;letter-spacing:.04em}.player-history-detail-stat b{display:block;color:#fff;font-size:.9rem;margin-top:3px}.player-history-detail-loading{color:#7f93aa;font-size:.62rem;padding:4px}.player-history-note{padding:10px 12px;color:#7f93aa;font-size:.58rem;line-height:1.45;border-top:1px solid #ffffff10}'+
'.player-history-empty{padding:14px 4px;color:#7f93aa;font-size:.66rem}'+
'.player-history-error{color:#ff8b9d}'+
'@media(max-width:620px){.player-history-head,.player-history-row{grid-template-columns:46px 58px 40px 32px 48px 58px;padding:9px 6px;gap:3px}.player-history-team{gap:4px}.player-history-team-logo{width:18px;height:18px;flex-basis:18px}.player-history-team .full{display:none}.player-history-team .abbr{display:inline}.player-history-head{font-size:.48rem}.player-history-finish{font-size:.75rem}.player-history-games,.player-history-ppg,.player-history-points{font-size:.63rem;font-weight:950;color:#fff}.player-history-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}';
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
  const teamId=Number(p.proTeamId)||0;
  const teamInfo=TEAM_BY_ID[teamId]||{abbr:'—',name:'—'};
  const directGames=rawStat(season,210);
  const avg=Number(season?.appliedAverage);
  const pointValue=Number.isFinite(Number(points))?Number(points):0;
  const games=directGames>0?Math.round(directGames):((Number.isFinite(avg)&&avg>0&&pointValue>0)?Math.max(1,Math.round(pointValue/avg)):null);
  const ppg=(Number.isFinite(avg)&&avg>0)?avg:((games&&pointValue)?pointValue/games:null);
  return {id,name,position,teamId,team:teamInfo.name,teamAbbr:teamInfo.abbr,games,ppg:Number.isFinite(Number(ppg))?Number(ppg):null,points:pointValue};
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
function publicPlayerUrls(year,view='kona_player_info',scoringPeriodId=0){
  return [
    'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/'+year+'/players?scoringPeriodId='+scoringPeriodId+'&view='+view,
    'https://fantasy.espn.com/apis/v3/games/ffl/seasons/'+year+'/players?scoringPeriodId='+scoringPeriodId+'&view='+view
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
        let entry=list.find(x=>String(deepPlayer(x)?.id ?? x?.id ?? '')===String(player.id))||null;
        if(!entry){
          const wanted=norm(player.name);
          entry=list.find(x=>{
            const p=deepPlayer(x);
            const n=norm(p?.fullName||p?.displayName||p?.name);
            const pos=POSITION_BY_ID[Number(p?.defaultPositionId)];
            return n===wanted&&(!player.position||pos===player.position);
          })||null;
        }
        const row=entry?toSeasonRow(entry,year):null;
        if(row){
          if(player.position&&row.position!==player.position)continue;
          return {...row,position:player.position||row.position};
        }
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
  const targetPosition=row.position;
  try{
    const board=await fetchSeasonBoard(year);
    const posRows=board.filter(x=>x.position===targetPosition)
      .sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
    let i=posRows.findIndex(x=>String(x.id)===String(row.id));
    if(i<0){
      const n=norm(row.name);
      i=posRows.findIndex(x=>norm(x.name)===n);
    }
    if(i>=0)return {year,id:row.id,name:row.name,position:targetPosition,rank:i+1,teamId:row.teamId,team:row.team,teamAbbr:row.teamAbbr,games:row.games,ppg:row.ppg,points:row.points};
  }catch(e){}

  try{
    const board=await fetchComputedBoard(year);
    if(board?.length){
      const posRows=board.filter(x=>x.position===targetPosition)
        .sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
      let i=posRows.findIndex(x=>String(x.id)===String(row.id));
      if(i<0){
        const n=norm(row.name);
        i=posRows.findIndex(x=>norm(x.name)===n);
      }
      if(i>=0)return {year,id:row.id,name:row.name,position:targetPosition,rank:i+1,teamId:row.teamId,team:row.team,teamAbbr:row.teamAbbr,games:row.games,ppg:row.ppg,points:row.points};
    }
  }catch(e){}
  return {year,id:row.id,name:row.name,position:targetPosition,rank:null,teamId:row.teamId,team:row.team,teamAbbr:row.teamAbbr,games:row.games,ppg:row.ppg,points:row.points};
}

function weekStat(stats,year,week){
  const list=Array.isArray(stats)?stats:[];
  return list.find(s=>Number(s?.seasonId)===year&&statSource(s)===0&&Number(s?.scoringPeriodId||0)===week)||null;
}
function weekPoints(entry,year,week){
  const s=weekStat(deepStats(entry),year,week);
  if(!s)return null;
  const applied=Number(s?.appliedTotal);
  if(Number.isFinite(applied))return applied;
  const p=computedPpr(s);
  return Number.isFinite(Number(p))?Number(p):null;
}
function weeklyPositionFilter(year,week,position){
  return JSON.stringify({players:{
    filterSlotIds:{value:[SLOT_BY_POSITION[position]]},
    filterStatsForSourceIds:{value:[0]},
    filterStatsForTopScoringPeriodIds:{value:week,additionalValue:['00'+year,'10'+year]},
    sortPercOwned:{sortPriority:1,sortAsc:false},
    limit:500,
    offset:0
  }});
}

function parseCsvLine(line){
  const out=[];let cur='';let quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){cur+='"';i++}
      else quoted=!quoted;
    }else if(ch===','&&!quoted){out.push(cur);cur=''}
    else cur+=ch;
  }
  out.push(cur);
  return out;
}
function snapPctNumber(v){
  const n=Number(v);
  if(!Number.isFinite(n))return null;
  return n<=1.5?n*100:n;
}
async function fetchSnapSeason(year){
  if(year<2013)return [];
  if(snapSeasonCache.has(year))return snapSeasonCache.get(year);
  const promise=(async()=>{
    const url='https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_'+year+'.csv';
    const res=await fetch(url,{cache:'force-cache'});
    if(!res.ok)throw new Error('Snap data returned '+res.status);
    const text=await res.text();
    const lines=text.split(/\r?\n/).filter(Boolean);
    if(lines.length<2)return[];
    const head=parseCsvLine(lines[0]);
    const ix=name=>head.indexOf(name);
    const idx={week:ix('week'),player:ix('player'),position:ix('position'),team:ix('team'),gameType:ix('game_type'),offSnaps:ix('offense_snaps'),offPct:ix('offense_pct')};
    if(Object.values(idx).some(v=>v<0))throw new Error('Unexpected snap-count columns');
    return lines.slice(1).map(line=>{
      const x=parseCsvLine(line);
      return {
        week:Number(x[idx.week]),
        player:x[idx.player],
        position:x[idx.position],
        team:x[idx.team],
        gameType:x[idx.gameType],
        offenseSnaps:Number(x[idx.offSnaps])||0,
        snapPct:snapPctNumber(x[idx.offPct])
      };
    }).filter(x=>x.gameType==='REG'&&x.week>=1&&x.week<=18);
  })();
  snapSeasonCache.set(year,promise);
  try{return await promise}catch(e){snapSeasonCache.delete(year);return[]}
}
async function fetchPlayerSnaps(row){
  const all=await fetchSnapSeason(row.year);
  if(!all.length)return[];
  const wanted=norm(row.name);
  const sameName=all.filter(x=>norm(x.player)===wanted);
  const samePos=sameName.filter(x=>!row.position||x.position===row.position);
  const pool=samePos.length?samePos:sameName;
  return pool.sort((a,b)=>a.week-b.week);
}
function formatSnapPct(v){
  return Number.isFinite(Number(v))?Number(v).toFixed(1)+'%':'—';
}

async function fetchPlayerWeeks(row){
  const key=String(row.id)+':'+row.year;
  if(playerWeekCache.has(key))return playerWeekCache.get(key);
  const promise=(async()=>{
    let espnEntry=null;
    const filter=playerFilter(row.id,row.year);
    const urls=[...defaultUrls(row.year,'kona_playercard'),...publicPlayerUrls(row.year,'kona_player_info')];
    for(const url of urls){
      try{
        const list=await fetchList(url,filter);
        let entry=list.find(x=>String(deepPlayer(x)?.id ?? x?.id ?? '')===String(row.id))||null;
        if(!entry){
          const wanted=norm(row.name);
          entry=list.find(x=>norm(deepPlayer(x)?.fullName||deepPlayer(x)?.displayName||deepPlayer(x)?.name)===wanted)||null;
        }
        if(entry){espnEntry=entry;break}
      }catch(e){}
    }

    const espnByWeek=new Map();
    if(espnEntry){
      for(let week=1;week<=18;week++){
        const pts=weekPoints(espnEntry,row.year,week);
        if(Number.isFinite(Number(pts)))espnByWeek.set(week,Number(pts));
      }
    }

    const snaps=await fetchPlayerSnaps(row);
    if(snaps.length){
      return snaps
        .filter(s=>s.offenseSnaps>0)
        .map(s=>({
          week:s.week,
          points:espnByWeek.has(s.week)?espnByWeek.get(s.week):0,
          snapPct:s.snapPct,
          offenseSnaps:s.offenseSnaps
        }));
    }

    return [...espnByWeek.entries()].map(([week,points])=>({
      week,points,snapPct:null,offenseSnaps:null
    })).sort((a,b)=>a.week-b.week);
  })();
  playerWeekCache.set(key,promise);
  return promise;
}
async function fetchWeekBoard(year,week,position){
  const key=year+':'+week+':'+position;
  if(weekBoardCache.has(key))return weekBoardCache.get(key);
  const promise=(async()=>{
    const filter=weeklyPositionFilter(year,week,position);
    const urls=[...defaultUrls(year,'kona_playercard',week),...publicPlayerUrls(year,'kona_player_info',week)];
    for(const url of urls){
      try{
        const list=await fetchList(url,filter);
        const rows=list.map(entry=>{
          const p=deepPlayer(entry);
          const pos=POSITION_BY_ID[Number(p?.defaultPositionId)];
          if(pos!==position)return null;
          const id=String(p?.id ?? entry?.id ?? '');
          const name=p?.fullName||p?.displayName||p?.name||'';
          const points=weekPoints(entry,year,week);
          if(!id||!name||!Number.isFinite(Number(points)))return null;
          return {id,name,points:Number(points)};
        }).filter(Boolean);
        if(rows.length)return rows.sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
      }catch(e){}
    }
    return [];
  })();
  weekBoardCache.set(key,promise);
  try{return await promise}catch(e){weekBoardCache.delete(key);return[]}
}
async function buildSeasonDetails(row){
  const weeks=await fetchPlayerWeeks(row);
  if(!weeks.length)return {games:0,high:null,low:null,twenty:0,top12:null,top5:null,avgSnap:null,weeks:[]};
  let top12=0,top5=0,rankedWeeks=0;
  await mapLimited(weeks,3,async w=>{
    const board=await fetchWeekBoard(row.year,w.week,row.position);
    if(!board.length)return;
    let i=board.findIndex(x=>String(x.id)===String(row.id));
    if(i<0){
      const wanted=norm(row.name);
      i=board.findIndex(x=>norm(x.name)===wanted);
    }
    if(i<0)return;
    rankedWeeks++;
    const rank=i+1;
    if(rank<=12)top12++;
    if(rank<=5)top5++;
  });
  const pts=weeks.map(x=>x.points);
  const snapVals=weeks.map(x=>x.snapPct).filter(x=>Number.isFinite(Number(x)));
  return {
    games:weeks.length,
    high:Math.max(...pts),
    low:Math.min(...pts),
    twenty:weeks.filter(x=>x.points>=20).length,
    top12:rankedWeeks?top12:null,
    top5:rankedWeeks?top5:null,
    avgSnap:snapVals.length?snapVals.reduce((a,b)=>a+Number(b),0)/snapVals.length:null,
    weeks
  };
}
function teamLogoHtml(abbr){
  const slug=TEAM_SLUGS[abbr];
  return slug?'<img class="player-history-team-logo" src="https://a.espncdn.com/i/teamlogos/nfl/500/'+slug+'.png" alt="">':'';
}
function detailStat(label,value){
  return '<div class="player-history-detail-stat"><span>'+label+'</span><b>'+value+'</b></div>';
}
async function toggleSeasonDetail(rowEl,row){
  const detail=rowEl.nextElementSibling;
  if(!detail||!detail.classList.contains('player-history-detail'))return;
  const opening=!detail.classList.contains('open');
  rowEl.classList.toggle('open',opening);
  detail.classList.toggle('open',opening);
  if(!opening||detail.dataset.loaded==='1')return;
  detail.innerHTML='<div class="player-history-detail-loading">Loading '+row.year+' weekly breakdown…</div>';
  const d=await buildSeasonDetails(row);
  detail.dataset.loaded='1';

  if(d.games>0){
    row.games=d.games;
    row.ppg=row.points/d.games;
    const gpEl=rowEl.querySelector('.player-history-games');
    const ppgEl=rowEl.querySelector('.player-history-ppg');
    if(gpEl)gpEl.textContent=String(d.games);
    if(ppgEl)ppgEl.textContent=Number(row.ppg).toFixed(1);
  }

  const ppg=Number.isFinite(Number(row.ppg))?Number(row.ppg).toFixed(1):'—';
  const weeklyHtml=d.weeks.length?
    '<div class="player-history-weekly">'+
      '<div class="player-history-weekly-head"><div>Week</div><div style="text-align:right">PPR</div><div style="text-align:right">Snap %</div></div>'+
      d.weeks.map(w=>'<div class="player-history-weekly-row"><div><b>'+w.week+'</b></div><div class="player-history-week-points">'+Number(w.points).toFixed(1)+'</div><div class="player-history-snap">'+formatSnapPct(w.snapPct)+'</div></div>').join('')+
    '</div>':'';

  detail.innerHTML='<div class="player-history-detail-grid">'+
    detailStat('Games Played',d.games||'—')+
    detailStat('PPG',ppg)+
    detailStat('Avg Snap %',formatSnapPct(d.avgSnap))+
    detailStat('Total PPR',Number.isFinite(Number(row.points))?Number(row.points).toFixed(1):'—')+
    detailStat('Weekly High',Number.isFinite(Number(d.high))?Number(d.high).toFixed(1):'—')+
    detailStat('Weekly Low',Number.isFinite(Number(d.low))?Number(d.low).toFixed(1):'—')+
    detailStat('20+ Pt Games',d.twenty)+
    detailStat('Top-12 Weeks',d.top12===null?'—':d.top12)+
    detailStat('Top-5 Weeks',d.top5===null?'—':d.top5)+
  '</div>'+weeklyHtml;
}
function readPlayerCache(player){
  try{
    const data=JSON.parse(localStorage.getItem('shuaEspnFinishHistory:'+player.id)||'null');
    if(!data||data.version!==9||!Array.isArray(data.rows))return null;
    if(Number(data.latestCompleted)!==LATEST_COMPLETED)return null;
    return data.rows;
  }catch(e){return null}
}
function savePlayerCache(player,rows){
  try{
    localStorage.setItem('shuaEspnFinishHistory:'+player.id,JSON.stringify({
      version:9,
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
function renderRows(player,rows,target){
  const good=rows.filter(Boolean).sort((a,b)=>b.year-a.year);
  if(!good.length){
    target.innerHTML='<div class="player-history-empty">No completed ESPN fantasy seasons found for this player.</div>';
    return;
  }
  target.innerHTML=
    '<div class="player-history-card">'+
      '<div class="player-history-head"><div>Year</div><div>Team</div><div>Finish</div><div style="text-align:center">GP</div><div style="text-align:right">PPG</div><div style="text-align:right">PPR Pts</div></div>'+
      good.map((r,i)=>{
        const ppg=Number.isFinite(Number(r.ppg))?Number(r.ppg).toFixed(1):((r.games&&r.points)?(r.points/r.games).toFixed(1):'—');
        return '<div class="player-history-row" data-history-index="'+i+'" role="button" tabindex="0">'+
          '<div class="player-history-year"><span class="player-history-chevron">›</span>'+r.year+'</div>'+
          '<div class="player-history-team">'+teamLogoHtml(r.teamAbbr)+'<span class="full">'+(r.team||'—')+'</span><span class="abbr">'+(r.teamAbbr||'—')+'</span></div>'+
          '<div class="player-history-finish">'+(r.rank?r.rank:'—')+'</div>'+
          '<div class="player-history-games">'+(Number.isFinite(Number(r.games))?Number(r.games):'—')+'</div>'+
          '<div class="player-history-ppg">'+ppg+'</div>'+
          '<div class="player-history-points">'+(Number.isFinite(Number(r.points))?Number(r.points).toFixed(1):'—')+'</div>'+
        '</div><div class="player-history-detail" data-detail-index="'+i+'"></div>';
      }).join('')+
      '<div class="player-history-note">Tap a season for its weekly breakdown. Top-12 and Top-5 count weekly positional finishes using ESPN PPR scoring.</div>'+
    '</div>';
  target.querySelectorAll('[data-history-index]').forEach(el=>{
    const row=good[Number(el.dataset.historyIndex)];
    const open=()=>toggleSeasonDetail(el,row);
    el.addEventListener('click',open);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  });
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
      renderRows(player,cached,target);
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
    renderRows(player,good,target);
  }catch(e){
    target.innerHTML='<div class="player-history-empty player-history-error">Could not load ESPN history right now.</div>';
  }
}

window.ShuaPlayerHistory={render};
})();