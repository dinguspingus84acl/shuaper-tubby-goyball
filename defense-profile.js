/* ESPN NFL D/ST season history and weekly game logs inside the unified player card. */
(()=>{
'use strict';
const years=[2026,2025,2024,2023,2022,2021,2020];
const teamById={1:'ATL',2:'BUF',3:'CHI',4:'CIN',5:'CLE',6:'DAL',7:'DEN',8:'DET',9:'GB',10:'TEN',11:'IND',12:'KC',13:'LV',14:'LAR',15:'MIA',16:'MIN',17:'NE',18:'NO',19:'NYG',20:'NYJ',21:'PHI',22:'ARI',23:'PIT',24:'LAC',25:'SF',26:'SEA',27:'TB',28:'WAS',29:'CAR',30:'JAX',33:'BAL',34:'HOU'};
const codes={WAS:'wsh',WSH:'wsh',GB:'gb',JAX:'jax',LAR:'lar',LAC:'lac',LV:'lv',KC:'kc',NE:'ne',NO:'no',SF:'sf',TB:'tb'};
const seasonCache=new Map(),rankingCache=new Map(),scheduleCache=new Map(),selectedYears=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toFixed(1);
const logo=t=>{const c=codes[t]||String(t||'').toLowerCase();return /^[a-z]{2,3}$/.test(c)?'https://a.espncdn.com/i/teamlogos/nfl/500/'+c+'.png':''};
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const alive=(target,name)=>target?.isConnected&&norm(document.getElementById('modal')?.dataset.unifiedName)===norm(name)&&document.getElementById('modal')?.dataset.unifiedPosition==='D/ST';
async function json(url,headers,timeoutMs=8500){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{headers:headers||{},signal:controller.signal,cache:'force-cache'});
  if(!response.ok)throw new Error('ESPN HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(timer)}
}
function fantasyUrl(year){return 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/'+year+'/segments/0/leaguedefaults/3?scoringPeriodId=0&view=kona_player_info'}
function headers(filter){return {'Accept':'application/json','X-Fantasy-Source':'kona','X-Fantasy-Filter':JSON.stringify({players:filter})}}
function dataPlayer(entry){return entry?.player||entry?.playerPoolEntry?.player||null}
function seasonStat(player,year){return (player?.stats||[]).find(s=>Number(s.seasonId)===year&&Number(s.statSourceId)===0&&Number(s.statSplitTypeId)===0)}
function defenseId(id,team){const n=Number(id);if(Number.isInteger(n)&&n<0)return n;const v=Object.entries(teamById).find(([,abbr])=>abbr===team);return v?-16000-Number(v[0]):null}
async function season(id,team,year){
 const resolved=defenseId(id,team);if(!resolved)return null;
 const key=resolved+':'+year;if(seasonCache.has(key))return seasonCache.get(key);
 const promise=(async()=>{
  const filter={filterIds:{value:[resolved]},filterStatsForSourceIds:{value:[0]},filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['00'+year,'10'+year]}};
  const data=await json(fantasyUrl(year),headers(filter));
  const player=(data.players||[]).map(dataPlayer).find(p=>Number(p?.id)===resolved);
  if(!player)return null;
  const stats=(player.stats||[]).filter(s=>Number(s.seasonId)===year&&Number(s.statSourceId)===0);
  const total=seasonStat(player,year);
  const games=stats.filter(s=>Number(s.statSplitTypeId)===1&&Number(s.scoringPeriodId)>=1&&Number(s.scoringPeriodId)<=18)
   .sort((a,b)=>Number(a.scoringPeriodId)-Number(b.scoringPeriodId))
   .map(s=>({week:Number(s.scoringPeriodId),points:Number(s.appliedTotal)||0}));
  if(!total&&!games.length)return null;
  const points=Number.isFinite(Number(total?.appliedTotal))?Number(total.appliedTotal):games.reduce((sum,g)=>sum+g.points,0);
  const teamId=Number(player.proTeamId)||Math.abs(resolved+16000);
  return {year,team:teamById[teamId]||team,teamId,points,gp:games.length,ppg:games.length?points/games.length:0,games};
 })().catch(()=>null);
 seasonCache.set(key,promise);return promise;
}
async function ranks(year){
 if(rankingCache.has(year))return rankingCache.get(year);
 const promise=(async()=>{
  const filter={filterSlotIds:{value:[16]},filterStatsForSourceIds:{value:[0]},filterStatsForSplitTypeIds:{value:[0]},sortAppliedStatTotal:{sortAsc:false,sortPriority:1,value:'00'+year},filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['00'+year]},limit:100,offset:0};
  const data=await json(fantasyUrl(year),headers(filter));
  const rows=(data.players||[]).map(dataPlayer).filter(p=>Number(p?.defaultPositionId)===16).map(p=>({id:String(p.id),points:Number(seasonStat(p,year)?.appliedTotal)})).filter(p=>Number.isFinite(p.points)).sort((a,b)=>b.points-a.points);
  if(rows.length<20)return null;
  return new Map(rows.map((r,i)=>[r.id,i+1]));
 })().catch(()=>null);
 rankingCache.set(year,promise);return promise;
}
async function schedule(teamId,year){
 if(!teamId)return new Map();const key=teamId+':'+year;
 if(scheduleCache.has(key))return scheduleCache.get(key);
 const promise=(async()=>{
  const data=await json('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+teamId+'/schedule?season='+year);
  const out=new Map();
  for(const event of data.events||[]){
   const week=Number(event.week?.number),teams=event.competitions?.[0]?.competitors||[];
   if(!week||!teams.some(c=>Number(c.team?.id)===teamId))continue;
   const opponent=teams.find(c=>Number(c.team?.id)!==teamId);
   if(opponent)out.set(week,opponent.team?.abbreviation||'');
  }
  return out;
 })().catch(()=>new Map());
 scheduleCache.set(key,promise);return promise;
}
const playerKey=(id,team)=>String(defenseId(id,team)||team);
async function renderOverview(name,id,team,target){
 if(!target)return;target.innerHTML='<div class="stat"><span>Defense</span><b>Loading…</b></div>';
 const row=await season(id,team,2026);
 if(!alive(target,name))return;
 target.innerHTML='<div class="stat"><span>ESPN Points</span><b>'+fmt(row?.points)+'</b></div><div class="stat"><span>PPG</span><b>'+fmt(row?.ppg)+'</b></div><div class="stat"><span>Games</span><b>'+(row?.gp??'—')+'</b></div><div class="stat"><span>Position</span><b>D/ST</b></div>';
}
async function renderHistory(name,id,team,target){
 if(!target)return;target.innerHTML='<div class="unified-profile-loading">Loading defense history…</div>';
 const seasons=await Promise.all(years.map(year=>season(id,team,year)));
 if(!alive(target,name))return;
 const rows=seasons.filter(Boolean),boards=await Promise.all(rows.map(row=>row.year===2026?Promise.resolve(null):ranks(row.year)));
 if(!alive(target,name))return;
 target.innerHTML=rows.length?'<div class="player-history-card"><div class="player-history-head"><div>Year</div><div>Team</div><div>Finish</div><div>GP</div><div>PPG</div><div>Pts</div></div>'+rows.map((row,i)=>{
  const src=logo(row.team),rank=boards[i]?.get(String(defenseId(id,team)));
  return '<div class="player-history-row" data-defense-year="'+row.year+'" role="button" tabindex="0"><div class="player-history-year">› '+row.year+'</div><div class="player-history-team">'+(src?'<img class="player-history-team-logo" src="'+src+'" alt="'+esc(row.team)+' logo" loading="lazy">':'')+'<span class="full">'+esc(row.team)+'</span><span class="abbr">'+esc(row.team)+'</span></div><div class="player-history-finish">'+(rank||'—')+'</div><div class="player-history-games">'+row.gp+'</div><div class="player-history-ppg">'+fmt(row.ppg)+'</div><div class="player-history-points">'+fmt(row.points)+'</div></div>';
 }).join('')+'<div class="player-history-note">Finish = ESPN D/ST rank by season fantasy points. Current season is not yet final. Tap a season for its game log.</div></div>':'<div class="player-history-empty">No ESPN defense history available.</div>';
 target.querySelectorAll('[data-defense-year]').forEach(el=>{
  const open=()=>{selectedYears.set(playerKey(id,team),Number(el.dataset.defenseYear));const gameLog=document.getElementById('unifiedGameLogPanel');if(gameLog)gameLog.dataset.ready='0';document.querySelector('[data-profile-tab="gamelog"]')?.click();};
  el.addEventListener('click',open);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
 });
}
async function renderGameLog(name,id,team,target){
 if(!target)return;const key=playerKey(id,team),year=selectedYears.get(key)||2026;
 target.innerHTML='<div class="unified-profile-loading">Loading '+year+' defense game log…</div>';
 const row=await season(id,team,year),opponents=row?await schedule(row.teamId,year):new Map();
 if(!alive(target,name))return;
 const title='<div class="espn-game-log-title"><strong>'+esc(name)+' Game Log</strong><span>'+year+' · ESPN Fantasy</span></div>';
 const summary=row?'<div class="espn-game-log-summary"><strong>'+year+' Season</strong><span>'+fmt(row.ppg)+' PPG · '+fmt(row.points)+' Pts · '+row.gp+' GP</span></div>':'';
 const select='<div class="espn-game-log-controls"><div class="espn-game-log-year-row"><span class="espn-game-log-year-label">Years</span><select class="espn-game-log-year-select" aria-label="D/ST season">'+years.map(y=>'<option value="'+y+'"'+(y===year?' selected':'')+'>'+y+'</option>').join('')+'</select></div></div>';
 const table=row?.games.length?'<div class="espn-game-log-table-wrap"><table class="espn-game-log-table defense-log-table"><thead><tr><th>WK</th><th>OPP</th><th class="gl-pts">PTS</th></tr></thead><tbody>'+row.games.map(g=>{
  const opponent=opponents.get(g.week)||'',src=logo(opponent);
  const color=g.points>=10?' gl-pts-high':g.points<5?' gl-pts-low':' gl-pts-mid';
  return '<tr><td>'+g.week+'</td><td><div class="espn-game-log-opponent">'+(src?'<img class="espn-game-log-opponent-logo" src="'+src+'" alt="">':'')+'<span>'+esc(opponent||'—')+'</span></div></td><td class="gl-pts'+color+'">'+fmt(g.points)+'</td></tr>';
 }).join('')+'</tbody></table></div>':'<div class="espn-game-log-empty">No ESPN defense game log found for '+year+'.</div>';
 target.innerHTML=title+summary+select+table;
 const control=target.querySelector('.espn-game-log-year-select');if(control)control.onchange=()=>{selectedYears.set(key,Number(control.value));renderGameLog(name,id,team,target)};
}
const style=document.createElement('style');style.textContent=`
.featured-player-card.featured-defense-profile .featured-portrait-box{background:transparent!important;border:0!important;box-shadow:none!important}
.featured-player-card.featured-defense-profile .featured-portrait-box .featured-defense-logo{height:86%!important;width:86%!important;max-width:86%!important;bottom:4%!important;object-fit:contain!important;filter:none!important}
.featured-player-card.featured-defense-profile .featured-team-strip{grid-template-columns:minmax(0,1fr)!important}
#unifiedGameLogPanel .defense-log-table{width:100%!important;min-width:0!important;table-layout:fixed}
#unifiedGameLogPanel .defense-log-table th:first-child,#unifiedGameLogPanel .defense-log-table td:first-child{width:42px!important}
#unifiedGameLogPanel .defense-log-table th:nth-child(2),#unifiedGameLogPanel .defense-log-table td:nth-child(2){width:auto!important;min-width:0!important}
#unifiedGameLogPanel .defense-log-table th:last-child,#unifiedGameLogPanel .defense-log-table td:last-child{width:88px!important;text-align:right!important;padding-right:14px!important}
`;document.head.append(style);
window.ShuaDefenseProfile={renderOverview,renderHistory,renderGameLog};
})();