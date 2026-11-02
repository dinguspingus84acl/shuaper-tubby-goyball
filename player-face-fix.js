/* Official ESPN headshots for 2026 ranked players whose displayed names omit suffixes.
 * IDs were matched against ESPN's current NFL team rosters, not guessed from names. */
(()=>{
  'use strict';
  const verifiedIds=Object.freeze({
    lutherburden:'4685278',
    chrisgodwin:'3116165',
    kcconcepcion:'4870653',
    haroldfannin:'5083076',
    brianthomas:'4432773',
    deebosamuel:'3126486',
    chrisrodriguez:'4362619',
    omarcooper:'4723820',
    mikewashington:'4686658',
    chigoziemokonkwo:'4360635',
    chigookonkwo:'4360635',
    kevincoleman:'4685307',
    olliegordon:'4711533',
    tyronetracy:'4360516'
  });
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const baseName=name=>String(name||'').trim().replace(/\s+(?:jr\.?|sr\.?|ii|iii|iv|v)$/i,'').trim();
  const key=name=>normalize(baseName(name));
  const officialUrl=id=>'https://a.espncdn.com/i/headshots/nfl/players/full/'+id+'.png';
  const verifiedUrl=name=>verifiedIds[key(name)]?officialUrl(verifiedIds[key(name)]):'';
  let archive={},archiveAliases={};
  function urls(name){
    const exact=normalize(name),base=key(name);
    return [...new Set([verifiedUrl(name),...(archive[exact]||archive[base]||archiveAliases[base]||[])].filter(Boolean))];
  }
  function faceName(element){
    const rank=element.closest('.photo-cell');
    if(rank)return rank.querySelector('b')?.textContent?.trim()||'';
    const pool=element.closest('.pool-player');
    if(pool)return pool.querySelector('span[data-id] > b')?.textContent?.trim()||'';
    const roster=element.closest('.roster-card');
    if(roster)return roster.querySelector('.roster-name-line b, b')?.textContent?.trim()||'';
    const depth=element.closest('.depth-player');
    if(depth)return [...depth.querySelectorAll('span')].at(-1)?.textContent?.trim()||'';
    const espn=element.closest('.espn-player');
    if(espn)return espn.querySelector('.espn-name-btn')?.textContent?.trim()||'';
    const featured=element.closest('.featured-player-card, .featured-profile-card, .featured-card');
    if(featured)return featured.querySelector('.featured-name')?.textContent?.trim()||'';
    if(element.closest('.person'))return document.getElementById('pn')?.textContent?.trim()||'';
    return element.getAttribute('data-player-name')||'';
  }
  function fixFallback(element){
    if(element.dataset.faceAttempted==='1')return;
    const name=faceName(element),candidates=urls(name);
    if(!name||!candidates.length)return;
    const classes=[...element.classList].filter(cls=>cls!=='fallback'&&cls!=='espn-headshot-fallback');
    if(!classes.length)classes.push('photo');
    const image=document.createElement('img');
    image.className=classes.join(' ');
    image.src=candidates[0];
    image.alt=name;
    image.loading='lazy';
    image.decoding='async';
    image.dataset.faceUrls=candidates.map(encodeURIComponent).join('|');
    image.dataset.faceIndex='0';
    image.dataset.faceInitials=String(name).split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase();
    image.dataset.faceFallbackClass=element.className;
    image.onerror=()=>{
      const next=Number(image.dataset.faceIndex||'0')+1;
      if(next<candidates.length){image.dataset.faceIndex=String(next);image.src=candidates[next];return;}
      element.dataset.faceAttempted='1';
      image.replaceWith(element);
    };
    element.replaceWith(image);
  }
  let queued=false;
  function refresh(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      document.querySelectorAll('.photo.fallback, .espn-headshot-fallback, .featured-photo.fallback').forEach(fixFallback);
    });
  }
  window.ShuaPlayerFaces=Object.freeze({key,urls,url:name=>urls(name)[0]||'',verifiedUrl});
  if(document.body){
    new MutationObserver(records=>{
      if(records.some(record=>record.addedNodes.length))refresh();
    }).observe(document.body,{childList:true,subtree:true});
    refresh();
  }
  // Resolve suffix variants for other historical players too. Exact-name matches
  // take precedence so two distinct players with the same base name are not merged.
  fetch('legacy-stats/headshots.json?v=20261010-headshots8',{cache:'force-cache'})
    .then(res=>res.ok?res.json():null)
    .then(data=>{
      archive=data?.headshots||{};
      for(const [name,list] of Object.entries(archive)){
        const base=name.replace(/(?:jr|sr|iii|ii|iv|v)$/,'');
        if(base!==name&&!archive[base]&&!archiveAliases[base])archiveAliases[base]=list;
      }
      refresh();
    }).catch(()=>{});
})();
