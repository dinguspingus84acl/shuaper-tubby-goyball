// post-registry-cache-bust smoke
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'inherit'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function openStats(page,year){
  if(await page.locator('#phoneMenuButton').isVisible()){
    await page.click('#phoneMenuButton');
    const statsMenu=page.locator('#phoneMenuItems button').filter({hasText:'Stats'}).first();
    await statsMenu.click();
  }else{
    await page.click('.espn-live-btn');
  }
  await page.waitForSelector('#espnStatsYear',{timeout:30000});
  await page.selectOption('#espnStatsYear',String(year));
  await page.waitForFunction(()=>document.querySelectorAll('#espnLiveRows .espn-live-row').length>10,{timeout:120000});
}
async function verifyHistoricalYear(page,year){
  await page.selectOption('#espnStatsYear',String(year));
  await page.waitForFunction(y=>{
    const sub=document.getElementById('sub')?.textContent||'';
    return sub.startsWith(String(y)+' ');
  },year,{timeout:120000});
  await page.waitForFunction(()=>document.querySelectorAll('#espnLiveRows .espn-live-row').length>10,{timeout:120000});

  const rowCount=await page.locator('#espnLiveRows .espn-live-row').count();
  const first=page.locator('#espnLiveRows .espn-live-row').first();
  const firstName=await first.locator('.espn-name-btn').innerText();
  const rowFaceLoaded=await first.locator('.espn-headshot').evaluate(el=>el.tagName==='IMG'?el.complete&&el.naturalWidth>0:true);

  await first.locator('.espn-name-btn').click();
  await page.waitForSelector('#modal.open',{timeout:30000});
  const tabs=await page.locator('#unifiedProfileTabs .unified-profile-tab').allInnerTexts();
  if(!tabs.includes('History')||!tabs.includes('Game Log'))throw new Error('Missing History/Game Log tabs for '+firstName);

  const profileFace=page.locator('#profileTop .person img.photo');
  const profileFaceLoaded=await profileFace.count()?await profileFace.evaluate(el=>el.complete&&el.naturalWidth>0):false;
  if(!rowFaceLoaded||!profileFaceLoaded)throw new Error('Face did not load for '+firstName+' in '+year);

  await page.click('[data-profile-tab="history"]');
  await page.waitForFunction(()=>document.querySelectorAll('#unifiedHistoryPanel .player-history-row').length>0,{timeout:120000});
  const yearTexts=await page.locator('#unifiedHistoryPanel .player-history-year').allInnerTexts();
  const historyYears=yearTexts.map(x=>Number(x.replace(/[^0-9]/g,''))).filter(Boolean);
  if(new Set(historyYears).size!==historyYears.length)throw new Error('Duplicate History years for '+firstName+': '+historyYears.join(','));
  if(!historyYears.includes(Number(year)))throw new Error('History missing selected year '+year+' for '+firstName);

  const selectedIndex=historyYears.indexOf(Number(year));
  const rows=page.locator('#unifiedHistoryPanel .player-history-row');
  await rows.nth(selectedIndex>=0?selectedIndex:0).click();
  await page.waitForFunction(()=>{
    const d=document.querySelector('#unifiedHistoryPanel .player-history-detail.open');
    return d && (d.querySelector('.espn-game-log-table') || /No game stats|Could not load/.test(d.textContent));
  },{timeout:120000});

  const detail=page.locator('#unifiedHistoryPanel .player-history-detail.open').first();
  const detailText=await detail.innerText();
  if(/Could not load/.test(detailText))throw new Error('Game log failed for '+firstName+' '+year);
  const options=await detail.locator('select option').allTextContents();
  const logYears=options.map(Number).filter(Boolean);
  if(logYears.length&&new Set(logYears).size!==logYears.length)throw new Error('Duplicate Game Log years for '+firstName+': '+logYears.join(','));

  await page.click('#close');
  return {year,rowCount,firstName,historyYears:historyYears.slice(0,15),logYears:logYears.slice(0,15),rowFaceLoaded,profileFaceLoaded,detailText:detailText.slice(0,350)};
}

try{
  await sleep(1200);
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});

  await page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('#phoneMenuButton',{state:'visible',timeout:30000});
  await openStats(page,2016);

  const checks=[];
  checks.push(await verifyHistoricalYear(page,2016));
  checks.push(await verifyHistoricalYear(page,2004));

  console.log('RESULT',JSON.stringify({checks,errors},null,2));
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
