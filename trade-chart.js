/* SHUA four-column trade chart: reuses the calculator's exact published values. */
(function(){
'use strict';
const section=document.getElementById('tradeSection'),shell=section?.querySelector('.trade-shell');
if(!shell||document.getElementById('tradeChartPanel'))return;
const positions=[['RB','Running Backs'],['WR','Wide Receivers'],['TE','Tight Ends'],['QB','Quarterbacks']];
const teamSlugs={ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GNB:'gb',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KAN:'kc',KC:'kc',LAC:'lac',LAR:'lar',LVR:'lv',LV:'lv',MIA:'mia',MIN:'min',NWE:'ne',NE:'ne',NOR:'no',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SFO:'sf',SF:'sf',TAM:'tb',TB:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'};
const aliases={kennethwalkeriii:'kennethwalker',michaelpittmanjr:'michaelpittman',brianthomasjr:'brianthomas',marvinharrisonjr:'marvinharrison',chigokonkwo:'chigoziemokonkwo',lutherburdeniii:'lutherburden',haroldfanninjr:'haroldfannin',joshpalmer:'joshuapalmer',jamescookiii:'jamescook'};
const key=n=>{const v=String(n||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');return aliases[v]||v;};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
const format=(v,d=1)=>number(v)===null?'—':Number(v).toFixed(d);
let view='calculator',pos='ALL',stats=new Map(),statsStatus='pending',pending=null,search='';
const chooser=document.createElement('div');chooser.className='trade-chart-views';chooser.setAttribute('role','group');chooser.setAttribute('aria-label','Trade section view');
chooser.innerHTML='<button class="trade-chart-view-btn" type="button" data-tcc-view="calculator" aria-pressed="true">Trade Calculator</button><button class="trade-chart-view-btn" type="button" data-tcc-view="chart" aria-pressed="false">Trade Chart</button>';
shell.insertBefore(chooser,shell.firstChild);
const panel=document.createElement('div');panel.id='tradeChartPanel';panel.hidden=true;
panel.innerHTML='<div class="tcc-shell"><div class="tcc-tools"><div class="tcc-tools-search"><label for="tradeChartSearch">Find player</label><input id="tradeChartSearch" type="search" autocomplete="off" placeholder="Search this trade chart…"></div><div class="tcc-position-picker" role="group" aria-label="Chart positions">'+['ALL','RB','WR','TE','QB'].map(p=>'<button type="button" data-tcc-pos="'+p+'" aria-pressed="'+(p==='ALL')+'">'+(p==='ALL'?'All':p)+'</button>').join('')+'</div></div><p class="tcc-caption" id="tradeChartSourceInfo">Values use your Big Board and existing Trade Calculator scale. Loading rankings…</p><div id="tradeChartContent" class="tcc-status" role="status">Loading your rankings…</div></div>';
shell.append(panel);
const nameLabels={RB:'RUNNING BACKS',WR:'WIDE RECEIVERS',TE:'TIGHT ENDS',QB:'QUARTERBACKS'};
function source(){try{return window.ShuaTradeChartSource?.()||null;}catch(e){return null;}}
function groupRows(players){
 const seen=new Set();
 const pool=players.filter(p=>positions.some(x=>x[0]===p.position)&&(pos==='ALL'||p.position===pos)&&number(p.value)!==null)
 .filter(p=>{const id=key(p.name)+'|'+p.position;if(seen.has(id))return false;seen.add(id);return true;})
 .sort((a,b)=>b.value-a.value||a.rank-b.rank||a.positionRank-b.positionRank||a.name.localeCompare(b.name));
 const bands=[];
 for(let i=0;i<pool.length;){
  const v=number(pool[i].value),size=v>=100?2:v>=55?3:v>=20?4:v>=5?5:6;
  const part=pool.slice(i,i+size);
  bands.push({high:part[0].value,low:part[part.length-1].value,players:part});
  i+=part.length;
 }
 return bands;
}
function tone(v,kind,position){
 if(number(v)===null)return 'neutral';
 if(kind==='fpoe'||kind==='trend')return v>=3?'great':v>=.7?'good':v<=-3?'awful':v<=-.7?'bad':'neutral';
 const thresholds={QB:[25,20,14,9],RB:[20,15,10,5],WR:[18,14,9,5],TE:[14,10,7,3]};
 const [high,good,poor,low]=thresholds[position]||thresholds.WR;
 return v>=high?'great':v>=good?'good':v<low?'awful':v<poor?'bad':'neutral';
}
function logo(team){
 const slug=teamSlugs[team];return slug?'<img class="tcc-logo" loading="lazy" alt="" src="https://a.espncdn.com/i/teamlogos/nfl/500/'+slug+'.png">':'<span></span>';
}
function playerHtml(player,mode){
 const s=stats.get(key(player.name))||{};
 const fpg=number(s.fpg),fpoe=number(s.fpoe),trend=number(s.trend);
 const signed=n=>number(n)===null?'—':(n>0?'+':'')+format(n,1);
 const cls=player.tag==='draft'?'tag-draft':player.tag==='do-not-draft'?'tag-do-not-draft':'';
 const sourceRank=mode==='ROS'?(player.position+' #'+player.positionRank+' ROS'):('#'+player.rank+' Big Board');
 return '<div class="tcc-player '+cls+'" data-tcc-player="'+esc(key(player.name))+'" title="'+esc(sourceRank+' · Trade Value '+format(player.value,1))+'">'+logo(player.team)+
 '<div class="tcc-identity"><button type="button" class="tcc-player-name" data-trade-profile="'+encodeURIComponent(player.name)+'" title="'+esc(player.name)+'">'+esc(player.name)+'</button><small>'+esc(sourceRank)+'</small></div>'+
 '<span class="tcc-amount" title="Your calculated trade value">'+format(player.value,1)+'</span>'+
 '<span class="tcc-number '+tone(trend,'trend',player.position)+'" title="2026 xFP/G trend: recent 3 weeks minus prior 3">'+signed(trend)+'</span>'+
 '<span class="tcc-number '+tone(fpg,'fpg',player.position)+'" title="Actual ESPN 2026 full-PPR points per recorded game">'+format(fpg,1)+'</span>'+
 '<span class="tcc-number '+tone(fpoe,'fpoe',player.position)+'" title="Fantasy points over expected per verified 2026 game">'+signed(fpoe)+'</span></div>';
}
function render(){
 if(view!=='chart')return;
 const holder=document.getElementById('tradeChartContent');if(!holder)return;
 const previous=holder.querySelector('#tradeChartScroll');const oldX=previous?.scrollLeft||0;
 const src=source(),data=src?.players||[],mode=src?.mode||'PRESEASON';
 if(!data.length){holder.className='tcc-status';holder.textContent='Loading your published Big Board and positional rankings…';return;}
 const selected=positions.filter(x=>pos==='ALL'||x[0]===pos);
 const bands=groupRows(data);
 const count=bands.reduce((n,b)=>n+b.players.length,0);
 const info=document.getElementById('tradeChartSourceInfo');
 if(info)info.textContent=count+' players · '+(mode==='ROS'?'Your ROS positional ordering on your existing cross-position trade-value slots':'Your exact Big Board overall ordering')+
 ' · Same trade-value numbers as the calculator · 2026 PPR/G and FPOE are observed, not forecasts.';
 let html='<div class="tcc-paper"><div class="tcc-title-row"><h3 class="tcc-title"><em>SHUA TRADE CHART</em> &amp; RANKINGS</h3><div class="tcc-legend"><span><b class="tag-draft">Green</b> Your draft tag</span><span><b class="tag-avoid">Red</b> Your do-not-draft tag</span></div></div>';
 html+='<p class="tcc-subtitle">'+(mode==='ROS'?'REST OF SEASON':'PRESEASON')+' | 2026 PPR | Built from your rankings, not Kyle Menton’s. Chart columns: player, value, xFP Δ, FPG, FPOE/G.</p>';
 html+='<div class="tcc-scroll" id="tradeChartScroll" tabindex="0" role="region" aria-label="Trade values for running backs, wide receivers, tight ends and quarterbacks; swipe sideways on phones"><div class="tcc-table '+(pos==='ALL'?'':'tcc-one')+'">';
 html+='<div class="tcc-headers"><div class="tcc-haxis">VALUE</div>'+selected.map(([p])=>'<div class="tcc-hposition '+p.toLowerCase()+'">'+nameLabels[p]+'<span>PLAYER · VALUE · xFP Δ · FPG · FPOE</span></div>').join('')+'</div>';
 for(const band of bands){
  const label=band.high===band.low?format(band.high,1):format(band.high,1)+' – '+format(band.low,1);
  html+='<div class="tcc-band"><div class="tcc-axis"><strong>'+esc(label)+'</strong><small>trade value</small></div>';
  for(const [p] of selected)html+='<div class="tcc-lane">'+band.players.filter(x=>x.position===p).map(x=>playerHtml(x,mode)).join('')+'</div>';
  html+='</div>';
 }
 html+='</div></div><p class="tcc-footer">Trade values are those already used by your calculator: max(0.1, 150 × exp(−0.04 × (overall rank − 1))). In ROS mode, positional ROS rankings fill the calculator’s existing preseason cross-position value slots. Individual values shown on every player. xFP Δ = three-game expected-points trend; FPG = observed PPR points per game; FPOE/G = fantasy points over expected per matched game. Blank or unavailable source values show —. Missing advanced statistics never change the trade-value order. '+(statsStatus==='loaded'?'Season statistics loaded.':statsStatus==='error'?'Season-stat source unavailable; trade values remain valid.':'Loading optional season statistics…')+'</p></div>';
 holder.className='';holder.innerHTML=html;const current=holder.querySelector('#tradeChartScroll');if(current)current.scrollLeft=oldX;applySearch(false);
}
function applySearch(jump){
 const q=key(search),players=panel.querySelectorAll('.tcc-player');
 let matches=0,first=null;
 players.forEach(el=>{
  const match=!q||el.dataset.tccPlayer.includes(q);
  el.classList.toggle('tcc-match',!!q&&match);
  el.classList.toggle('tcc-dim',!!q&&!match);
  if(q&&match){matches++;if(!first)first=el;}
 });
 if(jump&&first)first.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
}
function switchView(next){
 view=next==='chart'?'chart':'calculator';
 chooser.querySelectorAll('[data-tcc-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tccView===view)));
 section.classList.toggle('trade-chart-view',view==='chart');
 panel.hidden=view!=='chart';
 syncHeading();
 if(view==='chart'){render();fetchStats();}
}
function syncHeading(){
 if(section.hidden)return;
 const title=document.getElementById('title'),sub=document.getElementById('sub');
 if(title)title.textContent=view==='chart'?'Trade Chart':'Trade Calculator';
 if(sub)sub.textContent=view==='chart'?'Based on your published rankings and values':'Powered by your Big Board';
}
function fetchStats(){
 if(pending||statsStatus==='loaded')return;
 statsStatus='loading';
 pending=Promise.allSettled([
 fetch('analytics/data/season-2026.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('ESPN history '+r.status);return r.json();}),
 fetch('analytics/data/ranked-usage-2026.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Ranked usage '+r.status);return r.json();})
 ]).then(results=>{
  if(results[0].status==='rejected'&&results[1].status==='rejected')throw Error('No verified 2026 statistics');
  const season=results[0].status==='fulfilled'?results[0].value:null;
  const usage=results[1].status==='fulfilled'?results[1].value:null;
  const next=new Map();
  if(season?.year===2026)for(const p of season.players||[]){
   const gamePoints=(p.games||[]).filter(g=>g.hasStats!==false&&number(g.totalPoints)!==null).map(g=>Number(g.totalPoints));
   if(!gamePoints.length)continue;
   next.set(key(p.name),{fpg:gamePoints.reduce((a,b)=>a+b,0)/gamePoints.length});
  }
  if(usage?.season===2026)for(const p of Object.values(usage.players||{})){
   const k=key(p.name),s=next.get(k)||{};
   const n=number(p.expectedPointsCoverage?.matchedWeeks),oe=number(p.fantasyPointsOverExpected);
   s.fpoe=n>0&&oe!==null?oe/n:null;
   const covers=p.nextUsageCoverage;
   s.trend=(number(p.expectedFantasyPointsTrend)!==null&&covers?.trendRecentWeeks>=2&&covers?.trendPriorWeeks>=2)?Number(p.expectedFantasyPointsTrend):null;
   next.set(k,s);
  }
  stats=next;statsStatus='loaded';render();
 }).catch(()=>{statsStatus='error';render();});
}
chooser.addEventListener('click',e=>{const b=e.target.closest('[data-tcc-view]');if(b)switchView(b.dataset.tccView);});
panel.querySelector('#tradeChartSearch').addEventListener('input',e=>{search=e.target.value;applySearch(false);});
panel.querySelector('#tradeChartSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applySearch(true);}});
panel.querySelector('.tcc-position-picker').addEventListener('click',e=>{
 const b=e.target.closest('[data-tcc-pos]');if(!b)return;pos=b.dataset.tccPos;
 panel.querySelectorAll('[data-tcc-pos]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 render();
});
window.addEventListener('shua:trade-data-updated',()=>render());
window.ShuaTradeChartUI={syncHeading,get isChart(){return view==='chart';},groupRows};
})();