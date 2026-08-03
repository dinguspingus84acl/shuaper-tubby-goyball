(function(){
  const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  let ppgRanks=new Map();

  fetch('rb-2025-ppg.json',{cache:'no-store'})
    .then(r=>r.json())
    .then(data=>{
      ppgRanks=new Map((data.players||[]).map(p=>[normalize(p.name),p.rank]));
    })
    .catch(()=>{});

  function install(){
    if(typeof window.profile!=='function'||window.__rbPpgInstalled)return;
    window.__rbPpgInstalled=true;
    const original=window.profile;
    window.profile=function(id){
      original(id);
      const player=(window.players||[]).find(p=>p.id===id)||(window.board||[]).find(p=>p.id===id);
      if(!player||player.position!=='RB')return;
      const rank=ppgRanks.get(normalize(player.name));
      if(!rank)return;
      const stats=document.querySelector('#stats');
      if(!stats||stats.querySelector('[data-rb-ppg-rank]'))return;
      const card=document.createElement('div');
      card.className='stat';
      card.setAttribute('data-rb-ppg-rank','');
      card.innerHTML='<span>2025 PPG rank</span><b>#'+rank+'</b>';
      stats.appendChild(card);
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
  setTimeout(install,500);
})();
