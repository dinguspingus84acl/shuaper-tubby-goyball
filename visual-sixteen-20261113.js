/* Big Board visual enhancements. Works with the existing draft renderer/events. */
(()=>{
  'use strict';
  const grid=document.getElementById('board');
  if(!grid)return;

  // A visual key, not additional ranking filters or buttons.
  const subtitle=document.getElementById('sub');
  if(subtitle&&!document.getElementById('shuaBoardPositionKey')){
    const key=document.createElement('div');
    key.id='shuaBoardPositionKey';
    key.setAttribute('aria-label','Big Board position colors');
    const color={QB:'#bd9bee',RB:'#64d1a5',WR:'#6dbfea',TE:'#e5ad62'};
    Object.entries(color).forEach(([position,tone])=>{
      const entry=document.createElement('span');
      const dot=document.createElement('i');
      dot.style.setProperty('--position-color',tone);
      dot.setAttribute('aria-hidden','true');
      entry.append(dot,document.createTextNode(position));
      key.append(entry);
    });
    subtitle.insertAdjacentElement('afterend',key);
  }

  function decorate(){
    const picks=grid.querySelectorAll('.pick:not([data-shua-round])');
    if(!picks.length)return;
    const entries=typeof board!=='undefined'&&Array.isArray(board)?board:[];
    const byId=new Map(entries.map(p=>[String(p.id),p]));
    const teamCodes=typeof teams!=='undefined'?teams:{};
    const columns=typeof teamCount==='number'?teamCount:10;
    picks.forEach((tile)=>{
      const slot=tile.querySelector('.slot')?.textContent.trim()||'';
      const round=Number(slot.split('.')[0]);
      if(!Number.isInteger(round)||round<1)return;
      tile.dataset.shuaRound=String(round);
      tile.classList.add(round%2===0?'shua-round-even':'shua-round-odd');
      if((Array.prototype.indexOf.call(grid.children,tile)%columns)===0){
        tile.dataset.shuaRoundStart='true';
      }
      const player=byId.get(tile.dataset.id||'');
      const label=tile.querySelector('.name');
      if(label&&player?.name){
        label.textContent=player.name;
        label.classList.toggle('shua-long-name',player.name.length>19);
      }
      const code=teamCodes[player?.team];
      if(typeof code==='string'&&/^[a-z]{2,3}$/.test(code)){
        const image=document.createElement('img');
        image.className='shua-pick-watermark';
        image.loading='lazy';
        image.decoding='async';
        image.alt='';
        image.setAttribute('aria-hidden','true');
        image.src='https://a.espncdn.com/i/teamlogos/nfl/500/'+code+'.png';
        image.onerror=()=>image.remove();
        tile.append(image);
      }
    });
  }

  let queued=false;
  const observer=new MutationObserver(mutations=>{
    if(!mutations.some(m=>m.addedNodes.length))return;
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{queued=false;decorate();});
  });
  observer.observe(grid,{childList:true});
  decorate();
})();
