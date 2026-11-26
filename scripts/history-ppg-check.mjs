import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
const index=JSON.parse(read('legacy-stats/index.json')).players;
const key='joshallen';
const meta=index[key];
assert(meta?.history?.length,'Josh Allen career missing');
const career=meta.history.filter(r=>[2024,2025].includes(Number(r.year)));
assert.equal(career.length,2);
const subset={};
for(const [k,m] of Object.entries(index)){
 const h=(m.history||[]).filter(x=>[2024,2025].includes(Number(x.year)));
 if(h.length)subset[k]={...m,history:h};
}
const seasonFiles={};
for(const yr of [2024,2025]){
 const j=JSON.parse(read('legacy-stats/'+yr+'.json'));
 seasonFiles[yr]=Array.isArray(j)?j:j.rows;
}
const live=read('espn-live.js');
const start=live.indexOf('  async getCareerPpgRank(row){');
const end=live.indexOf('\n  getPlayerHeadshotUrl',start);
assert(start>=0&&end>start,'rank API not found');
const method=live.slice(start,end).trim().replace(/,$/,'');
const data=JSON.stringify({index:subset,career,seasons:seasonFiles}).replaceAll('<','\\u003c');
const history=read('player-history.js').replaceAll('</script','<\\/script');
const html=`<!doctype html><meta charset="utf-8"><style>${read('visual-twentyfour-20261114.css')}</style><style>body{margin:0;color:white;background:#07182a;font:16px Arial}#modal{display:block!important;position:static!important;width:auto!important;padding:0!important}#unifiedHistoryPanel{width:390px;box-sizing:border-box}.player-history-card{width:100%;box-sizing:border-box}</style><body class="shua-clean phone-mode"><div id="modal"><div id="unifiedHistoryPanel"></div></div><pre id="test-result">PENDING</pre><script>
const fixture=${data};
const SEASON=2026;
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const nameKey=s=>norm(s).replace(/kennethwalkeriii$/,'kennethwalker');
const loadHistoricalIndex=async()=>fixture.index;
const fetchHistoricalSeason=async y=>fixture.seasons[y];
const ensureCurrentRows=async()=>[];
window.ShuaEspnLive={${method},getCompleteCareer:async()=>fixture.career,getCareerSeasonBoard:fetchHistoricalSeason};
</script><script>${history}</script><script>
(async()=>{
 const result=document.getElementById('test-result');
 try{
 const panel=document.getElementById('unifiedHistoryPanel');
 await window.ShuaPlayerHistory.render('Josh Allen',panel);
 const head=panel.querySelector('.player-history-head');
 const rows=[...panel.querySelectorAll('.player-history-row')];
 if(!head||rows.length!==2)throw Error('History did not render: '+panel.textContent);
 const labels=[...head.children].map(x=>x.textContent.trim());
 if(labels.join('|')!=='Year|Team|GP|Finish|PPG|PPG Rank|Pts')throw Error(labels.join('|'));
 const ranks=[];
 for(const row of rows){
   if(row.children.length!==7)throw Error('row does not have seven cells');
   const year=Number(row.children[0].textContent.replace(/[^0-9]/g,''));
   const rank=row.children[5].textContent;
   const pool=fixture.seasons[year].filter(p=>p.position==='QB'&&Number(p.gamesPlayed??p.games)>0&&p.points!=null&&Number.isFinite(Number(p.points)));
   const target=pool.find(p=>nameKey(p.name)==='joshallen');
   if(!target)throw Error('missing season player '+year);
   const score=p=>Number(p.points)/Number(p.gamesPlayed??p.games);
   const expected=1+pool.filter(p=>score(p)>score(target)+1e-8).length;
   if(rank!=='QB'+expected)throw Error('Rank mismatch '+year+': '+rank+' expected QB'+expected);
   ranks.push(year+':'+rank);
 }
 for(const width of [320,390,600]){
   panel.style.width=width+'px';
   const card=panel.querySelector('.player-history-card').getBoundingClientRect();
   for(const row of rows){
     for(let i=0;i<7;i++){
       const h=head.children[i].getBoundingClientRect(),r=row.children[i].getBoundingClientRect();
       if(Math.abs(h.left-r.left)>1||Math.abs(h.right-r.right)>1)throw Error('Misaligned '+width+' column '+i);
       if(r.right>card.right+1)throw Error('Overflow '+width+' column '+i);
     }
   }
 }
 result.textContent='PASS '+ranks.join(', ')+'; widths 320, 390, 600';
 }catch(e){result.textContent='FAIL '+e.message}
})();
</script>`;
fs.writeFileSync('/tmp/history-ppg-check.html',html);
const chrome=spawnSync('google-chrome',['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--host-resolver-rules=MAP * ~NOTFOUND','--virtual-time-budget=10000','--dump-dom','file:///tmp/history-ppg-check.html'],{encoding:'utf8',maxBuffer:40*1024*1024,timeout:45000});
if(chrome.error)throw chrome.error;
const result=chrome.stdout.match(/<pre id="test-result">([^<]*)<\/pre>/)?.[1];
console.log(result||chrome.stderr?.slice(-2000));
assert(result?.startsWith('PASS '),result||'No browser test result');
