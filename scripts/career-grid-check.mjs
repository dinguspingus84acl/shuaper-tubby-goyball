import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const source=fs.readFileSync('player-season-stats.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const styles=[...index.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]);
const cssFiles=[...index.matchAll(/<link\b[^>]*href=["']([^"']+\.css)(?:\?[^"']*)?["'][^>]*>/gi)].map(m=>m[1]).filter(p=>fs.existsSync(p));
const css=styles.concat(cssFiles.map(p=>fs.readFileSync(p,'utf8'))).join('\n');
const fixture=[{year:2026,position:'RB',team:'DAL',gamesPlayed:12,points:224.7,rank:3,ppgRank:2,rushAtt:217,rushYds:860,rushTD:12,targets:36,receptions:31,recYds:177,recTD:0},{year:2025,position:'RB',team:'DAL',gamesPlayed:16,points:242.8,rank:12,ppgRank:11,rushAtt:252,rushYds:1201,rushTD:11,targets:51,receptions:35,recYds:137,recTD:1}];
const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><body class="phone-mode shua-clean"><div id="modal" class="modal open" style="display:block!important;position:static!important;padding:0!important"><div class="profile featured-player-profile" style="width:100%!important;max-width:100%!important;box-sizing:border-box"><div id="unifiedProfilePanels"><div id="unifiedPlayerStatsPanel"></div></div></div></div><pre id="test-result">PENDING</pre><script>'+source.replaceAll('</script','<\\/script')+'</script><script>try{const p=document.querySelector("#unifiedPlayerStatsPanel");p.innerHTML=window.ShuaPlayerSeasonStats.build('+JSON.stringify(fixture)+',"RB");const w=p.querySelector(".ps-table-wrap"),t=p.querySelector("table"),head=t.querySelector("thead"),h=t.querySelectorAll(".ps-stat-head"),row=t.tBodies[0].rows[0];if(getComputedStyle(t).display!=="table"||getComputedStyle(head).display!=="table-header-group"||getComputedStyle(row).display!=="table-row")throw Error("not a horizontal table");if(h.length<10||!Array.from(h).some(x=>x.textContent==="TAR")||h[0].getBoundingClientRect().height<10)throw Error("missing headings");if(w.scrollWidth<=w.clientWidth+100)throw Error("no horizontal overflow: "+w.scrollWidth+"/"+w.clientWidth);const fixed=row.cells[0],before=fixed.getBoundingClientRect().left;w.scrollLeft=400;const after=fixed.getBoundingClientRect().left;if(w.scrollLeft<300||Math.abs(after-before)>2)throw Error("year did not stay fixed");document.querySelector("#test-result").textContent="PASS headers "+h.length+", horizontal scroll "+w.scrollLeft+", fixed year "+after;}catch(e){document.querySelector("#test-result").textContent="FAIL "+e.message;}</script>';
fs.writeFileSync('/tmp/career-grid-test.html',html);
for(const width of [390,320]){
 const chrome=spawnSync('google-chrome',['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--host-resolver-rules=MAP * ~NOTFOUND','--window-size='+width+',844','--force-device-scale-factor=1','--virtual-time-budget=5000','--dump-dom','file:///tmp/career-grid-test.html'],{encoding:'utf8',maxBuffer:30*1024*1024,timeout:45000});
 if(chrome.error)throw chrome.error;
 const result=chrome.stdout.match(/<pre id="test-result">([^<]*)<\/pre>/)?.[1];
 console.log(width,result||chrome.stderr?.slice(-1500));
 assert(result?.startsWith('PASS '),result||'No browser test output');
}
