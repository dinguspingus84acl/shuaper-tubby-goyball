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

def open_search(page,phone):
    assert page.locator('#shuaGlobalSearchBar .shua-global-search-launch').is_visible(), 'Search bar must be visible on every site tab'
    page.locator('#shuaGlobalSearchBar .shua-global-search-launch').click()
    page.locator('#shuaExpandedSearch .shua-search-dialog').wait_for(state='visible',timeout=18000)

def check_browser(browser,phone):
    ctx=browser.new_context(viewport={'width':390 if phone else 1365,'height':844 if phone else 900},
                            is_mobile=phone,has_touch=phone)
    page=ctx.new_page()
    page.goto(base,wait_until='domcontentloaded')
    page.locator('#shuaExpandedSearch').wait_for(state='attached',timeout=25000)
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
    a=hero.locator('.featured-last').bounding_box()
    b=hero.locator('.featured-jersey-number').bounding_box()
    if a and b:
        assert b['x']>=a['x']+a['width']-3,('Jersey must be right of surname',a,b)
        assert abs((b['y']+b['height'])-(a['y']+a['height']))<=13,('Jersey should align with surname',a,b)
        assert not (a['x']+a['width']>b['x']+3 and a['y']+a['height']>b['y']),'Jersey overlaps name'
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
    # Short and long surnames must all occupy one line beneath the given name.
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
            const row=el.closest('.featured-last-row').getBoundingClientRect();
            const number=el.closest('.featured-last-row').querySelector('.featured-jersey-number').getBoundingClientRect();
            return {lines:rects.length,textRight:Math.max(...rects.map(x=>x.right)),numberLeft:number.left,
                    numberRight:number.right,rowRight:row.right};
        }''')
        assert fit['lines']==1,('Surname wrapped onto a third row',full_name,fit)
        assert fit['textRight']<=fit['numberLeft']+2,('Surname and jersey overlap',full_name,fit)
        assert fit['numberRight']<=fit['rowRight']+4,('Jersey clipped off name row',full_name,fit)
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
    if phone:
        page.locator('#phoneMenuButton').click()
        page.locator('#phoneMenuItems [data-target="ANALYTICS"]').click()
    else:page.locator('.positions [data-pos="ANALYTICS"]').click()
    assert page.locator('#shuaGlobalSearchBar .shua-global-search-launch').is_visible(),'Analytics tab needs global search'
    page.wait_for_function('window.ShuaStudio?.UI?.navigate !== undefined',timeout=25000)
    page.evaluate("window.ShuaStudio.UI.navigate('consistency')")
    analytic=page.locator('#stGlobalSearch')
    analytic.wait_for(state='visible',timeout=30000)
    assert page.locator('.st-global-search-inputrow .st-global-search-icon').is_visible()
    analytic.fill('Bijan')
    suggestions=page.locator('#stGlobalPlayerMatches [data-st-open]')
    suggestions.first.wait_for(state='visible',timeout=12000)
    assert 'Bijan' in suggestions.first.inner_text()
    assert suggestions.first.locator('.st-global-player-face').count()==1
    assert page.locator('#stGlobalLeadingAvatar').is_visible(),'Analytics input needs the matching face'
    assert page.locator('#stGlobalLeadingAvatar .st-global-leading-image').count()==1
    assert page.locator('.st-global-search-icon').is_hidden()
    assert page.locator('[data-st-clear-search]').is_visible()
    page.locator('[data-st-clear-search]').click()
    assert analytic.input_value()==''
    assert page.locator('#stGlobalLeadingAvatar').is_hidden()
    assert page.locator('.st-global-search-icon').is_visible()
    analytic.fill('Bijan')
    suggestions=page.locator('#stGlobalPlayerMatches [data-st-open]')
    suggestions.first.wait_for(state='visible',timeout=12000)
    suggestions.first.click()
    page.wait_for_function("document.querySelector('#modal.open #featuredPlayerCard .featured-last')?.textContent?.includes('Robinson')",timeout=18000)
    page.locator('#close').evaluate('(e)=>e.click()')
    open_search(page,phone)
    page.locator('#shuaExpandedSearch .shua-search-close').click()
    print('PASS',browser.browser_type.name,'phone' if phone else 'desktop',
          'two-line names, uniform game-log amounts, inline snap rates, headshot search and clean Analytics search',flush=True)
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
          'status':{'currentScoringPeriod':8,'currentMatchupPeriod':8}}
    def fulfill(route):
        if '/leagues/'+str(info['id']) in route.request.url:
            route.fulfill(status=200,content_type='application/json',body=json.dumps(mock))
        else:route.fulfill(status=403,content_type='application/json',body='{}')
    page.route('**/apis/v3/games/ffl/seasons/2026/segments/0/leagues/**',fulfill)
    page.locator('.positions [data-pos="MYTEAMS"]').click()
    page.wait_for_function('window.ShuaMyTeamsLive && window.ShuaMyTeamsLive.lastSuccess > 0',timeout=35000)
    names=page.evaluate('window.ShuaMyTeamsUI.rosterSnapshots[0].roster.map(p=>p.name)')
    assert names==['Joe Burrow'],names
    assert 'Live ESPN' in page.locator('#myTeamsLiveStatus').inner_text()
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
