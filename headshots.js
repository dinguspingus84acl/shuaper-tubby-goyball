(() => {
  const API = 'https://api.sleeper.app/v1/players/nfl';
  const CDN = id => `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;
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

    .pick.has-photo,.drafted.has-photo{min-height:112px;padding:52px 8px 22px}
    .pick.has-photo>.player-photo,.drafted.has-photo>.player-photo{position:absolute;left:8px;top:8px;width:38px;height:38px}

    /* Keep the full player name anchored to the left edge. */
    .pick.has-photo .name,.drafted.has-photo .name{
      position:relative!important;
      left:0!important;
      right:auto!important;
      z-index:4;
      display:block;
      width:calc(100% - 2px);
      margin:0;
      padding:0;
      text-align:left!important;
      color:#061322;
      font-size:.82rem;
      font-weight:950;
      line-height:1.12;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .pick.has-photo .slot,.drafted.has-photo .slot{position:absolute;right:7px;top:8px;left:auto;z-index:5;display:block;padding:3px 5px;border-radius:5px;background:rgba(255,255,255,.82);color:#061322;font-size:.72rem;font-weight:950;opacity:1}
    .pick.has-photo .meta,.drafted.has-photo .team{position:relative;left:0!important;z-index:2;display:block;margin-top:4px;text-align:left!important}
    .pick.has-photo .arrow,.drafted.has-photo .arrow{z-index:2}

    .photo-name-cell{display:flex;align-items:center;gap:10px;min-width:190px}
    .pool-player.has-photo{grid-template-columns:42px 38px minmax(0,1fr) auto}
    .roster-card.has-photo{position:relative;padding-left:60px;min-height:68px}
    .roster-card.has-photo>.player-photo{position:absolute;left:10px;top:11px}
    .profile-photo-wrap{display:flex;align-items:center;gap:16px;margin:8px 0 12px}

    @media(max-width:650px){
      .player-photo{width:38px;height:38px}
      .pick.has-photo,.drafted.has-photo{min-height:106px;padding:49px 7px 21px}
      .pick.has-photo>.player-photo,.drafted.has-photo>.player-photo{width:34px;height:34px;left:7px;top:7px}
      .pick.has-photo .name,.drafted.has-photo .name{font-size:.76rem}
      .pick.has-photo .slot,.drafted.has-photo .slot{right:6px;top:7px;font-size:.68rem}
      .pool-player.has-photo{grid-template-columns:34px 34px minmax(0,1fr) auto}
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
    document.querySelectorAll('.pick,.drafted').forEach(addCardPhoto);
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
