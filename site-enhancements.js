(()=>{
'use strict';
const TEAM_SLUGS={ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GNB:'gb',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KAN:'kc',KC:'kc',LAC:'lac',LAR:'lar',LVR:'lv',LV:'lv',MIA:'mia',MIN:'min',NWE:'ne',NE:'ne',NOR:'no',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SFO:'sf',SF:'sf',TAM:'tb',TB:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'};
const POSITIONS=['QB','RB','WR','TE'];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const aliases={kennethwalkeriii:'kennethwalker',travisetiennejr:'travisetienne',marvinharrisonjr:'marvinharrison',michaelpittmanjr:'michaelpittman',brianthomasjr:'brianthomas',tyronetracyjr:'tyronetracy',brianrobinsonjr:'brianrobinson',jeramayahlove:'jeremiyahlove',kennethgainwell:'kennygainwell',jaydenblue:'jaydonblue',kcconception:'kcconcepcion',patbyrnat:'patbryant'};
const canon=s=>aliases[norm(s)]||norm(s);
let tags={QB:{draft:[],'do-not-draft':[]},RB:{draft:[],'do-not-draft':[]},WR:{draft:[],'do-not-draft':[]},TE:{draft:[],'do-not-draft':[]}};
let rankPlayers=[];
let currentKind=null;
let currentPos='ALL';

function addStyles(){
  if(document.getElementById('shuaEnhancementStyles'))return;
  const st=document.createElement('style');st.id='shuaEnhancementStyles';st.textContent=`
    @media(min-width:901px){.search{flex:0 1 285px!important;min-width:180px!important}}
    .myguys-btn{border-color:#35d07f66!important}.myguys-btn.active{background:#145c3d!important;color:#fff!important;border-color:#35d07f!important}
    .dnd-btn{border-color:#ff174466!important}.dnd-btn.active{background:#681b2a!important;color:#fff!important;border-color:#ff1744!important}
    .tagged-controls{display:none;gap:7px;flex-wrap:wrap;margin:12px 0}.tagged-controls.open{display:flex}.tagged-controls button{border:1px solid var(--l);background:transparent;color:var(--m);border-radius:8px;padding:8px 12px;font-weight:900}.tagged-controls button.active{background:#183d63;color:#fff}.tagged-count{margin-left:auto;color:var(--m);align-self:center;font-weight:800}
    .tag-group td{background:#0d2945!important;color:#fff!important;font-weight:950!important;letter-spacing:.08em;padding:9px 14px!important}.tag-group.qb td{border-left:5px solid var(--qb)}.tag-group.rb td{border-left:5px solid var(--rb)}.tag-group.wr td{border-left:5px solid var(--wr)}.tag-group.te td{border-left:5px solid var(--te)}
    .team-abbr{display:inline-flex;align-items:center;gap:7px;font-weight:800;white-space:nowrap}.team-mini-logo{width:22px;height:22px;object-fit:contain;vertical-align:middle;flex:0 0 22px}.team-mini-logo.sm{width:18px;height:18px;flex-basis:18px}
    @media(max-width:650px){.tagged-controls.open{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.tagged-controls button{padding:8px 4px}.tagged-count{grid-column:1/-1;margin-left:0}.tag-group{display:block!important}.tag-group td{display:block!important}}
    @media(max-width:650px){
      .phone-mode #tableCard tbody tr{grid-template-columns:42px minmax(0,1fr) 58px 62px!important}
      .phone-mode #tableCard tbody td:nth-child(4){padding-left:0!important;padding-right:2px!important;transform:translateX(-5px);overflow:visible!important}
      .phone-mode #tableCard .team-abbr{gap:3px!important;font-size:.68rem!important}
      .phone-mode #tableCard .team-mini-logo{width:17px!important;height:17px!important;flex-basis:17px!important}
    }

  `;document.head.appendChild(st);
}
function logoHtml(team,small=false){const slug=TEAM_SLUGS[team];return slug?`<span class="team-abbr"><img class="team-mini-logo${small?' sm':''}" src="https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png" alt=""><span>${team}</span></span>`:`<span class="team-abbr">${team||'—'}</span>`}
function tagSet(pos,key){return new Set((tags[pos]?.[key]||[]).map(canon))}
function isTagged(p,key){if(!p||!POSITIONS.includes(p.position))return false;const n=canon(p.name);const wanted=tagSet(p.position,key);const opposite=tagSet(p.position,key==='draft'?'do-not-draft':'draft');if(opposite.has(n))return false;if(wanted.has(n))return true;return p.additionalStats?.tag===key}
function idFor(p){return `${p.position.toLowerCase()}-${p.positionRank}-${norm(p.name)}`}
function buildRows(kind){
  const key=kind==='MYGUYS'?'draft':'do-not-draft';
  let arr=rankPlayers.filter(p=>isTagged(p,key));
  if(currentPos!=='ALL')arr=arr.filter(p=>p.position===currentPos);
  arr.sort((a,b)=>POSITIONS.indexOf(a.position)-POSITIONS.indexOf(b.position)||a.positionRank-b.positionRank);
  return arr;
}
function ensureControls(){
  let c=document.getElementById('taggedControls');
  if(c)return c;
  c=document.createElement('div');c.id='taggedControls';c.className='tagged-controls';
  c.innerHTML=`<button data-tagpos="ALL" class="active">All</button><button data-tagpos="QB">QB</button><button data-tagpos="RB">RB</button><button data-tagpos="WR">WR</button><button data-tagpos="TE">TE</button><span id="taggedCount" class="tagged-count"></span>`;
  const anchor=document.getElementById('overallToggle');
  (anchor?.parentNode||document.querySelector('main'))?.insertBefore(c,anchor?anchor.nextSibling:null);
  c.querySelectorAll('[data-tagpos]').forEach(b=>b.onclick=()=>{currentPos=b.dataset.tagpos;c.querySelectorAll('[data-tagpos]').forEach(x=>x.classList.toggle('active',x===b));renderTagged()});
  return c;
}
function addNav(){
  const nav=document.querySelector('.positions');if(!nav)return;
  nav.querySelector('[data-pos="ADMIN"]')?.remove();
  document.getElementById('adminSection')?.remove();
  let my=nav.querySelector('[data-pos="MYGUYS"]');
  if(!my){my=document.createElement('button');my.className='pos myguys-btn';my.dataset.pos='MYGUYS';my.textContent='My Guys';nav.insertBefore(my,nav.querySelector('[data-pos="MOCK"]')||null)}
  let dnd=nav.querySelector('[data-pos="DND"]');
  if(!dnd){dnd=document.createElement('button');dnd.className='pos dnd-btn';dnd.dataset.pos='DND';dnd.textContent='Do Not Draft';nav.insertBefore(dnd,nav.querySelector('[data-pos="MOCK"]')||null)}
  my.onclick=()=>openTagged('MYGUYS',my);dnd.onclick=()=>openTagged('DND',dnd);
}
function openTagged(kind,button){
  currentKind=kind;currentPos='ALL';
  try{position=kind}catch(e){}
  document.querySelectorAll('.positions .pos').forEach(x=>x.classList.toggle('active',x===button));
  const c=ensureControls();c.querySelectorAll('[data-tagpos]').forEach(x=>x.classList.toggle('active',x.dataset.tagpos==='ALL'));
  renderTagged();
}
function renderTagged(){
  if(!currentKind)return;
  const my=currentKind==='MYGUYS';
  const arr=buildRows(currentKind);
  const c=ensureControls();c.classList.add('open');
  document.getElementById('title').textContent=my?'My Guys':'Do Not Draft';
  document.getElementById('sub').textContent=currentPos==='ALL'?'Grouped by position — QB, RB, WR, TE':`Showing ${currentPos} only`;
  document.getElementById('teamControls').hidden=true;document.getElementById('overallToggle').hidden=true;document.getElementById('mockSection').hidden=true;document.getElementById('depthSection').hidden=true;document.getElementById('board').hidden=true;document.getElementById('tableCard').hidden=false;
  document.getElementById('taggedCount').textContent=`${arr.length} player${arr.length===1?'':'s'}`;
  const grouped=currentPos==='ALL';let last='';let html='';
  arr.forEach(p=>{if(grouped&&p.position!==last){last=p.position;html+=`<tr class="tag-group ${p.position.toLowerCase()}"><td colspan="6">${p.position}</td></tr>`}const a=p.additionalStats||{};html+=`<tr data-id="${idFor(p)}"><td class="rank">#${p.positionRank}</td><td><div class="photo-cell">${typeof pic==='function'?pic(p.name,'',p.team,p.position):''}<b class="${my?'draft-name':'do-not-draft-name'}">${p.name}</b></div></td><td><span class="badge">${p.position}</span></td><td>${p.team}</td><td>${a.espnAdp||'—'}</td><td class="notes">${a.notes||'—'}</td></tr>`});
  document.getElementById('rows').innerHTML=html;
  document.querySelectorAll('#rows tr[data-id]').forEach(tr=>tr.onclick=()=>{if(typeof profile==='function')profile(tr.dataset.id)});
  decorateTeamLogos();
}
function hideTagged(){currentKind=null;const c=document.getElementById('taggedControls');if(c)c.classList.remove('open')}
function decorateTeamLogos(){
  document.querySelectorAll('#rows tr:not(.tag-group)').forEach(tr=>{const tds=tr.querySelectorAll('td');if(tds.length<4)return;const td=tds[3];if(td.querySelector('.team-mini-logo'))return;const team=td.textContent.trim();if(TEAM_SLUGS[team])td.innerHTML=logoHtml(team)});
  document.querySelectorAll('.pool-meta').forEach(el=>{if(el.querySelector('.team-mini-logo'))return;const m=el.textContent.match(/^(.*?)[·]\s*([A-Z]{2,3})\s*$/);if(m&&TEAM_SLUGS[m[2]])el.innerHTML=`${m[1]}· ${logoHtml(m[2],true)}`});
  document.querySelectorAll('.roster-card span').forEach(el=>{if(el.querySelector('.team-mini-logo'))return;const m=el.textContent.match(/^(.*?)[·]\s*([A-Z]{2,3})\s*$/);if(m&&TEAM_SLUGS[m[2]])el.innerHTML=`${m[1]}· ${logoHtml(m[2],true)}`});
}
function applyColors(){
  const green=new Set(),red=new Set();Object.values(tags).forEach(g=>{(g.draft||[]).forEach(n=>green.add(canon(n)));(g['do-not-draft']||[]).forEach(n=>red.add(canon(n)))});
  document.querySelectorAll('#rows .photo-cell b,.pool-player span[data-id]>b,.roster-card b,.sug b').forEach(el=>{const n=canon(el.textContent.replace(/^(QB|RB|WR|TE|FLEX):\s*/i,''));el.classList.remove('draft-name','do-not-draft-name');if(red.has(n))el.classList.add('do-not-draft-name');else if(green.has(n))el.classList.add('draft-name')});
}
async function loadData(){
  const files=['player-color-tags.json','qb-rankings.json','rb-rankings.json','wr-rankings.json','te-rankings.json'];
  const [tagData,...rankData]=await Promise.all(files.map(f=>fetch(f,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(f);return r.json()})));
  tags=tagData;rankPlayers=[];
  rankData.forEach((d,i)=>{const pos=POSITIONS[i];(d.players||[]).forEach(x=>rankPlayers.push({name:x.name,team:x.team||'—',position:pos,positionRank:+x.rank,additionalStats:x}))});
  applyColors();if(currentKind)renderTagged();
}
function install(){
  addStyles();ensureControls();addNav();
  document.addEventListener('click',e=>{const b=e.target.closest('.positions .pos');if(b&&!['MYGUYS','DND'].includes(b.dataset.pos))hideTagged()},true);
  const obs=new MutationObserver(()=>requestAnimationFrame(()=>{decorateTeamLogos();applyColors()}));obs.observe(document.body,{subtree:true,childList:true});
  loadData().catch(console.error);requestAnimationFrame(decorateTeamLogos);
}
install();
})();