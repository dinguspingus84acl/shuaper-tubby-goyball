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
    if phone:
        page.locator('#phoneMenuButton').click()
        page.locator('#phoneMenuSearchWrap #search').click()
    else:page.locator('.shua-search-desktop-launch').click()
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
    current.click()
    hero=page.locator('#modal.open #featuredPlayerCard')
    hero.wait_for(state='visible',timeout=18000)
    values=page.evaluate("({selected:document.querySelector('#modal')?.dataset?.unifiedName,plain:document.querySelector('#pn')?.textContent,first:document.querySelector('#featuredPlayerCard .featured-first')?.textContent,last:document.querySelector('#featuredPlayerCard .featured-last')?.textContent})")
    print('PROFILE TRACE',values,flush=True)
    page.wait_for_function("document.querySelector('#modal.open #featuredPlayerCard .featured-last')?.textContent?.includes('Robinson')",timeout=12000)
    a=hero.locator('.featured-last').bounding_box()
    b=hero.locator('.featured-jersey-number').bounding_box()
    if a and b:
        assert a['y']+a['height']<=b['y']+2 or b['y']+b['height']<=a['y']+2 or \
            a['x']+a['width']<=b['x']+2 or b['x']+b['width']<=a['x']+2,'Jersey overlaps name'
    page.locator('[data-profile-tab="performance"]').click()
    performance=page.locator('#unifiedPerformancePanel')
    performance.wait_for(state='visible',timeout=10000)
    assert '3-game average' not in performance.inner_text().lower()
    assert '5-game average' not in performance.inner_text().lower()
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
    print('PASS',browser.browser_type.name,'phone' if phone else 'desktop',
          'fullscreen search, direct cards, jersey layout, Performance, retired search',flush=True)
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
