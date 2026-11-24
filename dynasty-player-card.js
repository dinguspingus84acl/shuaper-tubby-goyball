/* Goyball player-card Dynasty tab. Uses locally cached Dynasty market data. */
(()=>{
'use strict';
const FILES={
  rankings:'dynasty-rankings.json',
  history:'dynasty-history.json',
  details:'dynasty-player-details.json'
};
const allowed=new Set(['QB','RB','WR','TE']);
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const rank=v=>num(v)&&num(v)>0?'#'+num(v):'—';
const int=v=>num(v)!==null?Math.round(num(v)).toLocaleString():'—';
const pct=v=>num(v)!==null?(num(v)>0?'+':'')+num(v).toFixed(1)+'%':'—';
let cachePromise=null,data=null,dynastyActive=false,format='1QB',rangeDays=90,subview='value';

const style=document.createElement('style');
style.id='dynastyPlayerCardStyles';
style.textContent=`
#unifiedDynastyPanel{padding-top:10px}
.dpc-shell{display:grid;gap:10px}
.dpc-toolbar{display:flex;gap:6px;align-items:center;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
.dpc-toolbar::-webkit-scrollbar{display:none}
.dpc-toolbar button{flex:0 0 auto;border:1px solid #ffffff20;background:#081a2d;color:#90a4b8;border-radius:8px;padding:7px 10px;font-size:.62rem;font-weight:950}
.dpc-toolbar button.active{background:#173f61;color:#fff;border-color:#5f90b8}
.dpc-format{margin-left:auto}
.dpc-card{border:1px solid #ffffff16;border-radius:11px;background:#07192b;padding:10px}
.dpc-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
.dpc-title strong{font-size:.74rem}
.dpc-title small{color:#7f93aa;font-size:.58rem}
.dpc-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
.dpc-stat{border:1px solid #ffffff12;border-radius:9px;background:#0a2034;padding:9px;min-width:0}
.dpc-stat span{display:block;color:#7f93aa;font-size:.55rem;font-weight:850;line-height:1.15}
.dpc-stat b{display:block;margin-top:4px;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dpc-chart-wrap{height:220px;position:relative}
.dpc-chart{width:100%;height:100%;display:block;overflow:visible}
.dpc-axis{fill:#7890a7;font-size:8px;font-weight:800}
.dpc-grid-line{stroke:#ffffff12;stroke-width:1}
.dpc-value-line{fill:none;stroke:var(--profile-accent,#55a4e3);stroke-width:2.5;vector-effect:non-scaling-stroke}
.dpc-point{fill:#dff5ff;stroke:var(--profile-accent,#55a4e3);stroke-width:1.5}
.dpc-range{display:flex;gap:5px}
.dpc-range button{border:1px solid #ffffff1b;background:transparent;color:#8499ae;border-radius:7px;padding:5px 8px;font-size:.56rem;font-weight:900}
.dpc-range button.active{background:#183d63;color:#fff}
.dpc-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
.dpc-adjacent{display:grid;gap:5px}
.dpc-adjacent button{width:100%;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid #ffffff12;border-radius:8px;background:#081a2d;color:#fff;padding:7px 9px;text-align:left}
.dpc-adjacent button.current{border-color:var(--profile-accent,#55a4e3);background:#102a43}
.dpc-adjacent small{color:#8196aa}.dpc-adjacent b{white-space:nowrap}
.dpc-bar-chart{height:190px;display:flex;align-items:flex-end;gap:6px;padding:8px 2px 22px;position:relative}
.dpc-bar-col{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px}
.dpc-bar{width:min(28px,70%);min-height:2px;background:var(--profile-accent,#55a4e3);border-radius:5px 5px 2px 2px}
.dpc-bar-col small{font-size:.5rem;color:#7890a7;white-space:nowrap}
.dpc-bar-col b{font-size:.55rem;color:#dfeaf3}
.dpc-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.dpc-list{display:grid;gap:0}
.dpc-row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid #ffffff0d;font-size:.64rem}
.dpc-row:first-child{border-top:0}.dpc-row span{color:#8297aa}.dpc-row b{text-align:right}
.dpc-empty{padding:18px;text-align:center;color:#7f93aa;font-size:.65rem}
.dpc-subview[hidden]{display:none!important}
@media(max-width:650px){
 .dpc-summary,.dpc-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
 .dpc-profile-grid{grid-template-columns:1fr}
 .dpc-chart-wrap{height:190px}
 .dpc-format{margin-left:0}
 .dpc-toolbar{flex-wrap:nowrap}
}
`;
document.head.append(style);

async function loadData(){
  if(data)return data;
  if(cachePromise)return cachePromise;
  cachePromise=Promise.all([
    fetch(FILES.rankings,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(Error('rankings'))),
    fetch(FILES.history,{cache:'no-store'}).then(r=>r.ok?r.json():({players:{}})),
    fetch(FILES.details,{cache:'no-store'}).then(r=>r.ok?r.json():({players:{}}))
  ]).then(([rankings,history,details])=>{
    const players=rankings.players||[];
    data={
      rankings,
      history,
      details,
      byName:new Map(players.map(p=>[norm(p.name),p])),
      byId:new Map(players.map(p=>[String(p.name_id||''),p]))
    };
    return data;
  }).finally(()=>{cachePromise=null});
  return cachePromise;
}

function currentName(){
  return document.getElementById('modal')?.dataset.unifiedName||document.getElementById('pn')?.textContent||'';
}
function currentPlayer(){
  if(!data)return null;
  return data.byName.get(norm(currentName()))||null;
}
function valueFields(p){
  const sf=format==='SF';
  return {
    value:num(sf?p.sf_trade_value:p.trade_value),
    overall:num(sf?p.sf_overall_rank:p.overall_rank),
    posRank:num(sf?p.sf_position_rank:p.position_rank),
    lastMonth:num(sf?p.last_month_value_sf:p.last_month_value),
    lastMonthRank:num(sf?p.last_month_rank_sf:p.last_month_rank),
    high90:num(sf?p.three_month_high_sf:p.three_month_high),
    low90:num(sf?p.three_month_low_sf:p.three_month_low),
    best90:num(sf?p.three_month_best_rank_sf:p.three_month_best_rank),
    worst90:num(sf?p.three_month_worst_rank_sf:p.three_month_worst_rank),
    allHigh:num(sf?p.all_time_high_sf:p.all_time_high),
    allLow:num(sf?p.all_time_low_sf:p.all_time_low),
    allBest:num(sf?p.all_time_best_rank_sf:p.all_time_best_rank),
    allWorst:num(sf?p.all_time_worst_rank_sf:p.all_time_worst_rank)
  };
}
function changePct(current,old){
  if(!current||!old)return null;
  return (current-old)/old*100;
}
function historyFor(p,days=rangeDays){
  const rows=data?.history?.players?.[p.name_id]||[];
  const cutoff=Date.now()-days*86400000;
  return rows.map(r=>({
    date:r.date,
    time:new Date(r.date).getTime(),
    value:num(format==='SF'?r.sf_trade_value:r.trade_value),
    rank:num(format==='SF'?r.sf_position_rank:r.position_rank)
  })).filter(x=>Number.isFinite(x.time)&&x.time>=cutoff&&x.value!==null).sort((a,b)=>a.time-b.time);
}
function svgLine(rows){
  if(!rows.length)return '<div class="dpc-empty">No value history is cached for this player yet.</div>';
  const W=640,H=200,L=42,R=10,T=12,B=26;
  const vals=rows.map(x=>x.value),min=Math.min(...vals),max=Math.max(...vals);
  const pad=Math.max(50,(max-min)*.12),lo=Math.max(0,min-pad),hi=max+pad;
  const x=(i)=>L+(W-L-R)*(rows.length===1?.5:i/(rows.length-1));
  const y=(v)=>T+(H-T-B)*(1-(v-lo)/(hi-lo||1));
  const pts=rows.map((r,i)=>x(i).toFixed(1)+','+y(r.value).toFixed(1)).join(' ');
  const ticks=[0,.25,.5,.75,1].map(t=>{
    const yy=T+(H-T-B)*t;
    const val=Math.round(hi-(hi-lo)*t);
    return '<line class="dpc-grid-line" x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'"></line><text class="dpc-axis" x="2" y="'+(yy+3)+'">'+val.toLocaleString()+'</text>';
  }).join('');
  const marks=[0,Math.floor((rows.length-1)/2),rows.length-1].filter((v,i,a)=>a.indexOf(v)===i).map(i=>{
    const d=new Date(rows[i].time);
    const label=d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
    return '<text class="dpc-axis" text-anchor="'+(i===0?'start':i===rows.length-1?'end':'middle')+'" x="'+x(i)+'" y="'+(H-4)+'">'+label+'</text>';
  }).join('');
  const dots=rows.filter((_,i)=>i===rows.length-1||i===0||i%Math.max(1,Math.floor(rows.length/8))===0).map(r=>{
    const i=rows.indexOf(r);
    return '<circle class="dpc-point" cx="'+x(i)+'" cy="'+y(r.value)+'" r="3"><title>'+new Date(r.time).toLocaleDateString()+': '+Math.round(r.value).toLocaleString()+'</title></circle>';
  }).join('');
  return '<svg class="dpc-chart" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="Dynasty value history">'+ticks+'<polyline class="dpc-value-line" points="'+pts+'"></polyline>'+dots+marks+'</svg>';
}
function metric(label,value){
  return '<div class="dpc-stat"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>';
}
function adjacentHtml(p){
  const sf=format==='SF';
  const list=(data.rankings.players||[]).filter(x=>allowed.has(x.position)).filter(x=>num(sf?x.sf_trade_value:x.trade_value)>0)
    .sort((a,b)=>(num(sf?b.sf_trade_value:b.trade_value)||0)-(num(sf?a.sf_trade_value:a.trade_value)||0));
  const idx=list.findIndex(x=>x.name_id===p.name_id);
  if(idx<0)return '<div class="dpc-empty">Adjacent players unavailable.</div>';
  return list.slice(Math.max(0,idx-2),Math.min(list.length,idx+3)).map((x,j)=>{
    const v=num(sf?x.sf_trade_value:x.trade_value);
    const r=list.indexOf(x)+1;
    const cur=x.name_id===p.name_id;
    return '<button type="button" class="'+(cur?'current':'')+'" data-dpc-player="'+encodeURIComponent(x.name)+'"><span>#'+r+'</span><span><strong>'+esc(x.name)+'</strong><br><small>'+esc(x.team||'—')+' · '+esc(x.position||'—')+'</small></span><b>'+int(v)+'</b></button>';
  }).join('');
}
function normalizeTradeVolume(raw){
  let rows=[];
  if(Array.isArray(raw))rows=raw;
  else if(raw&&typeof raw==='object'){
    if(Array.isArray(raw.mat_vw_trade_agg))rows=raw.mat_vw_trade_agg;
    else rows=Object.values(raw).filter(x=>x&&typeof x==='object');
  }
  return rows.map(x=>({
    interval:num(x.week_interval??x.interval??x.week??x.weeks_ago),
    count:num(x.count??x.trade_count??x.volume),
    rank:num(x.rank??x.overall_rank),
    posRank:num(x.position_rank)
  })).filter(x=>x.count!==null).sort((a,b)=>(b.interval??0)-(a.interval??0));
}
function tradeBars(rows){
  if(!rows.length)return '<div class="dpc-empty">Trade-volume history is not available for this player yet.</div>';
  const last=rows.slice(-8),max=Math.max(...last.map(x=>x.count),1);
  return '<div class="dpc-bar-chart">'+last.map((x,i)=>{
    const h=Math.max(3,x.count/max*140);
    const label=x.interval===1?'7d':x.interval?((x.interval-1)*7)+'-'+(x.interval*7)+'d':'';
    return '<div class="dpc-bar-col"><b>'+Math.round(x.count)+'</b><div class="dpc-bar" style="height:'+h+'px"></div><small>'+label+'</small></div>';
  }).join('')+'</div>';
}
function profileRows(obj){
  return Object.entries(obj).filter(([,v])=>v!==null&&v!==undefined&&v!=='').map(([k,v])=>'<div class="dpc-row"><span>'+esc(k)+'</span><b>'+esc(v)+'</b></div>').join('');
}
function combineMap(profile){
  const list=profile?.profile_json?.profile?.combine_metrics||[];
  const names={ht:'Height',wt:'Weight',forty:'40 Yard',bench:'Bench',vertical:'Vertical',broad_jump:'Broad Jump',cone:'3 Cone',shuttle:'Shuttle'};
  const out={};
  list.forEach(x=>{if(names[x.metric]&&x.value!==0&&x.value!=='0')out[names[x.metric]]=x.value});
  return out;
}
function renderValue(panel,p){
  const f=valueFields(p),hist=historyFor(p),hist90=historyFor(p,90);
  const values90=hist90.map(x=>x.value).filter(v=>v!==null);
  const ranks90=hist90.map(x=>x.rank).filter(v=>v!==null&&v>0);
  const target30=Date.now()-30*86400000;
  const ref30=hist90.length?hist90.reduce((best,x)=>Math.abs(x.time-target30)<Math.abs(best.time-target30)?x:best,hist90[0]):null;
  const lastMonth=f.lastMonth??ref30?.value??null;
  const high90=f.high90??(values90.length?Math.max(...values90):null);
  const low90=f.low90??(values90.length?Math.min(...values90):null);
  const best90=f.best90??(ranks90.length?Math.min(...ranks90):null);
  const worst90=f.worst90??(ranks90.length?Math.max(...ranks90):null);
  const chg=changePct(f.value,lastMonth);
  panel.innerHTML=
    '<div class="dpc-summary">'+
      metric('Dynasty Value',int(f.value))+
      metric('Overall Rank',rank(f.overall))+
      metric(p.position+' Rank',rank(f.posRank))+
      metric('30 Day Change',pct(chg))+
    '</div>'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Value History</strong><div class="dpc-range"><button data-dpc-range="30" class="'+(rangeDays===30?'active':'')+'">30D</button><button data-dpc-range="90" class="'+(rangeDays===90?'active':'')+'">90D</button></div></div><div class="dpc-chart-wrap">'+svgLine(hist)+'</div></div>'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Market Range</strong></div><div class="dpc-metrics">'+
      metric('90D High',int(high90))+
      metric('90D Low',int(low90))+
      metric('90D Best Rank',rank(best90))+
      metric('90D Worst Rank',rank(worst90))+
      metric('All-Time High',int(f.allHigh))+
      metric('All-Time Low',int(f.allLow))+
      metric('All-Time Best Rank',rank(f.allBest))+
      metric('All-Time Worst Rank',rank(f.allWorst))+
    '</div></div>'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Players Around '+esc(p.name)+'</strong></div><div class="dpc-adjacent">'+adjacentHtml(p)+'</div></div>';
}
function renderMarket(panel,p){
  const detail=data?.details?.players?.[p.name_id]||{};
  const rows=normalizeTradeVolume(detail.tradeVolume);
  const recent=rows.length?rows[rows.length-1]:null;
  const month=rows.filter(x=>x.interval!==null&&x.interval<=4).reduce((s,x)=>s+x.count,0);
  panel.innerHTML=
    '<div class="dpc-summary">'+
      metric('Trades Past Week',recent?int(recent.count):'—')+
      metric('Trades Past Month',rows.length?int(month):'—')+
      metric('Volume Overall Rank',recent?rank(recent.rank):'—')+
      metric('Volume '+p.position+' Rank',recent?rank(recent.posRank):'—')+
    '</div>'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Weekly Trade Volume</strong><small>Up to 8 weeks</small></div>'+tradeBars(rows)+'</div>';
}
function renderAdp(panel,p){
  const rows={
    'Average ADP':num(p.avg_adp),
    'FantasyPros':num(p.fantasypro_adp),
    'BestBall10s':num(p.bb10_adp),
    'RTSports':num(p.rtsports_adp),
    'Underdog':num(p.underdog_adp),
    'Drafters':num(p.drafters_adp)
  };
  panel.innerHTML='<div class="dpc-card"><div class="dpc-title"><strong>Dynasty ADP Snapshot</strong></div><div class="dpc-list">'+profileRows(rows)+'</div></div>'+
    '<div class="dpc-card"><div class="dpc-empty">Draft-selection scatter data is not cached yet. The current ADP snapshot above uses the same Dynasty player feed.</div></div>';
}
function renderProfile(panel,p){
  const detail=data?.details?.players?.[p.name_id]||{};
  const profile=detail.profile||{};
  const pj=profile.profile_json||{};
  const base=pj.profile||{};
  const contract=pj.contract||{};
  const ras=pj.ras||{};
  const athletic={
    'College':base.College,
    'Draft Round':base['Draft Round'],
    'Draft Pick':base['Draft Pick'],
    'RAS':ras.ras,
    ...combineMap(profile)
  };
  const contractRows={
    'Free Agent':contract.free_agent,
    'Per Year':contract.per_year,
    'Total Contract':contract.total,
    'Fully Guaranteed':contract.guaranteed_fully,
    'Total Guaranteed':contract.guaranteed_free
  };
  const rost=detail.rostership||{};
  const rosterRows={'Sleeper':rost.sleeper,'ESPN':rost.espn,'Yahoo':rost.yahoo};
  panel.innerHTML='<div class="dpc-profile-grid">'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Athletic / Draft Profile</strong></div><div class="dpc-list">'+(profileRows(athletic)||'<div class="dpc-empty">Profile data unavailable.</div>')+'</div></div>'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Contract</strong></div><div class="dpc-list">'+(profileRows(contractRows)||'<div class="dpc-empty">Contract data unavailable.</div>')+'</div></div>'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Rostership</strong></div><div class="dpc-list">'+(profileRows(rosterRows)||'<div class="dpc-empty">Rostership data unavailable.</div>')+'</div></div>'+
  '</div>';
}
function renderSubview(root,p){
  root.querySelectorAll('[data-dpc-subview]').forEach(b=>b.classList.toggle('active',b.dataset.dpcSubview===subview));
  const body=root.querySelector('.dpc-body');
  if(!body)return;
  if(subview==='market')renderMarket(body,p);
  else if(subview==='adp')renderAdp(body,p);
  else if(subview==='profile')renderProfile(body,p);
  else renderValue(body,p);
}
function renderPanel(){
  const panel=document.getElementById('unifiedDynastyPanel');
  if(!panel)return;
  const p=currentPlayer();
  if(!p||!allowed.has(p.position)){
    panel.innerHTML='<div class="dpc-empty">Dynasty data is available for QB, RB, WR and TE players.</div>';
    return;
  }
  panel.innerHTML='<div class="dpc-shell">'+
    '<div class="dpc-toolbar">'+
      '<button data-dpc-subview="value">Value</button>'+
      '<button data-dpc-subview="market">Market</button>'+
      '<button data-dpc-subview="adp">ADP</button>'+
      '<button data-dpc-subview="profile">Profile</button>'+
      '<button class="dpc-format '+(format==='SF'?'active':'')+'" data-dpc-format="SF">Superflex</button>'+
    '</div>'+
    '<div class="dpc-body"></div>'+
  '</div>';
  renderSubview(panel,p);
}
async function showDynasty(){
  dynastyActive=true;
  const tabs=document.querySelectorAll('#unifiedProfileTabs [data-profile-tab]');
  tabs.forEach(b=>b.classList.toggle('active',b.dataset.profileTab==='dynasty'));
  document.querySelectorAll('#unifiedProfilePanels [data-profile-panel]').forEach(p=>p.hidden=p.dataset.profilePanel!=='dynasty');
  const panel=document.getElementById('unifiedDynastyPanel');
  if(panel)panel.innerHTML='<div class="dpc-empty">Loading Dynasty data…</div>';
  try{
    await loadData();
    if(!dynastyActive)return;
    renderPanel();
  }catch(e){
    if(panel)panel.innerHTML='<div class="dpc-empty">Dynasty player data is updating. Try this tab again shortly.</div>';
  }
}
function ensureUi(){
  const tabs=document.getElementById('unifiedProfileTabs');
  const panels=document.getElementById('unifiedProfilePanels');
  if(!tabs||!panels)return false;
  if(!tabs.querySelector('[data-profile-tab="dynasty"]')){
    const btn=document.createElement('button');
    btn.type='button';btn.className='unified-profile-tab';btn.dataset.profileTab='dynasty';btn.textContent='Dynasty';
    tabs.appendChild(btn);
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showDynasty();});
  }
  if(!document.getElementById('unifiedDynastyPanel')){
    const panel=document.createElement('div');
    panel.id='unifiedDynastyPanel';panel.className='unified-profile-panel';panel.dataset.profilePanel='dynasty';panel.hidden=true;
    panels.appendChild(panel);
    panel.addEventListener('click',e=>{
      const sv=e.target.closest('[data-dpc-subview]');
      if(sv){subview=sv.dataset.dpcSubview;const p=currentPlayer();if(p)renderSubview(panel,p);return;}
      const range=e.target.closest('[data-dpc-range]');
      if(range){rangeDays=Number(range.dataset.dpcRange)||90;const p=currentPlayer();if(p)renderValue(panel.querySelector('.dpc-body'),p);return;}
      const fmt=e.target.closest('[data-dpc-format]');
      if(fmt){format=format==='SF'?'1QB':'SF';renderPanel();return;}
      const player=e.target.closest('[data-dpc-player]');
      if(player){
        const name=decodeURIComponent(player.dataset.dpcPlayer);
        if(window.openUnifiedPlayerProfileByName)window.openUnifiedPlayerProfileByName(name);
      }
    });
  }
  if(!tabs.dataset.dpcBuiltInWatch){
    tabs.dataset.dpcBuiltInWatch='1';
    tabs.addEventListener('click',e=>{
      const b=e.target.closest('[data-profile-tab]');
      if(b&&b.dataset.profileTab!=='dynasty')dynastyActive=false;
    },true);
  }
  return true;
}
function syncForPlayer(){
  if(!ensureUi())return;
  const btn=document.querySelector('#unifiedProfileTabs [data-profile-tab="dynasty"]');
  const name=currentName();
  if(!name){if(btn)btn.hidden=true;return;}
  loadData().then(()=>{
    const p=currentPlayer();
    if(btn)btn.hidden=!(p&&allowed.has(p.position));
    if(dynastyActive&&p&&allowed.has(p.position))requestAnimationFrame(showDynasty);
  }).catch(()=>{if(btn)btn.hidden=true});
}
const modal=document.getElementById('modal');
if(modal){
  new MutationObserver(m=>{
    if(m.some(x=>x.type==='attributes'&&x.attributeName==='data-unified-name'))syncForPlayer();
    if(m.some(x=>x.type==='attributes'&&x.attributeName==='class')&&!modal.classList.contains('open'))dynastyActive=false;
    requestAnimationFrame(ensureUi);
  }).observe(modal,{attributes:true,attributeFilter:['data-unified-name','class'],subtree:false});
}
new MutationObserver(()=>requestAnimationFrame(syncForPlayer)).observe(document.body,{childList:true,subtree:true});
ensureUi();
syncForPlayer();
window.ShuaDynastyPlayerCard={show:showDynasty,refresh(){data=null;cachePromise=null;return loadData().then(()=>{if(dynastyActive)renderPanel();});}};
})();