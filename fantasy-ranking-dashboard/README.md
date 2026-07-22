# SHUA Live Fantasy Ranking Engine

## Dashboard formats
The dashboard includes:
- Standard
- Half PPR
- Full PPR

Each format has its own overall score, overall order, position filters, movement, and player score breakdown.

## Current state
`rankings-live.json` initially contains deterministic baseline model results derived from the supplied SHUA position rankings. Those results are visibly labeled `baseline`.

The updater immediately adds free live Sleeper status/team/trending data. A licensed projection/consensus JSON feed is required for a complete live model.

## Run locally
A web server is required because the dashboard loads JSON:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

Refresh rankings:

```bash
npm run update-rankings
```

## Projection feed contract
Set `PROJECTION_FEED_URL` to an endpoint returning an array, or `{ "players": [...] }`.

Supported fields:

```json
{
  "name": "Player Name",
  "team": "BUF",
  "position": "QB",
  "projected_standard": 300.2,
  "projected_half_ppr": 300.2,
  "projected_ppr": 300.2,
  "consensus_rank": 4,
  "injury_status": "Questionable"
}
```

## Automatic refresh
The included GitHub Actions workflow runs every three days and commits:
- `rankings-live.json`
- `ranking-history.json`

Add these repository secrets:
- `PROJECTION_FEED_URL`
- `PROJECTION_FEED_API_KEY`

The second secret is optional when the feed does not require authorization.
