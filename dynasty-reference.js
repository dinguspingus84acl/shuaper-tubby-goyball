/* Live Dynasty Daddy rankings via the official public API. */
(()=>{
'use strict';
const toggle=document.getElementById('positionToggle');
if(!toggle||toggle.querySelector('[data-posview="DYNASTY"]'))return;
const API='https://api.dynasty-daddy.com/api/v1/values/dynasty';
const SOURCE='https://dynasty-daddy.com/fantasy-rankings';
const KEY='shua-dynasty-daddy-cache-v1';
const TTL=3*60*60*1000;
const allowed=new Set(['QB','RB','WR','TE']);
let mode='1QB',rowsData=null,pending=null,sleeperMap=null;

const norm=v=>typeof N==='function'?N(v):String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const relaxed=v=>norm(v).replace(/(jr|sr|ii|iii|iv)$/,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);

const dynastyBtn=document.createElement('button');
dynastyBtn.type='button';dynastyBtn.dataset.posview='DYNASTY';dynastyBtn.textContent='Dynasty';
toggle.append(dynastyBtn);

const formatBar=document.createElement('div');
formatBar.id='dynastyFormatToggle';formatBar.className='dynasty-format-toggle';formatBar.hidden=true;
formatBar.innerHTML='<span>Dynasty format</span><button type="button" data-dynasty-format="1QB" class="active">1QB</button><button type="button" data-dynasty-format="SF">Superflex</button><a href="'+SOURCE+'" target="_blank" rel="noopener noreferrer">Dynasty Daddy ↗</a>';
toggle.insertAdjacentElement('afterend',formatBar);

const style=document.createElement('style');
style.textContent='.dynasty-format-toggle{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 12px;color:var(--m)}.dynasty-format-toggle[hidden]{display:none!important}.dynasty-format-toggle>span{font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.dynasty-format-toggle button,.dynasty-format-toggle a{border:1px solid var(--l);background:transparent;color:var(--m);border-radius:8px;padding:8px 11px;font-weight:900;text-decoration:none}.dynasty-format-toggle button.active{background:#183d63;color:#fff}.dynasty-format-toggle a{margin-left:auto}.dynasty-loading td,.dynasty-error td{padding:20px!important;text-align:center;color:var(--m);white-space:normal!important}.dynasty-value{font-weight:950;color:#fff}.dynasty-source-note{display:block;margin-top:2px;color:var(--m);font-size:.68rem}@media(max-width:650px){.phone-mode .dynasty-format-toggle{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;margin:8px 0!important;padding-bottom:2px!important;scrollbar-width:none}.phone-mode .dynasty-format-toggle::-webkit-scrollbar{display:none}.phone-mode .dynasty-format-toggle>*{flex:0 0 auto}.phone-mode .dynasty-format-toggle a{margin-left:0}.phone-mode #tableCard tbody tr.dynasty-rank-row{grid-template-columns:40px minmax(0,1fr)!important}.phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(3),.phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(4),.phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(5),.phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(6){display:none!important}}';
document.head.append(style);

function setHeaders(isDynasty){
 const th=[...document.querySelectorAll('#tableCard thead th')];
 if(th.length<6)return;
 th[0].textContent='Rank'; th[1].textContent='Player'; th[2].textContent='Position'; th[3].textContent='Team';
 th[4].textContent=isDynasty?'Dynasty Value':'ESPN ADP';
 th[5].textContent=isDynasty?'Format':'Notes';
}
function localMaps(){
 const exact=new Map(),loose=new Map();
 if(typeof players==='undefined')return{exact,loose};
 for(const p of players||[]){
   if(!allowed.has(p.position))continue;
   exact.set(norm(p.name)+String(p.position).toLowerCase(),p);
   const k=relaxed(p.name)+String(p.position).toLowerCase();
   if(!loose.has(k))loose.set(k,p);
 }
 return{exact,loose};
}
function matchLocal(r,m){
 const pos=String(r.position||'').toUpperCase(),id=norm(r.name_id);
 if(m.exact.has(id))return m.exact.get(id);
 const suffix=pos.toLowerCase();
 const base=id.endsWith(suffix)?id.slice(0,-suffix.length):id;
 return m.loose.get(relaxed(base)+suffix)||null;
}
function cached(){
 try{
   const c=JSON.parse(localStorage.getItem(KEY)||'null');
   if(c&&Array.isArray(c.data)&&Date.now()-Number(c.time||0)<TTL)return c.data;
 }catch(_){}
 return null;
}
function save(raw){try{localStorage.setItem(KEY,JSON.stringify({time:Date.now(),data:raw}));}catch(_){}}
async function sleepers(){
 if(sleeperMap)return sleeperMap;
 const r=await fetch('https://api.sleeper.app/v1/players/nfl');
 if(!r.ok)throw Error('Sleeper '+r.status);
 const j=await r.json();
 sleeperMap=new Map(Object.entries(j||{}).map(([id,p])=>[String(id),p]));
 return sleeperMap;
}
function prepare(raw,sm){
 const maps=localMaps();
 return (raw||[]).filter(r=>allowed.has(String(r.position||'').toUpperCase())).map(r=>{
   const local=matchLocal(r,maps),sp=sm&&sm.get(String(r.sleeper_id||''));
   const pos=String(r.position||local?.position||sp?.position||'').toUpperCase();
   let name=local?.name||sp?.full_name||'';
   if(!name&&sp?.first_name&&sp?.last_name)name=sp.first_name+' '+sp.last_name;
   if(!name)name=String(r.name_id||'Player').replace(new RegExp(pos.toLowerCase()+'$'),'');
   return {local,name,team:String(r.team||local?.team||sp?.team||'—').toUpperCase(),position:pos,rank:number(r.position_rank),sfRank:number(r.sf_position_rank),overall:number(r.overall_rank),sfOverall:number(r.sf_overall_rank),value:number(r.trade_value),sfValue:number(r.sf_trade_value)};
 });
}
async function loadData(){
 if(rowsData)return rowsData;
 if(pending)return pending;
 pending=(async()=>{
   let raw=cached();
   if(!raw){
     const r=await fetch(API,{headers:{Accept:'application/json'}});
     if(!r.ok)throw Error('Dynasty Daddy '+r.status);
     raw=await r.json();
     if(!Array.isArray(raw))throw Error('Unexpected Dynasty Daddy response');
     save(raw);
   }
   let sm=null; try{sm=await sleepers();}catch(_){}
   rowsData=prepare(raw,sm); return rowsData;
 })().finally(()=>pending=null);
 return pending;
}
function fields(r){
 return mode==='SF'
   ?{rank:r.sfRank,value:r.sfValue,overall:r.sfOverall,label:'Superflex'}
   :{rank:r.rank,value:r.value,overall:r.overall,label:'1QB'};
}
function renderDynasty(){
 if(typeof positionView==='undefined'||positionView!=='DYNASTY'||typeof position==='undefined'||!allowed.has(position))return;
 formatBar.hidden=false; setHeaders(true);
 const boardEl=document.getElementById('board'),card=document.getElementById('tableCard'),rows=document.getElementById('rows'),title=document.getElementById('title'),sub=document.getElementById('sub');
 if(boardEl)boardEl.hidden=true; if(card)card.hidden=false;
 if(title)title.textContent=position+' Dynasty Rankings';
 if(sub)sub.textContent='Live Dynasty Daddy market rankings · values update a few times per day';
 if(!rows)return;
 if(!rowsData){
   rows.innerHTML='<tr class="dynasty-loading"><td colspan="6">Loading Dynasty Daddy rankings…</td></tr>';
   loadData().then(()=>{if(positionView==='DYNASTY')renderDynasty();}).catch(()=>{if(positionView==='DYNASTY')rows.innerHTML='<tr class="dynasty-error"><td colspan="6">Dynasty rankings could not load right now. <a href="'+SOURCE+'" target="_blank" rel="noopener noreferrer">Open Dynasty Daddy ↗</a></td></tr>';});
   return;
 }
 const list=rowsData.filter(r=>r.position===position).map(r=>({r,...fields(r)})).filter(x=>x.rank!==null).sort((a,b)=>a.rank-b.rank||((b.value??-1)-(a.value??-1))||a.r.name.localeCompare(b.r.name));
 rows.innerHTML=list.map(x=>{
   const p=x.r,local=p.local;
   const photo=typeof pic==='function'?pic(p.name,'',p.team,p.position):'<span class="photo fallback">'+esc((p.name||'?').slice(0,2).toUpperCase())+'</span>';
   const id=local?.id?' data-id="'+esc(local.id)+'"':'';
   return '<tr class="dynasty-rank-row"'+id+'><td class="rank">#'+x.rank+'</td><td><div class="photo-cell">'+photo+'<div class="rank-player-copy"><b>'+esc(p.name)+'</b><span class="phone-rank-meta">'+(typeof teamMini==='function'?teamMini(p.team):'')+'<span>'+esc(p.team)+' · '+esc(p.position)+' · '+esc(x.label)+' #'+x.rank+'</span></span></div></div></td><td><span class="badge">'+esc(p.position)+'</span></td><td>'+esc(p.team)+'</td><td><span class="dynasty-value">'+(x.value===null?'—':Math.round(x.value).toLocaleString())+'</span><span class="dynasty-source-note">Overall #'+(x.overall??'—')+'</span></td><td>'+esc(x.label)+'<span class="dynasty-source-note">Dynasty Daddy</span></td></tr>';
 }).join('')||'<tr class="dynasty-error"><td colspan="6">No dynasty rankings found for this position.</td></tr>';
 if(typeof bind==='function')bind();
}
if(typeof render==='function'){
 const baseRender=render;
 render=function(){
   baseRender();
   const active=typeof positionView!=='undefined'&&positionView==='DYNASTY'&&typeof position!=='undefined'&&allowed.has(position);
   formatBar.hidden=!active; setHeaders(active); if(active)renderDynasty();
 };
}
dynastyBtn.addEventListener('click',()=>{
 positionView='DYNASTY';
 toggle.querySelectorAll('[data-posview]').forEach(el=>el.classList.toggle('active',el===dynastyBtn));
 if(typeof render==='function')render(); else renderDynasty();
});
formatBar.addEventListener('click',e=>{
 const b=e.target.closest('[data-dynasty-format]'); if(!b)return;
 mode=b.dataset.dynastyFormat==='SF'?'SF':'1QB';
 formatBar.querySelectorAll('[data-dynasty-format]').forEach(x=>x.classList.toggle('active',x===b));
 renderDynasty();
});
window.ShuaDynastyDaddy={source:API,get format(){return mode;},refresh(){rowsData=null;try{localStorage.removeItem(KEY);}catch(_){}return loadData().then(renderDynasty);}};
})();