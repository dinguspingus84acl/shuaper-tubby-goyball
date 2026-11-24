/* Goyball Dynasty rankings: local dataset generated from Dynasty Daddy's public API. */
(()=>{
'use strict';
const toggle=document.getElementById('positionToggle');
if(!toggle||toggle.querySelector('[data-posview="DYNASTY"]'))return;

const DATA_FILE='dynasty-rankings.json';
const allowed=new Set(['QB','RB','WR','TE']);
let mode='1QB',rookiesOnly=false,dataset=null,pending=null;

const norm=v=>typeof N==='function'?N(v):String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const relaxed=v=>norm(v).replace(/(jr|sr|ii|iii|iv)$/,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);

const dynastyBtn=document.createElement('button');
dynastyBtn.type='button';
dynastyBtn.dataset.posview='DYNASTY';
dynastyBtn.textContent='Dynasty';
toggle.append(dynastyBtn);

const formatBar=document.createElement('div');
formatBar.id='dynastyFormatToggle';
formatBar.className='dynasty-format-toggle';
formatBar.hidden=true;
formatBar.innerHTML='<span>Dynasty</span><button type="button" data-dynasty-format="1QB" class="active">1QB</button><button type="button" data-dynasty-format="SF">Superflex</button><button type="button" data-dynasty-rookies="1">Rookies</button><span class="dynasty-updated" id="dynastyUpdated"></span>';
toggle.insertAdjacentElement('afterend',formatBar);

const style=document.createElement('style');
style.textContent='.dynasty-format-toggle{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 12px;color:var(--m)}.dynasty-format-toggle[hidden]{display:none!important}.dynasty-format-toggle>span:first-child{font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.dynasty-format-toggle button{border:1px solid var(--l);background:transparent;color:var(--m);border-radius:8px;padding:8px 11px;font-weight:900}.dynasty-format-toggle button.active{background:#183d63;color:#fff}.dynasty-updated{margin-left:auto;font-size:.68rem;color:var(--m)}.dynasty-loading td,.dynasty-error td{padding:20px!important;text-align:center;color:var(--m);white-space:normal!important}.dynasty-value{font-weight:950;color:#fff}.dynasty-source-note{display:block;margin-top:2px;color:var(--m);font-size:.68rem}@media(max-width:650px){.phone-mode .dynasty-format-toggle{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;margin:8px 0!important;padding-bottom:2px!important;scrollbar-width:none}.phone-mode .dynasty-format-toggle::-webkit-scrollbar{display:none}.phone-mode .dynasty-format-toggle>*{flex:0 0 auto}.phone-mode .dynasty-updated{margin-left:0}.phone-mode #tableCard tbody tr.dynasty-rank-row{grid-template-columns:40px minmax(0,1fr)!important}.phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(3),.phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(4),.phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(5),.phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(6){display:none!important}}';
document.head.append(style);

function setHeaders(isDynasty){
 const th=[...document.querySelectorAll('#tableCard thead th')];
 if(th.length<6)return;
 th[0].textContent='Rank';
 th[1].textContent='Player';
 th[2].textContent='Position';
 th[3].textContent='Team';
 th[4].textContent=isDynasty?'Value':'ESPN ADP';
 th[5].textContent=isDynasty?'Rank':'Notes';
}

function localMaps(){
 const bySleeper=new Map(),byExact=new Map(),byLoose=new Map();
 if(typeof players==='undefined')return{bySleeper,byExact,byLoose};
 for(const p of players||[]){
   if(!allowed.has(p.position))continue;
   const sid=String(p.additionalStats?.sleeperId||p.additionalStats?.sleeper_id||'');
   if(sid)bySleeper.set(sid,p);
   const suffix=String(p.position).toLowerCase();
   byExact.set(norm(p.name)+suffix,p);
   const k=relaxed(p.name)+suffix;
   if(!byLoose.has(k))byLoose.set(k,p);
 }
 return{bySleeper,byExact,byLoose};
}

function matchLocal(r,maps){
 const sid=String(r.sleeper_id||'');
 if(sid&&maps.bySleeper.has(sid))return maps.bySleeper.get(sid);
 const pos=String(r.position||'').toUpperCase();
 const suffix=pos.toLowerCase();
 const exact=norm(r.name)+suffix;
 if(maps.byExact.has(exact))return maps.byExact.get(exact);
 const id=norm(r.name_id);
 if(maps.byExact.has(id))return maps.byExact.get(id);
 const base=id.endsWith(suffix)?id.slice(0,-suffix.length):id;
 return maps.byLoose.get(relaxed(base)+suffix)||maps.byLoose.get(relaxed(r.name)+suffix)||null;
}

async function loadData(){
 if(dataset)return dataset;
 if(pending)return pending;
 pending=fetch(DATA_FILE,{cache:'no-store'})
   .then(r=>{if(!r.ok)throw Error('Goyball dynasty rankings '+r.status);return r.json();})
   .then(j=>{
     if(!j||!Array.isArray(j.players))throw Error('Invalid Goyball dynasty rankings file');
     const maps=localMaps();
     dataset={...j,players:j.players.filter(r=>allowed.has(String(r.position||'').toUpperCase())).map(r=>({...r,local:matchLocal(r,maps)}))};
     return dataset;
   })
   .finally(()=>{pending=null;});
 return pending;
}

function formatUpdated(value){
 if(!value)return'';
 const d=new Date(value);
 if(Number.isNaN(d.getTime()))return'';
 return 'Updated '+d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
}

function fields(r){
 return mode==='SF'
   ?{rank:number(r.sf_position_rank),value:number(r.sf_trade_value),overall:number(r.sf_overall_rank),label:'Superflex'}
   :{rank:number(r.position_rank),value:number(r.trade_value),overall:number(r.overall_rank),label:'1QB'};
}

function renderDynasty(){
 if(typeof positionView==='undefined'||positionView!=='DYNASTY'||typeof position==='undefined'||!allowed.has(position))return;
 formatBar.hidden=false;
 setHeaders(true);

 const boardEl=document.getElementById('board');
 const card=document.getElementById('tableCard');
 const rows=document.getElementById('rows');
 const title=document.getElementById('title');
 const sub=document.getElementById('sub');
 if(boardEl)boardEl.hidden=true;
 if(card)card.hidden=false;
 if(title)title.textContent=position+' Dynasty Rankings';
 if(sub)sub.textContent='Goyball dynasty rankings · sourced from Dynasty Daddy';
 if(!rows)return;

 if(!dataset){
   rows.innerHTML='<tr class="dynasty-loading"><td colspan="6">Loading dynasty rankings…</td></tr>';
   loadData().then(()=>{if(positionView==='DYNASTY')renderDynasty();}).catch(()=>{
     if(positionView==='DYNASTY')rows.innerHTML='<tr class="dynasty-error"><td colspan="6">Goyball dynasty rankings are temporarily unavailable.</td></tr>';
   });
   return;
 }

 const updated=document.getElementById('dynastyUpdated');
 if(updated)updated.textContent=formatUpdated(dataset.updated_at);

 const list=dataset.players
   .filter(r=>String(r.position||'').toUpperCase()===position)
   .filter(r=>!rookiesOnly||r.rookie===true)
   .map(r=>({r,...fields(r)}))
   .filter(x=>x.rank!==null&&x.rank>0)
   .sort((a,b)=>a.rank-b.rank||((b.value??-1)-(a.value??-1))||String(a.r.name||'').localeCompare(String(b.r.name||'')));
 const displayRank=new Map(list.map((x,i)=>[x.r,i+1]));

 rows.innerHTML=list.map(x=>{
   const p=x.r;
   const local=p.local;
   const name=p.name||p.name_id||'Player';
   const team=String(p.team||local?.team||'—').toUpperCase();
   const pos=String(p.position||local?.position||position).toUpperCase();
   const photo=typeof pic==='function'?pic(name,'',team,pos):'<span class="photo fallback">'+esc(name.slice(0,2).toUpperCase())+'</span>';
   const id=local?.id?' data-id="'+esc(local.id)+'"':'';
   const shownRank=rookiesOnly?displayRank.get(p):x.rank;
   return '<tr class="dynasty-rank-row"'+id+'>
     '<td class="rank">#'+shownRank+'</td>'+
     '<td><div class="photo-cell">'+photo+'<div class="rank-player-copy"><b>'+esc(name)+'</b><span class="phone-rank-meta">'+(typeof teamMini==='function'?teamMini(team):'')+'<span>'+esc(pos)+'</span></span></div></div></td>'+
     '<td><span class="badge">'+esc(pos)+'</span></td>'+
     '<td>'+esc(team)+'</td>'+
     '<td><span class="dynasty-value">'+(x.value===null?'—':Math.round(x.value).toLocaleString())+'</span><span class="dynasty-source-note">'+esc(x.label)+'</span></td>'+
     '<td>#'+(x.overall??'—')+'</td>'+
   '</tr>';
 }).join('')||'<tr class="dynasty-error"><td colspan="6">No dynasty rankings found for this position.</td></tr>';

 if(typeof bind==='function')bind();
}

if(typeof render==='function'){
 const baseRender=render;
 render=function(){
   baseRender();
   const active=typeof positionView!=='undefined'&&positionView==='DYNASTY'&&typeof position!=='undefined'&&allowed.has(position);
   formatBar.hidden=!active;
   setHeaders(active);
   if(active)renderDynasty();
 };
}

dynastyBtn.addEventListener('click',()=>{
 positionView='DYNASTY';
 toggle.querySelectorAll('[data-posview]').forEach(el=>el.classList.toggle('active',el===dynastyBtn));
 if(typeof render==='function')render(); else renderDynasty();
});

formatBar.addEventListener('click',e=>{
 const formatButton=e.target.closest('[data-dynasty-format]');
 if(formatButton){
   mode=formatButton.dataset.dynastyFormat==='SF'?'SF':'1QB';
   formatBar.querySelectorAll('[data-dynasty-format]').forEach(x=>x.classList.toggle('active',x===formatButton));
   renderDynasty();
   return;
 }
 const rookieButton=e.target.closest('[data-dynasty-rookies]');
 if(rookieButton){
   rookiesOnly=!rookiesOnly;
   rookieButton.classList.toggle('active',rookiesOnly);
   renderDynasty();
 }
});

window.ShuaDynastyRankings={
 file:DATA_FILE,
 get format(){return mode;},
 get rookiesOnly(){return rookiesOnly;},
 refresh(){dataset=null;return loadData().then(renderDynasty);}
};
})();