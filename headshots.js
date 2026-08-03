(() => {
  const PLAYER_API = 'https://api.sleeper.app/v1/players/nfl';
  const PLAYER_CDN = id => `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;
  const TEAM_SLUGS = {ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GNB:'gb',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KAN:'kc',KC:'kc',LAC:'lac',LAR:'lar',LVR:'lv',LV:'lv',MIA:'mia',MIN:'min',NWE:'ne',NE:'ne',NOR:'no',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SFO:'sf',SF:'sf',TAM:'tb',TB:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'};
  const TEAM_NAMES = {ARI:'Arizona Cardinals',ATL:'Atlanta Falcons',BAL:'Baltimore Ravens',BUF:'Buffalo Bills',CAR:'Carolina Panthers',CHI:'Chicago Bears',CIN:'Cincinnati Bengals',CLE:'Cleveland Browns',DAL:'Dallas Cowboys',DEN:'Denver Broncos',DET:'Detroit Lions',GNB:'Green Bay Packers',GB:'Green Bay Packers',HOU:'Houston Texans',IND:'Indianapolis Colts',JAX:'Jacksonville Jaguars',KAN:'Kansas City Chiefs',KC:'Kansas City Chiefs',LAC:'Los Angeles Chargers',LAR:'Los Angeles Rams',LVR:'Las Vegas Raiders',LV:'Las Vegas Raiders',MIA:'Miami Dolphins',MIN:'Minnesota Vikings',NWE:'New England Patriots',NE:'New England Patriots',NOR:'New Orleans Saints',NO:'New Orleans Saints',NYG:'New York Giants',NYJ:'New York Jets',PHI:'Philadelphia Eagles',PIT:'Pittsburgh Steelers',SEA:'Seattle Seahawks',SFO:'San Francisco 49ers',SF:'San Francisco 49ers',TAM:'Tampa Bay Buccaneers',TB:'Tampa Bay Buccaneers',TEN:'Tennessee Titans',WAS:'Washington Commanders',WSH:'Washington Commanders'};
  const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const byName = new Map();
  let photosReady = false;
  let pending = false;

  const style = document.createElement('style');
  style.textContent = `
    #board .player-photo,#board .team-helmet,#board .realistic-helmet,#draftBoard .player-photo,#draftBoard .team-helmet,#draftBoard .realistic-helmet{display:none!important}
    #board .pick,#draftBoard .drafted{padding-left:8px!important;min-height:78px!important}
    .player-photo{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:top center;background:#17314a;border:2px solid rgba(255,255,255,.58);flex:0 0 auto}
    .player-photo.small{width:34px;height:34px;border-width:1px}.player-photo.large{width:106px;height:106px;border-width:3px}
    .player-photo-fallback{display:inline-flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:950;color:#fff;background:#244761}
    .photo-name-cell{display:flex;align-items:center;gap:10px;min-width:190px}.pool-player.has-photo{grid-template-columns:42px 38px minmax(0,1fr) auto}
    .roster-card.has-photo{position:relative;padding-left:60px;min-height:68px}.roster-card.has-photo>.player-photo{position:absolute;left:10px;top:11px}
    .description-helmet{display:flex;align-items:center;gap:18px;margin:12px 0 0;padding:14px;border:1px solid rgba(150,180,210,.22);border-radius:12px;background:#071a2d}
    .helmet-shell{position:relative;width:118px;height:80px;flex:0 0 118px;display:flex;align-items:center;justify-content:center;padding:8px 28px 8px 8px;background:linear-gradient(145deg,#f8fafc,#d7e1ec 60%,#8fa0b3);border:4px solid #111827;border-radius:60px 52px 34px 39px;box-shadow:inset -12px -9px 15px rgba(15,23,42,.25),0 5px 12px rgba(0,0,0,.35);overflow:visible}
    .helmet-shell:before{content:'';position:absolute;right:-25px;top:29px;width:43px;height:35px;border:5px solid #111827;border-left:0;border-radius:0 22px 22px 0;transform:skewY(-7deg)}
    .helmet-shell:after{content:'';position:absolute;right:-12px;bottom:0;width:34px;height:23px;border-right:6px solid #111827;border-bottom:6px solid #111827;border-radius:0 0 15px 0}
    .helmet-shell img{width:64px;height:64px;object-fit:contain}.helmet-info small{display:block;color:#91a4ba;font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.helmet-info strong{display:block;margin-top:4px}.helmet-info span{color:#91a4ba;font-size:.8rem}
    @media(max-width:650px){.pool-player.has-photo{grid-template-columns:34px 34px minmax(0,1fr) auto}.description-helmet{align-items:flex-start}.helmet-shell{width:88px;height:62px;flex-basis:88px;padding-right:20px}.helmet-shell img{width:48px;height:48px}.helmet-shell:before{right:-18px;top:22px;width:31px;height:26px}.helmet-shell:after{right:-9px;width:25px;height:18px}}
  `;
  document.head.appendChild(style);

  function initials(name){return String(name||'?').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?'}
  function fallback(name,size=''){const s=document.createElement('span');s.className=`player-photo player-photo-fallback ${size}`.trim();s.textContent=initials(name);return s}
  function makePhoto(name,size=''){const p=byName.get(norm(name));if(!p?.player_id)return fallback(name,size);const img=document.createElement('img');img.className=`player-photo ${size}`.trim();img.loading='lazy';img.alt=`${name} headshot`;img.src=PLAYER_CDN(p.player_id);img.onerror=()=>img.isConnected&&img.replaceWith(fallback(name,size));return img}
  function fullName(el){const id=el.dataset?.id;if(id){const key=norm(id.replace(/^(qb|rb|wr|te)-\d+-/i,''));for(const [k,p] of byName){if(key===k||key.endsWith(k))return p.full_name}}return [...el.querySelectorAll('b,.name')].map(x=>x.textContent.trim()).find(Boolean)||''}

  function stripBoards(){document.querySelectorAll('#board .pick,#draftBoard .drafted').forEach(card=>{card.querySelectorAll('.player-photo,.team-helmet,.realistic-helmet,.helmet-shell,.description-helmet').forEach(x=>x.remove());card.classList.remove('has-photo')})}
  function addTablePhoto(row){if(row.dataset.photoDone)return;const c=row.children;if(c.length<2)return;const name=fullName(row);if(!name)return;const wrap=document.createElement('div');wrap.className='photo-name-cell';while(c[1].firstChild)wrap.appendChild(c[1].firstChild);wrap.prepend(makePhoto(name));c[1].appendChild(wrap);row.dataset.photoDone='1'}
  function addPoolPhoto(row){if(row.dataset.photoDone)return;const name=fullName(row);if(!name)return;const rank=row.querySelector('.pool-rank');rank?rank.insertAdjacentElement('afterend',makePhoto(name,'small')):row.prepend(makePhoto(name,'small'));row.classList.add('has-photo');row.dataset.photoDone='1'}
  function addRosterPhoto(card){if(card.classList.contains('empty-slot')||card.querySelector(':scope > .player-photo'))return;const name=fullName(card);if(!name)return;card.prepend(makePhoto(name,'small'));card.classList.add('has-photo')}

  function renderDescriptionHelmet(){
    const modal=document.getElementById('modal');
    if(!modal?.classList.contains('open'))return;
    const pm=document.getElementById('pm'),notes=document.querySelector('.profile .note-box');
    if(!pm||!notes)return;
    const team=(pm.textContent.split('·')[0]||'').trim().toUpperCase();
    if(!team||team==='—')return;
    const old=notes.querySelector('.description-helmet');
    if(old?.dataset.team===team)return;
    old?.remove();
    const wrap=document.createElement('div');wrap.className='description-helmet';wrap.dataset.team=team;
    const shell=document.createElement('div');shell.className='helmet-shell';
    const slug=TEAM_SLUGS[team];
    if(slug){const img=document.createElement('img');img.src=`https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;img.alt='';img.onerror=()=>{img.remove();shell.textContent=team};shell.appendChild(img)}else shell.textContent=team;
    const info=document.createElement('div');info.className='helmet-info';info.innerHTML=`<small>Team helmet</small><strong>${TEAM_NAMES[team]||team}</strong><span>${team}</span>`;
    wrap.append(shell,info);
    notes.insertBefore(wrap,notes.firstChild.nextSibling);
  }

  function hydrate(){pending=false;stripBoards();renderDescriptionHelmet();if(!photosReady)return;document.querySelectorAll('#rows tr').forEach(addTablePhoto);document.querySelectorAll('.pool-player').forEach(addPoolPhoto);document.querySelectorAll('.roster-card:not(.empty-slot)').forEach(addRosterPhoto);renderDescriptionHelmet()}
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(hydrate)}

  fetch(PLAYER_API).then(r=>r.ok?r.json():{}).then(data=>Object.values(data).forEach(p=>{const n=p.full_name||`${p.first_name||''} ${p.last_name||''}`.trim();if(n)byName.set(norm(n),{...p,full_name:n})})).catch(()=>{}).finally(()=>{photosReady=true;schedule()});
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('load',schedule);
  schedule();
})();
