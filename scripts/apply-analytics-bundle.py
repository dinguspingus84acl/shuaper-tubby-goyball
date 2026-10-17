"""Validate and apply the local-source transfer on the preview branch only."""
import gzip, hashlib, json, shutil
from pathlib import Path
root=Path(__file__).resolve().parents[1]
staging=root/'.analytics-staging'
if staging.exists():
    pieces=sorted(staging.iterdir())
    assert len(pieces)==10
    payload=b''.join(p.read_bytes()[:5000] if p.name.endswith('prefix') else p.read_bytes() for p in pieces)
    assert hashlib.sha256(payload).hexdigest()=='cdc20a456f9cfd3670e1fc4cb481cf76fdc99ceb6360a55ecec308b67c7a5edb','Source transfer checksum mismatch'
    files=json.loads(gzip.decompress(payload))
    allowed={'analytics-core.js','analytics-charts.js','analytics-ui.js','analytics-premium.css','analytics-dashboard.js','player-insights.js','scripts/build-analytics-data.py','tests/analytics.test.cjs'}
    assert set(files)==allowed
    for path,text in files.items():
        dest=root/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(text)
    p=root/'index.html';html=p.read_text()
    for name,old in [('analytics-dashboard','20261017-polished-charts5'),('player-insights','20261017-analytics1')]:
        assert f'{name}.js?v={old}' in html or f'{name}.js?v=20261017-premium1' in html
        html=html.replace(f'{name}.js?v={old}',f'{name}.js?v=20261017-premium1')
    p.write_text(html)
    shutil.rmtree(staging)
    print('Applied eight validated source files and two script cache versions.')
