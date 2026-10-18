"""Refresh verified ESPN full-PPR opponent ranks for every offensive position and D/ST.

ESPN grades rank 1 as the *toughest* opponent and 32 as the easiest.
The public league below was verified against its published scoring settings:
1 point per reception and 4 points per passing touchdown.
"""
from __future__ import annotations
import datetime as dt
import json
import math
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / "analytics" / "espn-matchups-2026.json"
YEAR = 2026
LEAGUE = 456278  # ESPN public full-PPR league, 4-point passing TDs (verified)
ROOT_API = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{YEAR}/segments/0/leagues/{LEAGUE}"
TEAMS = {
    1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL",
    7: "DEN", 8: "DET", 9: "GB", 10: "TEN", 11: "IND", 12: "KC",
    13: "LV", 14: "LAR", 15: "MIA", 16: "MIN", 17: "NE", 18: "NO",
    19: "NYG", 20: "NYJ", 21: "PHI", 22: "ARI", 23: "PIT", 24: "LAC",
    25: "SF", 26: "SEA", 27: "TB", 28: "WAS", 29: "CAR", 30: "JAX",
    33: "BAL", 34: "HOU"
}
POS = {"1": "QB", "2": "RB", "3": "WR", "4": "TE", "16": "DST"}


def fetch(view, period=None):
    url = ROOT_API + "?view=" + view
    if period is not None:
        url += "&scoringPeriodId=" + str(period)
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; SHUA-Analytics/1.0)",
        "Accept": "application/json"
    })
    with urllib.request.urlopen(req, timeout=28) as res:
        data = json.load(res)
    if not isinstance(data, dict):
        raise ValueError("ESPN returned a non-object response")
    return data, url


def build():
    settings, _ = fetch("mSettings")
    scoring = settings.get("settings", {}).get("scoringSettings", {})
    items = scoring.get("scoringItems", [])
    points = {int(i["statId"]): i.get("points") for i in items}
    if abs(float(points.get(53, -1)) - 1.0) > 1e-9:
        raise ValueError("ESPN source does not award 1 point per reception")
    if abs(float(points.get(4, -1)) - 4.0) > 1e-9:
        raise ValueError("ESPN source does not award 4 points per passing TD")
    if abs(float(points.get(3, -1)) - 0.04) > 1e-9:
        raise ValueError("ESPN passing-yard score is not 0.04 points per yard")
    status = settings.get("status", {})
    period = int(status.get("currentMatchupPeriod") or status.get("currentScoringPeriod")
                 or settings.get("scoringPeriodId") or 1)
    if period < 1 or period > 18:
        raise ValueError("Invalid ESPN scoring period: " + str(period))
    raw, api_url = fetch("mPositionalRatings", period)
    ratings = raw.get("positionAgainstOpponent", {}).get("positionalRatings", {})
    if not ratings:
        raise ValueError("ESPN omitted positionalRatings; refusing to manufacture ranks")
    result = {}
    for pid, position in POS.items():
        entries = ratings.get(pid, {}).get("ratingsByOpponent")
        if not isinstance(entries, dict) or len(entries) != 32:
            raise ValueError(f"ESPN {position} rankings incomplete ({len(entries or {})}/32)")
        mapped = {}
        for code, value in entries.items():
            team = TEAMS.get(int(code))
            if not team:
                raise ValueError(f"Unknown ESPN professional team ID {code}")
            rank = int(value["rank"])
            avg = float(value["average"])
            if not 1 <= rank <= 32 or not math.isfinite(avg):
                raise ValueError(f"Invalid ESPN rating for {team} vs {position}")
            mapped[team] = {"rank": rank, "allowed": round(avg, 5)}
        if len(mapped) != 32:
            raise ValueError(f"ESPN {position} rankings contain duplicate teams")
        result[position] = mapped
    return {
        "schema": 1,
        "season": YEAR,
        "source": "ESPN Fantasy Football mPositionalRatings",
        "scoring": "full PPR; 4-point passing TD",
        "leagueId": LEAGUE,
        "sourceUrl": api_url,
        "referenceUrl": f"https://fantasy.espn.com/football/pointsagainst?leagueId={LEAGUE}",
        "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "scoringPeriodId": period,
        "rankMeaning": "ESPN rank 1 = toughest; ESPN rank 32 = easiest",
        "positions": result
    }


def main():
    try:
        result = build()
    except Exception as error:
        if DEST.is_file():
            prior = json.loads(DEST.read_text())
            if len(prior.get("positions", {}).get("QB", {})) == 32:
                print(f"::warning::ESPN unavailable; retained previous verified snapshot: {error}")
                return
        raise
    DEST.parent.mkdir(exist_ok=True, parents=True)
    new = json.dumps(result, indent=2, sort_keys=True) + "\n"
    tmp = DEST.with_suffix(".tmp")
    tmp.write_text(new, encoding="utf-8")
    tmp.replace(DEST)
    print(f"Verified ESPN {result['scoring']} matchup ratings for "
          f"{len(result['positions'])} positions and 32 teams, period {result['scoringPeriodId']}")


if __name__ == "__main__":
    main()
