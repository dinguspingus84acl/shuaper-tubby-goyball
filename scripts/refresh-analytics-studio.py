"""Refresh source snapshots while retaining the last good season if a feed fails."""
from __future__ import annotations
import json, pathlib, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
FILES=[ROOT/'analytics/manifest.json',ROOT/'analytics/rank-history.json',ROOT/'index.html',*sorted((ROOT/'analytics/data').glob('season-*.json'))]
def validate(dataset):
 if not isinstance(dataset,dict) or not isinstance(dataset.get('players'),list):raise ValueError('Invalid dataset')
 players=dataset['players'];games=[g for p in players for g in p.get('games',[])]
 if len(players)<100 or len(games)<100:raise ValueError('Incomplete season response')
 if any(not isinstance(g.get('week'),(int,float)) or not 1<=g['week']<=18 for g in games):raise ValueError('Invalid scoring period')
 return len(games)
def main():
 saved={p:p.read_bytes() for p in FILES if p.exists()}
 previous=json.loads(saved.get(ROOT/'analytics/manifest.json',b'{}'))
 try:
  subprocess.run([sys.executable,str(ROOT/'scripts/prepare-analytics-studio.py')],cwd=ROOT,check=True)
  mpath=ROOT/'analytics/manifest.json';manifest=json.loads(mpath.read_text())
  for year,path in previous.get('datasets',{}).items():
   dest=ROOT/path;old=saved.get(dest)
   if not old:continue
   try:
    if year not in manifest.get('datasets',{}):raise ValueError('Source did not return this season')
    new=json.loads(dest.read_text());olddata=json.loads(old)
    if validate(new)<.9*validate(olddata):raise ValueError('Unexpected loss of recorded player games')
   except (ValueError,KeyError,json.JSONDecodeError) as e:
    dest.write_bytes(old);manifest.setdefault('datasets',{})[year]=path
    manifest.setdefault('notes',[]).append(f'{year}: retained last verified snapshot: {e}')
    print(f'::warning::{year}: retained last verified snapshot: {e}')
  for path in manifest.get('datasets',{}).values():validate(json.loads((ROOT/path).read_text()))
  mpath.write_text(json.dumps(manifest,separators=(',',':')))
  print('Validated refreshed snapshots. Any retained season keeps its original source timestamp.')
 except Exception:
  for path,content in saved.items():path.write_bytes(content)
  raise
if __name__=='__main__':main()
