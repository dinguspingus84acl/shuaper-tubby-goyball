"""Regression tests of the actual website and source-attributed datasets, not mockups."""
import functools, http.server, json, pathlib, threading
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/studio-verification';OUT.mkdir(parents=True,exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
manifest=json.loads((ROOT/'analytics/manifest.json').read_text())
year=max(map(int,manifest['datasets']))
report={'year':year,'source':'actual repository + prepared source-attributed datasets','browsers':[]}
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  browser=getattr(pw,engine).launch(headless=True)
  for width,height in [(1440,1000),(390,844)]:
   context=browser.new_context(viewport={'width':width,'height':height},is_mobile=width<700,has_touch=width<700,device_scale_factor=1)
   context.add_init_script("localStorage.setItem('shuaViewMode',"+json.dumps('phone' if width<700 else 'desktop')+");localStorage.setItem('shuaPageStateV2',JSON.stringify({section:'ANALYTICS'}));localStorage.setItem('shuaStudioStateV1',JSON.stringify({year:"+str(year)+",view:'weekly'}));")
   page=context.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto('http://127.0.0.1:8765/',wait_until='domcontentloaded',timeout=90000)
   page.wait_for_selector('#shuaAnalyticsSection[data-ready="true"]',timeout=90000)
   def select_chart(view):
    if width<=1000 or page.locator('#stDashboard').is_visible():page.select_option('#stDashboard',view)
    else:page.locator('.st-navigation [data-st-view="'+view+'"]').click()
   if width<=1000:
    assert page.locator('#stDashboard').is_visible(),'Mobile chart dropdown should be visible'
    assert page.locator('.st-navigation').is_hidden(),'Swipeable chart tabs should be hidden on phone'
   else:
    assert page.locator('#stDashboard').is_hidden(),'Desktop keeps its sidebar navigation'
    assert page.locator('.st-navigation').is_visible()
   result={'engine':engine,'viewport':width,'views':[]}
   for view in ['matchup','trends','opportunity','consistency','teams','injury','schedule','startsit','weekly']:
    select_chart(view)
    if view=='injury':
     assert page.locator('#stInjuryList [data-st-injury]').count()>0,'No injured offensive players listed'
     assert 'Who benefits most?' in page.locator('#stContent').inner_text()
     assert page.locator('#stContent .st-chart').count()>=2,'Injury impact chart missing'
     page.select_option('#stInjuryPos','WR')
     assert page.locator('#stInjuryList [data-st-injury]').count()>0
     page.select_option('#stInjuryPos','ALL')
    if view=='schedule':
     page.wait_for_selector('#stScheduleRows tr',timeout=45000)
     assert page.locator('#stSeason').count()==0,'Schedule should remain 2026 only'
     assert page.locator('[data-st-schedule-pos="ALL"]').count()==0,'All filter must be removed'
     assert page.locator('#stScheduleRows tr').count()==36,'QB tab should include all ROS QBs'
     assert page.locator('#stScheduleCount').count()==0,'Remove player count below Search'
     assert page.locator('.st-heat-legend').count()==0,'Remove explanatory chart legend'
     assert page.locator('.st-week-sort-hint').count()==0,'Remove schedule instructional copy'
     assert page.locator('.st-method').count()==0,'Remove calculation notes from Schedule'
     assert page.locator('#stSource').is_hidden(),'Remove bottom source notes from Schedule'
     assert page.locator('.st-schedule-best-panel .st-panel-head p').count()==0,'Remove description under Best Remaining Schedules'
     assert page.locator('#stScheduleBest .st-schedule-best-row').count()==36,'List every QB, not just the top 12'
     assert page.locator('.st-schedule-toolbar').count()==1,'Search and Week must share one toolbar'
     geom=page.evaluate("""() => {
      const search=document.querySelector('#stScheduleSearch').getBoundingClientRect();
      const week=document.querySelector('#stWeek').getBoundingClientRect();
      const sc=document.querySelector('.st-heat-scroll').getBoundingClientRect();
      const h=document.querySelector('.st-week-sort').getBoundingClientRect();
      return {searchY:search.y,weekY:week.y,searchRight:search.right,weekX:week.x,scrollWidth:sc.width,scrollHeight:sc.height,headHeight:h.height,viewportWidth:innerWidth,viewportHeight:innerHeight};
     }""")
     assert abs(geom['searchY']-geom['weekY'])<=3,('Search and Week should be on the same row',geom)
     assert geom['searchRight']<=geom['weekX']+1,('Week should be to the right of Search',geom)
     assert geom['scrollWidth']>=geom['viewportWidth']-25,('Schedule table should span nearly full screen width',geom)
     assert geom['scrollHeight']>=geom['viewportHeight']*.50,('Schedule table should fill most of the viewport height',geom)
     assert geom['headHeight']<=32,('Shorten the week header row',geom)
     averages=page.locator('#stScheduleBest .st-schedule-average').evaluate_all("(els)=>els.map(el=>Number(el.textContent)).filter(Number.isFinite)")
     assert len(averages)>10 and averages==sorted(averages,reverse=True),'Best schedules must be sorted by HIGHEST average ESPN opponent rank'
     average_check=page.evaluate("""() => {
      const ds=window.ShuaStudio.UI.dataset,el=document.querySelector('#stScheduleBest .st-schedule-best-row');
      const player=ds.scheduleRoster.QB.find(p=>p.key===el.dataset.stBestKey);
      const start=Number(window.ShuaStudio.UI.state.week);
      const ranks=Array.from({length:19-start},(_,i)=>start+i)
       .map(w=>ds.schedule[player.team]?.[w]?.opponent)
       .map(opp=>ds.espnRatings.positions.QB[opp]?.rank)
       .filter(Number.isFinite);
      const expected=ranks.length?ranks.reduce((a,b)=>a+b,0)/ranks.length:null;
      return {expected,actual:parseFloat(el.querySelector('.st-schedule-average').textContent)};
     }""")
     if average_check['expected'] is not None:
      assert abs(average_check['expected']-average_check['actual'])<0.11,('Average should use displayed ESPN OPRK, not inverted ease ranks',average_check)

     assert page.locator('#stPlayoffs').count()==0,'Schedule window filter should be gone'
     assert page.locator('#stDashboard option[value="schedule"]').text_content().strip()=='Schedule'
     assert page.locator('#stScheduleRows .st-schedule-team-logo').count()>0,'Team logos should precede the team text'
     assert page.locator('#stScheduleRows .st-week-opponent-logo').count()>0,'Matchup opponent logos should appear'
     assert page.locator('#stScheduleRows .st-week-opponent > span').count()==0,'Opponent abbreviations should not appear beside matchup logos'
     assert page.locator('#stScheduleRows .st-week-opponent-logo').first.get_attribute('alt'),'Logo-only matchup must retain accessible team name'
     search_width=page.locator('#stScheduleSearch').evaluate('(x)=>x.getBoundingClientRect().width')
     assert search_width>=(160 if width<700 else 250),('Search should be reasonably wide',search_width)
     position_tops=page.locator('.st-schedule-positions button').evaluate_all('(buttons)=>buttons.map(b=>Math.round(b.getBoundingClientRect().top))')
     assert len(position_tops)==5 and max(position_tops)-min(position_tops)<=2,'All positions must fit in one row'
     if width>=1001:
      page.locator('[data-st-schedule-pos="TE"]').hover()
      highlight=page.evaluate("""() => {
       const qb=document.querySelector('[data-st-schedule-pos="QB"]');
       const te=document.querySelector('[data-st-schedule-pos="TE"]');
       return {qb:getComputedStyle(qb).color,te:getComputedStyle(te).color,qbSelected:qb.getAttribute('aria-pressed')};
      }""")
      assert highlight['te']=='rgb(36, 239, 160)' and highlight['qb']!='rgb(36, 239, 160)',('Exactly one position should be green while hovering',highlight)
      page.locator('#stScheduleSearch').hover()
      assert page.locator('[data-st-schedule-pos="QB"]').get_attribute('aria-pressed')=='true'
     week_buttons=page.locator('.st-week-sort')
     assert week_buttons.count()>=2
     assert page.locator('.st-week-sort-icon').count()==0,'Inactive week arrows should be absent'
     assert week_buttons.evaluate_all('(buttons)=>buttons.every(b=>b.getBoundingClientRect().width>=75 && b.scrollWidth<=b.clientWidth+2)'),'Week labels must not be cut off'
     assert page.locator('#stScheduleRows .st-heat-cell small').first.text_content().find('easiest')==-1,'Remove easiest from scores'

     assert page.locator('.st-topline').count()==0,'Old Studio branding should not appear'
     assert page.locator('#stWorkspace > .st-heading').count()==0,'Remove the schedule title and 2026 schedule eyebrow'
     assert page.locator('.st-schedule-heatmap-panel .st-panel-head').count()==0,'Remove duplicate heatmap heading'
     assert page.locator('#stDashboard option[value="schedule"]').text_content().strip().endswith('Schedule')
     assert 120<=page.locator('#stWeek').evaluate('(x)=>x.getBoundingClientRect().width')<=200,'Week selector should fit beside search'
     assert page.locator('#stScheduleSearch').evaluate('(x)=>x.getBoundingClientRect().width')<=370,'Search must fit alongside Week'
     assert page.locator('[data-st-sort-week]').count()>=2,'Each schedule week needs a sort button'
     first_week=page.locator('[data-st-sort-week]').first
     baseline=page.locator('#stScheduleRows tr').first.get_attribute('data-st-schedule-key')
     def week_ranks():
      return page.locator('#stScheduleRows tr').evaluate_all("(rows)=>rows.map(row=>parseInt(row.querySelector('td .st-heat-cell small')?.textContent||'',10)).filter(Number.isFinite)")
     first_week.click()
     assert page.locator('.st-week-sort.active').count()==1
     assert page.locator('.st-week-sort.active').first.get_attribute('aria-label').endswith('Easiest first')
     assert page.locator('.st-week-sort-icon').count()==1,'Only the active week should show a sort arrow'
     assert page.locator('.st-week-sort.active .st-week-sort-icon').evaluate('(x)=>getComputedStyle(x).color')=='rgb(54, 240, 174)','Selected arrow should be green'
     ranks=week_ranks()
     assert len(ranks)>=2 and ranks==sorted(ranks,reverse=True),'ESPN rank 32 should sort easiest first'
     first_week=page.locator('[data-st-sort-week]').first
     first_week.click()
     ranks=week_ranks()
     assert ranks==sorted(ranks),'ESPN rank 1 should sort hardest first'
     page.locator('[data-st-sort-week]').first.click()
     assert page.locator('.st-week-sort.active').count()==0,'Third tap restores published ROS ordering'
     assert page.locator('#stScheduleRows tr').first.get_attribute('data-st-schedule-key')==baseline
     assert page.locator('#stScheduleSearch').get_attribute('placeholder')=='Search players'
     assert page.locator('.st-schedule-toolbar .st-schedule-search-wrap .st-label').text_content().strip()=='Search'
     assert page.locator('#stScheduleRows .st-schedule-rank').count()==0,'Green rank badges must be removed'
     assert page.locator('#stScheduleRows .st-schedule-avatar').count()==36,'Circular faces should remain'
     assert page.locator('#stContent #stRange').count()==0,'Sample dropdown must not appear on Schedule'
     assert page.locator('#stDashboard').count()==1,'Dropdown should be provided to navigate charts'
     assert page.locator('.st-navigation [data-st-view]').count()==9,'Clickable chart navigation must remain'
     assert page.locator('#stScheduleRows .st-schedule-person-button').count()==36
     espn_feed=page.evaluate('window.ShuaStudio.UI.dataset.espnRatings')
     assert espn_feed['scoring']=='full PPR; 4-point passing TD'
     assert len(espn_feed['positions']['QB'])==32 and len(espn_feed['positions']['DST'])==32
     assert espn_feed['positions']['QB']['DET']['rank']==32
     assert espn_feed['positions']['QB']['MIN']['rank']==1
     page.locator('#stScheduleSearch').fill('Jahmyr')
     page.wait_for_selector('#stScheduleSuggestions [data-st-suggest]',timeout=15000)
     assert 'Jahmyr Gibbs' in page.locator('#stScheduleSuggestions').inner_text()
     page.locator('#stScheduleSuggestions [data-st-suggest]').first.click()
     assert page.locator('[data-st-schedule-pos="RB"]').get_attribute('aria-pressed')=='true'
     assert page.locator('#stScheduleRows tr.st-schedule-highlight').count()==1
     page.locator('[data-st-schedule-pos="QB"]').click()
     if width<700:
      page.evaluate("""() => {
       const bar=document.querySelector('.st-schedule-positions'),q=bar.querySelector('[data-st-schedule-pos="QB"]'),te=bar.querySelector('[data-st-schedule-pos="TE"]');
       const a=q.getBoundingClientRect(),b=te.getBoundingClientRect();
       q.dispatchEvent(new PointerEvent('pointerdown',{pointerId:177,pointerType:'touch',bubbles:true,clientX:a.x+a.width/2,clientY:a.y+a.height/2}));
       bar.dispatchEvent(new PointerEvent('pointermove',{pointerId:177,pointerType:'touch',bubbles:true,clientX:b.x+b.width/2,clientY:b.y+b.height/2}));
       bar.dispatchEvent(new PointerEvent('pointerup',{pointerId:177,pointerType:'touch',bubbles:true,clientX:b.x+b.width/2,clientY:b.y+b.height/2}));
      }""")
      assert page.locator('[data-st-schedule-pos="TE"]').get_attribute('aria-pressed')=='true'
      page.locator('[data-st-schedule-pos="QB"]').click()


     assert page.locator('#stScheduleRows .st-schedule-person-info').first.inner_text().find('ROS')==-1
     page.locator('#stScheduleSearch').fill('Josh Allen')
     assert page.locator('#stScheduleRows tr:visible').count()==1
     page.locator('#stScheduleSearch').fill('')
     for pos,total in [('WR',130),('TE',53),('RB',110),('DST',32),('QB',36)]:
      page.locator('[data-st-schedule-pos="'+pos+'"]').click()
      assert page.locator('#stScheduleRows tr').count()==total,(pos,'missing ROS or defense entries')
      assert page.locator('#stScheduleBest .st-schedule-best-row').count()==total,(pos,'Best Remaining must include every selected-position player')
     assert page.locator('#stScheduleRows .st-schedule-face').count()>0,'Player portraits missing'
    page.wait_for_timeout(300)
    assert page.locator('#stContent .st-panel').count()>0,(engine,width,view,'missing panels')
    assert not page.locator('#stContent').inner_text().startswith('This dashboard could not render'),(view,page.locator('#stContent').inner_text())
    sizes=page.evaluate('({width:innerWidth,document:document.documentElement.scrollWidth})')
    assert sizes['document']<=width+2,(engine,view,sizes)
    result['views'].append({'view':view,'panels':page.locator('#stContent .st-panel').count(),'documentWidth':sizes['document']})
    if view in ['trends','opportunity','injury','schedule','weekly']:
     page.screenshot(path=str(OUT/f'{engine}-{width}-{view}.png'),full_page=True)
   # Clicking Schedule from a player card focuses that player in the heatmap.
   select_chart('schedule')
   page.wait_for_selector('#stScheduleRows [data-st-open="joshallen"]',timeout=45000)
   page.locator('[data-st-schedule-pos="QB"]').click()
   # Click the face, not just the name: the entire player box must open the card.
   page.locator('#stScheduleRows [data-st-open="joshallen"] .st-schedule-face').first.click()
   page.wait_for_selector('#modal.open #sosStat[role="button"]',timeout=20000)
   sos_rank=page.evaluate("""async () => {
     const feed=await window.ShuaStudio.Data.espnMatchups(2026);
     const card=document.querySelector('#sosStat b')?.textContent||'';
     return {expected:feed.positions.QB.BUF.rank,actual:Number(card.match(/#(\\d+)/)?.[1])};
   }""")
   assert sos_rank['expected']==sos_rank['actual'],('Card SOS should use ESPN OPRK',sos_rank)
   # Opponent colors in the actual player Game Log must use Schedule's positional grades.
   page.locator('#unifiedProfileTabs [data-profile-tab="gamelog"]').click()
   page.wait_for_selector('#unifiedGameLogPanel .espn-game-log-opponent[data-gl-opponent]',timeout=35000)
   page.wait_for_function("""() => [...document.querySelectorAll('#unifiedGameLogPanel .espn-game-log-opponent')]
      .some(el => ['gl-sos-easy','gl-sos-neutral','gl-sos-tough'].some(cls => el.classList.contains(cls)))""",timeout=35000)
   matchup_result=page.evaluate("""async () => {
     const snapshot=await window.ShuaStudio.Data.espnMatchups(2026);
     const grades=window.ShuaStudio.Data.espnDefense(snapshot,'QB').byTeam;
     const colored=[...document.querySelectorAll('#unifiedGameLogPanel .espn-game-log-opponent')]
       .find(el => el.matches('.gl-sos-easy,.gl-sos-neutral,.gl-sos-tough'));
     const team=window.ShuaStudio.canonicalTeam(colored.dataset.glOpponent);
     const rank=grades[team]?.rank;
     const expected=rank<=10?'gl-sos-easy':rank<=20?'gl-sos-neutral':'gl-sos-tough';
     return {team,rank,expected,actual:colored.className};
   }""")
   assert matchup_result['rank'] is not None and matchup_result['expected'] in matchup_result['actual'],matchup_result
   assert page.evaluate("""() => {
     const b=document.querySelector('#unifiedGameLogPanel .espn-game-log-opponent.gl-sos-easy, #unifiedGameLogPanel .espn-game-log-opponent.gl-sos-neutral, #unifiedGameLogPanel .espn-game-log-opponent.gl-sos-tough');
     return b && b.offsetWidth>=90 && b.getBoundingClientRect().right>=b.querySelector('span').getBoundingClientRect().right;
   }"""),'Colored matchup must cover entire game-log opponent label'
   page.locator('#unifiedProfileTabs [data-profile-tab="overview"]').click()
   assert page.locator('#unifiedScheduleLink').count()==0,'Old Schedule shortcut should be removed'
   page.locator('#sosStat').click()
   page.wait_for_selector('#stScheduleRows tr.st-schedule-highlight',timeout=45000)
   assert page.locator('#stScheduleRows tr.st-schedule-highlight').first.get_attribute('data-st-schedule-key')=='joshallen'
   assert page.locator('#modal.open').count()==0
   assert page.locator('[data-st-schedule-pos="QB"]').get_attribute('aria-pressed')=='true'
   select_chart('trends')
   page.locator('[data-st-pos="WR"]').click()
   options=page.locator('#stPlayer option').evaluate_all('(es)=>es.map(e=>e.value)')
   if len(options)>1:
    page.select_option('#stPlayer',options[1]);assert page.locator('#stPlayer').input_value()==options[1]
   assert page.locator('#stContent .st-chart').count()>=1
   page.select_option('#stWeek','8');assert page.locator('#stWeek').input_value()=='8'
   select_chart('schedule')
   assert page.locator('#stPlayoffs').count()==0
   assert page.locator('.st-week-sort').count()>=2
   select_chart('trends')
   page.locator('.st-chart-hit').first.focus();assert page.locator('.st-tooltip:not([hidden])').count()
   page.locator('.st-legend-btn').first.click();assert page.locator('.st-legend-btn').first.get_attribute('aria-pressed')=='false'
   select_chart('weekly')
   page.locator('[data-st-open]').first.click()
   if page.locator('#modal.open').count():
    page.locator('#shuaPlayerInsights summary').click();page.wait_for_selector('#shuaPlayerInsights .st-svg',timeout=25000)
    page.locator('#stReturnToAnalytics').click()
    assert not page.locator('#modal.open').count(),'Profile did not close'
   for tab in ['QB','RB','WR','TE','DEPTH','ESPNLIVE','COMPARE','TRADE']:
    selector='.positions [data-pos="'+tab+'"]'
    if page.locator(selector).count():
     page.locator(selector).evaluate('(b)=>b.click()');page.wait_for_timeout(150)
     assert not page.locator('#shuaAnalyticsSection').is_visible(),(tab,'analytics stayed visible')
     page.locator('#studioNav').evaluate('(b)=>b.click()');page.wait_for_selector('#shuaAnalyticsSection[data-ready="true"]')
   if width<700 and page.locator('#phoneMenuButton').count():
    page.locator('#phoneMenuButton').click();page.wait_for_selector('#phoneMenuItems button[data-target="ANALYTICS"]');page.locator('#phoneMenuItems button[data-target="ANALYTICS"]').click()
    assert page.locator('#shuaAnalyticsSection').is_visible()
   result['pageErrors']=errors
   assert not errors,errors
   report['browsers'].append(result)
   (OUT/'report.json').write_text(json.dumps(report,indent=2))
   context.close()
  browser.close()
server.shutdown()
print(json.dumps(report,indent=2))
print('PASS: actual-site Chromium and WebKit at phone + desktop sizes. WebKit does not reproduce physical iPhone Safari browser chrome.')
