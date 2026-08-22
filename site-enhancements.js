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
  const st=document.createElement('style');
  st.id='shuaEnhancementStyles';
  st.textContent=`
    .tools>.search{display:none!important}
    @media(min-width:901px){.search{flex:0 1 285px!important;min-width:180px!important}}
    .home-btn.active{background:linear-gradient(90deg,#b51635,#203fa7)!important;color:#fff!important}
    .myguys-btn{border-color:#35d07f66!important}.myguys-btn.active{background:#145c3d!important;color:#fff!important;border-color:#35d07f!important}
    .dnd-btn{border-color:#ff174466!important}.dnd-btn.active{background:#681b2a!important;color:#fff!important;border-color:#ff1744!important}
    .tagged-controls{display:none;gap:7px;flex-wrap:wrap;margin:12px 0}.tagged-controls.open{display:flex}.tagged-controls button{border:1px solid var(--l);background:transparent;color:var(--m);border-radius:8px;padding:8px 12px;font-weight:900}.tagged-controls button.active{background:#183d63;color:#fff}.tagged-count{margin-left:auto;color:var(--m);align-self:center;font-weight:800}
    .tag-group td{background:#0d2945!important;color:#fff!important;font-weight:950!important;letter-spacing:.08em;padding:9px 14px!important}.tag-group.qb td{border-left:5px solid var(--qb)}.tag-group.rb td{border-left:5px solid var(--rb)}.tag-group.wr td{border-left:5px solid var(--wr)}.tag-group.te td{border-left:5px solid var(--te)}
    .team-abbr{display:inline-flex;align-items:center;gap:7px;font-weight:800;white-space:nowrap}.team-mini-logo{width:22px;height:22px;object-fit:contain;vertical-align:middle;flex:0 0 22px}.team-mini-logo.sm{width:18px;height:18px;flex-basis:18px}

    #fantasyHome{display:none;position:fixed;inset:0;z-index:10;background:#010315;align-items:center;justify-content:center;overflow:hidden}
    #fantasyHome img{width:min(88vw,900px);height:min(88vh,900px);object-fit:contain;filter:drop-shadow(0 0 34px rgba(69,39,255,.18))}
    body.fantasy-home-mode #fantasyHome{display:flex}
    body.fantasy-home-mode header,body.fantasy-home-mode main{display:none!important}
    body.fantasy-home-mode .sticky{position:fixed;left:0;right:0;top:0;z-index:30;background:linear-gradient(180deg,rgba(1,3,21,.92),rgba(1,3,21,.28),transparent);border:0}
    body.fantasy-home-mode .tools{justify-content:center}
    body.fantasy-home-mode .search{display:none!important}
    body.fantasy-home-mode .positions{justify-content:center}

    #phoneMenuButton{display:none;position:fixed;top:14px;right:14px;z-index:120;width:48px;height:48px;border:1px solid #ffffff35;border-radius:12px;background:#061322eb;box-shadow:0 8px 24px #0008;align-items:center;justify-content:center;flex-direction:column;gap:5px;padding:0}
    #phoneMenuButton span{display:block;width:23px;height:3px;border-radius:3px;background:#fff}
    #phoneMenuBackdrop{display:none;position:fixed;inset:0;z-index:108;background:rgba(0,0,0,.58);backdrop-filter:blur(2px)}
    #phoneMenuDrawer{position:fixed;top:0;right:0;bottom:0;z-index:110;width:min(82vw,330px);transform:translateX(105%);transition:transform .22s ease;background:linear-gradient(180deg,#07182a,#04101e);border-left:1px solid #ffffff25;box-shadow:-18px 0 40px #0009;padding:78px 16px 24px;overflow-y:auto}
    #phoneMenuDrawer h3{margin:0 0 14px;color:#91a4ba;font-size:.75rem;letter-spacing:.18em;text-transform:uppercase}
    #phoneMenuDrawer button{display:block;width:100%;min-height:48px;margin:0 0 8px;padding:10px 13px;border:1px solid #ffffff25;border-radius:10px;background:#0b2139;color:#fff;text-align:left;font-weight:900}
    #phoneMenuDrawer button.active{background:#183d63;border-color:#ffffff55}
    #phoneMenuSearchWrap{margin-top:10px;padding-top:12px;border-top:1px solid #ffffff20}
    #phoneMenuSearchWrap label{display:block;margin:0 0 7px;color:#91a4ba;font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    #phoneMenuSearch{width:100%;height:44px;border:1px solid #ffffff25;border-radius:10px;background:#0b2139;color:#fff;padding:0 11px;outline:none}
    #phoneMenuSearchResults{margin-top:6px;border-radius:10px;overflow:hidden;background:#081a2d}
    .phone-menu-search-result{display:block!important;width:100%!important;min-height:42px!important;margin:0!important;border:0!important;border-top:1px solid #ffffff12!important;border-radius:0!important;background:#081a2d!important;color:#fff!important;padding:8px 10px!important;text-align:left!important;font-weight:800!important}
    .phone-menu-search-result small{display:block;margin-top:2px;color:#7f93aa;font-size:.64rem;font-weight:700}
    body.mobile-menu-open #phoneMenuBackdrop{display:block}
    body.mobile-menu-open #phoneMenuDrawer{transform:translateX(0)}

    @media(max-width:650px){
      .tagged-controls.open{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.tagged-controls button{padding:8px 4px}.tagged-count{grid-column:1/-1;margin-left:0}.tag-group{display:block!important}.tag-group td{display:block!important}
      .phone-mode .positions{display:none!important}
      .phone-mode #phoneMenuButton{display:flex}
      .phone-mode #fantasyHome img{width:96vw;height:88vh}
      .phone-mode #tableCard tbody tr{grid-template-columns:42px minmax(0,1fr) 58px 62px!important}
      .phone-mode #tableCard tbody td:nth-child(4){padding-left:0!important;padding-right:2px!important;transform:translateX(-5px);overflow:visible!important}
      .phone-mode #tableCard .team-abbr{gap:3px!important;font-size:.68rem!important}
      .phone-mode #tableCard .team-mini-logo{width:17px!important;height:17px!important;flex-basis:17px!important}
      .phone-mode.fantasy-home-mode .sticky{height:0;overflow:visible;background:transparent}
      .phone-mode.fantasy-home-mode .tools{display:none!important}
    }
  `;
  document.head.appendChild(st);
}

function logoHtml(team,small=false){
  const slug=TEAM_SLUGS[team];
  return slug?`<span class="team-abbr"><img class="team-mini-logo${small?' sm':''}" src="https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png" alt=""><span>${team}</span></span>`:`<span class="team-abbr">${team||'—'}</span>`;
}
function tagSet(pos,key){return new Set((tags[pos]?.[key]||[]).map(canon))}
function isTagged(p,key){
  if(!p||!POSITIONS.includes(p.position))return false;
  const n=canon(p.name),wanted=tagSet(p.position,key),opposite=tagSet(p.position,key==='draft'?'do-not-draft':'draft');
  if(opposite.has(n))return false;
  if(wanted.has(n))return true;
  return p.additionalStats?.tag===key;
}
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
  c=document.createElement('div');
  c.id='taggedControls';c.className='tagged-controls';
  c.innerHTML=`<button data-tagpos="ALL" class="active">All</button><button data-tagpos="QB">QB</button><button data-tagpos="RB">RB</button><button data-tagpos="WR">WR</button><button data-tagpos="TE">TE</button><span id="taggedCount" class="tagged-count"></span>`;
  const anchor=document.getElementById('overallToggle');
  (anchor?.parentNode||document.querySelector('main'))?.insertBefore(c,anchor?anchor.nextSibling:null);
  c.querySelectorAll('[data-tagpos]').forEach(b=>b.onclick=()=>{
    currentPos=b.dataset.tagpos;
    c.querySelectorAll('[data-tagpos]').forEach(x=>x.classList.toggle('active',x===b));
    renderTagged();
  });
  return c;
}
function hideTagged(){currentKind=null;const c=document.getElementById('taggedControls');if(c)c.classList.remove('open')}

function ensureHome(){
  if(document.getElementById('fantasyHome'))return;
  const home=document.createElement('section');
  home.id='fantasyHome';
  home.innerHTML='<img src="fantasy-home.svg" alt="Fantasy">';
  document.body.insertBefore(home,document.body.firstChild);
}
function showHome(){
  hideTagged();
  document.body.classList.add('fantasy-home-mode');
  document.querySelectorAll('.positions .pos').forEach(x=>x.classList.toggle('active',x.dataset.pos==='HOME'));
  closeMobileMenu();
}
function leaveHome(){document.body.classList.remove('fantasy-home-mode')}

function addNav(){
  const nav=document.querySelector('.positions');if(!nav)return;
  nav.querySelector('[data-pos="ADMIN"]')?.remove();
  document.getElementById('adminSection')?.remove();

  let home=nav.querySelector('[data-pos="HOME"]');
  if(!home){
    home=document.createElement('button');home.className='pos home-btn';home.dataset.pos='HOME';home.textContent='Home';
    nav.insertBefore(home,nav.firstChild);
  }
  home.onclick=e=>{e.preventDefault();showHome()};

  let my=nav.querySelector('[data-pos="MYGUYS"]');
  if(!my){my=document.createElement('button');my.className='pos myguys-btn';my.dataset.pos='MYGUYS';my.textContent='My Guys';nav.insertBefore(my,nav.querySelector('[data-pos="MOCK"]')||null)}
  let dnd=nav.querySelector('[data-pos="DND"]');
  if(!dnd){dnd=document.createElement('button');dnd.className='pos dnd-btn';dnd.dataset.pos='DND';dnd.textContent='Do Not Draft';nav.insertBefore(dnd,nav.querySelector('[data-pos="MOCK"]')||null)}
  my.onclick=()=>openTagged('MYGUYS',my);
  dnd.onclick=()=>openTagged('DND',dnd);
}

function openTagged(kind,button){
  leaveHome();
  currentKind=kind;currentPos='ALL';
  try{position=kind}catch(e){}
  document.querySelectorAll('.positions .pos').forEach(x=>x.classList.toggle('active',x===button));
  const c=ensureControls();
  c.querySelectorAll('[data-tagpos]').forEach(x=>x.classList.toggle('active',x.dataset.tagpos==='ALL'));
  renderTagged();
  closeMobileMenu();
}
function renderTagged(){
  if(!currentKind)return;
  const my=currentKind==='MYGUYS',arr=buildRows(currentKind),c=ensureControls();
  c.classList.add('open');
  document.getElementById('title').textContent=my?'My Guys':'Do Not Draft';
  document.getElementById('sub').textContent=currentPos==='ALL'?'Grouped by position — QB, RB, WR, TE':`Showing ${currentPos} only`;
  document.getElementById('teamControls').hidden=true;
  document.getElementById('overallToggle').hidden=true;
  document.getElementById('mockSection').hidden=true;
  document.getElementById('depthSection').hidden=true;
  document.getElementById('board').hidden=true;
  document.getElementById('tableCard').hidden=false;
  document.getElementById('taggedCount').textContent=`${arr.length} player${arr.length===1?'':'s'}`;
  const grouped=currentPos==='ALL';let last='',html='';
  arr.forEach(p=>{
    if(grouped&&p.position!==last){last=p.position;html+=`<tr class="tag-group ${p.position.toLowerCase()}"><td colspan="6">${p.position}</td></tr>`}
    const a=p.additionalStats||{};
    html+=`<tr data-id="${idFor(p)}"><td class="rank">#${p.positionRank}</td><td><div class="photo-cell">${typeof pic==='function'?pic(p.name,'',p.team,p.position):''}<b class="${my?'draft-name':'do-not-draft-name'}">${p.name}</b></div></td><td><span class="badge">${p.position}</span></td><td>${p.team}</td><td>${a.espnAdp||'—'}</td><td class="notes">${a.notes||'—'}</td></tr>`;
  });
  document.getElementById('rows').innerHTML=html;
  document.querySelectorAll('#rows tr[data-id]').forEach(tr=>tr.onclick=()=>{if(typeof profile==='function')profile(tr.dataset.id)});
  decorateTeamLogos();
}

function ensureMobileMenu(){
  if(document.getElementById('phoneMenuButton'))return;
  const button=document.createElement('button');
  button.id='phoneMenuButton';button.type='button';button.setAttribute('aria-label','Open menu');
  button.innerHTML='<span></span><span></span><span></span>';
  const backdrop=document.createElement('div');backdrop.id='phoneMenuBackdrop';
  const drawer=document.createElement('aside');drawer.id='phoneMenuDrawer';drawer.innerHTML='<h3>Fantasy Menu</h3><div id="phoneMenuItems"></div><div id="phoneMenuSearchWrap"><label for="phoneMenuSearch">Search players</label><input id="phoneMenuSearch" type="search" placeholder="Search for a player…" autocomplete="off"><div id="phoneMenuSearchResults"></div></div>';
  document.body.append(button,backdrop,drawer);
  button.onclick=()=>document.body.classList.contains('mobile-menu-open')?closeMobileMenu():openMobileMenu();
  backdrop.onclick=closeMobileMenu;
  const menuSearch=document.getElementById('phoneMenuSearch');
  const menuResults=document.getElementById('phoneMenuSearchResults');
  if(menuSearch&&menuResults){
    menuSearch.addEventListener('input',()=>{
      const q=norm(menuSearch.value);
      if(!q){menuResults.innerHTML='';return;}
      const seen=new Set();
      const matches=[...board,...players].filter(p=>{const k=p.id||norm(p.name);if(seen.has(k))return false;seen.add(k);return norm(p.name).includes(q)}).slice(0,10);
      menuResults.innerHTML=matches.map(p=>`<button type="button" class="phone-menu-search-result" data-menu-player="${p.id}"><span>${p.name}</span><small>${p.position} #${p.positionRank} · ${p.team}</small></button>`).join('')||'<div style="padding:10px;color:#7f93aa">No players found</div>';
    });
    menuResults.addEventListener('click',e=>{const b=e.target.closest('[data-menu-player]');if(!b)return;closeMobileMenu();if(typeof profile==='function')profile(b.dataset.menuPlayer);});
  }
}
function openMobileMenu(){refreshMobileMenu();document.body.classList.add('mobile-menu-open')}
function closeMobileMenu(){document.body.classList.remove('mobile-menu-open')}
function refreshMobileMenu(){
  const box=document.getElementById('phoneMenuItems');if(!box)return;
  box.innerHTML='';
  document.querySelectorAll('.positions .pos').forEach(source=>{
    const b=document.createElement('button');
    b.type='button';b.textContent=source.textContent.trim();b.dataset.target=source.dataset.pos||'';
    b.classList.toggle('active',source.classList.contains('active'));
    b.onclick=()=>{
      if(source.dataset.pos==='HOME')showHome();
      else{leaveHome();source.click();}
      closeMobileMenu();
    };
    box.appendChild(b);
  });
}

function decorateTeamLogos(){
  document.querySelectorAll('#rows tr:not(.tag-group)').forEach(tr=>{
    const tds=tr.querySelectorAll('td');if(tds.length<4)return;
    const td=tds[3];if(td.querySelector('.team-mini-logo'))return;
    const team=td.textContent.trim();if(TEAM_SLUGS[team])td.innerHTML=logoHtml(team);
  });
  document.querySelectorAll('.pool-meta').forEach(el=>{
    if(el.querySelector('.team-mini-logo'))return;
    const m=el.textContent.match(/^(.*?)[·]\s*([A-Z]{2,3})\s*$/);
    if(m&&TEAM_SLUGS[m[2]])el.innerHTML=`${m[1]}· ${logoHtml(m[2],true)}`;
  });
  document.querySelectorAll('.roster-card span').forEach(el=>{
    if(el.querySelector('.team-mini-logo'))return;
    const m=el.textContent.match(/^(.*?)[·]\s*([A-Z]{2,3})\s*$/);
    if(m&&TEAM_SLUGS[m[2]])el.innerHTML=`${m[1]}· ${logoHtml(m[2],true)}`;
  });
}
function applyColors(){
  const green=new Set(),red=new Set();
  Object.values(tags).forEach(g=>{(g.draft||[]).forEach(n=>green.add(canon(n)));(g['do-not-draft']||[]).forEach(n=>red.add(canon(n)))});
  document.querySelectorAll('#rows .photo-cell b,.pool-player span[data-id]>b,.roster-card b,.sug b').forEach(el=>{
    const n=canon(el.textContent.replace(/^(QB|RB|WR|TE|FLEX):\s*/i,''));
    el.classList.remove('draft-name','do-not-draft-name');
    if(red.has(n))el.classList.add('do-not-draft-name');else if(green.has(n))el.classList.add('draft-name');
  });
}
async function loadData(){
  const files=['player-color-tags.json','qb-rankings.json','rb-rankings.json','wr-rankings.json','te-rankings.json'];
  const [tagData,...rankData]=await Promise.all(files.map(f=>fetch(f,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(f);return r.json()})));
  tags=tagData;rankPlayers=[];
  rankData.forEach((d,i)=>{const pos=POSITIONS[i];(d.players||[]).forEach(x=>rankPlayers.push({name:x.name,team:x.team||'—',position:pos,positionRank:+x.rank,additionalStats:x}))});
  applyColors();if(currentKind)renderTagged();
}

function install(){
  addStyles();ensureHome();ensureControls();addNav();ensureMobileMenu();
  document.addEventListener('click',e=>{
    const b=e.target.closest('.positions .pos');
    if(!b)return;
    if(!['HOME','MYGUYS','DND'].includes(b.dataset.pos)){leaveHome();hideTagged();closeMobileMenu();}
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileMenu()});
  const obs=new MutationObserver(()=>requestAnimationFrame(()=>{decorateTeamLogos();applyColors()}));
  obs.observe(document.body,{subtree:true,childList:true});
  loadData().catch(console.error);
  requestAnimationFrame(()=>{decorateTeamLogos();applyColors();showHome()});
}
install();
})();