(() => {
  const API = 'https://api.sleeper.app/v1/players/nfl';
  const CDN = id => `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;
  const TEAM_LOGO = team => {
    const map = {
      ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',
      DAL:'dal',DEN:'den',DET:'det',GNB:'gb',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',
      KAN:'kc',KC:'kc',LAC:'lac',LAR:'lar',LVR:'lv',LV:'lv',MIA:'mia',MIN:'min',
      NWE:'ne',NE:'ne',NOR:'no',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',
      SEA:'sea',SFO:'sf',SF:'sf',TAM:'tb',TB:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'
    };
    const slug = map[String(team || '').trim().toUpperCase()];
    return slug ? `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png` : '';
  };
  const norm = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const byName = new Map();
  let ready = false;
  let scheduled = false;

  const style = document.createElement('style');
  style.textContent = `
    .player-photo{width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:top center;background:#17314a;border:2px solid rgba(255,255,255,.58);flex:0 0 auto}
    .player-photo.small{width:34px;height:34px;border-width:1px}
    .player-photo.large{width:112px;height:112px;border-width:3px;margin:4px 0 12px}
    .player-photo-fallback{display:inline-flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:950;color:#fff;background:#244761}
    .photo-name-cell{display:flex;align-items:center;gap:10px;min-width:190px}
    .pool-player.has-photo{grid-template-columns:42px 38px minmax(0,1fr) auto}
    .roster-card.has-photo{position:relative;padding-left:60px;min-height:68px}
    .roster-card.has-photo>.player-photo{position:absolute;left:10px;top:11px}
    .profile-photo-wrap{display:flex;align-items:center;gap:16px;margin:8px 0 12px}

    .team-helmet{
      position:absolute;
      right:7px;
      bottom:5px;
      width:31px;
      height:25px;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:3px 5px 4px 3px;
      background:rgba(255,255,255,.92);
      border:1px solid rgba(6,19,34,.35);
      border-radius:55% 55% 42% 42%;
      clip-path:polygon(0 0,82% 0,100% 35%,91% 72%,70% 72%,70% 100%,52% 100%,52% 70%,0 70%);
      box-shadow:0 2px 4px rgba(0,0,0,.22);
      z-index:4;
      pointer-events:none;
    }
    .team-helmet img{width:100%;height:100%;object-fit:contain;display:block}

    @media(max-width:650px){
      .player-photo{width:38px;height:38px}
      .pool-player.has-photo{grid-template-columns:34px 34px minmax(0,1fr) auto}
      .team-helmet{width:28px;height:23px;right:6px;bottom:5px}
    }
  `;
  document.head.appendChild(style);

  function initials(name){
    const parts=String(name||'?').trim().split(/\s+/).filter(Boolean);
    return parts.slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?';
  }

  function fullNameFromElement(el){
    if(el.id==='pn') return el.textContent.trim();
    const id=el.dataset && el.dataset.id;
    if(id){
      const key=norm(id.replace(/^(qb|rb|wr|te)-\d+-/i,''));
      if(byName.has(key)) return byName.get(key).full_name;
      for(const [nameKey,p] of byName){if(key.endsWith(nameKey)) return p.full_name;}
    }
    const candidates=[...el.querySelectorAll('b,.name')].map(x=>x.textContent.trim()).filter(Boolean);
    return candidates.find(x=>x && !/^(empty|bench)$/i.test(x)) || '';
  }

  function fallback(name,size=''){
    const span=document.createElement('span');
    span.className=`player-photo player-photo-fallback ${size}`.trim();
    span.setAttribute('role','img');
    span.setAttribute('aria-label',`${name} photo unavailable`);
    span.textContent=initials(name);
    return span;
  }

  function makePhoto(name,size=''){
    const player=byName.get(norm(name));
    if(!player || !player.player_id) return fallback(name,size);
    const img=document.createElement('img');
    img.className=`player-photo ${size}`.trim();
    img.loading='lazy';
    img.decoding='async';
    img.alt=`${name} headshot`;
    img.src=CDN(player.player_id);
    img.onerror=()=>{if(img.isConnected)img.replaceWith(fallback(name,size));};
    return img;
  }

  function addCardPhoto(el){
    if(el.classList.contains('empty-slot')||el.querySelector(':scope > .player-photo'))return;
    const name=fullNameFromElement(el);if(!name)return;
    el.classList.add('has-photo');
    el.prepend(makePhoto(name,'small'));
  }

  function removeBoardPhoto(el){
    el.querySelectorAll(':scope > .player-photo').forEach(photo=>photo.remove());
    el.classList.remove('has-photo');
  }

  function teamFromBoardCard(el){
    const text=(el.querySelector('.meta,.team')?.textContent||'').trim();
    const parts=text.split('·').map(x=>x.trim()).filter(Boolean);
    return parts.length ? parts[parts.length-1].toUpperCase() : '';
  }

  function addTeamHelmet(el){
    if(el.classList.contains('empty-slot')||el.querySelector(':scope > .team-helmet'))return;
    const team=teamFromBoardCard(el),src=TEAM_LOGO(team);
    if(!src)return;
    const helmet=document.createElement('span');
    helmet.className='team-helmet';
    helmet.setAttribute('role','img');
    helmet.setAttribute('aria-label',`${team} team helmet`);
    const img=document.createElement('img');
    img.loading='lazy';
    img.decoding='async';
    img.alt='';
    img.src=src;
    img.onerror=()=>helmet.remove();
    helmet.appendChild(img);
    el.appendChild(helmet);
  }

  function addTablePhoto(row){
    if(row.dataset.photoDone)return;
    const cells=row.children;if(cells.length<2)return;
    const name=fullNameFromElement(row);if(!name)return;
    const cell=cells[1],wrap=document.createElement('div');
    wrap.className='photo-name-cell';
    while(cell.firstChild)wrap.appendChild(cell.firstChild);
    wrap.prepend(makePhoto(name));
    cell.appendChild(wrap);
    row.dataset.photoDone='1';
  }

  function addPoolPhoto(row){
    if(row.dataset.photoDone)return;
    const name=fullNameFromElement(row);if(!name)return;
    const rank=row.querySelector('.pool-rank');
    if(rank)rank.insertAdjacentElement('afterend',makePhoto(name,'small'));else row.prepend(makePhoto(name,'small'));
    row.classList.add('has-photo');
    row.dataset.photoDone='1';
  }

  function addProfilePhoto(){
    const title=document.getElementById('pn');if(!title||!title.textContent.trim())return;
    const profile=title.closest('.profile');if(!profile)return;
    const old=profile.querySelector('.profile-photo-wrap');
    if(old&&old.dataset.name===title.textContent.trim())return;
    if(old)old.remove();
    const wrap=document.createElement('div');
    wrap.className='profile-photo-wrap';
    wrap.dataset.name=title.textContent.trim();
    wrap.appendChild(makePhoto(title.textContent.trim(),'large'));
    title.insertAdjacentElement('afterend',wrap);
  }

  function hydrate(){
    scheduled=false;if(!ready)return;
    document.querySelectorAll('.pick,.drafted').forEach(el=>{
      removeBoardPhoto(el);
      addTeamHelmet(el);
    });
    document.querySelectorAll('#rows tr').forEach(addTablePhoto);
    document.querySelectorAll('.pool-player').forEach(addPoolPhoto);
    document.querySelectorAll('.roster-card:not(.empty-slot)').forEach(addCardPhoto);
    if(document.getElementById('modal')?.classList.contains('open'))addProfilePhoto();
  }

  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(hydrate);}

  fetch(API).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
    Object.values(data).forEach(p=>{
      const name=p.full_name || `${p.first_name||''} ${p.last_name||''}`.trim();
      if(name)byName.set(norm(name),{...p,full_name:name});
    });
    ready=true;schedule();
  }).catch(()=>{ready=true;schedule();});

  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener('load',schedule);
})();
