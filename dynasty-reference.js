/* Goyball Dynasty rankings: local Dynasty Daddy player + draft-pick market data. */
(()=>{
'use strict';
const toggle=document.getElementById('positionToggle');
const nav=document.querySelector('.positions');
if(!toggle||!nav||toggle.querySelector('[data-posview="DYNASTY"]'))return;

const DATA_FILE='dynasty-rankings.json';
const PICKS_FILE='dynasty-picks.json';
const allowed=new Set(['QB','RB','WR','TE']);
const dynastyScopes=new Set(['ALL','FLEX','QB','RB','WR','TE','PICKS']);
let mode='1QB',rookiesOnly=false,includePicks=false,dataset=null,pickDataset=null,pending=null;

const norm=v=>typeof N==='function'?N(v):String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const relaxed=v=>norm(v).replace(/(jr|sr|ii|iii|iv)$/,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);

const dynastyBtn=document.createElement('button');
dynastyBtn.type='button';
dynastyBtn.dataset.posview='DYNASTY';
dynastyBtn.textContent='Dynasty';
toggle.append(dynastyBtn);

const picksNav=document.createElement('button');
picksNav.type='button';
picksNav.className='pos dynasty-picks-nav';
picksNav.dataset.pos='PICKS';
picksNav.textContent='Draft Picks';
picksNav.hidden=true;
const flexNav=nav.querySelector('[data-pos="FLEX"]');
if(flexNav)flexNav.insertAdjacentElement('afterend',picksNav);else nav.append(picksNav);

const formatBar=document.createElement('div');
formatBar.id='dynastyFormatToggle';
formatBar.className='dynasty-format-toggle';
formatBar.hidden=true;
formatBar.innerHTML='<button type="button" data-dynasty-format="1QB" class="active">1QB</button><button type="button" data-dynasty-format="SF">Superflex</button><button type="button" data-dynasty-rookies="1">Rookies</button><button type="button" data-dynasty-include-picks="1">Picks</button>';
toggle.insertAdjacentElement('afterend',formatBar);

const style=document.createElement('style');
style.textContent=`
.dynasty-format-toggle{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 12px;color:var(--m)}
.dynasty-format-toggle[hidden],.dynasty-picks-nav[hidden]{display:none!important}
.dynasty-format-toggle button{border:1px solid var(--l);background:transparent;color:var(--m);border-radius:8px;padding:8px 11px;font-weight:900}
.dynasty-format-toggle button.active{background:#183d63;color:#fff}
.dynasty-loading td,.dynasty-error td{padding:20px!important;text-align:center;color:var(--m);white-space:normal!important}
.dynasty-value{font-weight:950;color:#fff}
.dynasty-pick-avatar{background:#183d63!important;border-color:#ffffff45!important;font-size:.72rem!important}
.dynasty-pick-name{color:#fff}
@media(max-width:650px){
 .phone-mode .dynasty-format-toggle{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;margin:8px 0!important;padding-bottom:2px!important;scrollbar-width:none}
 .phone-mode .dynasty-format-toggle::-webkit-scrollbar{display:none}
 .phone-mode .dynasty-format-toggle>*{flex:0 0 auto}
 .phone-mode #tableCard tbody tr.dynasty-rank-row{grid-template-columns:40px minmax(0,1fr)!important}
 .phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(3),
 .phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(4),
 .phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(5),
 .phone-mode #tableCard tbody tr.dynasty-rank-row td:nth-child(6){display:none!important}
}
`;
document.head.append(style);

function setHeaders(isDynasty){
 const th=[...document.querySelectorAll('#tableCard thead th')];
 if(th.length<6)return;
 th[0].textContent='Rank';
 th[1].textContent=isDynasty?'Player / Pick':'Player';
 th[2].textContent='Position';
 th[3].textContent='Team';
 th[4].textContent=isDynasty?'Values':'ESPN ADP';
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
 if(dataset&&pickDataset)return{dataset,pickDataset};
 if(pending)return pending;
 pending=Promise.all([
   fetch(DATA_FILE,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Goyball dynasty rankings '+r.status);return r.json();}),
   fetch(PICKS_FILE,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Goyball dynasty picks '+r.status);return r.json();})
 ]).then(([j,p])=>{
   if(!j||!Array.isArray(j.players))throw Error('Invalid Goyball dynasty rankings file');
   if(!p||!Array.isArray(p.picks))throw Error('Invalid Goyball dynasty picks file');
   const maps=localMaps();
   dataset={...j,players:j.players.filter(r=>allowed.has(String(r.position||'').toUpperCase())).map(r=>({...r,local:matchLocal(r,maps)}))};
   pickDataset={...p,picks:p.picks.map((r,i)=>({...r,isPick:true,position:'PICK',team:'—',pickIndex:i+1}))};
   return{dataset,pickDataset};
 }).finally(()=>{pending=null;});
 return pending;
}

function fields(r){
 return mode==='SF'
   ?{rank:number(r.sf_position_rank),value:number(r.sf_trade_value),overall:number(r.sf_overall_rank),label:'Superflex'}
   :{rank:number(r.position_rank),value:number(r.trade_value),overall:number(r.overall_rank),label:'1QB'};
}

function playerScopeMatch(r){
 const p=String(r.position||'').toUpperCase();
 if(position==='ALL')return allowed.has(p);
 if(position==='FLEX')return allowed.has(p)&&p!=='QB';
 if(position==='PICKS')return false;
 return p===position;
}

function makeAssets(){
 const playersList=dataset.players
   .filter(playerScopeMatch)
   .filter(r=>!rookiesOnly||r.rookie===true)
   .map(r=>({r,...fields(r),isPick:false}))
   .filter(x=>{
     const base=position==='ALL'||position==='FLEX'?x.overall:x.rank;
     return base!==null&&base>0&&x.value!==null;
   });

 const wantPicks=position==='PICKS'||includePicks;
 const picks=wantPicks?pickDataset.picks
   .filter(p=>number(p.value)!==null&&number(p.value)>0)
   .map(p=>({r:p,isPick:true,value:number(p.value),rank:null,overall:null,label:'Draft Pick'})):[];
 if(position==='PICKS')return picks.sort((a,b)=>b.value-a.value||String(a.r.name).localeCompare(String(b.r.name)));

 if(wantPicks){
   return playersList.concat(picks).sort((a,b)=>b.value-a.value||
     (a.isPick?1:0)-(b.isPick?1:0)||
     ((a.overall??9999)-(b.overall??9999))||
     String(a.r.name||'').localeCompare(String(b.r.name||'')));
 }

 const combined=position==='ALL'||position==='FLEX';
 return playersList.sort((a,b)=>{
   const ar=combined?a.overall:a.rank,br=combined?b.overall:b.rank;
   return ar-br||b.value-a.value||String(a.r.name||'').localeCompare(String(b.r.name||''));
 });
}

function renderDynasty(){
 if(typeof positionView==='undefined'||positionView!=='DYNASTY'||typeof position==='undefined'||!dynastyScopes.has(position))return;
 formatBar.hidden=false;
 picksNav.hidden=false;
 setHeaders(true);

 const boardEl=document.getElementById('board');
 const card=document.getElementById('tableCard');
 const rows=document.getElementById('rows');
 const title=document.getElementById('title');
 const sub=document.getElementById('sub');
 if(boardEl)boardEl.hidden=true;
 if(card)card.hidden=false;
 if(title)title.textContent=position==='ALL'?'Overall Rankings':position==='PICKS'?'Draft Picks':position+' Rankings';
 if(sub)sub.textContent='';
 if(!rows)return;

 if(!dataset||!pickDataset){
   rows.innerHTML='<tr class="dynasty-loading"><td colspan="6">Loading dynasty rankings…</td></tr>';
   loadData().then(()=>{if(positionView==='DYNASTY')renderDynasty();}).catch(()=>{
     if(positionView==='DYNASTY')rows.innerHTML='<tr class="dynasty-error"><td colspan="6">Goyball dynasty rankings are temporarily unavailable.</td></tr>';
   });
   return;
 }

 const list=makeAssets();
 rows.innerHTML=list.map((x,i)=>{
   const p=x.r;
   const shownRank=i+1;
   if(x.isPick){
     return '<tr class="dynasty-rank-row dynasty-pick-row">'+
       '<td class="rank">#'+shownRank+'</td>'+
       '<td><div class="photo-cell"><span class="photo fallback dynasty-pick-avatar">P</span><div class="rank-player-copy"><b class="dynasty-pick-name">'+esc(p.name)+'</b><span class="phone-rank-meta"><span>Draft Pick</span></span></div></div></td>'+
       '<td><span class="badge">PICK</span></td>'+
       '<td>—</td>'+
       '<td><span class="dynasty-value">'+Math.round(x.value).toLocaleString()+'</span></td>'+
       '<td>#'+shownRank+'</td>'+
     '</tr>';
   }
   const local=p.local;
   const name=p.name||p.name_id||'Player';
   const team=String(p.team||local?.team||'—').toUpperCase();
   const pos=String(p.position||local?.position||position).toUpperCase();
   const photo=typeof pic==='function'?pic(name,'',team,pos):'<span class="photo fallback">'+esc(name.slice(0,2).toUpperCase())+'</span>';
   const id=local?.id?' data-id="'+esc(local.id)+'"':'';
   const marketRank=(includePicks||rookiesOnly||position==='FLEX')?shownRank:(position==='ALL'?x.overall:x.rank);
   return '<tr class="dynasty-rank-row"'+id+'>'+
     '<td class="rank">#'+marketRank+'</td>'+
     '<td><div class="photo-cell">'+photo+'<div class="rank-player-copy"><b>'+esc(name)+'</b><span class="phone-rank-meta">'+(typeof teamMini==='function'?teamMini(team):'')+'<span>'+esc(team)+' · '+esc(pos)+'</span></span></div></div></td>'+
     '<td><span class="badge">'+esc(pos)+'</span></td>'+
     '<td>'+esc(team)+'</td>'+
     '<td><span class="dynasty-value">'+Math.round(x.value).toLocaleString()+'</span></td>'+
     '<td>#'+(includePicks?shownRank:(x.overall??marketRank))+'</td>'+
   '</tr>';
 }).join('')||'<tr class="dynasty-error"><td colspan="6">No dynasty assets found for this view.</td></tr>';

 if(typeof bind==='function')bind();
}

if(typeof render==='function'){
 const baseRender=render;
 render=function(){
   baseRender();
   const eligible=typeof position!=='undefined'&&dynastyScopes.has(position);
   const active=typeof positionView!=='undefined'&&positionView==='DYNASTY'&&eligible;
   picksNav.hidden=!active;
   if(toggle&&eligible)toggle.hidden=false;
   formatBar.hidden=!active;
   setHeaders(active);
   if(active)renderDynasty();
 };
}

dynastyBtn.addEventListener('click',()=>{
 positionView='DYNASTY';
 if(!dynastyScopes.has(position))position='ALL';
 toggle.querySelectorAll('[data-posview]').forEach(el=>el.classList.toggle('active',el===dynastyBtn));
 if(typeof render==='function')render();else renderDynasty();
});

picksNav.addEventListener('click',e=>{
 e.preventDefault();
 position='PICKS';
 positionView='DYNASTY';
 nav.querySelectorAll('.pos').forEach(x=>x.classList.toggle('active',x===picksNav));
 toggle.querySelectorAll('[data-posview]').forEach(x=>x.classList.toggle('active',x===dynastyBtn));
 renderDynasty();
});

formatBar.addEventListener('click',e=>{
 const formatButton=e.target.closest('[data-dynasty-format]');
 if(formatButton){
   mode=formatButton.dataset.dynastyFormat==='SF'?'SF':'1QB';
   formatBar.querySelectorAll('[data-dynasty-format]').forEach(x=>x.classList.toggle('active',x===formatButton));
   renderDynasty();
   window.dispatchEvent(new CustomEvent('shua:dynasty-format-change',{detail:{format:mode}}));
   return;
 }
 const rookieButton=e.target.closest('[data-dynasty-rookies]');
 if(rookieButton){
   rookiesOnly=!rookiesOnly;
   rookieButton.classList.toggle('active',rookiesOnly);
   renderDynasty();
   return;
 }
 const pickButton=e.target.closest('[data-dynasty-include-picks]');
 if(pickButton){
   includePicks=!includePicks;
   pickButton.classList.toggle('active',includePicks);
   pickButton.textContent='Picks';
   renderDynasty();
 }
});

document.addEventListener('click',e=>{
 const b=e.target.closest('.positions .pos');
 if(!b||b===picksNav)return;
 if(positionView!=='DYNASTY')picksNav.hidden=true;
});

window.ShuaDynastyRankings={
 file:DATA_FILE,
 picksFile:PICKS_FILE,
 get format(){return mode;},
 get rookiesOnly(){return rookiesOnly;},
 get includePicks(){return includePicks;},
 get players(){return dataset?.players||[];},
 get picks(){return pickDataset?.picks||[];},
 load:loadData,
 refresh(){dataset=null;pickDataset=null;return loadData().then(renderDynasty);}
};
})();