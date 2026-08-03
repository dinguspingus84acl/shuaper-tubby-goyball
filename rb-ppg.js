(function(){
  const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  let ppgRanks=new Map();

  function renderRank(){
    const modal=document.querySelector('#modal');
    const stats=document.querySelector('#stats');
    const name=document.querySelector('#pn')?.textContent?.trim();
    const meta=document.querySelector('#pm')?.textContent||'';
    if(!modal?.classList.contains('open')||!stats||!name)return;

    const existing=stats.querySelector('[data-rb-ppg-rank]');
    if(existing)existing.remove();
    if(!/(^|\s|·)RB($|\s|·)/.test(meta))return;

    const rank=ppgRanks.get(normalize(name));
    if(!rank)return;

    const card=document.createElement('div');
    card.className='stat';
    card.setAttribute('data-rb-ppg-rank','');
    card.innerHTML='<span>2025 PPG rank</span><b>#'+rank+'</b>';
    stats.appendChild(card);
  }

  fetch('rb-2025-ppg.json?v=2',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error('Unable to load RB PPG rankings');return r.json()})
    .then(data=>{
      ppgRanks=new Map((data.players||[]).map(p=>[normalize(p.name),p.rank]));
      renderRank();
    })
    .catch(err=>console.error('RB PPG rankings failed to load:',err));

  function installObserver(){
    const modal=document.querySelector('#modal');
    const stats=document.querySelector('#stats');
    const name=document.querySelector('#pn');
    const meta=document.querySelector('#pm');
    if(!modal||!stats||!name||!meta)return false;

    const observer=new MutationObserver(()=>queueMicrotask(renderRank));
    observer.observe(modal,{attributes:true,attributeFilter:['class'],subtree:true,childList:true,characterData:true});

    document.addEventListener('click',e=>{
      if(e.target.closest('[data-id],[data-sid]'))setTimeout(renderRank,0);
    },true);
    return true;
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      if(!installObserver())setTimeout(installObserver,300);
    });
  }else if(!installObserver()){
    setTimeout(installObserver,300);
  }
})();
