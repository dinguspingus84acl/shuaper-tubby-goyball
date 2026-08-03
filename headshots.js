(() => {
  const PLAYER_API = 'https://api.sleeper.app/v1/players/nfl';
  const PLAYER_CDN = id => `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;
  const TEAM_SLUGS = {ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GNB:'gb',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KAN:'kc',KC:'kc',LAC:'lac',LAR:'lar',LVR:'lv',LV:'lv',MIA:'mia',MIN:'min',NWE:'ne',NE:'ne',NOR:'no',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SFO:'sf',SF:'sf',TAM:'tb',TB:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'};
  const norm = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const byName = new Map();
  let photosReady = false;

  const style = document.createElement('style');
  style.textContent = `
    #board .player-photo,#board .profile-helmet,#draftBoard .player-photo,#draftBoard .profile-helmet{display:none!important}
    #board .pick,#draftBoard .drafted{padding-left:8px!important;min-height:78px!important}
    .player-photo{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:top center;background:#17314a;border:2px solid rgba(255,255,255,.58);flex:0 0 auto}
    .player-photo.small{width:34px;height:34px;border-width:1px}.player-photo.large{width:108px;height:108px;border-width:3px}
    .player-photo-fallback{display:inline-flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:950;color:#fff;background:#244761}
    .photo-name-cell{display:flex;align-items:center;gap:10px;min-width:190px}.pool-player.has-photo{grid-template-columns:42px 38px minmax(0,1fr) auto}
    .roster-card.has-photo{position:relative;padding-left:60px;min-height:68px}.roster-card.has-photo>.player-photo{position:absolute;left:10px;top:11px}
    .profile{position:relative}.profile-top-visuals{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin:12px 0 18px}
    .profile-photo-block{display:flex;align-items:center;gap:14px;min-width:0}.profile-photo-copy strong{display:block;font-size:1.05rem}.profile-photo-copy span{display:block;margin-top:4px;color:#91a4ba;font-size:.82rem}
    .profile-helmet{position:relative;width:118px;height:80px;flex:0 0 118px;display:flex;align-items:center;justify-content:center;padding:8px 28px 8px 8px;background:linear-gradient(145deg,#f8fafc,#d7e1ec 60%,#8fa0b3);border:4px solid #111827;border-radius:60px 52px 34px 39px;box-shadow:inset -12px -9px 15px rgba(15,23,42,.25),0 5px 12px rgba(0,0,0,.35);overflow:visible;margin-right:16px}
    .profile-helmet:before{content:'';position:absolute;right:-25px;top:29px;width:43px;height:35px;border:5px solid #111827;border-left:0;border-radius:0 22px 22px 0;transform:skewY(-7deg)}
    .profile-helmet:after{content:'';position:absolute;right:-12px;bottom:0;width:34px;height:23px;border-right:6px solid #111827;border-bottom:6px solid #111827;border-radius:0 0 15px 0}
    .profile-helmet img{width:64px;height:64px;object-fit:contain}.profile-helmet-fallback{font-weight:950;color:#071321}
    .note-box .description-helmet,.profile .profile-visuals,.profile .profile-team-helmet-wrap{display:none!important}
    @media(max-width:650px){.pool-player.has-photo{grid-template-columns:34px 34px minmax(0,1fr) auto}.profile-top-visuals{gap:8px;align-items:center}.player-photo.large{width:84px;height:84px}.profile-photo-copy{display:none}.profile-helmet{width:86px;height:60px;flex-basis:86px;padding-right:20px;margin-right:10px}.profile-helmet img{width:46px;height:46px}.profile-helmet:before{right:-18px;top:21px;width:31px;height:26px}.profile-helmet:after{right:-9px;width:25px;height:18px}}
  `;
  document.head.appendChild(style);

  const initials = name => String(name || '?').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0] || '').join('').toUpperCase() || '?';
  function fallback(name,size=''){const el=document.createElement('span');el.className=`player-photo player-photo-fallback ${size}`.trim();el.textContent=initials(name);return el}
  function makePhoto(name,size=''){const player=byName.get(norm(name));if(!player?.player_id)return fallback(name,size);const img=document.createElement('img');img.className=`player-photo ${size}`.trim();img.loading='lazy';img.decoding='async';img.alt=`${name} headshot`;img.src=PLAYER_CDN(player.player_id);img.onerror=()=>{if(img.isConnected)img.replaceWith(fallback(name,size))};return img}
  function fullName(el){const id=el.dataset?.id;if(id){const key=norm(id.replace(/^(qb|rb|wr|te)-\d+-/i,''));for(const [k,p] of byName){if(key===k||key.endsWith(k))return p.full_name}}return [...el.querySelectorAll('b,.name')].map(x=>x.textContent.trim()).find(Boolean)||''}

  function cleanBoards(){document.querySelectorAll('#board .pick,#draftBoard .drafted').forEach(card=>{card.querySelectorAll('.player-photo,.team-helmet,.realistic-helmet,.helmet-shell,.description-helmet,.profile-helmet').forEach(x=>x.remove());card.classList.remove('has-photo')})}
  function addTablePhotos(){document.querySelectorAll('#rows tr').forEach(row=>{if(row.dataset.photoDone)return;const cells=row.children;if(cells.length<2)return;const name=fullName(row);if(!name)return;const wrap=document.createElement('div');wrap.className='photo-name-cell';while(cells[1].firstChild)wrap.appendChild(cells[1].firstChild);wrap.prepend(makePhoto(name));cells[1].appendChild(wrap);row.dataset.photoDone='1'})}
  function addPoolPhotos(){document.querySelectorAll('.pool-player').forEach(row=>{if(row.dataset.photoDone)return;const name=fullName(row);if(!name)return;const rank=row.querySelector('.pool-rank');rank?rank.insertAdjacentElement('afterend',makePhoto(name,'small')):row.prepend(makePhoto(name,'small'));row.classList.add('has-photo');row.dataset.photoDone='1'})}
  function addRosterPhotos(){document.querySelectorAll('.roster-card:not(.empty-slot)').forEach(card=>{if(card.querySelector(':scope > .player-photo'))return;const name=fullName(card);if(!name)return;card.prepend(makePhoto(name,'small'));card.classList.add('has-photo')})}

  function renderProfileTop(){
    const modal=document.getElementById('modal');
    if(!modal?.classList.contains('open'))return;
    const title=document.getElementById('pn'),pm=document.getElementById('pm');
    if(!title||!pm)return;
    const profile=title.closest('.profile'),name=title.textContent.trim(),team=(pm.textContent.split('·')[0]||'').trim().toUpperCase();
    if(!profile||!name)return;
    profile.querySelectorAll('.description-helmet,.profile-visuals,.profile-team-helmet-wrap,.profile-top-visuals').forEach(x=>x.remove());
    const top=document.createElement('div');top.className='profile-top-visuals';
    const photoBlock=document.createElement('div');photoBlock.className='profile-photo-block';photoBlock.appendChild(makePhoto(name,'large'));
    const copy=document.createElement('div');copy.className='profile-photo-copy';copy.innerHTML=`<strong>${name}</strong><span>${pm.textContent}</span>`;photoBlock.appendChild(copy);
    const helmet=document.createElement('div');helmet.className='profile-helmet';
    const slug=TEAM_SLUGS[team];
    if(slug){const img=document.createElement('img');img.src=`https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;img.alt=`${team} helmet`;img.onerror=()=>{img.remove();const s=document.createElement('span');s.className='profile-helmet-fallback';s.textContent=team;helmet.appendChild(s)};helmet.appendChild(img)}else{const s=document.createElement('span');s.className='profile-helmet-fallback';s.textContent=team||'NFL';helmet.appendChild(s)}
    top.append(photoBlock,helmet);
    pm.insertAdjacentElement('afterend',top);
  }

  function refreshDynamic(){cleanBoards();if(photosReady){addTablePhotos();addPoolPhotos();addRosterPhotos()}renderProfileTop()}

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-id],[data-sid],.pos,.team-btn,[data-view],.pool-filter,.draft-btn,#startMock,#undoPick,#resetMock')){
      setTimeout(refreshDynamic,0);
      setTimeout(refreshDynamic,100);
    }
  });

  const modal=document.getElementById('modal');
  if(modal)new MutationObserver(()=>{if(modal.classList.contains('open')){setTimeout(renderProfileTop,0);setTimeout(renderProfileTop,100)}}).observe(modal,{attributes:true,attributeFilter:['class']});

  fetch(PLAYER_API).then(r=>r.ok?r.json():{}).then(data=>Object.values(data).forEach(player=>{const name=player.full_name||`${player.first_name||''} ${player.last_name||''}`.trim();if(name)byName.set(norm(name),{...player,full_name:name})})).catch(()=>{}).finally(()=>{photosReady=true;refreshDynamic()});
  window.addEventListener('load',refreshDynamic);
  refreshDynamic();
})();