/* Draft stock across Jack's 11 included 2026 ESPN fantasy teams. */
(()=>{
'use strict';
const source=window.ShuaStockDrafts;
const nav=document.querySelector('.positions'),main=document.querySelector('main');
if(!source?.leagues?.length||!nav||!main||document.getElementById('shuaStock'))return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const logos={WAS:'wsh',WSH:'wsh',GB:'gb',GNB:'gb',LAR:'lar',LA:'lar',LAC:'lac',LV:'lv',JAX:'jax',KC:'kc',NE:'ne',NO:'no',SF:'sf',TB:'tb'};
const logo=t=>{const code=logos[t]||String(t||'').toLowerCase();return /^[a-z]{2,3}$/.test(code)?'https://a.espncdn.com/i/teamlogos/nfl/500/'+code+'.png':''};
const section=document.createElement('section');section.id='shuaStock';section.hidden=true;main.append(section);
const button=document.createElement('button');button.type='button';button.className='pos';button.dataset.pos='STOCK';button.textContent='Stock';nav.append(button);
const style=document.createElement('style');style.textContent=`
body.shua-stock-open main>*:not(#shuaStock){display:none!important}body.shua-stock-open #shuaStock{display:block!important}
body.shua-stock-open .positions [data-pos="STOCK"]{background:#114b3a!important;color:#c8ffeb!important;border-color:#26d69a!important}
#shuaStock{max-width:1200px;margin:0 auto;color:#edf8ff;padding:17px 12px 75px}
#shuaStock .stock-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}
#shuaStock h2{font-size:clamp(21px,3vw,29px);font-weight:900;margin:0 0 3px}
#shuaStock .stock-sub{font-size:12px;color:#98b7c9;margin:0}
#shuaStock .stock-count{white-space:nowrap;color:#31e4a3;background:#10392e;border:1px solid #21674f;border-radius:30px;padding:7px 10px;font-size:12px;font-weight:850}
#shuaStock .stock-filters{display:flex;gap:6px;overflow-x:auto;padding-bottom:9px;margin-bottom:10px;scrollbar-width:none}
#shuaStock .stock-filters button{flex:0 0 auto;border:1px solid #3a586d;background:#0c2940;color:#b6cfe0;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:850;cursor:pointer}
#shuaStock .stock-filters button[aria-pressed="true"]{color:#fff;background:#136348;border-color:#29dda0}
#shuaStock .stock-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
#shuaStock .stock-group{min-width:0;background:#0a2034;border:1px solid #2a4c64;border-radius:13px;overflow:hidden}
#shuaStock .stock-group-head{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#102c44}
#shuaStock h3{margin:0;font-size:15px;font-weight:900}#shuaStock .stock-group-head small{color:#a0bcd0;font-size:11px}
#shuaStock .stock-header,#shuaStock .stock-row{display:grid;grid-template-columns:27px minmax(0,1fr) 55px 60px;align-items:center;column-gap:7px}
#shuaStock .stock-header{padding:8px 10px;color:#90abc0;font-size:9px;font-weight:850;text-transform:uppercase}
#shuaStock .stock-header span:nth-child(n+3){text-align:right}
#shuaStock .stock-row{padding:7px 10px;min-height:49px;border-top:1px solid #ffffff12}
#shuaStock .stock-rank{text-align:center;color:#9bb3c4;font-size:12px;font-weight:800}
#shuaStock .stock-person{display:flex;align-items:center;gap:8px;min-width:0;border:0;background:transparent;color:#f4faff;text-align:left;cursor:pointer;padding:0}
#shuaStock .stock-face{height:38px;width:38px;flex:0 0 38px;object-fit:cover;border-radius:50%;background:#1b3b51}
#shuaStock .stock-logo{height:15px;width:15px;object-fit:contain;vertical-align:middle;margin-right:4px}
#shuaStock .stock-name{min-width:0;font-size:12px;font-weight:850;line-height:1.2;overflow-wrap:anywhere}
#shuaStock .stock-meta{font-size:10px;color:#96b5c8;margin-top:4px}
#shuaStock .stock-num{text-align:right;font-size:15px;font-weight:900;font-variant-numeric:tabular-nums}
#shuaStock .stock-percent{text-align:right;color:#36e3a7;font-weight:900;font-size:13px;font-variant-numeric:tabular-nums}
#shuaStock .stock-modes{display:flex;gap:6px;margin-bottom:10px;overflow-x:auto;scrollbar-width:none}
#shuaStock .stock-modes button{flex:1 0 auto;max-width:180px;min-height:35px;border-radius:8px;border:1px solid #355a6b;background:#0f3047;color:#bbd8e8;font-weight:850;font-size:12px;cursor:pointer}
#shuaStock .stock-modes button[aria-pressed="true"]{background:#136348;border-color:#31dca1;color:#fff}
#shuaStock .stock-row.stock-current,#shuaStock .stock-header.stock-current{grid-template-columns:27px minmax(0,1fr) 44px 44px 60px}
#shuaStock .stock-row.stock-performance,#shuaStock .stock-header.stock-performance{grid-template-columns:27px minmax(0,1fr) 44px 44px 65px 44px}
#shuaStock .stock-value{text-align:right;font-size:12px;font-weight:850;font-variant-numeric:tabular-nums}
#shuaStock .stock-value small{font-weight:550;font-size:10px;display:block;color:#a7becf}
#shuaStock .stock-down{color:#ff9098!important}#shuaStock .stock-up{color:#36e3a7!important}
@media(max-width:750px){#shuaStock{padding:10px 4px 70px}#shuaStock .stock-groups{grid-template-columns:1fr;gap:9px}#shuaStock .stock-top{padding:0 4px}#shuaStock .stock-group-head{padding:9px 10px}#shuaStock .stock-row{grid-template-columns:23px minmax(0,1fr) 48px 52px;padding:6px;column-gap:5px}#shuaStock .stock-header{grid-template-columns:23px minmax(0,1fr) 48px 52px;padding:7px 6px;column-gap:5px}#shuaStock .stock-face{width:35px;height:35px;flex-basis:35px}#shuaStock .stock-name{font-size:12px}#shuaStock .stock-num{font-size:14px}#shuaStock .stock-percent{font-size:12px}}
@media(max-width:750px){#shuaStock .stock-row.stock-current,#shuaStock .stock-header.stock-current{grid-template-columns:23px minmax(0,1fr) 34px 37px 55px}#shuaStock .stock-row.stock-performance,#shuaStock .stock-header.stock-performance{grid-template-columns:23px minmax(0,1fr) 30px 32px 49px 33px}#shuaStock .stock-value{font-size:11px}#shuaStock .stock-value small{font-size:9px}}
body.phone-mode #shuaStock .stock-groups{grid-template-columns:1fr;gap:9px}
body.phone-mode #shuaStock .stock-row.stock-current,body.phone-mode #shuaStock .stock-header.stock-current{grid-template-columns:23px minmax(0,1fr) 34px 37px 55px}
body.phone-mode #shuaStock .stock-row.stock-performance,body.phone-mode #shuaStock .stock-header.stock-performance{grid-template-columns:23px minmax(0,1fr) 30px 32px 49px 33px}
`;document.head.append(style);
const order=['QB','RB','WR','TE','K','D/ST'];const denominator=source.leagues.length;
const grouped=new Map(order.map(pos=>[pos,new Map()]));
for(const league of source.leagues){
 const seen=new Set();
 for(const p of league.picks||[]){
  if(!grouped.has(p.pos)||seen.has(String(p.id)))continue;seen.add(String(p.id));
  const bucket=grouped.get(p.pos),key=String(p.id);
  if(!bucket.has(key))bucket.set(key,{...p,leagues:[]});
  bucket.get(key).leagues.push(league.name.trim());
 }
}
const players=Object.fromEntries(order.map(pos=>[pos,[...grouped.get(pos).values()].sort((a,b)=>b.leagues.length-a.leagues.length||a.name.localeCompare(b.name))]));
const currentGroups=new Map(order.map(pos=>[pos,new Map()]));
for(const league of window.ShuaPortfolioData?.leagues||[]){
 const seen=new Set();for(const p of league.roster||[]){const pos=p.pos==='DST'?'D/ST':p.pos,id=String(p.id);if(!currentGroups.has(pos)||seen.has(id))continue;seen.add(id);
 const bucket=currentGroups.get(pos);if(!bucket.has(id))bucket.set(id,{id,name:p.name,pos,nfl:p.team,leagues:[]});bucket.get(id).leagues.push(league.name);
 }
}
const currentPlayers=Object.fromEntries(order.map(pos=>[pos,[...currentGroups.get(pos).values()]]));
let filter='ALL',mode='draft',metricLoading=false,metricError='';
function metricsById(){return new Map((window.ShuaPortfolioMetrics?.players||[]).map(p=>[String(p[0]),p]));}
function loadMetrics(){if(window.ShuaPortfolioMetrics)return Promise.resolve();if(metricLoading)return Promise.resolve();metricLoading=true;metricError='';return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='portfolio-metrics.js?v=20261026-2';script.async=true;script.onload=()=>{metricLoading=false;resolve();render()};script.onerror=()=>{metricLoading=false;metricError='Performance data unavailable.';reject(new Error(metricError));render()};document.head.append(script);});}
const avg=(p,field)=>{const vals=(p?.picks||[]).map(x=>Number(x[field])).filter(n=>Number.isFinite(n));return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):'—';};
function combined(pos){const list=new Map();for(const p of players[pos])list.set(String(p.id),{...p,picks:[...source.leagues.flatMap(l=>(l.picks||[]).filter(x=>String(x.id)===String(p.id)))]});
 for(const p of currentPlayers[pos]){const id=String(p.id);if(!list.has(id))list.set(id,{...p,leagues:[],picks:[]});list.get(id).current=p.leagues;}
 return [...list.values()].sort((a,b)=>mode==='current'?(b.current?.length||0)-(a.current?.length||0)||b.leagues.length-a.leagues.length:b.leagues.length-a.leagues.length||a.name.localeCompare(b.name));
}
function render(){
 const groups=order.filter(pos=>filter==='ALL'||filter===pos);
 section.innerHTML='<div class="stock-top"><div><h2>Stock</h2><p class="stock-sub">'+(mode==='draft'?'2026 draft picks · Week 1 baseline':mode==='current'?'Drafted vs current ownership · Flaim snapshot':'Draft round vs actual 2026 full-PPR production')+'</p></div><span class="stock-count">'+denominator+' Teams</span></div>'+
 '<div class="stock-modes">'+[['draft','Draft Stock'],['current','Current Stock'],['performance','Performance']].map(([m,label])=>'<button type="button" data-stock-mode="'+m+'" aria-pressed="'+(mode===m)+'">'+label+'</button>').join('')+'</div>'+
 '<div class="stock-filters">'+['ALL',...order].map(pos=>'<button type="button" data-stock-position="'+pos+'" aria-pressed="'+(filter===pos)+'">'+pos+'</button>').join('')+'</div>'+
 (metricError?'<p class="stock-sub">'+esc(metricError)+'</p>':'')+
 '<div class="stock-groups">'+groups.map(pos=>{
  const list=mode==='draft'?players[pos]:combined(pos).filter(p=>mode==='performance'?(p.leagues?.length||0)>0:(p.current?.length||0)>0||(p.leagues?.length||0)>0);
  const cls=mode==='draft'?'':' stock-'+mode;
  const cols=mode==='draft'?['#','Player','Teams','Stock %']:mode==='current'?['#','Player','Draft','Now','Now %']:['#','Player','Picks','Rd','PPG / Pts','Pos #'];
  const stats=metricsById();
  return '<div class="stock-group"><div class="stock-group-head"><h3>'+pos+'</h3><small>'+list.length+' players</small></div><div class="stock-header'+cls+'">'+cols.map(c=>'<span>'+c+'</span>').join('')+'</div>'+
  list.map((p,i)=>{const nfl=logo(p.nfl),defense=pos==='D/ST',portrait=defense?nfl:'https://a.espncdn.com/i/headshots/nfl/players/full/'+encodeURIComponent(p.id)+'.png';
   const draftCount=p.leagues?.length||0,now=p.current?.length||0,row=stats.get(String(p.id)),pct=(100*now/denominator).toFixed(1),change=now-draftCount;
   const cells=mode==='draft'?'<span class="stock-num">'+draftCount+'</span><span class="stock-percent">'+(100*draftCount/denominator).toFixed(1)+'%</span>':mode==='current'?'<span class="stock-value">'+draftCount+'</span><span class="stock-value '+(change>0?'stock-up':change<0?'stock-down':'')+'">'+now+'<small>'+(change>0?'+':'')+change+'</small></span><span class="stock-percent">'+pct+'%</span>':'<span class="stock-value">'+draftCount+'</span><span class="stock-value">'+avg(p,'round')+'</span><span class="stock-value">'+(row&&row[5]!=null?Number(row[5]).toFixed(1):'—')+'<small>'+(row&&row[4]!=null?Number(row[4]).toFixed(1)+' pts':'—')+'</small></span><span class="stock-value">'+(row&&row[12]!=null?'#'+row[12]:'—')+'</span>';
   return '<div class="stock-row'+cls+'"><span class="stock-rank">'+(i+1)+'</span><button class="stock-person" type="button" data-stock-id="'+esc(p.id)+'" data-stock-pos="'+pos+'" title="'+esc((p.leagues||[]).join(' · '))+'"><img class="stock-face" src="'+portrait+'" loading="lazy" alt=""><span class="stock-name">'+esc(p.name)+'<span class="stock-meta">'+(defense?'D/ST · ':'')+(defense?'':nfl?'<img class="stock-logo" src="'+nfl+'" alt="">':'')+esc(p.nfl||'')+'</span></span></button>'+cells+'</div>';
  }).join('')+'</div>';
 }).join('')+'</div>'+'<p class="stock-sub" style="padding-top:10px">'+(mode==='performance'?'Performance metrics use full-PPR season actuals, not league-specific weekly projections. K/DST stats show — where not in the source.':mode==='current'?'Current ownership includes waiver and trade additions; drafted percentages remain fixed to Week 1.':'Players are counted once per league from verified ESPN drafts.')+'</p>';
}
section.addEventListener('click',e=>{
 const pos=e.target.closest('[data-stock-position]');if(pos){filter=pos.dataset.stockPosition;render();return;}
 const chosen=e.target.closest('[data-stock-mode]');if(chosen){mode=chosen.dataset.stockMode;render();if(mode==='performance'&&!window.ShuaPortfolioMetrics)loadMetrics().catch(()=>{});return;}
 const entry=e.target.closest('[data-stock-id]');if(!entry)return;
 const p=mode==='draft'?Object.values(players).flat().find(p=>String(p.id)===entry.dataset.stockId):combined(entry.dataset.stockPos).find(p=>String(p.id)===entry.dataset.stockId);
 if(p&&typeof window.openUnifiedPlayerProfileByName==='function')window.openUnifiedPlayerProfileByName(p.name,{id:p.id,name:p.name,team:p.nfl,position:p.pos,seasonYear:2026,source:'stock'});
});
function show(){document.body.classList.add('shua-stock-open');section.hidden=false;nav.querySelectorAll('.pos').forEach(b=>b.classList.toggle('active',b===button));}
function hide(){document.body.classList.remove('shua-stock-open');section.hidden=true;button.classList.remove('active');}
document.addEventListener('click',e=>{const target=e.target.closest('.positions [data-pos]');if(target&&target!==button)hide();},true);
nav.addEventListener('click',e=>{const target=e.target.closest('[data-pos]');if(!target)return;if(target===button){e.preventDefault();e.stopImmediatePropagation();show();}else hide();},true);
render();
})();
