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
async function swipeDownToClose(page){
  await page.evaluate(()=>{
    const profile=document.querySelector('#modal .profile');
    if(profile)profile.scrollTop=0;
  });
  const viewport=page.viewportSize()||{width:390,height:844};
  const x=Math.round(viewport.width/2);
  const cdp=await page.context().newCDPSession(page);
  try{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:70}]});
    await new Promise(r=>setTimeout(r,45));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:145}]});
    await new Promise(r=>setTimeout(r,45));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:245}]});
    await new Promise(r=>setTimeout(r,45));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }finally{
    await cdp.detach();
  }
  await page.waitForFunction(()=>!document.getElementById('modal')?.classList.contains('open'),{timeout:5000});
}

async function selectProfileTab(page,key){
  const phone=await page.evaluate(()=>document.body.classList.contains('phone-mode'));
  if(phone){
    const visible=await page.locator('#unifiedProfileTabs .unified-profile-tab:visible').count();
    if(visible!==4)throw new Error('Phone player profile should show four visible tabs, saw '+visible);
  }
  await page.locator('[data-profile-tab="'+key+'"]').click();
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
  await page.waitForFunction(()=>{
    const el=document.querySelector('#espnLiveRows .espn-live-row .espn-headshot');
    return !!el && (el.tagName!=='IMG' || (el.complete&&el.naturalWidth>0));
  },{timeout:15000});
  const rowFaceLoaded=await first.locator('.espn-headshot').evaluate(el=>el.tagName==='IMG'?el.complete&&el.naturalWidth>0:true);

  await first.locator('.espn-name-btn').click();
  await page.waitForSelector('#modal.open',{timeout:30000});

  const phoneSheet=await page.locator('#modal .profile').evaluate(el=>{
    const r=el.getBoundingClientRect();
    const close=document.getElementById('close');
    const hero=document.getElementById('featuredPlayerCard');
    return {
      bodyPhone:document.body.classList.contains('phone-mode'),
      width:r.width,height:r.height,top:r.top,left:r.left,
      innerWidth:window.innerWidth,innerHeight:window.innerHeight,
      closeDisplay:close?getComputedStyle(close).display:'missing',
      heroHeight:hero?hero.getBoundingClientRect().height:0
    };
  });
  if(phoneSheet.bodyPhone){
    if(phoneSheet.width<phoneSheet.innerWidth-2||phoneSheet.height<phoneSheet.innerHeight-2)
      throw new Error('Phone profile does not fill viewport: '+JSON.stringify(phoneSheet));
    if(phoneSheet.closeDisplay!=='none')
      throw new Error('Phone profile close button should be hidden: '+JSON.stringify(phoneSheet));
    if(phoneSheet.heroHeight>260)
      throw new Error('Phone featured card is not compact enough: '+JSON.stringify(phoneSheet));
  }

  const tabs=await page.locator('#unifiedProfileTabs .unified-profile-tab').allInnerTexts();
  if(!tabs.includes('History')||!tabs.includes('Game Log'))throw new Error('Missing History/Game Log tabs for '+firstName);

  await page.waitForFunction(()=>{
    const el=document.querySelector('#profileTop .person img.photo');
    return !!el && el.complete && el.naturalWidth>0;
  },{timeout:15000});
  const profileFace=page.locator('#profileTop .person img.photo');
  const profileFaceLoaded=await profileFace.evaluate(el=>el.complete&&el.naturalWidth>0);
  if(!rowFaceLoaded||!profileFaceLoaded)throw new Error('Face did not load for '+firstName+' in '+year);

  await selectProfileTab(page,'history');
  await page.waitForFunction(()=>document.querySelectorAll('#unifiedHistoryPanel .player-history-row').length>0,{timeout:120000});
  const yearTexts=await page.locator('#unifiedHistoryPanel .player-history-year').allInnerTexts();
  const historyYears=yearTexts.map(x=>Number(x.replace(/[^0-9]/g,''))).filter(Boolean);
  const historyLogoCount=await page.locator('#unifiedHistoryPanel .player-history-row .player-history-team-logo').count();
  if(historyLogoCount<1)throw new Error('History team logos missing for '+firstName);
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

  const opponentLabels=await detail.locator('.espn-game-log-table tbody tr td:nth-child(2)').allInnerTexts();
  const badOpponent=opponentLabels.find(x=>/^\s*(?:@|vs\.?\b)/i.test(x));
  if(badOpponent)throw new Error('Game Log opponent still includes @/vs prefix: '+badOpponent);

  const summaryText=await detail.locator('.espn-game-log-summary').first().innerText();
  if(!/Season/i.test(summaryText)||!/PPG/i.test(summaryText)||!/PPR/i.test(summaryText)||!/GP/i.test(summaryText))
    throw new Error('Game Log season summary missing or incomplete: '+summaryText);
  const opponentLogoCount=await detail.locator('.espn-game-log-opponent-logo').count();
  if(opponentLogoCount<1)throw new Error('Game Log opponent logos missing for '+firstName+' '+year);
  const scoredPtsCount=await detail.locator('.gl-pts-high,.gl-pts-mid,.gl-pts-low').count();
  if(scoredPtsCount<1)throw new Error('Game Log PTS color coding missing for '+firstName+' '+year);
  const controlsPosition=await detail.locator('.espn-game-log-controls').first().evaluate(el=>getComputedStyle(el).position);
  if(controlsPosition!=='sticky')throw new Error('Game Log controls are not sticky: '+controlsPosition);

  const gameLogLayout=await detail.locator('.espn-game-log-table').evaluate(table=>{
    const wrap=table.closest('.espn-game-log-table-wrap');
    const td=table.querySelector('tbody td.gl-stat, tbody td.gl-pts, tbody td');
    return {
      tableWidth:table.getBoundingClientRect().width,
      wrapWidth:wrap?.getBoundingClientRect().width||0,
      tdFont:td?parseFloat(getComputedStyle(td).fontSize):0
    };
  });
  if(phoneSheet.bodyPhone){
    if(gameLogLayout.tableWidth>gameLogLayout.wrapWidth+2)
      throw new Error('Phone Game Log table overflows available width: '+JSON.stringify(gameLogLayout));
    if(gameLogLayout.tdFont<12.5)
      throw new Error('Phone Game Log numbers are still too small: '+JSON.stringify(gameLogLayout));
  }else{
    if(Math.abs(gameLogLayout.tableWidth-gameLogLayout.wrapWidth)>3)
      throw new Error('Desktop Game Log table should fill its card: '+JSON.stringify(gameLogLayout));
    if(gameLogLayout.tdFont<13)
      throw new Error('Desktop Game Log numbers are too small: '+JSON.stringify(gameLogLayout));
  }

  const options=await detail.locator('select option').allTextContents();
  const logYears=options.map(Number).filter(Boolean);
  if(logYears.length&&new Set(logYears).size!==logYears.length)throw new Error('Duplicate Game Log years for '+firstName+': '+logYears.join(','));

  if(phoneSheet.bodyPhone)await swipeDownToClose(page);
  else await page.click('#close');
  return {year,rowCount,firstName,historyYears:historyYears.slice(0,15),logYears:logYears.slice(0,15),rowFaceLoaded,profileFaceLoaded,detailText:detailText.slice(0,350),phoneSheet,gameLogLayout,summaryText,opponentLogoCount,scoredPtsCount,controlsPosition};
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
  const phoneTopControls=await page.evaluate(()=>({
    phone:document.body.classList.contains('phone-mode'),
    teamControls:document.getElementById('teamControls')?getComputedStyle(document.getElementById('teamControls')).display:'missing',
    overallToggle:document.getElementById('overallToggle')?getComputedStyle(document.getElementById('overallToggle')).display:'missing',
    pageHead:document.querySelector('main .head')?getComputedStyle(document.querySelector('main .head')).display:'missing',
    toolsHeight:document.querySelector('.tools')?.getBoundingClientRect().height||0
  }));
  if(phoneTopControls.phone&&(phoneTopControls.teamControls!=='none'||phoneTopControls.overallToggle!=='none'||phoneTopControls.pageHead!=='none'))
    throw new Error('Phone top controls should be hidden: '+JSON.stringify(phoneTopControls));
  if(phoneTopControls.phone&&phoneTopControls.toolsHeight>90)
    throw new Error('Phone header is still too tall: '+JSON.stringify(phoneTopControls));
  await openStats(page,2016);

  const checks=[];
  checks.push(await verifyHistoricalYear(page,2016));
  checks.push(await verifyHistoricalYear(page,2004));

  const desktop=await browser.newPage({viewport:{width:1280,height:900}});
  desktop.on('pageerror',e=>errors.push('DESKTOP PAGEERROR '+e.message));
  desktop.on('console',m=>{if(m.type()==='error')errors.push('DESKTOP CONSOLE '+m.text())});
  await desktop.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded',timeout:60000});
  await openStats(desktop,2016);
  checks.push(await verifyHistoricalYear(desktop,2016));

  console.log('RESULT',JSON.stringify({checks,phoneTopControls,errors},null,2));
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
