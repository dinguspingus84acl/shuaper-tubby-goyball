/* Dynasty rankings reference: keep Goyball navigation intact while respecting KTC's published-use terms. */
(()=>{
  'use strict';
  const toggle=document.getElementById('positionToggle');
  if(!toggle||toggle.querySelector('[data-posview="DYNASTY"]'))return;

  const sourceUrls={
    QB:'https://keeptradecut.com/dynasty-rankings/qb-rankings',
    RB:'https://keeptradecut.com/dynasty-rankings/rb-rankings',
    WR:'https://keeptradecut.com/dynasty-rankings/wr-rankings',
    TE:'https://keeptradecut.com/dynasty-rankings/te-rankings'
  };
  const labels={QB:'Quarterback',RB:'Running Back',WR:'Wide Receiver',TE:'Tight End'};

  const button=document.createElement('button');
  button.type='button';
  button.dataset.posview='DYNASTY';
  button.textContent='Dynasty';
  toggle.append(button);

  const style=document.createElement('style');
  style.textContent=`
    .dynasty-reference-cell{padding:18px!important;grid-column:1/-1!important;white-space:normal!important;overflow:visible!important}
    .dynasty-reference-card{max-width:760px;margin:0 auto;border:1px solid var(--l);border-radius:14px;padding:18px;background:#081a2d}
    .dynasty-reference-card h3{margin:0 0 8px;font-size:1.15rem;color:#fff}
    .dynasty-reference-card p{margin:7px 0;color:var(--m);line-height:1.5}
    .dynasty-reference-card .dynasty-source{font-size:.78rem}
    .dynasty-reference-card a{display:inline-flex;align-items:center;justify-content:center;margin-top:8px;border:1px solid #ffffff35;border-radius:9px;padding:10px 14px;background:#183d63;color:#fff;text-decoration:none;font-weight:900}
    .dynasty-reference-card a:hover,.dynasty-reference-card a:focus-visible{background:#22517e;outline:none}
    .dynasty-reference-card strong{color:#fff}
    .phone-mode .dynasty-reference-cell{display:block!important;padding:10px 4px!important}
    .phone-mode .dynasty-reference-card{padding:14px}
    .phone-mode .dynasty-reference-card a{width:100%;min-height:42px}
  `;
  document.head.append(style);

  function renderDynastyReference(){
    if(typeof positionView==='undefined'||positionView!=='DYNASTY')return;
    if(typeof position==='undefined'||!sourceUrls[position])return;
    const boardEl=document.getElementById('board');
    const tableCard=document.getElementById('tableCard');
    const rows=document.getElementById('rows');
    const title=document.getElementById('title');
    const sub=document.getElementById('sub');
    if(boardEl)boardEl.hidden=true;
    if(tableCard)tableCard.hidden=false;
    if(title)title.textContent=position+' Dynasty Rankings';
    if(sub)sub.textContent='Live dynasty market rankings via KeepTradeCut';
    if(!rows)return;
    const url=sourceUrls[position];
    const label=labels[position]||position;
    rows.innerHTML=`<tr class="dynasty-reference-row"><td class="dynasty-reference-cell" colspan="6"><div class="dynasty-reference-card"><h3>${label} Dynasty Rankings</h3><p>Use the <strong>live KeepTradeCut dynasty rankings</strong> for this position. KTC controls its Superflex/1QB and TE-premium settings on its own site, so your saved KTC settings stay authoritative.</p><p class="dynasty-source">Source: KeepTradeCut. Their published terms allow individual references but do not allow reproducing the full rankings/values inside another tool.</p><a href="${url}" target="_blank" rel="noopener noreferrer">View live ${position} dynasty rankings on KTC ↗</a></div></td></tr>`;
  }

  if(typeof render==='function'){
    const baseRender=render;
    render=function(){
      baseRender();
      renderDynastyReference();
    };
  }

  button.addEventListener('click',()=>{
    if(typeof positionView!=='undefined')positionView='DYNASTY';
    toggle.querySelectorAll('[data-posview]').forEach(el=>el.classList.toggle('active',el===button));
    if(typeof render==='function')render();
    else renderDynastyReference();
  });
})();