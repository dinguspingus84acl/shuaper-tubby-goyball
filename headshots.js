(() => {
  const PLAYER_API = 'https://api.sleeper.app/v1/players/nfl';
  const PLAYER_CDN = id => `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;
  const TEAM_SLUGS = {
    ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',
    DAL:'dal',DEN:'den',DET:'det',GNB:'gb',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',
    KAN:'kc',KC:'kc',LAC:'lac',LAR:'lar',LVR:'lv',LV:'lv',MIA:'mia',MIN:'min',
    NWE:'ne',NE:'ne',NOR:'no',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',
    SEA:'sea',SFO:'sf',SF:'sf',TAM:'tb',TB:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'
  };
  const TEAM_NAMES = {
    ARI:'Arizona Cardinals',ATL:'Atlanta Falcons',BAL:'Baltimore Ravens',BUF:'Buffalo Bills',
    CAR:'Carolina Panthers',CHI:'Chicago Bears',CIN:'Cincinnati Bengals',CLE:'Cleveland Browns',
    DAL:'Dallas Cowboys',DEN:'Denver Broncos',DET:'Detroit Lions',GNB:'Green Bay Packers',GB:'Green Bay Packers',
    HOU:'Houston Texans',IND:'Indianapolis Colts',JAX:'Jacksonville Jaguars',KAN:'Kansas City Chiefs',KC:'Kansas City Chiefs',
    LAC:'Los Angeles Chargers',LAR:'Los Angeles Rams',LVR:'Las Vegas Raiders',LV:'Las Vegas Raiders',
    MIA:'Miami Dolphins',MIN:'Minnesota Vikings',NWE:'New England Patriots',NE:'New England Patriots',
    NOR:'New Orleans Saints',NO:'New Orleans Saints',NYG:'New York Giants',NYJ:'New York Jets',
    PHI:'Philadelphia Eagles',PIT:'Pittsburgh Steelers',SEA:'Seattle Seahawks',SFO:'San Francisco 49ers',SF:'San Francisco 49ers',
    TAM:'Tampa Bay Buccaneers',TB:'Tampa Bay Buccaneers',TEN:'Tennessee Titans',WAS:'Washington Commanders',WSH:'Washington Commanders'
  };
  const teamLogo = team => {
    const slug = TEAM_SLUGS[String(team || '').trim().toUpperCase()];
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
    .player-photo.large{width:112px;height:112px;border-width:3px}
    .player-photo-fallback{display:inline-flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:950;color:#fff;background:#244761}
    .photo-name-cell{display:flex;align-items:center;gap:10px;min-width:190px}
    .pool-player.has-photo{grid-template-columns:42px 38px minmax(0,1fr) auto}
    .roster-card.has-photo{position:relative;padding-left:60px;min-height:68px}
    .roster-card.has-photo>.player-photo{position:absolute;left:10px;top:11px}

    /* Never show faces or team graphics on either draft board. */
    #board .player-photo,#board .team-helmet,#draftBoard .player-photo,#draftBoard .team-helmet{display:none!important}
    #board .pick,#draftBoard .drafted{padding-left:8px!important;min-height:78px!important}

    .profile-visuals{display:flex;align-items:center;gap:24px;margin:14px 0 18px;flex-wrap:wrap}
    .profile-headshot{display:flex;align-items:center;justify-content:center}
    .profile-helmet-card{display:flex;align-items:center;gap:18px;min-height:118px;padding:15px 22px;border:1px solid rgba(150,180,210,.2);border-radius:14px;background:#081a2d;flex:1;min-width:290px}
    .realistic-helmet{position:relative;width:132px;height:88px;flex:0 0 132px;display:flex;align-items:center;justify-content:center;padding:8px 31px 8px 8px;background:linear-gradient(145deg,#f8fafc 0%,#dbe4ee 58%,#8fa0b3 100%);border:4px solid #111827;border-radius:66px 58px 35px 42px;box-shadow:inset -14px -10px 17px rgba(15,23,42,.26),0 7px 15px rgba(0,0,0,.38);overflow:visible}
    .realistic-helmet:before{content:'';position:absolute;right:-29px;top:32px;width:50px;height:40px;border:5px solid #111827;border-left:0;border-radius:0 25px 25px 0;transform:skewY(-7deg)}
    .realistic-helmet:after{content:'';position:absolute;right:-13px;bottom:-1px;width:38px;height:26px;border-right:6px solid #111827;border-bottom:6px solid #111827;border-radius:0 0 17px 0}
    .realistic-helmet img{width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}
    .helmet-fallback{font-weight:950;color:#071321;font-size:1rem}
    .helmet-copy small{display:block;color:#91a4ba;font-size:.68rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    .helmet-copy strong{display:block;margin-top:4px;font-size:1.08rem}
    .helmet-copy span{display:block;margin-top:4px;color:#91a4ba;font-size:.82rem}

    @media(max-width:650px){
      .player-photo{width:38px;height:38px}
      .pool-player.has-photo{grid-template-columns:34px 34px minmax(0,1fr) auto}
      .profile-visuals{gap:14px}
      .profile-helmet-card{min-width:100%;padding:12px 15px}
      .realistic-helmet{width:100px;height:69px;flex-basis:100px;padding-right:24px}
      .realistic-helmet img{width:54px;height:54px}
      .realistic-helmet:before{right:-22px;top:25px;width:38px;height:31px}
      .realistic-helmet:after{right:-10px;width:29px;height:20px}
    }
  `;
  document.head.appendChild(style);

  function initials(name){
    return String(name || '?').trim().split(/\s+/).filter(Boolean).slice(0,2)
      .map(part => part[0] || '').join('').toUpperCase() || '?';
  }

  function fullNameFromElement(el){
    if(el.id === 'pn') return el.textContent.trim();
    const id = el.dataset && el.dataset.id;
    if(id){
      const key = norm(id.replace(/^(qb|rb|wr|te)-\d+-/i,''));
      if(byName.has(key)) return byName.get(key).full_name;
      for(const [nameKey, player] of byName){
        if(key.endsWith(nameKey)) return player.full_name;
      }
    }
    return [...el.querySelectorAll('b,.name')].map(x => x.textContent.trim())
      .find(x => x && !/^(empty|bench)$/i.test(x)) || '';
  }

  function photoFallback(name,size=''){
    const span = document.createElement('span');
    span.className = `player-photo player-photo-fallback ${size}`.trim();
    span.setAttribute('role','img');
    span.setAttribute('aria-label',`${name} photo unavailable`);
    span.textContent = initials(name);
    return span;
  }

  function makePhoto(name,size=''){
    const player = byName.get(norm(name));
    if(!player || !player.player_id) return photoFallback(name,size);
    const img = document.createElement('img');
    img.className = `player-photo ${size}`.trim();
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = `${name} headshot`;
    img.src = PLAYER_CDN(player.player_id);
    img.onerror = () => { if(img.isConnected) img.replaceWith(photoFallback(name,size)); };
    return img;
  }

  function cleanBoards(){
    document.querySelectorAll('#board .pick,#draftBoard .drafted').forEach(card => {
      card.querySelectorAll(':scope > .player-photo,:scope > .team-helmet').forEach(x => x.remove());
      card.classList.remove('has-photo');
    });
  }

  function addTablePhoto(row){
    if(row.dataset.photoDone) return;
    const cells = row.children;
    if(cells.length < 2) return;
    const name = fullNameFromElement(row);
    if(!name) return;
    const cell = cells[1];
    const wrap = document.createElement('div');
    wrap.className = 'photo-name-cell';
    while(cell.firstChild) wrap.appendChild(cell.firstChild);
    wrap.prepend(makePhoto(name));
    cell.appendChild(wrap);
    row.dataset.photoDone = '1';
  }

  function addPoolPhoto(row){
    if(row.dataset.photoDone) return;
    const name = fullNameFromElement(row);
    if(!name) return;
    const rank = row.querySelector('.pool-rank');
    if(rank) rank.insertAdjacentElement('afterend',makePhoto(name,'small'));
    else row.prepend(makePhoto(name,'small'));
    row.classList.add('has-photo');
    row.dataset.photoDone = '1';
  }

  function addRosterPhoto(card){
    if(card.classList.contains('empty-slot') || card.querySelector(':scope > .player-photo')) return;
    const name = fullNameFromElement(card);
    if(!name) return;
    card.classList.add('has-photo');
    card.prepend(makePhoto(name,'small'));
  }

  function profileTeam(){
    const pm = document.getElementById('pm');
    return pm ? String(pm.textContent.split('·')[0] || '').trim().toUpperCase() : '';
  }

  function renderProfileVisuals(){
    const modal = document.getElementById('modal');
    if(!modal || !modal.classList.contains('open')) return;
    const title = document.getElementById('pn');
    const pm = document.getElementById('pm');
    if(!title || !pm || !title.textContent.trim()) return;
    const profile = title.closest('.profile');
    if(!profile) return;

    const name = title.textContent.trim();
    const team = profileTeam();
    const key = `${name}|${team}`;
    let visuals = profile.querySelector('.profile-visuals');
    if(visuals && visuals.dataset.key === key) return;
    if(visuals) visuals.remove();

    visuals = document.createElement('div');
    visuals.className = 'profile-visuals';
    visuals.dataset.key = key;

    const headshot = document.createElement('div');
    headshot.className = 'profile-headshot';
    headshot.appendChild(makePhoto(name,'large'));

    const helmetCard = document.createElement('div');
    helmetCard.className = 'profile-helmet-card';
    const helmet = document.createElement('div');
    helmet.className = 'realistic-helmet';
    helmet.setAttribute('role','img');
    helmet.setAttribute('aria-label',`${TEAM_NAMES[team] || team} helmet`);
    const src = teamLogo(team);
    if(src){
      const logo = document.createElement('img');
      logo.src = src;
      logo.alt = '';
      logo.loading = 'lazy';
      logo.onerror = () => {
        logo.remove();
        const fallback = document.createElement('span');
        fallback.className = 'helmet-fallback';
        fallback.textContent = team;
        helmet.appendChild(fallback);
      };
      helmet.appendChild(logo);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'helmet-fallback';
      fallback.textContent = team || 'NFL';
      helmet.appendChild(fallback);
    }

    const copy = document.createElement('div');
    copy.className = 'helmet-copy';
    copy.innerHTML = `<small>Team</small><strong>${TEAM_NAMES[team] || team || 'Unknown team'}</strong><span>${team || ''}</span>`;
    helmetCard.append(helmet,copy);
    visuals.append(headshot,helmetCard);
    pm.insertAdjacentElement('afterend',visuals);
  }

  function hydrate(){
    scheduled = false;
    cleanBoards();
    renderProfileVisuals();
    if(!photosReady) return;
    document.querySelectorAll('#rows tr').forEach(addTablePhoto);
    document.querySelectorAll('.pool-player').forEach(addPoolPhoto);
    document.querySelectorAll('.roster-card:not(.empty-slot)').forEach(addRosterPhoto);
    renderProfileVisuals();
  }

  function schedule(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(hydrate);
  }

  schedule();
  fetch(PLAYER_API)
    .then(r => r.ok ? r.json() : Promise.reject(new Error('Player API unavailable')))
    .then(data => {
      Object.values(data).forEach(player => {
        const name = player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim();
        if(name) byName.set(norm(name),{...player,full_name:name});
      });
    })
    .catch(() => {})
    .finally(() => { photosReady = true; schedule(); });

  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('load',schedule);
})();
