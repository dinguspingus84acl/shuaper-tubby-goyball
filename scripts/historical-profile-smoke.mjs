import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'inherit'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

try{
  await sleep(1200);
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});

  await page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('.espn-live-btn',{timeout:30000});
  await page.click('.espn-live-btn');
  await page.waitForSelector('#espnStatsYear',{timeout:30000});
  await page.selectOption('#espnStatsYear','2016');
  await page.waitForFunction(()=>document.querySelectorAll('#espnLiveRows .espn-live-row').length>10,{timeout:120000});

  const rowCount=await page.locator('#espnLiveRows .espn-live-row').count();
  const firstName=await page.locator('#espnLiveRows .espn-name-btn').first().innerText();
  const faceHtml=await page.locator('#espnLiveRows .espn-player').first().innerHTML();

  await page.locator('#espnLiveRows .espn-name-btn').first().click();
  await page.waitForSelector('#modal.open',{timeout:30000});
  const tabs=await page.locator('#unifiedProfileTabs .unified-profile-tab').allInnerTexts();
  const profileFace=await page.locator('#profileTop .person').innerHTML();

  await page.click('[data-profile-tab="history"]');
  await page.waitForFunction(()=>document.querySelectorAll('#unifiedHistoryPanel .player-history-row').length>0,{timeout:120000});
  const historyYears=await page.locator('#unifiedHistoryPanel .player-history-year').allInnerTexts();

  await page.locator('#unifiedHistoryPanel .player-history-row').first().click();
  await page.waitForFunction(()=>{
    const d=document.querySelector('#unifiedHistoryPanel .player-history-detail.open');
    return d && (d.querySelector('.espn-game-log-table') || /No game stats|Could not load/.test(d.textContent));
  },{timeout:120000});
  const detailText=await page.locator('#unifiedHistoryPanel .player-history-detail.open').first().innerText();

  console.log('RESULT',JSON.stringify({rowCount,firstName,tabs,historyYears:historyYears.slice(0,10),faceHtml,profileFace,detailText:detailText.slice(0,500),errors},null,2));
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
