/* Ranked-player usage cards. Read-only, lazy, and source-backed. */
(()=>{
'use strict';
const modal=document.getElementById('modal');
if(!modal)return;
const aliases={kennethwalkeriii:'kennethwalker',michaelpittmanjr:'michaelpittman',brianthomasjr:'brianthomas',marvinharrisonjr:'marvinharrison',chigokonkwo:'chigoziemokonkwo',lutherburdeniii:'lutherburden',haroldfanninjr:'haroldfannin',joshpalmer:'joshuapalmer'};
const key=name=>{const s=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');return aliases[s]||s;};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let snapshotPromise=null,scheduled=false,currentName='';
const data=()=>snapshotPromise||(snapshotPromise=fetch('analytics/data/ranked-usage-2026.json?v=20261026-1',{cache:'force-cache'})
 .then(r=>{if(!r.ok)throw new Error('Usage data unavailable');return r.json();})
 .then(d=>{if(d.schema!==1||d.season!==2026||!d.players)throw new Error('Unsupported usage data');return d;})
 .catch(e=>{snapshotPromise=null;throw e;}));
const fmt=(value,decimals=1,suffix='')=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:decimals,minimumFractionDigits:decimals})+suffix:'—';
const css=document.createElement('style');
css.id='shuaRankedUsageStyles';
css.textContent=`
#shuaRankedUsage{margin:9px 0 6px;min-width:0}
#shuaRankedUsage .sru-title{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:3px 0 7px}
#shuaRankedUsage .sru-title strong{color:#eef5ff;font-size:.8rem}
#shuaRankedUsage .sru-title span{color:#8197b0;font-size:.65rem;white-space:nowrap}
#shuaRankedUsage .sru-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
#shuaRankedUsage .sru-cell{min-width:0;padding:9px 8px;background:#0d243b;border:1px solid #ffffff20;border-radius:8px}
#shuaRankedUsage .sru-cell span{display:block;color:#9aacbf;font-size:.65rem;font-weight:750;line-height:1.15;min-height:1.5em}
#shuaRankedUsage .sru-cell strong{display:block;margin-top:5px;font-size:1.13rem;color:#eef6ff;font-variant-numeric:tabular-nums}
#shuaRankedUsage .sru-cell.unavailable strong{color:#627992}
#shuaRankedUsage .sru-note{margin:7px 2px 0;color:#8399b2;font-size:.62rem;line-height:1.35}
@media(max-width:670px){#shuaRankedUsage .sru-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}#shuaRankedUsage .sru-cell{padding:7px 8px}#shuaRankedUsage .sru-cell strong{font-size:1rem}#shuaRankedUsage .sru-title span{font-size:.61rem}}
`;
document.head.append(css);
function target(){
 const overview=document.getElementById('unifiedOverviewPanel');
 return overview?.querySelector('#stats')||null;
}
function install(container){
 let pane=document.getElementById('shuaRankedUsage');
 if(!pane){pane=document.createElement('section');pane.id='shuaRankedUsage';pane.setAttribute('aria-label','2026 advanced usage');}
 if(pane.previousElementSibling!==container)container.insertAdjacentElement('afterend',pane);
 return pane;
}
const specs=[
 ['Snap share','snapShare',1,'%'],
 ['Target share','targetShare',1,'%'],
 ['Opportunity share','opportunityShare',1,'%'],
 ['Red-zone opportunities','redZoneOpportunities',0,''],
 ['Route participation','routeParticipation',1,'%'],
 ['Targets per route','targetsPerRouteRun',2,''],
 ['Yards per route','yardsPerRouteRun',2,''],
 ['Air yards share','airYardsShare',1,'%']
];
function show(d,name){
 if(!modal.classList.contains('open')||key(modal.dataset.unifiedName)!==key(name))return;
 const stats=target();if(!stats)return;
 const row=d.players[key(name)];
 const existing=document.getElementById('shuaRankedUsage');
 if(!row){existing?.remove();return;}
 const pane=install(stats);
 const cells=specs.map(([label,field,decimal,suffix])=>{
  const n=row[field],missing=n===null||n===undefined;
  return `<div class="sru-cell${missing?' unavailable':''}" title="${escape(missing?'Not reported in available source data':label)}"><span>${escape(label)}</span><strong>${fmt(n,decimal,suffix)}</strong></div>`;
 }).join('');
 pane.innerHTML=`<div class="sru-title"><strong>2026 Usage</strong><span>Through W${Number(d.throughWeek)||'—'}</span></div><div class="sru-grid">${cells}</div><p class="sru-note">Recorded ESPN stats + <a href="https://github.com/nflverse" target="_blank" rel="noopener noreferrer">nflverse</a>/PFR usage. Shares use recorded team/player games, not official team totals. Unavailable route and air-yard metrics show —.</p>`;
}
async function refresh(){
 const name=String(modal.dataset.unifiedName||'');
 if(!modal.classList.contains('open')||!name)return;
 const stats=target();if(!stats)return;
 if(name===currentName&&document.getElementById('shuaRankedUsage')?.previousElementSibling===stats)return;
 currentName=name;
 try{show(await data(),name);}catch(e){
  if(modal.dataset.unifiedName===name){document.getElementById('shuaRankedUsage')?.remove();}
 }
}
function schedule(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;refresh();});
}
new MutationObserver(()=>{currentName='';schedule();}).observe(modal,{attributes:true,attributeFilter:['class','data-unified-name']});
// A profile can remain open when switching to another player; the name change is the only required trigger.
schedule();
window.ShuaRankedUsage={getSnapshot:data,refresh};
})();
