from pathlib import Path
import json, urllib.request, urllib.error
root=Path(__file__).resolve().parent
# Only Analytics Studio files are patched. Existing viewport and profile source is untouched.
p=root/'analytics/studio.css';s=p.read_text();s=s.replace('.st-studio .st-controls>.st-player-control{grid-column:1/-1}', '.st-studio .st-controls>.st-player-control{flex:1 1 100%;min-width:0}')
s+='\n/* Neutralize the old global <header> rule only inside the new dashboards. */\n#shuaAnalyticsSection header,.st-profile-insights header{border:0!important;max-width:none;margin:0;background:transparent}\n#shuaAnalyticsSection .st-heading{padding:0 0 17px!important}\n#shuaAnalyticsSection .st-panel-head,.st-profile-insights .st-panel-head{padding:0!important;margin-bottom:17px}\n';p.write_text(s)
# Match the working source's period/filter contract; projections are still excluded.
for file in ['analytics/data.js','scripts/prepare-analytics-studio.py']:
 p=root/file;s=p.read_text().replace('limit:2000','limit:700').replace("'limit':2000", "'limit':700").replace("['00'+year,'10'+year]", "['00'+year]").replace("['00'+str(year),'10'+str(year)]", "['00'+str(year)]").replace('leaguedefaults/3?view=kona_player_info','leaguedefaults/3?scoringPeriodId=0&view=kona_player_info');p.write_text(s)
# The old #close is intentionally hidden on phone. Exercise the visible close control.
p=root/'tests/studio-real-site.py';s=p.read_text();s=s.replace("page.locator('#close').click()", "\n    closers=page.locator('#modal button:visible').evaluate_all(\"els=>els.map(e=>({id:e.id,text:e.textContent,aria:e.getAttribute('aria-label'),cls:e.className}))\");print('VISIBLE PROFILE CONTROLS',json.dumps(closers),flush=True)\n    close=page.locator('#modal button:visible').filter(has_text='×')\n    if close.count():close.first.click()\n    else:page.keyboard.press('Escape')\n    assert not page.locator('#modal.open').count(),'Profile did not close'")
p.write_text(s)
# Inspect exact source responses; current-season failures are never disguised.
base='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026'
filters=[{}, {'players':{'limit':700,'filterSlotIds':{'value':[0,2,4,6]},'filterStatsForSourceIds':{'value':[0]},'filterStatsForSplitTypeIds':{'value':[0]},'filterStatsForTopScoringPeriodIds':{'value':20,'additionalValue':['002026']}}}]
for path,filt in [(base+'/segments/0/leaguedefaults/3?scoringPeriodId=0&view=kona_player_info',f) for f in filters]+[(base+'/players?scoringPeriodId=0&view=players_wl',filters[1])]:
 try:
  req=urllib.request.Request(path,headers={'Accept':'application/json','X-Fantasy-Filter':json.dumps(filt),'X-Fantasy-Source':'kona','User-Agent':'SHUA-Analytics/1.0'})
  with urllib.request.urlopen(req,timeout=35) as r:d=json.load(r)
  entries=d if isinstance(d,list) else d.get('players',[])
  print('2026 PROBE',path,'filtered',bool(filt),'entries',len(entries),flush=True)
  if entries:
   p=entries[0].get('player',entries[0]);print('SAMPLE',p.get('fullName'),[{k:x.get(k) for k in ['seasonId','seasonTypeId','statSourceId','scoringPeriodId','appliedTotal']} for x in p.get('stats',[])[:5]],flush=True)
 except urllib.error.HTTPError as e:print('2026 PROBE',e.code,e.read()[:1000].decode(errors='replace'),flush=True)
 except Exception as e:print('2026 PROBE ERROR',str(e),flush=True)
