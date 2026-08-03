(() => {
  const PLAYER_API = 'https://api.sleeper.app/v1/players/nfl';
  const PLAYER_CDN = id => `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;
  const ESPN_LOGO = team => {
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

  const norm = value => String(value || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const byName = new Map();
  let photosReady = false;
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
      right:6px;
      bottom:5px;
      width:35px;
      height:29px;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#fff;
      border:2px solid rgba(6,19,34,.55);
      border-radius:17px 17px 11px 12px;
      box-shadow:0 2px 5px rgba(0,0,0,.28);
      z-index:6;
      overflow:visible;
      pointer-events:none;
    }
    .team-helmet::after{
      content:'';
      position:absolute;
      right:-5px;
      bottom:2px;
      width:10px;
      height:8px;
      border-right:3px solid rgba(6,19,34,.7);
      border-bottom:3px solid rgba(6,19,34,.7);
      border-radius:0 0 5px 0;
    }
    .team-helmet img{width:25px;height:25px;object-fit:contain;display:block}
    .team-helmet-fallback{font-size:.58rem;font-weight:950;color:#061322;line-height:1}

    @media(max-width:650px){
      .player-photo{width:38px;height:38px}
      .pool-player.has-photo{grid-template-columns:34px 34px minmax(0,1fr) auto}
      .team-helmet{width:31px;height:26px;right:5px;bottom:4px}
      .team-helmet img{width:22px;height:22px}
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
      for(const [nameKey,p] of byName){ if(key.endsWith(nameKey)) return p.full_name; }
    }
    return [...el.querySelectorAll('b,.name')]
      .map(x=>x.textContent.trim())
      .find(x=>x && !/^(empty|bench)$/i.test(x)) || '';
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
    img.src=PLAYER_CDN(player.player_id);
    img.onerror=()=>{ if(img.isConnected) img.replaceWith(fallback(name,size)); };
    return img;
  }

  function addCardPhoto(el){
    if(el.classList.contains('empty-slot') || el.querySelector(':scope > .player-photo')) return;
    const name=fullNameFromElement(el); if(!name) return;
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
    if(el.classList.contains('empty-slot') || el.querySelector(':scope > .team-helmet')) return;
    const team=teamFromBoardCard(el);
    if(!team || team==='—') return;
    const helmet=document.createElement('span');
    helmet.className='team-helmet';
    helmet.setAttribute('role','img');
    helmet.setAttribute('aria-label',`${team} team helmet`);
    const src=ESPN_LOGO(team);
    if(src){
      const img=document.createElement('img');
      img.alt='';
      img.loading='lazy';
      img.decoding='async';
      img.src=src;
      img.onerror=()=>{
        img.remove();
        const fallback=document.createElement('span');
        fallback.className='team-helmet-fallback';
        fallback.textContent=team;
        helmet.appendChild(fallback);
      };
      helmet.appendChild(img);
    } else {
      const fallback=document.createElement('span');
      fallback.className='team-helmet-fallback';
      fallback.textContent=team;
      helmet.appendChild(fallback);
    }
    el.appendChild(helmet);
  }

  function addTablePhoto(row){
    if(row.dataset.photoDone) return;
    const cells=row.children; if(cells.length<2) return;
    const name=fullNameFromElement(row); if(!name) return;
    const cell=cells[1],wrap=document.createElement('div');
    wrap.className='photo-name-cell';
    while(cell.firstChild) wrap.appendChild(cell.firstChild);
    wrap.prepend(makePhoto(name));
    cell.appendChild(wrap);
    row.dataset.photoDone='1';
  }

  function addPoolPhoto(row){
    if(row.dataset.photoDone) return;
    const name=fullNameFromElement(row); if(!name) return;
    const rank=row.querySelector('.pool-rank');
    if(rank) rank.insertAdjacentElement('afterend',makePhoto(name,'small'));
    else row.prepend(makePhoto(name,'small'));
    row.classList.add('has-photo');
    row.dataset.photoDone='1';
  }

  function addProfilePhoto(){
    const title=document.getElementById('pn');
    if(!title || !title.textContent.trim()) return;
    const profile=title.closest('.profile'); if(!profile) return;
    const old=profile.querySelector('.profile-photo-wrap');
    if(old && old.dataset.name===title.textContent.trim()) return;
    if(old) old.remove();
    const wrap=document.createElement('div');
    wrap.className='profile-photo-wrap';
    wrap.dataset.name=title.textContent.trim();
    wrap.appendChild(makePhoto(title.textContent.trim(),'large'));
    title.insertAdjacentElement('afterend',wrap);
  }

  function hydrate(){
    scheduled=false;

    // Board helmets render immediately and do not wait for the large player API request.
    document.querySelectorAll('.pick,.drafted').forEach(el=>{
      removeBoardPhoto(el);
      addTeamHelmet(el);
    });

    if(!photosReady) return;
    document.querySelectorAll('#rows tr').forEach(addTablePhoto);
    document.querySelectorAll('.pool-player').forEach(addPoolPhoto);
    document.querySelectorAll('.roster-card:not(.empty-slot)').forEach(addCardPhoto);
    if(document.getElementById('modal')?.classList.contains('open')) addProfilePhoto();
  }

  function schedule(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(hydrate);
  }

  // Render helmets right away, before any network request finishes.
  schedule();

  fetch(PLAYER_API)
    .then(r=>r.ok?r.json():Promise.reject(new Error('Player API unavailable')))
    .then(data=>{
      Object.values(data).forEach(p=>{
        const name=p.full_name || `${p.first_name||''} ${p.last_name||''}`.trim();
        if(name) byName.set(norm(name),{...p,full_name:name});
      });
    })
    .catch(()=>{})
    .finally(()=>{ photosReady=true; schedule(); });

  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener('load',schedule);
})();
