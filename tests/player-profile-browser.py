#!/usr/bin/env python3
"""Desktop/iPhone regression for the search and My Teams enhancements."""
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
srv=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=srv.serve_forever,daemon=True).start()
base='http://127.0.0.1:%d/'%srv.server_address[1]

def navigate(page,group,target):
    page.locator(f'#shuaCleanNav [data-shua-group="{group}"] .shua-clean-trigger').click()
    page.locator(f'#shuaCleanNav [data-shua-target="{target}"]').click()

def open_search(page,phone):
    assert page.locator('#shuaGlobalSearchBar').count()==0, 'No standalone search bar should occupy space on any tab'
    tools=page.locator('#shuaCleanNav [data-shua-group="tools"] .shua-clean-trigger')
    tools.click()
    launch=page.locator('#shua-menu-tools [data-shua-search="players"]')
    assert launch.is_visible(),('Tools must contain the player search command',phone)
    launch.click()
    page.locator('#shuaExpandedSearch .shua-search-dialog').wait_for(state='visible',timeout=18000)

def check_position_rankings(page,phone):
    for pos in ('QB','RB','WR','TE'):
        navigate(page,'rankings',pos)
        page.locator('#rows tr').first.wait_for(state='visible',timeout=18000)
        assert page.locator('.positions .pos.active').first.get_attribute('data-pos')==pos
        modes=page.locator('main>.head #positionToggle')
        assert modes.is_visible(),('ROS and Pre Season must remain visible above '+pos+' ranks',phone)
        assert modes.locator('[data-posview="ROS"]').is_visible()
        assert modes.locator('[data-posview="PRESEASON"]').is_visible()
        if pos=='RB':
            modes.locator('[data-posview="PRESEASON"]').click()
            assert modes.locator('[data-posview="PRESEASON"]').get_attribute('class').find('active')>=0
            modes.locator('[data-posview="ROS"]').click()
            assert modes.locator('[data-posview="ROS"]').get_attribute('class').find('active')>=0
        check=page.locator('#rows').evaluate('''root=>{
          const rows=[...root.querySelectorAll('tr')];
          const invalidRanks=[],clippedNames=[],narrowRanks=[];
          for(const row of rows){
            const rank=row.querySelector('td.rank');
            const name=row.querySelector('.photo-cell b');
            if(!/^#\\d+$/.test(rank?.textContent?.trim()||''))invalidRanks.push(name?.textContent);
            if(!name)continue;
            if(document.body.classList.contains('phone-mode')){
              const box=name.getBoundingClientRect();
              const range=document.createRange();range.selectNodeContents(name);
              const textRects=[...range.getClientRects()].filter(r=>r.width>0);
              if(getComputedStyle(name).whiteSpace!=='normal'||
                 textRects.some(r=>r.left<box.left-2||r.right>box.right+2||r.bottom>box.bottom+2))
                clippedNames.push(name.textContent);
              if(rank.getBoundingClientRect().width<50)narrowRanks.push(rank.textContent);
            }
          }
          return {count:rows.length,invalidRanks,clippedNames,narrowRanks};
        }''')
        assert check['count']>=25,('Missing '+pos+' ranking rows',check)
        assert not check['invalidRanks'],('Every '+pos+' rank must be numeric',check)
        assert not check['clippedNames'],('Full '+pos+' names must fit',check)
        assert not check['narrowRanks'],('Three-digit '+pos+' ranks need their own column',check)

def check_browser(browser,phone):
    ctx=browser.new_context(viewport={'width':390 if phone else 1365,'height':844 if phone else 900},
                            is_mobile=phone,has_touch=phone)
    page=ctx.new_page()
    page.goto(base,wait_until='domcontentloaded')
    page.locator('#shuaExpandedSearch').wait_for(state='attached',timeout=25000)
    assert page.locator('#viewModeToggle').count()==0,'The display-mode switch must be removed'
    assert page.evaluate("document.body.classList.contains('phone-mode')")==phone,('Display mode must match device size',phone)
    assert page.locator('#shuaDisplayModeButton').count()==0,'Tools must not show a manual display switch'
    check_position_rankings(page,phone)
    # Keep Bijan in the active ranking sequence so a real horizontal swipe has neighbors.
    navigate(page,'rankings','RB')
    open_search(page,phone)
    query=page.locator('#shuaSearchQuery')
    assert query.is_visible()
    query.fill('Bijan Robinson')
    current=page.locator('[data-search-player]').first
    current.wait_for(state='visible',timeout=12000)
    assert 'Bijan Robinson' in current.inner_text()
    assert current.locator('.shua-search-avatar').count()==1
    assert page.locator('#shuaSearchInputFace').is_visible(),'Input itself should show best-matching player'
    assert page.locator('#shuaSearchInputFace .shua-search-avatar').count()==1
    page.wait_for_function("document.querySelector('.shua-search-result .shua-search-avatar img')!==null",timeout=22000)
    page.wait_for_function("document.querySelector('#shuaSearchInputFace img')!==null",timeout=22000)
    current.click()
    hero=page.locator('#modal.open #featuredPlayerCard')
    hero.wait_for(state='visible',timeout=18000)
    values=page.evaluate("({selected:document.querySelector('#modal')?.dataset?.unifiedName,plain:document.querySelector('#pn')?.textContent,first:document.querySelector('#featuredPlayerCard .featured-first')?.textContent,last:document.querySelector('#featuredPlayerCard .featured-last')?.textContent})")
    print('PROFILE TRACE',values,flush=True)
    page.wait_for_function("document.querySelector('#modal.open #featuredPlayerCard .featured-last')?.textContent?.includes('Robinson')",timeout=12000)
    assert 'broadcast-card' in (hero.get_attribute('class') or ''),'Every player must use the broadcast identity design'
    assert hero.locator('.featured-mini-logo').count()==1,'The team header must include the small logo'
    assert hero.locator('.featured-divider').count()==1,'The team header must separate its logo and name'
    assert hero.locator('.featured-team-name').inner_text().strip()=='ATLANTA FALCONS','Use the full city and team name'
    assert hero.locator('.featured-bio-item').count()==4,'The footer must remain a single four-stat strip'
    layout=hero.evaluate('''card=>{
      const rect=selector=>card.querySelector(selector)?.getBoundingClientRect();
      const team=rect('.featured-team-name'),logo=rect('.featured-mini-logo');
      const divider=rect('.featured-divider'),first=rect('.featured-first'),last=rect('.featured-last');
      const identity=rect('.featured-identity-meta'),footer=rect('.featured-bio'),frame=card.getBoundingClientRect();
      return {teamX:team.left,logoX:logo.left,logoRight:logo.right,dividerX:divider.left,
              dividerRight:divider.right,firstX:first.left,lastX:last.left,teamBottom:team.bottom,
              firstTop:first.top,lastBottom:last.bottom,identityTop:identity.top,
              footerTop:footer.top,footerRight:footer.right,frameRight:frame.right};
    }''')
    assert layout['logoX']>=layout['firstX']-5,('Small logo begins near the name column',layout)
    assert layout['dividerX']>=layout['logoRight']-3,('Divider must be after the small logo',layout)
    assert layout['teamX']>=layout['dividerRight']+2,('Team name must be after the divider',layout)
    assert abs(layout['lastX']-layout['firstX'])<=7,('First and last name must align',layout)
    assert layout['teamBottom']<layout['firstTop']+2,('Team label must be above name',layout)
    assert layout['lastBottom']<=layout['identityTop']+5,('Number and position must be below surname',layout)
    assert layout['identityTop']<layout['footerTop'],('Identity block belongs above stat rail',layout)
    assert abs(layout['footerRight']-layout['frameRight'])<=4,('Stat rail must span full card',layout)
    if phone:
        # Use the longest plausible weight label even if offline bio fetching
        # leaves a placeholder; its entire text must fit inside its tile.
        weight_box=hero.locator('.featured-bio-item').nth(2)
        fit=weight_box.evaluate('''box=>{
          const value=box.querySelector('.featured-bio-value'),old=value.textContent;
          value.textContent='299 lbs';
          const range=document.createRange();range.selectNodeContents(value);
          const text=range.getBoundingClientRect(),tile=box.getBoundingClientRect();
          value.textContent=old;
          return {textRight:text.right,tileRight:tile.right,textWidth:text.width,tileWidth:tile.width};
        }''')
        assert fit['textRight']<=fit['tileRight']-1,('Weight must fit without clipping on phone',fit)
    meta=hero.locator('.featured-identity-meta')
    number=meta.locator('.featured-jersey-number')
    position=meta.locator('.featured-team-meta strong')
    assert position.inner_text().strip()=='RB','Player position must appear beneath the name'
    if number.inner_text().strip():
        a=number.bounding_box();b=position.bounding_box()
        assert a and b and b['x']>a['x']+a['width'],('Display jersey number | position in that order',a,b)
        assert abs(a['y']-b['y'])<=5,('Jersey and position must share one row',a,b)
    # Chrome's touch-input protocol allows a drag-in-progress assertion.
    # WebKit runs the normal phone-card checks above, without a CDP session.
    if phone and browser.browser_type.name=='chromium':
        point=hero.locator('.featured-left').evaluate('''el=>{
          const r=el.getBoundingClientRect();
          return {x:r.left+Math.min(75,r.width*.55),y:r.top+Math.min(45,r.height*.25)};
        }''')
        cdp=ctx.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':point['x']+100,'y':point['y']}]})
        try:
            swipe=page.evaluate('''()=>{
          const preview=document.getElementById('playerSwipePreview');
          const card=preview?.querySelector('#previewFeaturedPlayerCard');
          if(!card){
            return {error:'Real phone swipe did not create a preview',
              hasPreview:!!preview,modalId:document.getElementById('modal')?.dataset.id};
          }
          const active=document.getElementById('featuredPlayerCard');
          const teamName=card.querySelector('.featured-team-name')?.textContent?.trim();
          const layout=getComputedStyle(card),liveLayout=getComputedStyle(active);
          const target=preview.dataset.targetId;
          const targetRow=[...document.querySelectorAll('#rows tr[data-id]')].find(r=>r.dataset.id===target);
          const expectedName=targetRow?.querySelector('.photo-cell b')?.textContent?.trim();
          const result={
            broadcast:card.classList.contains('broadcast-card'),
            cardDisplay:layout.display,
            sameAspectRatio:layout.aspectRatio===liveLayout.aspectRatio,
            sameBackground:layout.backgroundImage===liveLayout.backgroundImage,
            logoCount:card.querySelectorAll('.featured-team-strip .featured-mini-logo').length,
            dividerWidth:card.querySelector('.featured-team-strip .featured-divider')?.getBoundingClientRect().width,
            teamName,
            name:(card.querySelector('.featured-first')?.textContent+' '+card.querySelector('.featured-last')?.textContent).trim(),
            expectedName,
            position:card.querySelector('.featured-identity-meta .featured-team-meta')?.textContent?.trim(),
            number:card.querySelector('.featured-identity-meta .featured-jersey-number')?.textContent?.trim(),
            staleTeamHeaderPosition:!!card.querySelector('.featured-team-strip .featured-team-meta'),
            statCount:card.querySelectorAll('.featured-bio-item').length,
            bioValues:[...card.querySelectorAll('.featured-bio-value')].map(x=>x.textContent.trim()),
            secondaryAccent:card.style.getPropertyValue('--featured-secondary'),
            previewSection:preview.querySelector('.preview-profile-panel')?.dataset.profilePanel,
            previewRankLabels:[...preview.querySelectorAll('.preview-overview-stats .stat span')].map(x=>x.textContent.trim()),
            previewRankCount:preview.querySelectorAll('.preview-overview-stats .stat').length
          };
          return result;
        }''')
        finally:
            cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
        assert 'error' not in swipe,swipe
        assert swipe['broadcast'] and swipe['cardDisplay']=='grid',('Incoming swipe card must use the broadcast design',swipe)
        assert swipe['sameAspectRatio'] and swipe['sameBackground'],('Incoming card must match current card styling',swipe)
        assert swipe['logoCount']==1 and swipe['dividerWidth']>0,('Incoming card must retain the small logo and divider',swipe)
        assert len(swipe['teamName'].split())>=2,('Incoming card must display a full city and team name',swipe)
        assert swipe['name']==swipe['expectedName'],('Swipe preview must show the next player, not the previous name',swipe)
        assert swipe['position']=='RB' and not swipe['staleTeamHeaderPosition'],('Position must stay below the name during swiping',swipe)
        assert swipe['statCount']==4 and swipe['secondaryAccent'],('Incoming card must preserve four stats and team accents',swipe)
        assert swipe['previewSection']=='overview' and swipe['previewRankCount']>=5,('Incoming card must show the next player\'s data below the bio',swipe)
        assert 'ROS RB' in swipe['previewRankLabels'] and 'ESPN RB' in swipe['previewRankLabels'],('Swipe preview must include the next player\'s ranking details',swipe)
        if swipe['expectedName']=='Jahmyr Gibbs':
            assert swipe['number']=='#0',('Known jersey number should be visible before releasing swipe',swipe)
            assert swipe['bioValues']==['24','5\'9"','202 lbs','4'],('Known age, height, weight and experience should be visible during swipe',swipe)
        page.wait_for_timeout(250)
    page.locator('[data-profile-tab="performance"]').click()
    performance=page.locator('#unifiedPerformancePanel')
    performance.wait_for(state='visible',timeout=10000)
    assert '3-game average' not in performance.inner_text().lower()
    assert '5-game average' not in performance.inner_text().lower()
    page.locator('[data-profile-tab="gamelog"]').click()
    table=page.locator('#unifiedGameLogPanel .espn-game-log-table')
    table.wait_for(state='visible',timeout=25000)
    tabs=page.locator('#unifiedGameLogPanel [data-gl-mode]')
    assert tabs.count()==3,'Missing Rushing/Receiving/Snap Rates controls'
    assert [x.inner_text() for x in tabs.all()]==['Rushing','Receiving','Snap Rates']
    assert page.locator('[data-profile-tab="snaps"]').count()==0,'Snap Rates must be inside Game Log'
    assert page.locator('#unifiedGameLogPanel [data-gl-mode="rush"]').get_attribute('aria-pressed')=='true'
    rush_columns=table.locator('thead th').all_inner_texts()
    for column in ['PTS','ATT','YDS','TD']:
        assert column in rush_columns,('Missing rushing field '+column,rush_columns)
    assert 'SNAP %' not in rush_columns,'Snap rate must have its own Game Log button'
    assert 'REC' not in rush_columns,'Rushing tab should not show receiving fields'
    page.locator('#unifiedGameLogPanel [data-gl-mode="rec"]').click()
    table=page.locator('#unifiedGameLogPanel .espn-game-log-table')
    receive_columns=table.locator('thead th').all_inner_texts()
    for column in ['PTS','REC','TGT','YDS','TD']:
        assert column in receive_columns,('Missing receiving field '+column,receive_columns)
    assert 'ATT' not in receive_columns,'Receiving tab should not show rushing attempts'
    assert page.locator('#unifiedGameLogPanel [data-gl-mode="rec"]').get_attribute('aria-pressed')=='true'
    font_sizes=page.locator('#unifiedGameLogPanel .espn-game-log-table').evaluate('''el=>{
        const pts=el.querySelector('tbody td.gl-pts');
        const stat=el.querySelector('tbody td.gl-stat');
        return [parseFloat(getComputedStyle(pts).fontSize),parseFloat(getComputedStyle(stat).fontSize)];
    }''')
    assert abs(font_sizes[0]-font_sizes[1])<.1,('All numbers should have the same size',font_sizes)
    assert min(font_sizes)>=14,('Game Log numbers are too small',font_sizes)
    if phone:
        dims=page.locator('#unifiedGameLogPanel .espn-game-log-table-wrap').evaluate('(el)=>({total:el.scrollWidth,visible:el.clientWidth})')
        assert dims['total']<=dims['visible']+2,('Game log should fit without horizontal swiping',dims)
    page.locator('#unifiedGameLogPanel [data-gl-mode="snaps"]').click()
    snap=page.locator('#unifiedGameLogPanel [data-embedded-snap-rates]')
    snap.locator('.espn-game-log-table.espn-snap-game-log').wait_for(state='visible',timeout=30000)
    assert snap.locator('.espn-game-log-summary').is_visible(),'Snap Rates should use the same season-summary layout as Rushing'
    assert 'SNAP %' in snap.locator('thead th').all_inner_texts(),'Snap rate column missing from Game Log Snap Rates button'
    assert snap.locator('tbody tr').count()>0,'Snap Rates button has no weekly records'
    if phone:
        snap_width=snap.locator('.espn-game-log-table-wrap').evaluate('(el)=>({total:el.scrollWidth,visible:el.clientWidth})')
        assert snap_width['total']<=snap_width['visible']+2,('Snap Rates should not swipe horizontally',snap_width)
    # Short and long surnames stay on one line; jersey is now below the surname.
    for full_name,last_piece in [('Ladd McConkey','McConkey'),('Jaxon Smith-Njigba','Smith-Njigba'),('Amon-Ra St. Brown','St. Brown')]:
        page.evaluate('(name)=>window.openUnifiedPlayerProfileByName(name)',full_name)
        page.wait_for_function('last=>document.querySelector("#modal.open #featuredPlayerCard .featured-last")?.textContent?.includes(last)',arg=last_piece,timeout=18000)
        longname=page.locator('#featuredPlayerCard')
        longname.locator('.featured-jersey-number').evaluate("(el)=>{el.textContent='#11'}")
        page.evaluate("window.dispatchEvent(new Event('resize'))")
        page.wait_for_timeout(100)
        fit=longname.locator('.featured-last').evaluate('''el=>{
            const r=document.createRange();r.selectNodeContents(el);
            const rects=[...r.getClientRects()].filter(x=>x.width>0);
            const row=el.closest('.featured-name').getBoundingClientRect();
            const number=el.closest('.broadcast-card').querySelector('.featured-jersey-number').getBoundingClientRect();
            const last=el.getBoundingClientRect();
            return {lines:rects.length,textRight:Math.max(...rects.map(x=>x.right)),
                    numberTop:number.top,lastBottom:last.bottom,rowRight:row.right};
        }''')
        assert fit['lines']==1,('Surname wrapped onto a third row',full_name,fit)
        assert fit['textRight']<=fit['rowRight']+4,('Surname clipped past the card name column',full_name,fit)
        assert fit['numberTop']>=fit['lastBottom']-3,('Jersey must sit below the surname',full_name,fit)
    page.locator('#close').evaluate('(e)=>e.click()')
    open_search(page,phone)
    page.locator('[data-search-mode="historical"]').click()
    page.locator('#shuaSearchQuery').fill('Tom Brady')
    old=page.locator('[data-search-player]').first
    old.wait_for(state='visible',timeout=35000)
    assert 'Tom Brady' in old.inner_text()
    old.click()
    page.locator('#modal.open #featuredPlayerCard').wait_for(state='visible',timeout=25000)
    page.wait_for_function("document.querySelector('#modal.open #featuredPlayerCard .featured-last')?.textContent?.includes('Brady')",timeout=18000)
    page.locator('#close').evaluate('(e)=>e.click()')
    analytics_trigger=page.locator('#shuaCleanNav [data-shua-group="analytics"] .shua-clean-trigger')
    analytics_trigger.click()
    analytics_menu=page.locator('#shua-menu-analytics')
    analytics_options=analytics_menu.locator('[data-shua-studio]')
    assert analytics_options.count()==8,'The bottom Analytics button must expose all eight dashboards, like Rankings'
    assert analytics_options.all_inner_texts()==[
        'Usage','Fantasy Intelligence','Consistency','Team Shares',
        'Injury Impact','Schedule','Start / Sit','Weekly Report'
    ],'Every Analytics view must have its own bottom-menu option'
    assert analytics_menu.locator('[data-shua-target="ESPN"]').count()==1
    # The legacy Compare tab can be absent when Start/Sit owns comparison.
    if page.locator('.positions [data-pos="COMPARE"]').count():
        assert analytics_menu.locator('[data-shua-target="COMPARE"]').count()==1
    analytics_menu.locator('[data-shua-studio="usage"]').click()
    page.locator('#shuaAnalyticsSection').wait_for(state='visible',timeout=30000)
    page.wait_for_function('document.querySelector("#shuaAnalyticsSection")?.dataset.activeView==="usage"',timeout=30000)
    assert page.locator('#shuaGlobalSearchBar').count()==0,'Analytics should not show a sitewide search bar'
    assert page.locator('#shuaAnalyticsSection #stGlobalSearch').count()==0,'Analytics should not have a second player search bar'
    page.wait_for_function('window.ShuaStudio?.UI?.navigate !== undefined',timeout=25000)
    assert page.locator('#shuaAnalyticsSection .st-navigation').count()==0,'Do not repeat the bottom Analytics menu inside a dashboard'
    assert page.locator('#shuaAnalyticsSection .st-dashboard-picker').count()==0,'Do not add a duplicate chart dropdown'
    assert page.locator('#shuaAnalyticsSection #stWorkspace').is_visible(),'Keep the chart workspace immediately below search'
    assert page.locator('#shuaAnalyticsSection #stContent').is_visible(),'The active Analytics chart must remain visible'
    for view in ('schedule','consistency','weekly'):
        analytics_trigger.click()
        option=analytics_menu.locator('[data-shua-studio="'+view+'"]')
        assert option.is_visible(),('Analytics options must remain available from the bottom navigation',view,phone)
        option.click()
        page.wait_for_function('view=>document.querySelector("#shuaAnalyticsSection")?.dataset.activeView===view',arg=view,timeout=25000)
        assert analytics_trigger.locator('.shua-clean-current').text_content().strip()=={
            'schedule':'Schedule','consistency':'Consistency','weekly':'Weekly Report'
        }[view]
        assert page.locator('#shuaAnalyticsSection .st-navigation').count()==0,('In-page chart navigation must stay removed',view,phone)
        assert page.locator('#shuaAnalyticsSection #stWorkspace').is_visible(),('Every dashboard must fill the workspace',view,phone)
    page.evaluate("window.ShuaStudio.UI.navigate('consistency')")
    assert page.locator('#shuaAnalyticsSection .shua-analytics-fetched').count()==0,'Remove the redundant Analytics snapshot line'
    assert page.locator('#shuaAnalyticsSection .shua-active-filters').count()==0,'Remove the redundant Showing summary'
    assert page.locator('#shuaAnalyticsSection #stGlobalSearch').count()==0,'The player search is in Tools, not the Analytics header'
    assert page.locator('#stContent .st-hit-rate-full-panel').is_visible(),'Keep the chart and its live filters'
    for view in ('usage','intelligence','teams','injury','schedule','startsit','weekly','consistency'):
        page.evaluate('(v)=>window.ShuaStudio.UI.navigate(v)',view)
        page.wait_for_function('v=>document.querySelector("#shuaAnalyticsSection")?.dataset.activeView===v',arg=view,timeout=25000)
        assert page.locator('#shuaAnalyticsSection .shua-analytics-fetched').count()==0,('Snapshot label reappeared',view,phone)
        assert page.locator('#shuaAnalyticsSection .shua-active-filters').count()==0,('Showing filter summary reappeared',view,phone)
        assert page.locator('#shuaAnalyticsSection #stGlobalSearch').count()==0,('Search bar reappeared',view,phone)
        assert page.locator('#shuaAnalyticsSection #stContent').is_visible(),('Dashboard content must remain available',view,phone)
    open_search(page,phone)
    page.locator('#shuaSearchQuery').fill('Bijan Robinson')
    page.locator('[data-search-player]').first.click()
    page.wait_for_function("document.querySelector('#modal.open #featuredPlayerCard .featured-last')?.textContent?.includes('Robinson')",timeout=18000)
    page.locator('#close').evaluate('(e)=>e.click()')
    open_search(page,phone)
    page.locator('#shuaExpandedSearch .shua-search-close').click()
    print('PASS',browser.browser_type.name,'phone' if phone else 'desktop',
          'two-line names, uniform game-log amounts, inline snap rates and Tools player search',flush=True)
    ctx.close()

def check_rosters(browser):
    ctx=browser.new_context(viewport={'width':1365,'height':900})
    page=ctx.new_page()
    page.goto(base,wait_until='domcontentloaded')
    page.locator('#shuaMyTeams').wait_for(state='attached',timeout=25000)
    info=page.evaluate('window.ShuaMyTeamsUI.teamIndex[0]')
    mock={'id':int(info['id']),'teams':[{'id':int(info['teamId']),
          'roster':{'entries':[{'lineupSlotId':0,'playerPoolEntry':{'player':{
          'id':3915511,'fullName':'Joe Burrow','defaultPositionId':1,
          'proTeamId':4,'injuryStatus':'ACTIVE'}}}]}}],
          'status':{'currentScoringPeriod':9,'currentMatchupPeriod':9}}
    def fulfill(route):
        if '/leagues/'+str(info['id']) in route.request.url:
            route.fulfill(status=200,content_type='application/json',body=json.dumps(mock))
        else:route.fulfill(status=403,content_type='application/json',body='{}')
    page.route('**/apis/v3/games/ffl/seasons/2026/segments/0/leagues/**',fulfill)
    navigate(page,'teams','MYTEAMS')
    page.wait_for_function('window.ShuaMyTeamsLive && window.ShuaMyTeamsLive.lastSuccess > 0',timeout=35000)
    names=page.evaluate('window.ShuaMyTeamsUI.rosterSnapshots[0].roster.map(p=>p.name)')
    assert names==['Joe Burrow'],names
    assert page.locator('#myTeamsLiveStatus [data-myteams-sync-compact]').inner_text().startswith('Rosters checked ')
    print('PASS chromium: public ESPN roster response updates My Teams',flush=True)
    ctx.close()

try:
    with sync_playwright() as p:
        for engine in (p.chromium,p.webkit):
            browser=engine.launch(headless=True)
            try:
                for phone in (False,True):check_browser(browser,phone)
                if engine==p.chromium:check_rosters(browser)
            finally:browser.close()
finally:srv.shutdown()
