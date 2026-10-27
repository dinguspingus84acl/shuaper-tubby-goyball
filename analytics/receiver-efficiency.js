/* Verified 2026 receiving heatmaps for 32 NFL teams. */
(function(root){
'use strict';
const S=root.ShuaStudio=root.ShuaStudio||{};
let source=null,pending=null,active='CHI',base=null,sort='routes',direction='desc';
const columns=[
 ['routeShare','ROUTE SHARE','percent1','Routes divided by team passing-play opportunities'],
 ['yprr','YPRR','two','Receiving yards per route run'],
 ['tprr','TPRR','two','Targets per route run'],
 ['yacPerReception','YAC/REC','two','Receiving yards after catch divided by receptions'],
 ['firstDownsPerRoute','1D/RR','three','Receiving first downs per route run'],
 ['explosivePlayRate','EXPLOSIVE PLAY %','percent1','20-plus-yard receptions divided by receptions'],
 ['epaPerTarget','EPA/TARGET','three','Receiving EPA per target'],
 ['fantasyPointsPerRoute','FP/RR','two','PPR receiving points per route run']
];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=v=>v===null||v===undefined||!Number.isFinite(Number(v))?null:Number(v);
function display(v,kind){const n=val(v);if(n===null)return '—';if(kind==='percent1')return n.toFixed(1)+'%';let t=n.toFixed(kind==='three'?3:2);return t.replace(/^(-?)0\./,'$1.');}
function ordinal(n){return n+(n%100>=11&&n%100<=13?'TH':{1:'ST',2:'ND',3:'RD'}[n%10]||'TH');}
function load(){
 if(source)return Promise.resolve(source);
 if(!pending)pending=fetch('analytics/data/receiver-efficiency-2026.json?v=20261026-heatmap1',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw Error('Data HTTP '+r.status);return r.json();})
  .then(x=>{if(x.schema!==1||x.season!==2026||Object.keys(x.teams||{}).length!==32)throw Error('Invalid team source');source=x;return x;})
  .catch(e=>{pending=null;throw e;});
 return pending;
}
function render(node){
 if(!node||!node.isConnected||!source)return;
 const list=Object.keys(S.teams||{}).sort((a,b)=>S.teams[a].localeCompare(S.teams[b]));
 const leaders=(source.teams[active]||[]).filter(p=>p.routes>=8).slice(0,5);
 const rows=leaders.slice().sort((a,b)=>{
  const x=sort==='routes'?val(a.routes):val(a.metrics[sort]),y=sort==='routes'?val(b.routes):val(b.metrics[sort]);
  if(x===null&&y!==null)return 1;if(y===null&&x!==null)return -1;
  if(x!==null&&y!==null&&x!==y)return direction==='asc'?x-y:y-x;
  return b.routes-a.routes||a.name.localeCompare(b.name);
 });
 function tone(row,id){
  const x=val(row.metrics[id]);if(x===null)return ['missing',null];
  const valid=leaders.filter(p=>val(p.metrics[id])!==null),rank=1+valid.filter(p=>p.metrics[id]>x).length;
  if(valid.length<=1)return ['neutral',rank];
  const fraction=(rank-1)/(valid.length-1);
  return [fraction<=.2?'best':fraction<=.4?'good':fraction<=.6?'neutral':fraction<=.8?'poor':'worst',rank];
 }
 let html='<div class="re-heatmap"><div class="re-toolbar"><label for="reEfficiencyTeam">NFL team <select id="reEfficiencyTeam" aria-label="Receiver efficiency team">';
 for(const t of list)html+='<option value="'+t+'"'+(t===active?' selected':'')+'>'+esc(S.teams[t])+'</option>';
 html+='</select></label><small>Top 5 by charted routes · 2026 season</small></div>';
 const name=esc((S.teams||{})[active]||active),nickname=name.split(' ').at(-1).toUpperCase();
 html+='<div class="re-paper"><div class="re-title"><img src="https://a.espncdn.com/i/teamlogos/nfl/500/'+active.toLowerCase()+'.png" alt="" loading="lazy"><h3><em>'+nickname+' RECEIVER</em> EFFICIENCY</h3></div>';
 html+='<p class="re-subtitle">Through '+source.throughWeek+' charted weeks | 2026 season | HeatRadar + nflverse / ESPN <span class="re-key">Team rank: <i class="re-chip best"></i><i class="re-chip good"></i><i class="re-chip neutral"></i><i class="re-chip poor"></i><i class="re-chip worst"></i></span></p>';
 html+='<div class="re-table-scroll" role="region" tabindex="0" aria-label="'+name+' receiving heatmap (scroll horizontally on mobile)"><table class="re-table"><thead><tr><th scope="col" class="re-player-th"><button type="button" data-re-sort="routes">PLAYER'+(sort==='routes'?(direction==='desc'?' ↓':' ↑'):'')+'</button></th>';
 for(const [id,label,,explain] of columns)html+='<th scope="col"><div class="re-colhead"><button type="button" data-re-sort="'+id+'" aria-label="Sort '+esc(label)+'">'+esc(label)+(sort===id?(direction==='desc'?' ↓':' ↑'):'')+'</button><span class="re-info" title="'+esc(explain)+'" tabindex="0" aria-label="'+esc(explain)+'">ⓘ</span></div></th>';
 html+='</tr></thead><tbody>';
 for(const p of rows){
  html+='<tr><th scope="row" class="re-player"><strong>'+esc(p.name)+'</strong><small>'+esc(p.position)+' · '+p.routes+' routes · '+p.weeks.length+' weeks</small></th>';
  for(const [id,,kind] of columns){const [shade,rank]=tone(p,id);html+='<td class="re-cell '+shade+'"><b>'+display(p.metrics[id],kind)+'</b><small>'+(rank===null?'NO DATA':ordinal(rank))+'</small></td>';}
  html+='</tr>';
 }
 html+='</tbody><tfoot><tr><th scope="row" class="re-league">League Avg<small>All charted WR/TE</small></th>';
 for(const [id,,kind] of columns)html+='<td>'+display(source.leagueAverage[id],kind)+'</td>';
 html+='</tr></tfoot></table></div>';
 html+='<p class="re-footnote">Verified source values only; — means unavailable, not zero. Colors rank each team’s five listed receivers. League averages are denominator-weighted where underlying counts are verified. Charted routes and receiving stats must cover the same weeks. '+(source.source.receiving?'nflverse receiving metrics are active.':'Additional nflverse receiving fields are pending their scheduled refresh.')+'</p></div></div>';
 node.innerHTML=html;
}
function mount(team){
 const node=document.getElementById('stReceiverEfficiencyMount');if(!node)return;
 if(base!==team){base=team;if(S.teams?.[team])active=team;}
 if(source){render(node);return;}
 node.innerHTML='<p class="re-loading">Loading verified receiver efficiency…</p>';
 load().then(()=>{if(document.getElementById('stReceiverEfficiencyMount')===node)render(node);})
 .catch(e=>{if(node.isConnected)node.innerHTML='<p class="re-error">Receiver efficiency unavailable: '+esc(e.message)+'</p>';});
}
document.addEventListener('change',e=>{if(e.target?.id==='reEfficiencyTeam'&&S.teams?.[e.target.value]){active=e.target.value;render(document.getElementById('stReceiverEfficiencyMount'));}});
document.addEventListener('click',e=>{
 const b=e.target?.closest?.('[data-re-sort]'),host=document.getElementById('stReceiverEfficiencyMount');
 if(!b||!host?.contains(b))return;const next=b.dataset.reSort;
 if(next!=='routes'&&!columns.some(c=>c[0]===next))return;
 if(sort===next)direction=direction==='desc'?'asc':'desc';else{sort=next;direction='desc';}
 render(host);
});
S.ReceiverEfficiency={mount,get snapshot(){return source;}};
})(globalThis);