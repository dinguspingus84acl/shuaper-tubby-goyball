/* Jack's cross-league command center: 11 ESPN leagues, source-backed snapshots. */
(()=>{
'use strict';
const source=window.ShuaPortfolioData;
const nav=document.querySelector('.positions'),main=document.querySelector('main');
if(!source?.leagues?.length||!nav||!main||document.getElementById('shuaPortfolio'))return;
const leagues=source.leagues, archive=window.ShuaMyTeamsData?.historicalData||[], season=Number(source.season)||2026;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(n,d=1)=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))?Number(n).toFixed(d):'—';
const first=(arr)=>arr?.length?arr[0]:null;
const nflCodes={WAS:'wsh',WSH:'wsh',GB:'gb',GNB:'gb',KAN:'kc',KC:'kc',NE:'ne',NWE:'ne',NO:'no',NOR:'no',SF:'sf',SFO:'sf',TB:'tb',TAM:'tb',LV:'lv',LVR:'lv',LA:'lar'};
const nflLogo=t=>{const key=nflCodes[t]||String(t||'').toLowerCase();return /^[a-z]{2,3}$/.test(key)?'https://a.espncdn.com/i/teamlogos/nfl/500/'+key+'.png':'';};
const posCode=p=>String(p||'').toUpperCase()==='DST'?'D/ST':String(p||'').toUpperCase();
const normalizeTeam=t=>({GNB:'GB',KAN:'KC',NWE:'NE',NOR:'NO',SFO:'SF',TAM:'TB',LVR:'LV',WSH:'WAS'}[t]||t);
const img=(p)=>posCode(p.pos)==='D/ST'?nflLogo(p.team):'https://a.espncdn.com/i/headshots/nfl/players/full/'+encodeURIComponent(p.id)+'.png';
const teamSelect=(selected,includeAll=true)=>'<select data-port-league aria-label="Select fantasy league">'+(includeAll?'<option value="ALL">All 11 leagues</option>':'')+leagues.map(l=>'<option value="'+esc(l.id)+'" '+(selected===l.id?'selected':'')+'>'+esc(l.name)+'</option>').join('')+'</select>';
const playerButton=(p)=>'<button class="pc-player" type="button" data-port-player="'+esc(p.id)+'" data-port-name="'+esc(p.name)+'" data-port-pos="'+esc(p.pos)+'" data-port-team="'+esc(p.team)+'">'+esc(p.name)+'</button>';
const portrait=p=>'<img class="pc-portrait" src="'+img(p)+'" alt="" loading="lazy" onerror="this.style.opacity=.25">';
const nflBadge=t=>nflLogo(t)?'<img class="pc-nfl-logo" loading="lazy" src="'+nflLogo(t)+'" alt="">':'';
const selectedLeagues=()=>state.league==='ALL'?leagues:leagues.filter(l=>l.id===state.league);
const thisWeek=Math.max(1,...leagues.map(l=>Number(l.matchup?.week)||0));
const NAV=[['overview','Overview'],['lineups','Lineups / Start-Sit'],['waivers','Waiver Finder'],['playoffs','Playoffs'],['trends','Trends'],['history','History']];
const section=document.createElement('section');section.id='shuaPortfolio';section.hidden=true;main.append(section);
const button=document.createElement('button');button.type='button';button.className='pos';button.dataset.pos='COMMAND';button.textContent='Command Center';nav.append(button);
const state={tab:'overview',league:'ALL',position:'ALL',search:'',trend:'ALL',sort:'rise',compareA:'',compareB:'',loading:false};
const promises=new Map();let metricsIndex=null,waiverIndex=null;

function ensureScript(path,key){
 if(window[key])return Promise.resolve(window[key]);
 if(promises.has(key))return promises.get(key);
 const promise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');let done=false;
  const finish=(err)=>{if(done)return;done=true;clearTimeout(timer);if(err)reject(err);else if(window[key])resolve(window[key]);else reject(new Error(key+' did not initialize'));};
  const timer=setTimeout(()=>finish(new Error('Data request timed out')),15000);
  script.src=path;script.async=true;script.onload=()=>finish();script.onerror=()=>finish(new Error('Could not load '+path));document.head.append(script);
 });
 promises.set(key,promise);return promise;
}
function metricsData(){return window.ShuaPortfolioMetrics||null;}
function ensureMetrics(){return ensureScript('portfolio-metrics.js?v=20261026-2','ShuaPortfolioMetrics').then(data=>{if(!metricsIndex)metricsIndex=new Map(data.players.map(r=>[String(r[0]),r]));return data;});}
function ensureWaivers(){return ensureScript('portfolio-waivers.js?v=20261026-2','ShuaPortfolioWaivers').then(data=>{if(!waiverIndex){waiverIndex=new Map();for(const league of data.leagues)for(const r of league.rows){const k=String(r[0]);if(!waiverIndex.has(k))waiverIndex.set(k,{id:k,name:r[1],pos:posCode(r[2]),team:r[3],status:r[4],available:[],ppg:Number(r[7])||0,seasonPts:Number(r[8])||0});waiverIndex.get(k).available.push({leagueId:String(league.id),state:String(r[5]||'free_agent'),clears:r[6]});}}return data;});}
function mRow(p){return metricsIndex?.get(String(p.id))||null;}
function stat(p,i){const r=mRow(p);return r&&r[i]!==null&&r[i]!==undefined?Number(r[i]):null;}
function playerSchedule(p,week){const games=metricsData()?.schedule?.[normalizeTeam(p.team)]||metricsData()?.schedule?.[p.team];return Array.isArray(games)?games[week-1]:null;}
function isBye(p,week=thisWeek){return playerSchedule(p,week)==='BYE';}
function isStarter(p){return !/^(bench|be|ir|inj|reserve|res|inactive)$/i.test(String(p.slot||''));}
function injury(p){const s=String(p.status||'').trim();if(!s||/^(active|healthy|normal|none)$/i.test(s))return null;if(/season.?ending|out for (the )?season|injured reserve|\bIR\b|suspend|PUP|NFI/i.test(s))return {label:'IR',level:4};if(/\bout\b/i.test(s))return {label:'OUT',level:4};if(/doubtful/i.test(s))return {label:'D',level:3};if(/day.?to.?day|DTD/i.test(s))return {label:'DTD',level:2};if(/questionable/i.test(s))return {label:'Q',level:2};return {label:s.slice(0,9).toUpperCase(),level:1};}
function alertFor(p){return isBye(p)?{label:'BYE',level:5}:injury(p);}
function severityTag(a){return a?'<span class="pc-tag '+(a.level>=4?'danger':'warn')+'">'+esc(a.label)+'</span>':'';}
function roleLine(p){return '<span class="pc-meta">'+nflBadge(p.team)+esc(posCode(p.pos))+' · '+esc(p.team||'FA')+' · '+esc(p.slot||'')+'</span>';}
function sectionShell(content){
 section.innerHTML='<div class="pc-heading"><div><h2>Command Center</h2><div class="pc-sub">'+leagues.length+' ESPN leagues · '+season+' season</div></div><span class="pc-week">Week '+thisWeek+'</span></div>'+
 '<div class="pc-tabs" role="tablist" aria-label="Command Center sections">'+NAV.map(([key,label])=>'<button type="button" role="tab" data-port-tab="'+key+'" aria-selected="'+(state.tab===key)+'">'+label+'</button>').join('')+'</div>'+content;
}
function loading(label){sectionShell('<div class="pc-empty">Loading '+esc(label)+'…</div>');}
function error(message){sectionShell('<div class="pc-empty">'+esc(message)+'<p class="pc-note">Previously saved roster and league information remains available in My Teams.</p></div>');}
function allAlerts(startersOnly=true){const out=[];for(const l of leagues)for(const p of l.roster||[]){if(startersOnly&&!isStarter(p))continue;const issue=alertFor(p);if(issue)out.push({league:l,player:p,issue});}return out.sort((a,b)=>b.issue.level-a.issue.level||a.league.name.localeCompare(b.league.name));}

function renderOverview(){
 const alerts=allAlerts(),records=leagues.reduce((s,l)=>{s.w+=l.record?.wins||0;s.l+=l.record?.losses||0;s.t+=l.record?.ties||0;return s;},{w:0,l:0,t:0});
 const ahead=leagues.filter(l=>Number.isFinite(l.matchup?.myProjection)&&Number.isFinite(l.matchup?.opponentProjection)&&l.matchup.myProjection>l.matchup.opponentProjection).length;
 sectionShell('<div class="pc-summary"><div class="pc-card"><strong>'+leagues.length+'</strong><span>Active leagues</span></div><div class="pc-card"><strong>'+records.w+'–'+records.l+'</strong><span>Combined W–L</span></div><div class="pc-card"><strong>'+ahead+'/'+leagues.length+'</strong><span>Projected ahead</span></div><div class="pc-card"><strong class="'+(alerts.length?'pc-red':'pc-green')+'">'+alerts.length+'</strong><span>Starter alerts</span></div></div>'+
 '<div class="pc-grid">'+leagues.map(l=>{
 const r=l.record||{},m=l.matchup||{},issues=alerts.filter(a=>a.league.id===l.id);
 return '<article class="pc-card"><div class="pc-team-head"><div><h3>'+esc(l.name)+'</h3><div class="pc-team-name">'+esc(l.teamName||'')+'</div></div><span class="pc-seed">#'+(r.rank||'—')+' / '+l.leagueSize+'</span></div>'+ 
 '<div class="pc-record">'+(r.wins??'—')+'–'+(r.losses??'—')+(r.ties?'–'+r.ties:'')+'<span> · PF '+num(r.pointsFor)+' / PA '+num(r.pointsAgainst)+'</span></div>'+
 '<div class="pc-matchup"><span>You · Week '+(m.week||thisWeek)+'</span><span class="pc-numeric">'+num(m.myPoints,2)+'<small>Proj '+num(m.myProjection,1)+'</small></span><span>'+esc(m.opponent||'Opponent')+'</span><span class="pc-numeric">'+num(m.opponentPoints,2)+'<small>Proj '+num(m.opponentProjection,1)+'</small></span></div>'+
 (issues.length?'<div class="pc-meta" style="margin-top:8px">'+severityTag(issues[0].issue)+' '+issues.length+' starter alert'+(issues.length===1?'':'s')+' · '+esc(issues.slice(0,2).map(x=>x.player.name).join(', '))+'</div>':'')+
 '<button class="pc-open" data-port-open-league="'+esc(l.id)+'">Open league</button></article>';
 }).join('')+'</div><p class="pc-source">Matchup projections are ESPN team totals, not individual player weekly projections. Standings and rosters: Flaim snapshot '+esc(source.generatedAt.slice(0,10))+'. Week '+thisWeek+' may still be in progress.</p>');
}

function compareMarkup(){
 const l=leagues.find(x=>x.id===state.league);if(!l)return '<p class="pc-note">Choose one league to compare two roster players.</p>';
 const roster=l.roster||[];if(!roster.length)return '<p class="pc-note">No roster available.</p>';
 const starters=roster.filter(isStarter),bench=roster.filter(p=>!isStarter(p));
 if(!roster.some(p=>String(p.id)===String(state.compareA)))state.compareA=String((first(starters)||first(roster)).id);
 if(!roster.some(p=>String(p.id)===String(state.compareB)))state.compareB=String((bench.find(p=>p.pos===(first(starters)||{}).pos)||first(bench)||roster[1]||roster[0]).id);
 const choices=(chosen)=>roster.map(p=>'<option value="'+esc(p.id)+'" '+(String(p.id)===chosen?'selected':'')+'>'+esc(p.name)+' ('+esc(p.pos)+' · '+esc(p.slot)+')</option>').join('');
 return '<div class="pc-compare"><h3>Start / Sit — '+esc(l.name)+'</h3><div class="pc-note" style="padding:4px 0 8px">Actual full-PPR form; not a league-specific projection.</div><div class="pc-compare-grid"><label class="pc-sub">Player A<select data-port-compare-a>'+choices(state.compareA)+'</select></label><label class="pc-sub">Player B<select data-port-compare-b>'+choices(state.compareB)+'</select></label></div><div id="pcComparison">'+comparisonHtml()+'</div></div>';
}
function comparisonHtml(){
 const l=leagues.find(x=>x.id===state.league);if(!l)return '';
 const a=l.roster.find(p=>String(p.id)===state.compareA),b=l.roster.find(p=>String(p.id)===state.compareB);if(!a||!b)return '';
 const one=(p)=>'<div class="pc-metric-cell"><b>'+esc(p.name)+'</b>'+['Season PPG','Last 3 PPG','Targets / game','Snap %'].map((label,i)=>'<div style="margin-top:7px;color:#abc5d5">'+label+'<strong>'+num(stat(p,[5,7,8,10][i]),i===3?0:1)+(i===3?'%':'')+'</strong></div>').join('')+'<div class="pc-meta">'+esc(playerSchedule(p,thisWeek)||'No matchup')+' · '+esc(alertFor(p)?.label||'Active')+'</div></div>';
 return '<div class="pc-compare-data">'+one(a)+one(b)+'</div><p class="pc-note">These stats use the shared ESPN full-PPR analytics dataset, not your league’s scoring rules. Injuries and matchup status may affect availability.</p>';
}
function lineupRow(a){const p=a.player;return '<div class="pc-item">'+portrait(p)+'<div class="pc-info">'+playerButton(p)+roleLine(p)+'</div>'+severityTag(a.issue)+'</div>';}
function renderLineups(){
 const scoped=selectedLeagues();let alerts=allAlerts().filter(a=>scoped.some(l=>l.id===a.league.id));
 const columns=scoped.map(l=>{
  const issues=alerts.filter(a=>a.league.id===l.id),benchAlerts=(l.roster||[]).filter(p=>!isStarter(p)&&alertFor(p));
  const starters=(l.roster||[]).filter(isStarter),bench=(l.roster||[]).filter(p=>!isStarter(p));
  const potential=[];for(const p of bench){if(!['QB','RB','WR','TE'].includes(p.pos)||alertFor(p))continue;const bench3=stat(p,7);if(bench3===null)continue;for(const s of starters.filter(x=>x.pos===p.pos&&!alertFor(x))){const starter3=stat(s,7);if(starter3!==null&&bench3>starter3+4){potential.push({p,s,gap:bench3-starter3});break;}}}
  return '<article class="pc-card"><div class="pc-lineup-title"><div><h3>'+esc(l.name)+'</h3><div class="pc-team-name">'+esc(l.teamName)+'</div></div><small>'+issues.length+' starter alerts</small></div>'+
  (issues.length?issues.map(lineupRow).join(''):'<div class="pc-meta pc-green">No flagged starter injuries or byes</div>')+
  (potential.length?'<div class="pc-note">Bench review (last-three PPG): '+potential.slice(0,2).map(x=>esc(x.p.name)+' vs '+esc(x.s.name)+' (+'+num(x.gap)+' PPG)').join(' · ')+'</div>':'')+
  (benchAlerts.length?'<div class="pc-note">Bench: '+esc(benchAlerts.slice(0,3).map(p=>p.name+' ('+alertFor(p).label+')').join(' · '))+'</div>':'')+
  '<button class="pc-open" data-port-set-league="'+esc(l.id)+'">Compare '+esc(l.teamName)+'</button></article>';
 });
 sectionShell('<div class="pc-control-line">'+teamSelect(state.league)+'</div>'+compareMarkup()+'<div class="pc-grid">'+columns.join('')+'</div><p class="pc-source">Bye weeks follow the NFL schedule for Week '+thisWeek+'. “Bench review” compares recent actual fantasy points, not future projections or a lineup recommendation. Injury statuses reflect the roster snapshot.</p>');
}
function seasonUnavailable(p){return /season.?ending|out for (the )?season|injured reserve|\bIR\b|PUP|NFI/i.test(String(p.status||''));}
function waiverOptions(){return '<div class="pc-control-line">'+teamSelect(state.league)+'<input data-port-search aria-label="Search available players" placeholder="Find a waiver player…" value="'+esc(state.search)+'"></div><div class="pc-filters">'+['ALL','QB','RB','WR','TE','K','D/ST'].map(p=>'<button type="button" aria-pressed="'+(state.position===p)+'" data-port-position="'+p+'">'+p+'</button>').join('')+'</div><div id="pcWaiverResults"></div>';
}
function waiverList(){
 const q=state.search.toLowerCase().trim(),picked=state.league;
 const rows=[...(waiverIndex?.values()||[])].filter(p=>!seasonUnavailable(p)&&(state.position==='ALL'||posCode(p.pos)===state.position)&&(!q||p.name.toLowerCase().includes(q)||String(p.team).toLowerCase().includes(q))&&(picked==='ALL'||p.available.some(a=>a.leagueId===picked)));
 rows.sort((a,b)=>b.ppg-a.ppg||b.available.length-a.available.length||a.name.localeCompare(b.name));
 const visible=rows.slice(0,36);
 return '<div class="pc-sub" style="margin-bottom:9px">'+rows.length+' verified available players · Showing '+visible.length+' · Sorted by season PPG (not weekly projections)</div>'+
 (visible.length?'<div class="pc-grid">'+visible.map(p=>'<div class="pc-card pc-item">'+portrait(p)+'<div class="pc-info">'+playerButton(p)+'<div class="pc-meta">'+nflBadge(p.team)+esc(p.pos)+' · '+esc(p.team||'FA')+' · '+p.available.length+' league'+(p.available.length===1?'':'s')+'</div><div class="pc-meta">'+esc(p.available.filter(a=>picked==='ALL'||a.leagueId===picked).slice(0,3).map(a=>leagues.find(l=>l.id===a.leagueId)?.name+(a.state==='waivers'?' (W)':'')).join(' · '))+(p.available.length>3?' …':'')+'</div></div><div class="pc-stat">'+num(p.ppg)+'<small>PPG</small><div class="pc-tag '+(p.available.some(a=>a.state==='waivers')?'warn':'ok')+'" style="margin-top:5px">'+(p.available.every(a=>a.state==='free_agent')?'FA':'WAIVER')+'</div></div></div>').join('')+'</div>':'<div class="pc-empty">No matching available players in the current verified waiver snapshots.</div>');
}
function renderWaivers(){sectionShell(waiverOptions()+'<p class="pc-source">Only players returned by Flaim as currently available in the relevant league(s). Waiver-clearing status is indicated; IR/season-ending players excluded. The data provides season PPG, not individual weekly projections.</p>');const el=$('#pcWaiverResults');if(el)el.innerHTML=waiverList();}
function renderPlayoffs(){
 const picked=state.league==='ALL'?leagues[0]:leagues.find(l=>l.id===state.league)||leagues[0],picks=(picked.roster||[]).filter(p=>isStarter(p));
 const rows=picks.map(p=>{
  const pos=posCode(p.pos)==='D/ST'?'DST':p.pos,rankMap=metricsData()?.oprk?.[pos]||{};let ranks=[];
  const cells=[14,15,16,17].map(week=>{const game=playerSchedule(p,week),rank=rankMap[normalizeTeam(game)]??rankMap[game];if(Number.isFinite(rank))ranks.push(rank);return '<td><span class="'+(rank>=24?'pc-green':rank<=9?'pc-red':'')+'">'+esc(game||'—')+'</span>'+(Number.isFinite(rank)?'<small style="display:block;color:#9cb7c9">#'+rank+'</small>':'')+'</td>';});
  return {p,cells,average:ranks.length?ranks.reduce((a,b)=>a+b,0)/ranks.length:null};
 }).sort((a,b)=>a.p.pos.localeCompare(b.p.pos)||((b.average||0)-(a.average||0)));
 sectionShell('<div class="pc-control-line">'+teamSelect(picked.id,false)+'</div><p class="pc-note">Weeks 14–17 · Opponents and ESPN fantasy points-allowed difficulty by position. Higher opponent rank means an easier matchup; K has no comparable positional difficulty rating.</p><div class="pc-table-wrap"><table class="pc-table"><thead><tr><th>Starter</th><th>W14</th><th>W15</th><th>W16</th><th>W17</th><th>Avg rank</th></tr></thead><tbody>'+rows.map(({p,cells,average})=>'<tr><td>'+playerButton(p)+'<div class="pc-meta">'+nflBadge(p.team)+esc(p.pos)+' · '+esc(p.team)+'</div></td>'+cells.join('')+'<td><b>'+num(average,0)+'</b></td></tr>').join('')+'</tbody></table></div><p class="pc-source">Opponent rank (1 hardest to 32 easiest) uses ESPN full-PPR, four-point passing TD defensive matchup data; it is not a prediction of league-specific points.</p>');
}
function trendRows(){
 const owned=new Map();for(const l of selectedLeagues())for(const p of l.roster||[]){if(!['QB','RB','WR','TE'].includes(p.pos)||owned.has(String(p.id))&&owned.get(String(p.id)).leagues.includes(l.id))continue;const k=String(p.id);if(!owned.has(k))owned.set(k,{p,leagues:[]});owned.get(k).leagues.push(l.id);}
 const data=[...owned.values()].map(o=>{const season=stat(o.p,5),recent=stat(o.p,7),targets=stat(o.p,8),recentTargets=stat(o.p,9),snaps=stat(o.p,10),recentSnaps=stat(o.p,11);return {...o,season,recent,targets,recentTargets,snaps,recentSnaps,diff:season===null||recent===null?null:recent-season};}).filter(x=>x.diff!==null&&(state.trend==='ALL'||x.p.pos===state.trend));
 data.sort((a,b)=>state.sort==='fall'?a.diff-b.diff:b.diff-a.diff);
 return data.slice(0,24);
}
function renderTrends(){
 const rows=trendRows();
 sectionShell('<div class="pc-control-line">'+teamSelect(state.league)+'</div><div class="pc-filters">'+['ALL','QB','RB','WR','TE'].map(p=>'<button type="button" data-port-trend="'+p+'" aria-pressed="'+(state.trend===p)+'">'+p+'</button>').join('')+'<button type="button" data-port-sort="'+(state.sort==='rise'?'fall':'rise')+'">'+(state.sort==='rise'?'Rising ↑':'Falling ↓')+'</button></div><div class="pc-table-wrap"><table class="pc-table"><thead><tr><th>Player</th><th>Owned</th><th>Season PPG</th><th>Last 3 PPG</th><th>Change</th><th>Target Δ</th><th>Snap Δ</th></tr></thead><tbody>'+rows.map(o=>'<tr><td>'+playerButton(o.p)+'<div class="pc-meta">'+nflBadge(o.p.team)+esc(o.p.pos)+' · '+esc(o.p.team)+'</div></td><td>'+o.leagues.length+'</td><td>'+num(o.season)+'</td><td>'+num(o.recent)+'</td><td class="'+(o.diff>=0?'pc-green':'pc-red')+'">'+(o.diff>0?'+':'')+num(o.diff)+'</td><td>'+delta(o.targets,o.recentTargets)+'</td><td>'+delta(o.snaps,o.recentSnaps,'pp')+'</td></tr>').join('')+'</tbody></table></div><p class="pc-source">Actual 2026 full-PPR player metrics through the latest analytics snapshot. Change = last 3 games PPG minus season PPG; target Δ is targets/game and snap Δ is percentage points. Not weekly projections.</p>');
}
function delta(base,recent,suffix=''){return base===null||recent===null?'—':(recent-base>0?'+':'')+num(recent-base,1)+(suffix?' '+suffix:'');}
function finishFor(x){const s=x.standings?.find(t=>String(t.teamId)===String(x.teamId));if(!s||s.outcomeConfidence!=='explicit'||!Number.isInteger(s.finalRank))return null;return {...s,leagueId:x.id,year:x.year,leagueName:leagues.find(l=>l.id===x.id)?.name||'League'};}
function renderHistory(){
 const rows=archive.map(finishFor).filter(Boolean).filter(x=>state.league==='ALL'||x.leagueId===state.league).sort((a,b)=>b.year-a.year||a.leagueName.localeCompare(b.leagueName));
 const champions=rows.filter(x=>x.championshipWon),wins=rows.reduce((s,x)=>s+x.wins,0),losses=rows.reduce((s,x)=>s+x.losses,0),ties=rows.reduce((s,x)=>s+x.ties,0),avg=rows.length?rows.reduce((s,x)=>s+x.finalRank,0)/rows.length:null;
 sectionShell('<div class="pc-control-line">'+teamSelect(state.league)+'</div><div class="pc-summary"><div class="pc-card"><strong>'+rows.length+'</strong><span>Verified seasons</span></div><div class="pc-card"><strong class="pc-green">'+champions.length+'</strong><span>Championships</span></div><div class="pc-card"><strong>'+wins+'–'+losses+(ties?'–'+ties:'')+'</strong><span>Regular W–L</span></div><div class="pc-card"><strong>'+num(avg,1)+'</strong><span>Average final finish</span></div></div><div class="pc-table-wrap"><table class="pc-table"><thead><tr><th>League / My Team</th><th>Year</th><th>Record</th><th>Final</th></tr></thead><tbody>'+rows.map(x=>'<tr><td><b>'+esc(x.leagueName)+'</b><div class="pc-meta">'+esc(x.teamName)+'</div></td><td>'+x.year+'</td><td>'+x.wins+'–'+x.losses+(x.ties?'–'+x.ties:'')+'</td><td><span class="pc-history-rank '+(x.championshipWon?'pc-green':'')+'">'+(x.championshipWon?'Champion':ordinal(x.finalRank))+'</span></td></tr>').join('')+'</tbody></table></div><p class="pc-source">Only final placement explicitly verified in saved ESPN postseason results is counted; regular-season standings never substitute for final finish. '+archive.length+' historical records currently saved (2020–2025 where available).</p>');
}
function ordinal(n){return n+((n%100>=11&&n%100<=13)?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'));}

async function render(){
 if(section.hidden)return;
 if(state.tab==='overview'){renderOverview();ensureMetrics().then(()=>{if(!section.hidden&&state.tab==='overview')renderOverview();}).catch(()=>{});return;}
 if(['lineups','trends','playoffs'].includes(state.tab)&&!metricsIndex){
  loading(state.tab);try{await ensureMetrics();}catch(e){if(!section.hidden)error('Analytics data unavailable: '+e.message);return;}if(section.hidden)return;
 }
 if(state.tab==='waivers'&&!window.ShuaPortfolioWaivers){loading('verified waiver availability');try{await ensureWaivers();}catch(e){if(!section.hidden)error('Waiver data unavailable: '+e.message);return;}if(section.hidden)return;}
 if(state.tab==='lineups')renderLineups();
 else if(state.tab==='waivers')renderWaivers();
 else if(state.tab==='playoffs')renderPlayoffs();
 else if(state.tab==='trends')renderTrends();
 else if(state.tab==='history')renderHistory();
}

function show(){document.body.classList.add('shua-portfolio-open');section.hidden=false;nav.querySelectorAll('.pos').forEach(b=>b.classList.toggle('active',b===button));render();}
function hide(){document.body.classList.remove('shua-portfolio-open');section.hidden=true;button.classList.remove('active');}
function openLeague(id){
 const myBtn=nav.querySelector('[data-pos="MYTEAMS"]');if(!myBtn)return;
 hide();myBtn.click();
 const mySection=$('#shuaMyTeams'),idx=mySection?._cards?.findIndex(x=>String(x.id)===String(id));
 if(idx>=0){const card=mySection.querySelector('[data-myteams-open="'+idx+'"]');card?.click();}
}
section.addEventListener('click',e=>{
 const tab=e.target.closest('[data-port-tab]');if(tab){state.tab=tab.dataset.portTab;render();return;}
 const pos=e.target.closest('[data-port-position]');if(pos){state.position=pos.dataset.portPosition;render();return;}
 const trend=e.target.closest('[data-port-trend]');if(trend){state.trend=trend.dataset.portTrend;render();return;}
 const sort=e.target.closest('[data-port-sort]');if(sort){state.sort=sort.dataset.portSort;render();return;}
 const league=e.target.closest('[data-port-set-league]');if(league){state.league=league.dataset.portSetLeague;render();return;}
 const open=e.target.closest('[data-port-open-league]');if(open){openLeague(open.dataset.portOpenLeague);return;}
 const player=e.target.closest('[data-port-player]');if(player&&typeof window.openUnifiedPlayerProfileByName==='function')window.openUnifiedPlayerProfileByName(player.dataset.portName,{id:player.dataset.portPlayer,name:player.dataset.portName,team:player.dataset.portTeam,position:player.dataset.portPos,seasonYear:season,source:'portfolio'});
});
section.addEventListener('change',e=>{
 const league=e.target.closest('[data-port-league]');if(league){state.league=league.value;state.compareA='';state.compareB='';render();return;}
 const a=e.target.closest('[data-port-compare-a]');if(a){state.compareA=a.value;const slot=$('#pcComparison');if(slot)slot.innerHTML=comparisonHtml();return;}
 const b=e.target.closest('[data-port-compare-b]');if(b){state.compareB=b.value;const slot=$('#pcComparison');if(slot)slot.innerHTML=comparisonHtml();}
});
section.addEventListener('input',e=>{if(e.target.matches('[data-port-search]')){state.search=e.target.value;const slot=$('#pcWaiverResults');if(slot)slot.innerHTML=waiverList();}});
document.addEventListener('click',e=>{const target=e.target.closest('.positions [data-pos]');if(target&&target!==button)hide();},true);
nav.addEventListener('click',e=>{const target=e.target.closest('[data-pos]');if(!target)return;if(target===button){e.preventDefault();e.stopImmediatePropagation();show();}else hide();},true);
})();
