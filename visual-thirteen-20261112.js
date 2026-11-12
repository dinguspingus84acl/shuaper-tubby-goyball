/* Presentation-only draft-board refinements; existing pick handlers stay intact. */
(()=>{
  'use strict';
  const board=document.getElementById('board');
  const heading=document.querySelector('main>.head');
  const teamControls=document.getElementById('teamControls');
  const overall=document.getElementById('overallToggle');
  if(!board||!heading||!teamControls||!overall)return;
  let queued=false;
  function update(){
    queued=false;
    if(document.body.classList.contains('shua-clean')){
      // A later polish layer may group these controls inside Board Settings.
      // Preserve that group when body classes change (including menu toggles).
      if(overall.parentNode!==heading&&!overall.closest('#shuaBoardSettingsPanel'))heading.append(overall);
      heading.classList.add('shua-board-controls-inline');
    }else{
      heading.classList.remove('shua-board-controls-inline');
      if(overall.parentNode===heading)heading.after(overall);
    }
    const count=Number(teamControls.querySelector('.team-btn.active')?.dataset.teams)||10;
    const picks=[...board.querySelectorAll(':scope > .pick')];
    picks.forEach((pick,index)=>{
      const round=Math.floor(index/count)+1;
      pick.dataset.draftRoundTone=round%2===0?'even':'odd';
      if(index%count===0)pick.dataset.draftRound=String(round);
      else delete pick.dataset.draftRound;
    });
  }
  function schedule(){
    if(queued)return;
    queued=true;requestAnimationFrame(update);
  }
  new MutationObserver(schedule).observe(board,{childList:true});
  new MutationObserver(schedule).observe(teamControls,{attributes:true,subtree:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
  teamControls.addEventListener('click',schedule);
  schedule();
})();
