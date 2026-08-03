(function(){
  const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  let ppgRanks=new Map();
  let dataReady=fetch('rb-2025-ppg.json',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error('Unable to load RB PPG rankings');return r.json()})
    .then(data=>{
      ppgRanks=new Map((data.players||[]).map(p=>[normalize(p.name),p.rank]));
      return ppgRanks;
    })
    .catch(err=>{console.error(err);return ppgRanks});

  function addRankToOpenProfile(){
    const stats=document.querySelector('#stats');
    const name=document.querySelector('#pn')?.textContent?.trim();
    const meta=document.querySelector('#pm')?.textContent||'';
    if(!stats||!name||!/(^|\s|·)RB($|\s|·)/.test(meta))return;
    const old=stats.querySelector('[data-rb-ppg-rank]');
    if(old)old.remove();
    const rank=ppgRanks.get(normalize(name));
    if(!rank)return;
    const card=document.createElement('div');
    card.className='stat';
    card.setAttribute('data-rb-ppg-rank','');
    card.innerHTML='<span>2025 PPG rank</span><b>#'+rank+'</b>';
    stats.appendChild(card);
  }

  function install(){
    if(typeof window.profile!=='function'||window.__rbPpgInstalled)return;
    window.__rbPpgInstalled=true;
    const original=window.profile;
    window.profile=function(id){
      original(id);
      dataReady.then(addRankToOpenProfile);
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
  setTimeout(install,250);
  setTimeout(install,1000);
})();
