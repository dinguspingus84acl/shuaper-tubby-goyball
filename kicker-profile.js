/* Lightweight ESPN kicker profile. No QB/RB/WR/TE career scans. */
(()=>{
'use strict';
const cache=new Map();
const seasons=[2026,2025,2024,2023,2022,2021,2020];
const teamCodes={ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KC:'kc',LAC:'lac',LAR:'lar',LV:'lv',MIA:'mia',MIN:'min',NE:'ne',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SF:'sf',TB:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'};
const teamById={1:'ATL',2:'BUF',3:'CHI',4:'CIN',5:'CLE',6:'DAL',7:'DEN',8:'DET',9:'GB',10:'TEN',11:'IND',12:'KC',13:'LV',14:'LAR',15:'MIA',16:'MIN',17:'NE',18:'NO',19:'NYG',20:'NYJ',21:'PHI',22:'ARI',23:'PIT',24:'LAC',25:'SF',26:'SEA',27:'TB',28:'WAS',29:'CAR',30:'JAX',33:'BAL',34:'HOU'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pts=v=>Number.isFinite(Number(v))?Number(v).toFixed(1):'—';
let host=null,current=null,previousFocus=null,requestId=0;
const logo=team=>{const code=teamCodes[String(team||'').toUpperCase()];return code?'https://a.espncdn.com/i/teamlogos/nfl/500/'+code+'.png':''};
function ensure(){
 if(host)return host;
 const style=document.createElement('style');
 style.textContent=`
 body.shua-kicker-open{overflow:hidden!important}
 #shuaKickerProfile{position:fixed;inset:0;z-index:100000;background:#010916e8;display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 10px max(12px,env(safe-area-inset-bottom));color:#f4faff}
 #shuaKickerProfile[hidden]{display:none!important}
 #shuaKickerProfile .kp-card{width:min(560px,100%);max-height:100%;overflow:auto;border:1px solid #34546d;border-radius:15px;background:#081d30;box-shadow:0 18px 60px #0009}
 #shuaKickerProfile .kp-top{display:flex;align-items:center;gap:12px;padding:16px;background:linear-gradient(135deg,#123c59,#091e32);position:relative}
 #shuaKickerProfile .kp-portrait{width:77px;height:77px;border-radius:50%;object-fit:cover;background:#122e45;flex:none}
 #shuaKickerProfile .kp-name{font-size:21px;line-height:1.15;font-weight:900;margin:0 25px 6px 0}
 #shuaKickerProfile .kp-team{display:flex;align-items:center;gap:6px;color:#a7c3d6;font-size:12px}
 #shuaKickerProfile .kp-team img{width:20px;height:20px;object-fit:contain}
 #shuaKickerProfile .kp-close{position:absolute;top:9px;right:9px;border:1px solid #547187;border-radius:9px;background:#0b263d;color:white;font-size:21px;width:33px;height:33px}
 #shuaKickerProfile .kp-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:10px 12px 0}
 #shuaKickerProfile .kp-tabs button{background:#14334a;color:#bad0e0;border:1px solid #33566d;border-radius:7px;padding:10px 4px;font-weight:850}
 #shuaKickerProfile .kp-tabs button[aria-selected=true]{background:#15583f;color:#fff;border-color:#32d99c}
 #shuaKickerProfile .kp-body{padding:12px;min-height:130px}
 #shuaKickerProfile .kp-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
 #shuaKickerProfile .kp-stat{background:#102c43;border:1px solid #29485e;border-radius:9px;padding:12px 7px;text-align:center}
 #shuaKickerProfile .kp-stat small{display:block;color:#9fbbd0;font-size:10px;margin-bottom:5px}
 #shuaKickerProfile .kp-stat strong{font-size:17px;font-variant-numeric:tabular-nums}
 #shuaKickerProfile .kp-table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}
 #shuaKickerProfile .kp-table th{color:#9cbad0;text-align:left;font-size:10px}
 #shuaKickerProfile .kp-table td,#shuaKickerProfile .kp-table th{padding:10px 5px;border-bottom:1px solid #ffffff19}
 #shuaKickerProfile .kp-table td:last-child,#shuaKickerProfile .kp-table th:last-child{text-align:right}
 #shuaKickerProfile .kp-table button{background:none;border:0;padding:0;color:#5de7af;font-weight:850}
 #shuaKickerProfile .kp-year{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;color:#adcadb}
 #shuaKickerProfile .kp-year select{background:#17384e;color:white;border:1px solid #42627b;border-radius:7px;padding:7px}
 #shuaKickerProfile .kp-empty{color:#b5c9d8;font-size:12px;padding:12px 2px}
 @media(max-width:600px){#shuaKickerProfile{align-items:stretch;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}#shuaKickerProfile .kp-card{max-height:100%;border-radius:0;border-left:0;border-right:0}#shuaKickerProfile .kp-portrait{width:64px;height:64px}#shuaKickerProfile .kp-name{font-size:18px}}
 `;
 document.head.appendChild(style);
 host=document.createElement('div');host.id='shuaKickerProfile';host.hidden=true;
 host.innerHTML='<section class="kp-card" role="dialog" aria-modal="true" aria-label="Kicker player card"><div class="kp-top"></div><div class="kp-tabs"><button data-kp-tab="overview" aria-selected="true">Overview</button><button data-kp-tab="gamelog" aria-selected="false">Game Log</button><button data-kp-tab="history" aria-selected="false">History</button></div><div class="kp-body"></div></section>';
 document.body.appendChild(host);
 host.addEventListener('click',e=>{
  if(e.target===host||e.target.closest('.kp-close')){close();return}
  const tab=e.target.closest('[data-kp-tab]');if(tab){showTab(tab.dataset.kpTab);return}
  const year=e.target.closest('[data-kp-history-year]');if(year){current.year=Number(year.dataset.kpHistoryYear);showTab('gamelog');return}
 });
 host.addEventListener('change',e=>{if(e.target.matches('.kp-year select')){current.year=Number(e.target.value);showTab('gamelog')}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!host.hidden)close()});
 return host;
}
function close(){if(!host)return;host.hidden=true;current=null;requestId++;document.body.classList.remove('shua-kicker-open');previousFocus?.focus?.();}
async function getSeason(id,year){
 const key=id+':'+year;if(cache.has(key))return cache.get(key);
 const promise=(async()=>{
  const filter={players:{filterIds:{value:[Number(id)]},filterStatsForSourceIds:{value:[0]},filterStatsForTopScoringPeriodIds:{value:20,additionalValue:['00'+year,'10'+year]}}};
  const url='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/'+year+'/segments/0/leaguedefaults/3?scoringPeriodId=0&view=kona_player_info';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
  try{
   const response=await fetch(url,{headers:{'Accept':'application/json','X-Fantasy-Filter':JSON.stringify(filter),'X-Fantasy-Source':'kona'},signal:controller.signal,cache:year===2026?'no-store':'force-cache'});
   if(!response.ok)throw new Error('ESPN '+response.status);
   const data=await response.json(),entry=(data.players||[]).find(x=>String(x?.player?.id||x?.playerPoolEntry?.player?.id||'')===String(id));
   const p=entry?.player||entry?.playerPoolEntry?.player;if(!p)return null;
   const stats=(p.stats||[]).filter(s=>Number(s.seasonId)===year&&Number(s.statSourceId)===0);
   const season=stats.find(s=>Number(s.statSplitTypeId)===0)||stats.find(s=>Number(s.scoringPeriodId)===0);
   const games=stats.filter(s=>Number(s.statSplitTypeId)===1&&Number(s.scoringPeriodId)>=1&&Number(s.scoringPeriodId)<=18)
    .sort((a,b)=>Number(a.scoringPeriodId)-Number(b.scoringPeriodId)).map(s=>({week:Number(s.scoringPeriodId),points:Number(s.appliedTotal)||0}));
   const points=Number.isFinite(Number(season?.appliedTotal))?Number(season.appliedTotal):games.reduce((sum,g)=>sum+g.points,0);
   if(!season&&!games.length)return null;
   return {year,team:teamById[Number(p.proTeamId)]||'',points,gp:games.length,ppg:games.length?points/games.length:0,games};
  }finally{clearTimeout(timeout)}
 })().catch(()=>null);
 cache.set(key,promise);return promise;
}
function summary(s){return '<div class="kp-summary"><div class="kp-stat"><small>Fantasy points</small><strong>'+pts(s?.points)+'</strong></div><div class="kp-stat"><small>Games</small><strong>'+(s?.gp??'—')+'</strong></div><div class="kp-stat"><small>Points / game</small><strong>'+pts(s?.ppg)+'</strong></div></div>';}
async function showTab(tab){
 if(!current)return;const stamp=++requestId;
 host.querySelectorAll('[data-kp-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.kpTab===tab)));
 const body=host.querySelector('.kp-body');body.innerHTML='<div class="kp-empty">Loading ESPN kicker data…</div>';
 if(tab==='history'){
  const results=await Promise.all(seasons.map(y=>getSeason(current.id,y)));if(stamp!==requestId)return;
  const rows=results.filter(Boolean);body.innerHTML=rows.length?'<table class="kp-table"><thead><tr><th>Year</th><th>Team</th><th>GP</th><th>PPG</th><th>Points</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><button data-kp-history-year="'+r.year+'">'+r.year+'</button></td><td>'+esc(r.team)+'</td><td>'+r.gp+'</td><td>'+pts(r.ppg)+'</td><td>'+pts(r.points)+'</td></tr>').join('')+'</tbody></table>':'<div class="kp-empty">No completed ESPN kicking seasons available.</div>';return;
 }
 const s=await getSeason(current.id,current.year);if(stamp!==requestId)return;
 if(tab==='overview'){body.innerHTML=s?summary(s)+'<div class="kp-empty">ESPN standard fantasy kicker scoring · '+s.year+'</div>':'<div class="kp-empty">No ESPN kicker stats available for this season.</div>';return;}
 const available=seasons.filter(y=>y<=2026);
 const select='<label class="kp-year">Season <select>'+available.map(y=>'<option value="'+y+'"'+(y===current.year?' selected':'')+'>'+y+'</option>').join('')+'</select></label>';
 body.innerHTML=select+(s?summary(s)+(s.games.length?'<table class="kp-table"><thead><tr><th>Week</th><th>Fantasy points</th></tr></thead><tbody>'+s.games.map(g=>'<tr><td>Week '+g.week+'</td><td>'+pts(g.points)+'</td></tr>').join('')+'</tbody></table>':'<div class="kp-empty">No completed weekly games found.</div>'):'<div class="kp-empty">No ESPN game log found for '+current.year+'.</div>');
}
function open(player){
 const id=Number(player?.id);if(!Number.isInteger(id)||id<=0)return false;
 ensure();previousFocus=document.activeElement;current={id,name:String(player.name||'Kicker'),team:String(player.team||''),year:2026};
 const lg=logo(current.team);
 host.querySelector('.kp-top').innerHTML='<img class="kp-portrait" src="https://a.espncdn.com/i/headshots/nfl/players/full/'+id+'.png" alt="" onerror="this.style.opacity=\'0\'"><div><h2 class="kp-name">'+esc(current.name)+'</h2><div class="kp-team">'+(lg?'<img src="'+lg+'" alt="">':'')+esc(current.team)+' · K</div></div><button class="kp-close" type="button" aria-label="Close">×</button>';
 host.hidden=false;document.body.classList.add('shua-kicker-open');host.querySelector('.kp-close').focus();showTab('overview');return true;
}
window.ShuaKickerProfile={open,close};
})();