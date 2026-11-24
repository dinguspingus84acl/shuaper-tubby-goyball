/* Goyball Dynasty + Profile player-card tabs. Local cached market data only. */
(()=>{
'use strict';

const FILES={
  rankings:'dynasty-rankings.json',
  history:'dynasty-history.json',
  details:'dynasty-player-details.json'
};
const OFFENSE=new Set(['QB','RB','WR','TE']);
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const relaxed=s=>norm(s).replace(/(jr|sr|ii|iii|iv)$/,'');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
const int=v=>num(v)!==null?Math.round(num(v)).toLocaleString():'—';
const rank=v=>num(v)!==null&&num(v)>0?'#'+Math.round(num(v)):'—';
const dec=v=>num(v)!==null?num(v).toFixed(2):'—';
const pct=v=>num(v)!==null?(num(v)>0?'+':'')+num(v).toFixed(1)+'%':'—';

let data=null,loadPromise=null,format='1QB',rangeDays=90,dynastySubview='value',customMode=null;

const style=document.createElement('style');
style.id='dynastyPlayerCardStyles';
style.textContent=`
#unifiedDynastyPanel,#unifiedPlayerProfilePanel{padding-top:10px}
.featured-player-profile .unified-profile-tabs{grid-template-columns:repeat(6,minmax(0,1fr))!important}
.dpc-shell{display:grid;gap:10px}
.dpc-toolbar{display:flex;gap:6px;align-items:center;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
.dpc-toolbar::-webkit-scrollbar{display:none}
.dpc-toolbar button{flex:0 0 auto;border:1px solid #ffffff20;background:#081a2d;color:#90a4b8;border-radius:8px;padding:7px 10px;font-size:.62rem;font-weight:950}
.dpc-toolbar button.active{background:#173f61;color:#fff;border-color:#5f90b8}
.dpc-format{margin-left:auto}
.dpc-card{border:1px solid #ffffff16;border-radius:11px;background:#07192b;padding:10px}
.dpc-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
.dpc-title strong{font-size:.74rem}.dpc-title small{color:#7f93aa;font-size:.58rem}
.dpc-summary,.dpc-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
.dpc-stat{border:1px solid #ffffff12;border-radius:9px;background:#0a2034;padding:9px;min-width:0}
.dpc-stat span{display:block;color:#7f93aa;font-size:.55rem;font-weight:850;line-height:1.15}
.dpc-stat b{display:block;margin-top:4px;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dpc-chart-wrap{height:230px;position:relative;touch-action:manipulation}
.dpc-chart{width:100%;height:100%;display:block;overflow:visible}
.dpc-axis{fill:#7890a7;font-size:8px;font-weight:800;pointer-events:none}
.dpc-grid-line{stroke:#ffffff12;stroke-width:1;pointer-events:none}
.dpc-value-line{fill:none;stroke:var(--profile-accent,#55a4e3);stroke-width:2.5;vector-effect:non-scaling-stroke;pointer-events:none}
.dpc-point{fill:#dff5ff;stroke:var(--profile-accent,#55a4e3);stroke-width:1.5;pointer-events:none}
.dpc-tap-point{fill:var(--profile-accent,#55a4e3);stroke:#e9f8ff;stroke-width:1.8;cursor:pointer}
.dpc-hover-line{stroke:#ffffff70;stroke-width:1;stroke-dasharray:4 4;pointer-events:none}
.dpc-hover-dot{fill:#fff;stroke:var(--profile-accent,#55a4e3);stroke-width:2;pointer-events:none}
.dpc-chart-tip{position:absolute;z-index:3;top:8px;transform:translateX(-50%);max-width:190px;padding:6px 8px;border:1px solid #ffffff2b;border-radius:8px;background:#03101ded;color:#fff;font-size:.58rem;font-weight:850;line-height:1.35;box-shadow:0 8px 20px #0008;pointer-events:none;white-space:nowrap}
.dpc-range{display:flex;gap:5px}
.dpc-range button{border:1px solid #ffffff1b;background:transparent;color:#8499ae;border-radius:7px;padding:5px 8px;font-size:.56rem;font-weight:900}
.dpc-range button.active{background:#183d63;color:#fff}
.dpc-adjacent{display:grid;gap:5px}
.dpc-adjacent button{width:100%;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid #ffffff12;border-radius:8px;background:#081a2d;color:#fff;padding:7px 9px;text-align:left}
.dpc-adjacent button.current{border-color:var(--profile-accent,#55a4e3);background:#102a43}
.dpc-adjacent small{color:#8196aa}.dpc-adjacent b{white-space:nowrap}
.dpc-bar-chart{height:180px;display:flex;align-items:flex-end;gap:6px;padding:8px 2px 22px;position:relative}
.dpc-bar-col{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px}
.dpc-bar{width:min(28px,70%);min-height:2px;background:var(--profile-accent,#55a4e3);border-radius:5px 5px 2px 2px}
.dpc-bar-col small{font-size:.5rem;color:#7890a7;white-space:nowrap}.dpc-bar-col b{font-size:.55rem;color:#dfeaf3}
.dpc-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.dpc-list{display:grid;gap:0}
.dpc-row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid #ffffff0d;font-size:.64rem}
.dpc-row:first-child{border-top:0}.dpc-row span{color:#8297aa}.dpc-row b{text-align:right}
.dpc-adp-hero{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.dpc-empty{padding:18px;text-align:center;color:#7f93aa;font-size:.65rem}
@media(max-width:650px){
 .featured-player-profile .unified-profile-tabs{grid-template-columns:repeat(6,minmax(58px,1fr))!important;overflow-x:auto!important}
 .featured-player-profile .unified-profile-tab{font-size:.46rem!important;padding:5px 1px!important}
 .dpc-summary,.dpc-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
 .dpc-profile-grid{grid-template-columns:1fr}
 .dpc-adp-hero{grid-template-columns:1fr}
 .dpc-chart-wrap{height:205px}
 .dpc-format{margin-left:0}
 .dpc-toolbar{flex-wrap:nowrap}
 .dpc-tap-point{r:6}
}
@media(hover:hover) and (pointer:fine){.dpc-tap-point{opacity:.35}}
`;
document.head.append(style);

async function loadData(){
  if(data)return data;
  if(loadPromise)return loadPromise;
  loadPromise=Promise.all([
    fetch(FILES.rankings,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(Error('rankings'))),
    fetch(FILES.history,{cache:'no-store'}).then(r=>r.ok?r.json():({players:{}})),
    fetch(FILES.details,{cache:'no-store'}).then(r=>r.ok?r.json():({players:{}}))
  ]).then(([rankings,history,details])=>{
    const players=rankings.players||[];
    const byName=new Map(),byLoose=new Map();
    for(const p of players){
      if(p?.name)byName.set(norm(p.name),p);
      const k=relaxed(p?.name);
      if(k&&!byLoose.has(k))byLoose.set(k,p);
    }
    data={rankings,history,details,byName,byLoose};
    return data;
  }).finally(()=>{loadPromise=null});
  return loadPromise;
}

function currentName(){
  return document.getElementById('modal')?.dataset.unifiedName||document.getElementById('pn')?.textContent||'';
}
function currentPlayer(){
  if(!data)return null;
  const name=currentName();
  return data.byName.get(norm(name))||data.byLoose.get(relaxed(name))||null;
}
function getMarketValue(p){
  const sf=format==='SF';
  return num(sf?(p?.market_sf_trade_value??p?.sf_trade_value):(p?.market_trade_value??p?.trade_value));
}
function marketOverallRank(p){
  if(!data||!p)return null;
  const list=(data.rankings.players||[])
    .map(x=>({p:x,v:getMarketValue(x)}))
    .filter(x=>x.v!==null&&x.v>0)
    .sort((a,b)=>b.v-a.v||String(a.p.name||'').localeCompare(String(b.p.name||'')));
  const i=list.findIndex(x=>x.p.name_id===p.name_id);
  return i>=0?i+1:null;
}
function valueFields(p){
  const sf=format==='SF';
  return {
    value:getMarketValue(p),
    overall:marketOverallRank(p),
    posRank:num(sf?(p?.market_sf_position_rank??p?.sf_position_rank):(p?.market_position_rank??p?.position_rank)),
    lastMonth:num(sf?p?.last_month_value_sf:p?.last_month_value),
    high90:num(sf?p?.three_month_high_sf:p?.three_month_high),
    low90:num(sf?p?.three_month_low_sf:p?.three_month_low),
    best90:num(sf?p?.three_month_best_rank_sf:p?.three_month_best_rank),
    worst90:num(sf?p?.three_month_worst_rank_sf:p?.three_month_worst_rank),
    allHigh:num(sf?p?.all_time_high_sf:p?.all_time_high),
    allLow:num(sf?p?.all_time_low_sf:p?.all_time_low),
    allBest:num(sf?p?.all_time_best_rank_sf:p?.all_time_best_rank),
    allWorst:num(sf?p?.all_time_worst_rank_sf:p?.all_time_worst_rank)
  };
}
function changePct(current,old){
  if(!current||!old)return null;
  return (current-old)/old*100;
}
function historyFor(p,days=rangeDays){
  const rows=data?.history?.players?.[p?.name_id]||[];
  const cutoff=Date.now()-days*86400000;
  return rows.map(r=>({
    date:r.date,
    time:new Date(r.date).getTime(),
    value:num(format==='SF'?r.sf_trade_value:r.trade_value),
    rank:num(format==='SF'?r.sf_position_rank:r.position_rank)
  })).filter(x=>Number.isFinite(x.time)&&x.time>=cutoff&&x.value!==null).sort((a,b)=>a.time-b.time);
}
function metric(label,value){
  return '<div class="dpc-stat"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>';
}
function graphGeometry(rows){
  const W=640,H=210,L=42,R=10,T=12,B=28;
  const vals=rows.map(x=>x.value),min=Math.min(...vals),max=Math.max(...vals);
  const pad=Math.max(50,(max-min)*.12),lo=Math.max(0,min-pad),hi=max+pad;
  const x=i=>L+(W-L-R)*(rows.length===1?.5:i/(rows.length-1));
  const y=v=>T+(H-T-B)*(1-(v-lo)/(hi-lo||1));
  return{W,H,L,R,T,B,lo,hi,x,y};
}
function svgLine(rows){
  if(!rows.length)return '<div class="dpc-empty">No value history is cached for this player yet.</div>';
  const g=graphGeometry(rows);
  const pts=rows.map((r,i)=>g.x(i).toFixed(1)+','+g.y(r.value).toFixed(1)).join(' ');
  const ticks=[0,.25,.5,.75,1].map(t=>{
    const yy=g.T+(g.H-g.T-g.B)*t;
    const val=Math.round(g.hi-(g.hi-g.lo)*t);
    return '<line class="dpc-grid-line" x1="'+g.L+'" x2="'+(g.W-g.R)+'" y1="'+yy+'" y2="'+yy+'"></line><text class="dpc-axis" x="2" y="'+(yy+3)+'">'+val.toLocaleString()+'</text>';
  }).join('');
  const marks=[0,Math.floor((rows.length-1)/2),rows.length-1].filter((v,i,a)=>a.indexOf(v)===i).map(i=>{
    const label=new Date(rows[i].time).toLocaleDateString(undefined,{month:'short',day:'numeric'});
    return '<text class="dpc-axis" text-anchor="'+(i===0?'start':i===rows.length-1?'end':'middle')+'" x="'+g.x(i)+'" y="'+(g.H-5)+'">'+label+'</text>';
  }).join('');
  const sampleIdx=[0,.25,.5,.75,1].map(t=>Math.round((rows.length-1)*t)).filter((v,i,a)=>a.indexOf(v)===i);
  const taps=sampleIdx.map(i=>'<circle class="dpc-tap-point" data-dpc-point="'+i+'" cx="'+g.x(i)+'" cy="'+g.y(rows[i].value)+'" r="4"></circle>').join('');
  return '<svg class="dpc-chart" viewBox="0 0 '+g.W+' '+g.H+'" preserveAspectRatio="none" role="img" aria-label="Dynasty value history">'+
    ticks+'<polyline class="dpc-value-line" points="'+pts+'"></polyline>'+taps+
    '<line class="dpc-hover-line" hidden x1="0" x2="0" y1="'+g.T+'" y2="'+(g.H-g.B)+'"></line>'+
    '<circle class="dpc-hover-dot" hidden cx="0" cy="0" r="4"></circle>'+marks+'</svg>'+
    '<div class="dpc-chart-tip" hidden></div>';
}
function bindChart(panel,rows){
  if(!rows.length)return;
  const wrap=panel.querySelector('.dpc-chart-wrap');
  const svg=wrap?.querySelector('.dpc-chart');
  const tip=wrap?.querySelector('.dpc-chart-tip');
  const line=wrap?.querySelector('.dpc-hover-line');
  const dot=wrap?.querySelector('.dpc-hover-dot');
  if(!wrap||!svg||!tip||!line||!dot)return;
  const g=graphGeometry(rows);

  const show=i=>{
    i=Math.max(0,Math.min(rows.length-1,Number(i)||0));
    const row=rows[i],x=g.x(i),y=g.y(row.value);
    line.hidden=false;dot.hidden=false;tip.hidden=false;
    line.setAttribute('x1',x);line.setAttribute('x2',x);
    dot.setAttribute('cx',x);dot.setAttribute('cy',y);
    const px=(x/g.W)*wrap.clientWidth;
    tip.style.left=Math.max(64,Math.min(wrap.clientWidth-64,px))+'px';
    tip.innerHTML='<strong>'+new Date(row.time).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})+'</strong><br>Value '+Math.round(row.value).toLocaleString()+(row.rank?' · '+esc(currentPlayer()?.position||'Pos')+' #'+row.rank:'');
  };
  const hide=()=>{line.hidden=true;dot.hidden=true;tip.hidden=true};

  if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
    wrap.addEventListener('pointermove',e=>{
      const r=wrap.getBoundingClientRect();
      const rel=Math.max(0,Math.min(1,(e.clientX-r.left)/Math.max(1,r.width)));
      show(Math.round(rel*(rows.length-1)));
    });
    wrap.addEventListener('pointerleave',hide);
  }
  wrap.querySelectorAll('[data-dpc-point]').forEach(c=>{
    c.addEventListener('click',e=>{e.stopPropagation();show(c.dataset.dpcPoint)});
  });
}
function adjacentHtml(p){
  const list=(data.rankings.players||[]).map(x=>({p:x,v:getMarketValue(x)})).filter(x=>x.v!==null&&x.v>0)
    .sort((a,b)=>b.v-a.v||String(a.p.name||'').localeCompare(String(b.p.name||'')));
  const idx=list.findIndex(x=>x.p.name_id===p.name_id);
  if(idx<0)return '<div class="dpc-empty">Adjacent players unavailable.</div>';
  return list.slice(Math.max(0,idx-2),Math.min(list.length,idx+3)).map(x=>{
    const r=list.indexOf(x)+1,cur=x.p.name_id===p.name_id;
    return '<button type="button" class="'+(cur?'current':'')+'" data-dpc-player="'+encodeURIComponent(x.p.name)+'"><span>#'+r+'</span><span><strong>'+esc(x.p.name)+'</strong><br><small>'+esc(x.p.team||'—')+' · '+esc(x.p.position||'—')+'</small></span><b>'+int(x.v)+'</b></button>';
  }).join('');
}
function normalizeTradeVolume(raw){
  const rows=Array.isArray(raw)?raw:raw&&Array.isArray(raw.mat_vw_trade_agg)?raw.mat_vw_trade_agg:[];
  return rows.map(x=>({
    interval:num(x.week_interval),
    count:num(x.count),
    rank:num(x.rank),
    posRank:num(x.position_rank)
  })).filter(x=>x.count!==null).sort((a,b)=>(b.interval??0)-(a.interval??0));
}
function tradeBars(rows){
  if(!rows.length)return '<div class="dpc-empty">Trade-volume history is not available for this player yet.</div>';
  const last=rows.slice(-8),max=Math.max(...last.map(x=>x.count),1);
  return '<div class="dpc-bar-chart">'+last.map(x=>{
    const h=Math.max(3,x.count/max*135);
    const label=x.interval===1?'7d':x.interval?((x.interval-1)*7)+'-'+(x.interval*7)+'d':'';
    return '<div class="dpc-bar-col"><b>'+Math.round(x.count)+'</b><div class="dpc-bar" style="height:'+h+'px"></div><small>'+label+'</small></div>';
  }).join('')+'</div>';
}
function profileRows(obj,formatter=v=>v){
  return Object.entries(obj).filter(([,v])=>v!==null&&v!==undefined&&v!=='').map(([k,v])=>'<div class="dpc-row"><span>'+esc(k)+'</span><b>'+esc(formatter(v))+'</b></div>').join('');
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
  const values90=hist90.map(x=>x.value).filter(v=>v!==null),ranks90=hist90.map(x=>x.rank).filter(v=>v!==null&&v>0);
  const target30=Date.now()-30*86400000;
  const ref30=hist90.length?hist90.reduce((best,x)=>Math.abs(x.time-target30)<Math.abs(best.time-target30)?x:best,hist90[0]):null;
  const lastMonth=f.lastMonth??ref30?.value??null;
  const high90=f.high90??(values90.length?Math.max(...values90):null),low90=f.low90??(values90.length?Math.min(...values90):null);
  const best90=f.best90??(ranks90.length?Math.min(...ranks90):null),worst90=f.worst90??(ranks90.length?Math.max(...ranks90):null);
  const detail=data?.details?.players?.[p.name_id]||{},tradeRows=normalizeTradeVolume(detail.tradeVolume);
  const recent=tradeRows.length?tradeRows[tradeRows.length-1]:null;
  const month=tradeRows.filter(x=>x.interval!==null&&x.interval<=4).reduce((s,x)=>s+x.count,0);

  panel.innerHTML=
    '<div class="dpc-summary">'+
      metric('Dynasty Value',int(f.value))+metric('Overall Rank',rank(f.overall))+metric((p.position||'Pos')+' Rank',rank(f.posRank))+metric('30 Day Change',pct(changePct(f.value,lastMonth)))+
    '</div>'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Value History</strong><div class="dpc-range">'+
      '<button data-dpc-range="30" class="'+(rangeDays===30?'active':'')+'">1M</button>'+
      '<button data-dpc-range="90" class="'+(rangeDays===90?'active':'')+'">3M</button>'+
      '<button data-dpc-range="180" class="'+(rangeDays===180?'active':'')+'">6M</button>'+
    '</div></div><div class="dpc-chart-wrap">'+svgLine(hist)+'</div></div>'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Market Range</strong></div><div class="dpc-metrics">'+
      metric('90D High',int(high90))+metric('90D Low',int(low90))+metric('90D Best Rank',rank(best90))+metric('90D Worst Rank',rank(worst90))+
      metric('All-Time High',int(f.allHigh))+metric('All-Time Low',int(f.allLow))+metric('All-Time Best Rank',rank(f.allBest))+metric('All-Time Worst Rank',rank(f.allWorst))+
    '</div></div>'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Players Around '+esc(p.name)+'</strong></div><div class="dpc-adjacent">'+adjacentHtml(p)+'</div></div>'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Trade Activity</strong><small>Recent 8 weeks</small></div>'+
      '<div class="dpc-summary">'+metric('Past Week',recent?int(recent.count):'—')+metric('Past Month',tradeRows.length?int(month):'—')+metric('Volume Rank',recent?rank(recent.rank):'—')+metric((p.position||'Pos')+' Volume Rank',recent?rank(recent.posRank):'—')+'</div>'+
      tradeBars(tradeRows)+
    '</div>';
  bindChart(panel,hist);
}
function renderAdp(panel,p){
  const vals=[
    ['Average Position ADP',num(p.avg_adp)],
    ['FantasyPros',num(p.fantasypro_adp)],
    ['BestBall10s',num(p.bb10_adp)],
    ['RTSports',num(p.rtsports_adp)],
    ['Underdog',num(p.underdog_adp)],
    ['Drafters',num(p.drafters_adp)]
  ].filter(([,v])=>v!==null);
  const average=num(p.avg_adp);
  panel.innerHTML=
    '<div class="dpc-adp-hero">'+
      metric('Average Position ADP',dec(average))+
      metric((p.position||'Pos')+' Market Rank',rank(valueFields(p).posRank))+
      metric('Dynasty Value',int(valueFields(p).value))+
    '</div>'+
    '<div class="dpc-card"><div class="dpc-title"><strong>Dynasty ADP</strong><small>Lower is earlier</small></div>'+
      (vals.length?'<div class="dpc-list">'+vals.map(([label,v])=>'<div class="dpc-row"><span>'+esc(label)+'</span><b>'+dec(v)+'</b></div>').join('')+'</div>':'<div class="dpc-empty">No Dynasty ADP amount is currently available for this player.</div>')+
    '</div>';
}
function renderPlayerProfile(panel,p){
  const detail=data?.details?.players?.[p?.name_id]||{};
  const profile=detail.profile||{},pj=profile.profile_json||{},base=pj.profile||{},contract=pj.contract||{},ras=pj.ras||{};
  const basics={
    'Team':p?.team,
    'Position':p?.position,
    'Age':p?.age,
    'Experience':num(p?.experience)!==null?(num(p.experience)===0?'Rookie':num(p.experience)+' Years'):null
  };
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
  const rosterRows={'Sleeper Rostership':rost.sleeper,'ESPN Rostership':rost.espn,'Yahoo Rostership':rost.yahoo};
  panel.innerHTML=
    '<div class="dpc-profile-grid">'+
      '<div class="dpc-card"><div class="dpc-title"><strong>Player Profile</strong></div><div class="dpc-list">'+(profileRows(basics)||'<div class="dpc-empty">Basic profile unavailable.</div>')+'</div></div>'+
      '<div class="dpc-card"><div class="dpc-title"><strong>Athletic / Draft Profile</strong></div><div class="dpc-list">'+(profileRows(athletic)||'<div class="dpc-empty">Athletic profile unavailable.</div>')+'</div></div>'+
      '<div class="dpc-card"><div class="dpc-title"><strong>Contract</strong></div><div class="dpc-list">'+(profileRows(contractRows)||'<div class="dpc-empty">Contract data unavailable.</div>')+'</div></div>'+
      '<div class="dpc-card"><div class="dpc-title"><strong>Rostership</strong></div><div class="dpc-list">'+(profileRows(rosterRows)||'<div class="dpc-empty">Rostership data unavailable.</div>')+'</div></div>'+
    '</div>';
}
function renderDynasty(){
  const panel=document.getElementById('unifiedDynastyPanel');if(!panel)return;
  const p=currentPlayer();
  if(!p){
    panel.innerHTML='<div class="dpc-empty">No cached Dynasty market data is available for this player yet.</div>';
    return;
  }
  panel.innerHTML='<div class="dpc-shell"><div class="dpc-toolbar">'+
    '<button data-dpc-subview="value" class="'+(dynastySubview==='value'?'active':'')+'">Value</button>'+
    '<button data-dpc-subview="adp" class="'+(dynastySubview==='adp'?'active':'')+'">ADP</button>'+
    '<button class="dpc-format '+(format==='SF'?'active':'')+'" data-dpc-format="SF">Superflex</button>'+
    '</div><div class="dpc-body"></div></div>';
  const body=panel.querySelector('.dpc-body');
  if(dynastySubview==='adp')renderAdp(body,p);else renderValue(body,p);
}
function renderProfileTab(){
  const panel=document.getElementById('unifiedPlayerProfilePanel');if(!panel)return;
  const p=currentPlayer();
  if(!p){
    panel.innerHTML='<div class="dpc-empty">No cached extended profile is available for this player yet.</div>';
    return;
  }
  renderPlayerProfile(panel,p);
}
function setCustomTab(key){
  customMode=key;
  document.querySelectorAll('#unifiedProfileTabs [data-profile-tab]').forEach(b=>b.classList.toggle('active',b.dataset.profileTab===key));
  document.querySelectorAll('#unifiedProfilePanels [data-profile-panel]').forEach(p=>p.hidden=p.dataset.profilePanel!==key);
}
async function showDynasty(){
  setCustomTab('dynasty');
  const panel=document.getElementById('unifiedDynastyPanel');
  if(panel)panel.innerHTML='<div class="dpc-empty">Loading Dynasty data…</div>';
  try{await loadData();if(customMode==='dynasty')renderDynasty();}
  catch(e){if(panel)panel.innerHTML='<div class="dpc-empty">Dynasty player data is updating.</div>';}
}
async function showProfile(){
  setCustomTab('profile');
  const panel=document.getElementById('unifiedPlayerProfilePanel');
  if(panel)panel.innerHTML='<div class="dpc-empty">Loading profile…</div>';
  try{await loadData();if(customMode==='profile')renderProfileTab();}
  catch(e){if(panel)panel.innerHTML='<div class="dpc-empty">Extended player profile is updating.</div>';}
}
function ensureUi(){
  const tabs=document.getElementById('unifiedProfileTabs'),panels=document.getElementById('unifiedProfilePanels');
  if(!tabs||!panels)return false;

  let dynastyBtn=tabs.querySelector('[data-profile-tab="dynasty"]');
  if(!dynastyBtn){
    dynastyBtn=document.createElement('button');
    dynastyBtn.type='button';dynastyBtn.className='unified-profile-tab';dynastyBtn.dataset.profileTab='dynasty';dynastyBtn.textContent='Dynasty';
    tabs.appendChild(dynastyBtn);
    dynastyBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showDynasty();});
  }else dynastyBtn.hidden=false;

  let profileBtn=tabs.querySelector('[data-profile-tab="profile"]');
  if(!profileBtn){
    profileBtn=document.createElement('button');
    profileBtn.type='button';profileBtn.className='unified-profile-tab';profileBtn.dataset.profileTab='profile';profileBtn.textContent='Profile';
    tabs.appendChild(profileBtn);
    profileBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showProfile();});
  }else profileBtn.hidden=false;

  let dynPanel=document.getElementById('unifiedDynastyPanel');
  if(!dynPanel){
    dynPanel=document.createElement('div');
    dynPanel.id='unifiedDynastyPanel';dynPanel.className='unified-profile-panel';dynPanel.dataset.profilePanel='dynasty';dynPanel.hidden=true;
    panels.appendChild(dynPanel);
    dynPanel.addEventListener('click',e=>{
      const sv=e.target.closest('[data-dpc-subview]');
      if(sv){dynastySubview=sv.dataset.dpcSubview==='adp'?'adp':'value';renderDynasty();return;}
      const range=e.target.closest('[data-dpc-range]');
      if(range){rangeDays=[30,90,180].includes(Number(range.dataset.dpcRange))?Number(range.dataset.dpcRange):90;renderDynasty();return;}
      const fmt=e.target.closest('[data-dpc-format]');
      if(fmt){format=format==='SF'?'1QB':'SF';renderDynasty();return;}
      const player=e.target.closest('[data-dpc-player]');
      if(player&&window.openUnifiedPlayerProfileByName){
        window.openUnifiedPlayerProfileByName(decodeURIComponent(player.dataset.dpcPlayer));
      }
    });
  }

  let profilePanel=document.getElementById('unifiedPlayerProfilePanel');
  if(!profilePanel){
    profilePanel=document.createElement('div');
    profilePanel.id='unifiedPlayerProfilePanel';profilePanel.className='unified-profile-panel';profilePanel.dataset.profilePanel='profile';profilePanel.hidden=true;
    panels.appendChild(profilePanel);
  }

  if(!tabs.dataset.dpcWatch){
    tabs.dataset.dpcWatch='1';
    tabs.addEventListener('click',e=>{
      const b=e.target.closest('[data-profile-tab]');
      if(b&&!['dynasty','profile'].includes(b.dataset.profileTab))customMode=null;
    },true);
  }
  return true;
}
function syncForPlayer(){
  if(!ensureUi())return;
  loadData().then(()=>{
    if(customMode==='dynasty'){setCustomTab('dynasty');renderDynasty();}
    else if(customMode==='profile'){setCustomTab('profile');renderProfileTab();}
  }).catch(()=>{});
}
const modal=document.getElementById('modal');
if(modal){
  new MutationObserver(m=>{
    if(m.some(x=>x.type==='attributes'&&x.attributeName==='data-unified-name'))syncForPlayer();
    if(m.some(x=>x.type==='attributes'&&x.attributeName==='class')&&!modal.classList.contains('open'))customMode=null;
    requestAnimationFrame(ensureUi);
  }).observe(modal,{attributes:true,attributeFilter:['data-unified-name','class']});
}
ensureUi();
syncForPlayer();
window.ShuaDynastyPlayerCard={show:showDynasty,showProfile,refresh(){data=null;loadPromise=null;return loadData().then(()=>{if(customMode==='dynasty')renderDynasty();if(customMode==='profile')renderProfileTab();});}};
})();