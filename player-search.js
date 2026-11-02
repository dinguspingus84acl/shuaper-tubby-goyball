/* Full-screen search over current rankings or verified archived player index. */
(function(){
'use strict';
if(window.ShuaPlayerSearch||!document.getElementById('search'))return;
const key=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let mode='current',historical=null,historicalPromise=null,visible=false,shown=[],version=0;
let headshots=null,headshotsPromise=null;
const pictureUrl=value=>{
 const url=String(value||'').trim();
 return /^https:\/\/(?:a\.espncdn\.com|sleepercdn\.com|www\.sleepercdn\.com|cdn\.espn\.com)\//i.test(url)?url:'';
};
const initials=name=>String(name||'?').trim().split(/\s+/).filter(Boolean).map(part=>part[0]).slice(0,2).join('').toUpperCase();
function faceUrl(player){
 const name=player.name||'',id=key(name);
 const sources=[player.headshot,headshots?.[id]?.[0],headshots?.[id]];
 if(mode==='current'){
  try{
   const sleeper=typeof playerPhotoId==='function'?String(playerPhotoId(name,player.team||'',player.position||'')||''):'';
   if(/^[a-zA-Z0-9_-]+$/.test(sleeper))sources.push('https://sleepercdn.com/content/nfl/players/thumb/'+sleeper+'.jpg');
  }catch(_){}
  const espn=window.ShuaEspnLive?.getPlayerByName?.(name);
  if(/^\d{5,10}$/.test(String(espn?.id||'')))sources.push('https://a.espncdn.com/i/headshots/nfl/players/full/'+espn.id+'.png');
 }
 return sources.map(pictureUrl).find(Boolean)||'';
}
function faceHtml(p){
 const src=faceUrl(p),abbr=esc(initials(p.name));
 return '<span class="shua-search-avatar">'+
  (src?'<img class="shua-search-face" alt="" src="'+esc(src)+'" loading="lazy" decoding="async">':'')+
  '<span class="shua-search-initials"'+(src?' hidden':'')+'>'+abbr+'</span></span>';
}
async function loadHeadshots(){
 if(headshots)return headshots;
 if(!headshotsPromise)headshotsPromise=fetch('legacy-stats/headshots.json?v=20261101-face1',{cache:'force-cache'})
  .then(r=>{if(!r.ok)throw Error('No headshot index');return r.json();})
  .then(d=>{headshots=d?.headshots||{};if(visible)render();return headshots;})
  .catch(()=>{headshotsPromise=null;return null;});
 return headshotsPromise;
}
const overlay=document.createElement('div');overlay.id='shuaExpandedSearch';overlay.hidden=true;
overlay.innerHTML='<div class="shua-search-dimmer" data-search-close></div><section class="shua-search-dialog" role="dialog" aria-modal="true" aria-labelledby="shuaSearchTitle">'+
'<div class="shua-search-header"><h2 id="shuaSearchTitle">Find a player</h2><button type="button" class="shua-search-close" data-search-close aria-label="Close search">×</button></div>'+
'<label class="shua-search-field"><span>Search player names</span><span class="shua-search-field-shell"><span class="shua-search-input-icon" aria-hidden="true">⌕</span><span class="shua-search-input-avatar" id="shuaSearchInputFace" aria-hidden="true" hidden></span><input id="shuaSearchQuery" type="search" autocomplete="off" inputmode="search" placeholder="Search NFL players…"></span></label>'+
'<div class="shua-search-modes" role="group" aria-label="Player era"><button type="button" data-search-mode="current" aria-pressed="true">Current Players</button><button type="button" data-search-mode="historical" aria-pressed="false">Retired / Historical</button></div>'+
'<p id="shuaSearchStatus" class="shua-search-status" role="status"></p><div class="shua-search-results" id="shuaSearchResults"></div></section>';
document.body.append(overlay);
const input=overlay.querySelector('input'),results=overlay.querySelector('#shuaSearchResults'),status=overlay.querySelector('#shuaSearchStatus');
const leadingAvatar=overlay.querySelector('#shuaSearchInputFace'),leadingIcon=overlay.querySelector('.shua-search-input-icon');
overlay.addEventListener('error',event=>{
 const img=event.target;if(!img?.classList?.contains('shua-search-face'))return;
 img.hidden=true;const initials=img.parentElement?.querySelector('.shua-search-initials');
 if(initials)initials.hidden=false;
},true);
function current(){
 const all=[];try{if(typeof board!=='undefined')all.push(...board)}catch(_){}
 try{if(typeof players!=='undefined')all.push(...players)}catch(_){}
 const seen=new Set(),out=[];
 for(const p of all){const name=String(p?.name||'').trim(),id=key(name);if(!name||seen.has(id))continue;seen.add(id);out.push({name,position:p.position||'',team:p.team||'',rank:p.overallRank||p.positionRank||null,headshot:pictureUrl(p.headshot||p.headshotUrl)});}
 return out;
}
async function loadArchive(){
 if(historical)return historical;
 if(!historicalPromise)historicalPromise=fetch('legacy-stats/index.json?v=20261101-search1',{cache:'force-cache'})
 .then(r=>{if(!r.ok)throw Error('Historical index HTTP '+r.status);return r.json()})
 .then(data=>{
  const active=new Set(current().map(p=>key(p.name))),seen=new Set();
  historical=[];
  for(const meta of Object.values(data.players||{})){
   const name=String(meta?.name||meta?.history?.[0]?.name||'').trim(),id=key(name);
   if(!name||active.has(id)||seen.has(id))continue;
   seen.add(id);
   const years=(meta.years||meta.history?.map(x=>x.year)||[]).map(Number).filter(Number.isFinite);
   historical.push({name,position:meta.position||meta.history?.[0]?.position||'',lastYear:years.length?Math.max(...years):null,headshot:pictureUrl(meta.headshot||meta.headshots?.[0])});
  }
  return historical;
 }).catch(e=>{historicalPromise=null;throw e;});
 return historicalPromise;
}
function syncInputAvatar(player){
 const show=!!player&&key(input.value).length>=2;
 leadingAvatar.hidden=!show;
 leadingIcon.hidden=show;
 if(show)leadingAvatar.innerHTML=faceHtml(player);
 else leadingAvatar.replaceChildren();
}
function render(){
 if(!visible)return;
 if(mode==='historical'&&!historical){
  syncInputAvatar(null);
  status.textContent='Loading historical player directory…';results.innerHTML='<p class="shua-search-empty">Loading archived seasons…</p>';return;
 }
 const q=key(input.value),pool=mode==='current'?current():historical;
 const found=pool.filter(p=>!q||key(p.name).includes(q)).sort((a,b)=>{
  const x=key(a.name),y=key(b.name),ax=q?(x===q?0:x.startsWith(q)?1:2):0,ay=q?(y===q?0:y.startsWith(q)?1:2):0;
  return ax-ay||(mode==='current'?((a.rank||9999)-(b.rank||9999)):(b.lastYear||0)-(a.lastYear||0))||a.name.localeCompare(b.name);
 }).slice(0,35);
 syncInputAvatar(found[0]);
 shown=found;
 status.textContent=(mode==='historical'?'Archived NFL players (1999–2025)':'Current ranked players')+' · '+found.length+' results shown';
 results.innerHTML=found.length?found.map((p,i)=>
  '<button type="button" class="shua-search-result" data-search-player="'+i+'">'+faceHtml(p)+'<span class="shua-search-result-copy"><strong>'+esc(p.name)+'</strong><small>'+
  esc(p.position||'')+(p.team?' · '+esc(p.team):'')+(p.rank?' · Rank #'+p.rank:'')+(p.lastYear?' · Last indexed season '+p.lastYear:'')+
  '</small></span><span class="shua-search-chevron" aria-hidden="true">›</span></button>').join(''):
  '<p class="shua-search-empty">No players found in this list.</p>';
}
async function changeMode(next){
 mode=next==='historical'?'historical':'current';
 overlay.querySelectorAll('[data-search-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.searchMode===mode)));
 render();
 if(mode==='historical'&&!historical){
  try{await loadArchive();if(mode==='historical')render();}
  catch(_){status.textContent='Historical source is currently unavailable.';results.innerHTML='<p class="shua-search-empty">Unable to load retired players. Please try again.</p>';}
 }
}
function open(){
 if(visible)return;visible=true;overlay.hidden=false;
 document.body.classList.remove('mobile-menu-open');
 document.body.dataset.shuaSearchOpen='1';
 const suggestions=document.getElementById('suggestions');if(suggestions)suggestions.style.display='none';
 render();void loadHeadshots();requestAnimationFrame(()=>input.focus({preventScroll:true}));
}
function close(){
 if(!visible)return;visible=false;overlay.hidden=true;syncInputAvatar(null);delete document.body.dataset.shuaSearchOpen;
 const original=document.getElementById('search');if(original)original.value='';
}
async function choose(i){
 const p=shown[i],from=mode;if(!p)return;
 const id=++version;close();
 if(typeof window.openUnifiedPlayerProfileByName!=='function')return;
 if(from==='historical'){
  let seed=null;
  try{
   const career=await window.ShuaEspnLive?.getHistoricalCareer?.(p.name);
   seed=career?.find(x=>Number(x.year)===p.lastYear)||career?.[0]||
    await window.ShuaEspnLive?.getAnyPlayerByName?.(p.name,p.lastYear);
  }catch(_){}
  if(id!==version)return;
  if(!seed){open();status.textContent='Archived profile unavailable for '+p.name+'.';return;}
  await window.openUnifiedPlayerProfileByName(p.name,{...seed,year:seed.year||p.lastYear,seasonYear:seed.year||p.lastYear,source:'nflverse'});
 }else await window.openUnifiedPlayerProfileByName(p.name);
}
overlay.addEventListener('click',event=>{
 if(event.target.closest('[data-search-close]')){close();return;}
 const toggle=event.target.closest('[data-search-mode]');if(toggle){void changeMode(toggle.dataset.searchMode);return;}
 const item=event.target.closest('[data-search-player]');if(item)void choose(Number(item.dataset.searchPlayer));
});
input.addEventListener('input',render);
input.addEventListener('keydown',event=>{
 if(event.key==='Escape'){event.preventDefault();close();}
 if(event.key==='Enter'&&shown.length){event.preventDefault();void choose(0);}
});
document.addEventListener('keydown',event=>{if(visible&&event.key==='Escape'){event.preventDefault();close();}},true);
const original=document.getElementById('search');
original.addEventListener('focus',open);original.addEventListener('click',open);
// One consistent search entry point is visible above every site section, even when
// Analytics/Stats/Trades hide the other <main> children or phone mode hides navigation.
const globalSearch=document.createElement('div');
globalSearch.id='shuaGlobalSearchBar';
globalSearch.setAttribute('role','search');
globalSearch.innerHTML='<button type="button" class="shua-global-search-launch" aria-label="Search NFL players">'+
 '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.7" cy="10.7" r="6.5"></circle><path d="m16 16 5 5"></path></svg>'+
 '<span>Search players…</span><span class="shua-global-search-hint">Current &amp; historical</span></button>';
const sticky=document.querySelector('.sticky');
if(sticky)sticky.insertAdjacentElement('afterend',globalSearch);
else document.body.prepend(globalSearch);
globalSearch.querySelector('button').addEventListener('click',open);
window.ShuaPlayerSearch={open,close,get mode(){return mode;}};
})();
