(()=>{
'use strict';
const STORAGE_KEY='shuaAdminOverridesV1';
const TEAM_SLUGS={ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GNB:'gb',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KAN:'kc',KC:'kc',LAC:'lac',LAR:'lar',LVR:'lv',LV:'lv',MIA:'mia',MIN:'min',NWE:'ne',NE:'ne',NOR:'no',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SFO:'sf',SF:'sf',TAM:'tb',TB:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'};
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
let colorTags={QB:{draft:[], 'do-not-draft':[]},RB:{draft:[], 'do-not-draft':[]},WR:{draft:[], 'do-not-draft':[]},TE:{draft:[], 'do-not-draft':[]}};
let enhancementsReady=false,dragIndex=null;

function injectStyles(){
  const st=document.createElement('style');
  st.textContent=`
  @media(min-width:901px){.search{flex:0 1 285px!important;min-width:180px!important}}
  .myguys-btn.active{background:#145c3d!important;color:#fff!important;border-color:#35d07f!important}
  .team-abbr{display:inline-flex;align-items:center;gap:7px;font-weight:800;white-space:nowrap}.team-mini-logo{width:22px;height:22px;object-fit:contain;vertical-align:middle;flex:0 0 22px}.team-mini-logo.sm{width:18px;height:18px;flex-basis:18px}
  .admin-section{display:none}.admin-section.open{display:block}.admin-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin:12px 0}.admin-toolbar label{display:grid;gap:5px;color:var(--m);font-weight:800}.admin-toolbar select,.admin-toolbar input{height:42px;border:1px solid var(--l);border-radius:8px;background:#0b2139;color:#fff;padding:0 10px}.admin-toolbar button,.admin-action{border:1px solid var(--l);background:#102a47;color:#fff;border-radius:8px;padding:10px 12px;font-weight:900}.admin-toolbar .danger,.admin-action.danger{background:#5a1722}.admin-toolbar .good,.admin-action.good{background:#145c3d}.admin-note{padding:10px 12px;border:1px solid #ffffff25;border-radius:9px;color:var(--m);margin:10px 0;background:#091c30}.admin-status{font-weight:900;margin:8px 0}.admin-table-wrap{overflow:auto;border:1px solid var(--l);border-radius:12px;background:#091c30}.admin-table{min-width:980px}.admin-table th{position:sticky;top:0;background:#091c30;z-index:2}.admin-table input,.admin-table textarea,.admin-table select{width:100%;border:1px solid #ffffff20;border-radius:6px;background:#07192a;color:#fff;padding:7px}.admin-table textarea{min-height:58px;resize:vertical}.admin-table tr[draggable="true"]{cursor:grab}.admin-table tr.dragging{opacity:.45}.admin-order{display:flex;align-items:center;gap:5px}.admin-order button{border:1px solid #ffffff25;background:#102a47;color:#fff;border-radius:6px;padding:5px 8px}.admin-depth-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.admin-depth-card{border:1px solid var(--l);border-radius:10px;padding:12px;background:#091c30}.admin-depth-card textarea{width:100%;min-height:340px;background:#07192a;color:#fff;border:1px solid #ffffff20;border-radius:7px;padding:9px;resize:vertical}.admin-tag-draft{color:#35d07f}.admin-tag-dnd{color:#ff1744}.local-edit-badge{display:inline-block;margin-left:8px;padding:3px 7px;border-radius:999px;background:#5b4510;color:#ffe59a;font-size:.7rem;font-weight:900}
  @media(max-width:850px){.admin-depth-grid{grid-template-columns:1fr 1fr}}@media(max-width:520px){.admin-depth-grid{grid-template-columns:1fr}.admin-toolbar>*{width:100%}.admin-toolbar button{width:100%}}
  `;
  document.head.appendChild(st);
}
function logoHtml(team,small=false){const slug=TEAM_SLUGS[team];return slug?`<span class="team-abbr"><img class="team-mini-logo${small?' sm':''}" src="https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png" alt=""><span>${team}</span></span>`:`<span class="team-abbr">${team||'—'}</span>`}
function isMyGuy(p){if(!p||!p.position||!colorTags[p.position])return false;const s=new Set((colorTags[p.position].draft||[]).map(norm));return s.has(norm(p.name))||p.additionalStats?.tag==='draft'}
function isDoNotDraft(p){if(!p||!p.position||!colorTags[p.position])return false;const s=new Set((colorTags[p.position]['do-not-draft']||[]).map(norm));return s.has(norm(p.name))||p.additionalStats?.tag==='do-not-draft'}
function bestRank(p){const b=board.find(x=>norm(x.name)===norm(p.name));return b?.overallRank||9999}
function uniqueAllPlayers(){const out=[],seen=new Set();[...board,...players].forEach(p=>{const k=norm(p.name)+'|'+p.position;if(!seen.has(k)){seen.add(k);out.push(p)}});return out}
function addNavButtons(){
  const nav=document.querySelector('.positions'); if(!nav)return;
  if(!nav.querySelector('[data-pos="MYGUYS"]')){
    const b=document.createElement('button');b.className='pos myguys-btn';b.dataset.pos='MYGUYS';b.textContent='My Guys';
    const mock=nav.querySelector('[data-pos="MOCK"]');nav.insertBefore(b,mock||null);
    b.onclick=()=>{position='MYGUYS';nav.querySelectorAll('.pos').forEach(x=>x.classList.toggle('active',x===b));render()};
  }
  if(!nav.querySelector('[data-pos="ADMIN"]')){
    const b=document.createElement('button');b.className='pos';b.dataset.pos='ADMIN';b.textContent='Admin';nav.appendChild(b);
    b.onclick=()=>{position='ADMIN';nav.querySelectorAll('.pos').forEach(x=>x.classList.toggle('active',x===b));render()};
  }
  const filters=document.querySelector('.mock-filters');
  if(filters&&!filters.querySelector('[data-filter="MYGUYS"]')){
    const b=document.createElement('button');b.className='mock-btn pool-filter';b.dataset.filter='MYGUYS';b.textContent='My Guys';filters.appendChild(b);
    b.onclick=()=>{mock.filter='MYGUYS';filters.querySelectorAll('.pool-filter').forEach(x=>x.classList.toggle('primary',x===b));renderPool()};
  }
}
function decorateTeamLogos(){
  document.querySelectorAll('#rows tr').forEach(tr=>{const tds=tr.querySelectorAll('td');if(tds.length<4)return;const td=tds[3];if(td.querySelector('.team-mini-logo'))return;const team=td.textContent.trim();if(TEAM_SLUGS[team])td.innerHTML=logoHtml(team)});
  document.querySelectorAll('.pool-meta').forEach(el=>{if(el.querySelector('.team-mini-logo'))return;const m=el.textContent.match(/^(.*?)[·]\s*([A-Z]{2,3})\s*$/);if(m&&TEAM_SLUGS[m[2]])el.innerHTML=`${m[1]}· ${logoHtml(m[2],true)}`});
  document.querySelectorAll('.roster-card span').forEach(el=>{if(el.querySelector('.team-mini-logo'))return;const m=el.textContent.match(/^(.*?)[·]\s*([A-Z]{2,3})\s*$/);if(m&&TEAM_SLUGS[m[2]])el.innerHTML=`${m[1]}· ${logoHtml(m[2],true)}`});
}
function applyLocalColors(){
  const green=new Set(),red=new Set();Object.values(colorTags).forEach(g=>{(g.draft||[]).forEach(n=>green.add(norm(n)));(g['do-not-draft']||[]).forEach(n=>red.add(norm(n)))});
  document.querySelectorAll('#rows .photo-cell b,.pool-player span[data-id]>b,.roster-card b,.sug b').forEach(el=>{let n=norm(el.textContent.replace(/^(QB|RB|WR|TE|FLEX):\s*/i,''));el.classList.remove('draft-name','do-not-draft-name');if(red.has(n))el.classList.add('do-not-draft-name');else if(green.has(n))el.classList.add('draft-name')});
}
function renderMyGuys(){
  $('#title').textContent='My Guys';$('#sub').textContent='Only players marked green across QB, RB, WR and TE';
  $('#teamControls').hidden=true;$('#overallToggle').hidden=true;$('#mockSection').hidden=true;$('#depthSection').hidden=true;hideAdmin();$('#board').hidden=true;$('#tableCard').hidden=false;
  const list=uniqueAllPlayers().filter(isMyGuy).sort((a,b)=>bestRank(a)-bestRank(b)||a.position.localeCompare(b.position)||a.positionRank-b.positionRank);
  $('#rows').innerHTML=list.map((p,i)=>{const a=p.additionalStats||{},or=bestRank(p);return `<tr data-id="${p.id}"><td class="rank">${or<9999?'#'+or:'#'+(i+1)}</td><td><div class="photo-cell">${pic(p.name)}<b class="draft-name">${p.name}</b></div></td><td><span class="badge">${p.position}</span></td><td>${p.team}</td><td>${a.espnAdp||'—'}</td><td class="notes">${a.notes||'—'}</td></tr>`}).join('');bind();decorateTeamLogos();
}
function ensureAdminSection(){
  if(document.getElementById('adminSection'))return;
  const s=document.createElement('section');s.id='adminSection';s.className='admin-section';
  s.innerHTML=`<div class="admin-note"><b>Admin editor</b> — edits can be applied instantly and saved to this browser. Because this is a static GitHub Pages site, browser edits cannot safely publish to GitHub without a private authenticated backend. Use <b>Export All</b> to create one JSON file containing every change for publishing.</div>
  <div class="admin-toolbar"><label>Editor<select id="adminDataset"><option value="ALL">Overall Big Board</option><option value="QB">QB Rankings</option><option value="RB">RB Rankings</option><option value="WR">WR Rankings</option><option value="TE">TE Rankings</option><option value="DEPTH">Depth Charts</option></select></label><label id="adminTeamLabel" hidden>Team<select id="adminTeam"></select></label><label>Search<input id="adminSearch" placeholder="Find player..."></label><button id="adminAdd" class="good">+ Add Player</button><button id="adminSave" class="good">Save This Browser</button><button id="adminExport">Export All</button><button id="adminImport">Import</button><input id="adminImportFile" type="file" accept="application/json" hidden><button id="adminReset" class="danger">Reset Local Edits</button></div><div id="adminStatus" class="admin-status"></div><div id="adminEditor"></div>`;
  document.querySelector('main').appendChild(s);
  $('#adminDataset').onchange=()=>renderAdminEditor();$('#adminTeam').onchange=()=>renderAdminEditor();$('#adminSearch').oninput=()=>renderAdminEditor();
  $('#adminAdd').onclick=adminAddPlayer;$('#adminSave').onclick=saveLocal;$('#adminExport').onclick=exportAll;$('#adminImport').onclick=()=>$('#adminImportFile').click();$('#adminImportFile').onchange=importAll;$('#adminReset').onclick=resetLocal;
}
function hideAdmin(){const s=document.getElementById('adminSection');if(s)s.classList.remove('open')}
function renderAdmin(){
  ensureAdminSection();$('#title').innerHTML=`Admin Ranking Editor${localStorage.getItem(STORAGE_KEY)?'<span class="local-edit-badge">LOCAL EDITS ACTIVE</span>':''}`;$('#sub').textContent='Edit order, names, teams, ADP, notes, tags and depth charts';$('#teamControls').hidden=true;$('#overallToggle').hidden=true;$('#mockSection').hidden=true;$('#depthSection').hidden=true;$('#board').hidden=true;$('#tableCard').hidden=true;$('#adminSection').classList.add('open');renderAdminEditor();
}
function adminPlayers(ds){if(ds==='ALL')return board;return players.filter(p=>p.position===ds).sort((a,b)=>a.positionRank-b.positionRank)}
function tagValue(p){if(isDoNotDraft(p))return'do-not-draft';if(isMyGuy(p))return'draft';return''}
function renderAdminEditor(){
  const ds=$('#adminDataset').value,search=norm($('#adminSearch').value);$('#adminTeamLabel').hidden=ds!=='DEPTH';$('#adminAdd').hidden=ds==='DEPTH';
  if(ds==='DEPTH')return renderAdminDepth();
  let arr=adminPlayers(ds);if(search)arr=arr.filter(p=>norm(p.name).includes(search)||norm(p.team).includes(search));
  $('#adminStatus').textContent=`${arr.length} ${ds==='ALL'?'big-board':' '+ds} players shown`;
  $('#adminEditor').innerHTML=`<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Order</th><th>Player</th><th>Team</th>${ds==='ALL'?'':'<th>ESPN ADP</th><th>Notes</th><th>Tag</th>'}<th>Action</th></tr></thead><tbody>${arr.map((p,i)=>adminRow(p,i,ds)).join('')}</tbody></table></div>`;
  document.querySelectorAll('.admin-table tbody tr').forEach(tr=>{tr.addEventListener('dragstart',()=>{dragIndex=+tr.dataset.index;tr.classList.add('dragging')});tr.addEventListener('dragend',()=>tr.classList.remove('dragging'));tr.addEventListener('dragover',e=>e.preventDefault());tr.addEventListener('drop',e=>{e.preventDefault();adminMove(dragIndex,+tr.dataset.index,ds)})});
  document.querySelectorAll('[data-admin-field]').forEach(el=>el.onchange=()=>adminField(el,ds));document.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>adminMove(+b.dataset.up,+b.dataset.up-1,ds));document.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>adminMove(+b.dataset.down,+b.dataset.down+1,ds));document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>adminDelete(+b.dataset.del,ds));
}
function adminRow(p,i,ds){const a=p.additionalStats||{};return `<tr draggable="true" data-index="${i}"><td><div class="admin-order"><b>#${i+1}</b><button data-up="${i}" ${i===0?'disabled':''}>↑</button><button data-down="${i}">↓</button></div></td><td><input data-admin-field="name" data-index="${i}" value="${esc(p.name)}"></td><td><input data-admin-field="team" data-index="${i}" value="${esc(p.team)}"></td>${ds==='ALL'?'':`<td><input data-admin-field="espnAdp" data-index="${i}" value="${esc(a.espnAdp||'')}"></td><td><textarea data-admin-field="notes" data-index="${i}">${esc(a.notes||'')}</textarea></td><td><select data-admin-field="tag" data-index="${i}"><option value="" ${tagValue(p)===''?'selected':''}>Normal</option><option value="draft" ${tagValue(p)==='draft'?'selected':''}>My Guy</option><option value="do-not-draft" ${tagValue(p)==='do-not-draft'?'selected':''}>Do Not Draft</option></select></td>`}<td><button class="admin-action danger" data-del="${i}">Delete</button></td></tr>`}
function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function sourceArray(ds){return ds==='ALL'?board:players.filter(p=>p.position===ds).sort((a,b)=>a.positionRank-b.positionRank)}
function rebuildPosition(ds,arr){if(ds==='ALL'){board.splice(0,board.length,...arr);board.forEach((p,i)=>p.overallRank=i+1);return}const others=players.filter(p=>p.position!==ds);arr.forEach((p,i)=>{p.positionRank=i+1;p.additionalStats=p.additionalStats||{};p.additionalStats.rank=i+1});players.splice(0,players.length,...others,...arr)}
function adminMove(from,to,ds){const arr=sourceArray(ds);if(from<0||from>=arr.length||to<0||to>=arr.length)return;const [p]=arr.splice(from,1);arr.splice(to,0,p);rebuildPosition(ds,arr);renderAdminEditor()}
function adminField(el,ds){const arr=sourceArray(ds),p=arr[+el.dataset.index];if(!p)return;const f=el.dataset.adminField,v=el.value;if(f==='name'){const old=p.name;p.name=v;if(ds!=='ALL'){updateColorName(p.position,old,v)}}else if(f==='team')p.team=v.toUpperCase();else if(f==='tag')setColorTag(p,v);else{p.additionalStats=p.additionalStats||{};p.additionalStats[f]=v}renderAdminEditor()}
function adminDelete(i,ds){const arr=sourceArray(ds);if(!arr[i])return;if(!confirm(`Delete ${arr[i].name} from ${ds==='ALL'?'the Big Board':ds+' rankings'}?`))return;arr.splice(i,1);rebuildPosition(ds,arr);renderAdminEditor()}
function adminAddPlayer(){const ds=$('#adminDataset').value;if(ds==='DEPTH')return;const name=prompt('Player name');if(!name)return;const team=(prompt('Team abbreviation')||'—').toUpperCase();if(ds==='ALL'){const p=players.find(x=>norm(x.name)===norm(name))||{id:'admin-'+Date.now(),name,team,position:'—',positionRank:'—',additionalStats:{}};board.push({...p,overallRank:board.length+1})}else{const arr=sourceArray(ds);arr.push({id:ds.toLowerCase()+'-admin-'+Date.now(),name,team,position:ds,positionRank:arr.length+1,additionalStats:{rank:arr.length+1,espnAdp:'',notes:'',tag:''}});rebuildPosition(ds,arr)}renderAdminEditor()}
function updateColorName(pos,oldName,newName){const g=colorTags[pos];if(!g)return;['draft','do-not-draft'].forEach(k=>{const i=(g[k]||[]).findIndex(n=>norm(n)===norm(oldName));if(i>=0)g[k][i]=newName})}
function setColorTag(p,val){const g=colorTags[p.position];if(!g)return;['draft','do-not-draft'].forEach(k=>g[k]=(g[k]||[]).filter(n=>norm(n)!==norm(p.name)));if(val)g[val].push(p.name);p.additionalStats=p.additionalStats||{};p.additionalStats.tag=val;setTimeout(applyLocalColors,0)}
function fillAdminTeams(){const s=$('#adminTeam');if(!s||s.options.length)return;s.innerHTML=depthCharts.map(t=>`<option value="${t.team}">${t.team}</option>`).join('')}
function renderAdminDepth(){fillAdminTeams();const code=$('#adminTeam').value||depthCharts[0]?.team,d=depthCharts.find(x=>x.team===code)||depthCharts[0];if(!d){$('#adminEditor').innerHTML='No depth chart data.';return}$('#adminTeam').value=d.team;$('#adminStatus').textContent=`Editing ${d.team} depth chart — one player per line, in depth order.`;$('#adminEditor').innerHTML=`<div class="admin-depth-grid">${['QB','RB','WR','TE'].map(pos=>`<div class="admin-depth-card"><h3>${pos}</h3><textarea data-depth-pos="${pos}">${esc((d[pos]||[]).join('\n'))}</textarea></div>`).join('')}</div>`;document.querySelectorAll('[data-depth-pos]').forEach(t=>t.onchange=()=>{d[t.dataset.depthPos]=t.value.split(/\n+/).map(x=>x.trim()).filter(Boolean);$('#adminStatus').textContent=`${d.team} ${t.dataset.depthPos} updated locally.`})}
function serializePosition(pos){return {position:pos,players:sourceArray(pos).map((p,i)=>({rank:i+1,name:p.name,team:p.team,espnAdp:p.additionalStats?.espnAdp||'',notes:p.additionalStats?.notes||'',tag:tagValue(p)}))}}
function snapshot(){return {version:1,updatedAt:new Date().toISOString(),overall:{title:'SHUA Big Board',updatedAt:new Date().toISOString().slice(0,10),instructions:'Array order is the ranking order.',players:board.map(p=>p.name)},QB:serializePosition('QB'),RB:serializePosition('RB'),WR:serializePosition('WR'),TE:serializePosition('TE'),depth:{teams:depthCharts},tags:colorTags}}
function saveLocal(){localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshot()));$('#adminStatus').textContent='Saved. These edits will stay on this browser after you close or restart the device.';renderAdmin()}
function download(name,text){const b=new Blob([text],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function exportAll(){download('shua-admin-export.json',JSON.stringify(snapshot(),null,2));$('#adminStatus').textContent='Exported all rankings, depth charts and My Guys / Do Not Draft tags.'}
function importAll(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);applySnapshot(data);localStorage.setItem(STORAGE_KEY,JSON.stringify(data));renderAdmin();$('#adminStatus').textContent='Import complete and saved to this browser.'}catch(err){alert('That JSON file could not be imported.')}};r.readAsText(f);e.target.value=''}
function resetLocal(){if(!confirm('Remove all locally saved admin edits and return to the GitHub versions on next reload?'))return;localStorage.removeItem(STORAGE_KEY);location.reload()}
function applySnapshot(data){if(!data)return;if(data.tags)colorTags=data.tags;if(data.depth?.teams)depthCharts=data.depth.teams;['QB','RB','WR','TE'].forEach(pos=>{if(!data[pos]?.players)return;const arr=data[pos].players.map((x,i)=>({id:pos.toLowerCase()+'-'+(i+1)+'-'+norm(x.name),name:x.name,team:x.team||'—',position:pos,positionRank:i+1,additionalStats:{rank:i+1,espnAdp:x.espnAdp||'',notes:x.notes||'',tag:x.tag||''}}));rebuildPosition(pos,arr)});if(data.overall?.players){const map=new Map(players.map(p=>[norm(p.name),p]));const newBoard=data.overall.players.map((name,i)=>{const p=map.get(norm(name));return p?{...p,overallRank:i+1}:{id:'missing-local-'+i,name,team:'—',position:'—',positionRank:'—',overallRank:i+1,additionalStats:{}}});board.splice(0,board.length,...newBoard)}}
function loadColors(){return fetch('player-color-tags.json',{cache:'no-store'}).then(r=>r.json()).then(d=>{colorTags=d||colorTags}).catch(()=>{})}
function applySavedWhenReady(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return;try{applySnapshot(JSON.parse(raw));render()}catch(e){console.warn('Could not apply saved admin overrides',e)}}
function installWrappers(){
  const baseRender=render;render=function(){if(position==='MYGUYS')return renderMyGuys();if(position==='ADMIN')return renderAdmin();hideAdmin();baseRender();setTimeout(()=>{decorateTeamLogos();applyLocalColors()},0)};
  const basePool=pool;pool=function(f){if(f==='MYGUYS')return basePool('ALL').filter(isMyGuy);return basePool(f)};
  const baseRenderPool=renderPool;renderPool=function(){baseRenderPool();setTimeout(()=>{decorateTeamLogos();applyLocalColors()},0)};
  const baseProfile=profile;profile=function(id){baseProfile(id);setTimeout(decorateTeamLogos,0)};
}
function boot(){
  if(enhancementsReady)return;if(typeof render!=='function'||typeof pool!=='function'||!document.querySelector('.positions'))return setTimeout(boot,100);enhancementsReady=true;injectStyles();ensureAdminSection();addNavButtons();installWrappers();loadColors().then(()=>{const wait=()=>{if(typeof players!=='undefined'&&players.length){applySavedWhenReady();decorateTeamLogos();applyLocalColors()}else setTimeout(wait,100)};wait()});new MutationObserver(()=>requestAnimationFrame(()=>{decorateTeamLogos();applyLocalColors()})).observe(document.body,{childList:true,subtree:true});
}
boot();
})();