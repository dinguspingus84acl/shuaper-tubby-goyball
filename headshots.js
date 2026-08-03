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

    /* Team helmet belongs in the player description/profile, not on draft boards. */
    .profile-team-helmet-wrap{
      display:flex;
      align-items:center;
      gap:16px;
      margin:12px 0 16px;
      padding:12px 14px;
      border:1px solid rgba(150,180,210,.2);
      border-radius:12px;
      background:#081a2d;
    }
    .profile-team-helmet{
      position:relative;
      width:108px;
      height:78px;
      flex:0 0 108px;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:8px 22px 8px 8px;
      background:linear-gradient(145deg,#f8fafc,#cbd5e1 72%,#94a3b8);
      border:3px solid #0f172a;
      border-radius:54px 48px 31px 36px;
      box-shadow:inset -10px -8px 14px rgba(15,23,42,.24),0 5px 12px rgba(0,0,0,.35);
      overflow:visible;
    }
    .profile-team-helmet::before{
      content:'';
      position:absolute;
      right:-20px;
      top:30px;
      width:37px;
      height:31px;
      border:4px solid #111827;
      border-left:0;
      border-radius:0 20px 20px 0;
      transform:skewY(-8deg);
    }
    .profile-team-helmet::after{
      content:'';
      position:absolute;
      right:-10px;
      bottom:2px;
      width:29px;
      height:22px;
      border-right:5px solid #111827;
      border-bottom:5px solid #111827;
      border-radius:0 0 14px 0;
    }
    .profile-team-helmet img{width:62px;height:62px;object-fit:contain;display:block;filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}
    .profile-team-copy small{display:block;color:#91a4ba;font-size:.68rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    .profile-team-copy strong{display:block;margin-top:4px;font-size:1.05rem}
    .profile-team-copy span{display:block;margin-top:3px;color:#91a4ba;font-size:.82rem}

    @media(max-width:650px){
      .player-photo{width:38px;height:38px}
      .pool-player.has-photo{grid-template-columns:34px 34px minmax(0,1fr) auto}
      .profile-team-helmet{width:88px;height:64px;flex-basis:88px}
      .profile-team-helmet img{width:49px;height:49px}
      .profile-team-helmet::before{right:-16px;top:24px;width:30px;height:25px}
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

  function clearDraftBoardDecorations(){
    document.querySelectorAll('.pick,.drafted').forEach(el=>{
      el.querySelectorAll(':scope > .player-photo,:scope > .team-helmet').forEach(x=>x.remove());
      el.classList.remove('has-photo');
    });
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

  function teamFromProfile(){
    const pm=document.getElementById('pm');
    if(!pm) return '';
    return (pm.textContent.split('·')[0]||'').trim().toUpperCase();
  }

  function addProfilePhotoAndHelmet(){
    const title=document.getElementById('pn');
    if(!title || !title.textContent.trim()) return;
    const profile=title.closest('.profile'); if(!profile) return;

    let photoWrap=profile.querySelector('.profile-photo-wrap');
    if(!photoWrap || photoWrap.dataset.name!==title.textContent.trim()){
      if(photoWrap) photoWrap.remove();
      photoWrap=document.createElement('div');
      photoWrap.className='profile-photo-wrap';
      photoWrap.dataset.name=title.textContent.trim();
      photoWrap.appendChild(makePhoto(title.textContent.trim(),'large'));
      title.insertAdjacentElement('afterend',photoWrap);
    }

    const team=teamFromProfile();
    const old=profile.querySelector('.profile-team-helmet-wrap');
    if(old && old.dataset.team===team) return;
    if(old) old.remove();
    if(!team || team==='—') return;

    const wrap=document.createElement('div');
    wrap.className='profile-team-helmet-wrap';
    wrap.dataset.team=team;

    const helmet=document.createElement('div');
    helmet.className='profile-team-helmet';
    helmet.setAttribute('role','img');
    helmet.setAttribute('aria-label',`${team} football helmet`);
    const src=ESPN_LOGO(team);
    if(src){
      const img=document.createElement('img');
      img.src=src;
      img.alt='';
      img.loading='lazy';
      img.onerror=()=>{img.remove();helmet.textContent=team;};
      helmet.appendChild(img);
    } else helmet.textContent=team;

    const copy=document.createElement('div');
    copy.className='profile-team-copy';
    copy.innerHTML=`<small>Team helmet</small><strong>${team}</strong><span>Displayed in the player description</span>`;
    wrap.append(helmet,copy);

    const pm=document.getElementById('pm');
    if(pm) pm.insertAdjacentElement('afterend',wrap);
  }

  function hydrate(){
    scheduled=false;
    clearDraftBoardDecorations();
    if(!photosReady) return;
    document.querySelectorAll('#rows tr').forEach(addTablePhoto);
    document.querySelectorAll('.pool-player').forEach(addPoolPhoto);
    document.querySelectorAll('.roster-card:not(.empty-slot)').forEach(addCardPhoto);
    if(document.getElementById('modal')?.classList.contains('open')) addProfilePhotoAndHelmet();
  }

  function schedule(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(hydrate);
  }

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
