#!/usr/bin/env python3
"""Publish a small, source-attributed NFL weather snapshot for the static site.

Forecast observations are read from MySportsWeather's public NFL page, not
invented from an alternate weather provider. ESPN supplies the fixture list so
matchups without a MySportsWeather prediction can be clearly marked pending.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from lxml import html as lxml_html


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "weather" / "data" / "nfl.json"
SOURCE = "https://mysportsweather.com/nfl"
SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
EASTERN = ZoneInfo("America/New_York")
USER_AGENT = "ShuaperTubbyGoyball/1.0 (+https://shuapertubbygoyball.com; scheduled public weather index)"
ALIASES = {
    "JAC": "JAX", "JAX": "JAX", "WAS": "WAS", "WSH": "WAS",
    "GNB": "GB", "GB": "GB", "KAN": "KC", "KC": "KC",
    "LVR": "LV", "LV": "LV", "NWE": "NE", "NE": "NE",
    "NOR": "NO", "NO": "NO", "SFO": "SF", "SF": "SF",
    "TAM": "TB", "TB": "TB", "LA": "LAR", "LAR": "LAR",
}


def get_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/json"})
    with urlopen(request, timeout=25) as response:
        return response.read().decode("utf-8")


def clean(value: str) -> str:
    return " ".join((value or "").split())


def first(node, xpath: str) -> str:
    values = node.xpath(xpath)
    if not values:
        return ""
    value = values[0]
    return clean(value if isinstance(value, str) else " ".join(value.itertext()))


def number(value: str) -> int | None:
    match = re.search(r"(?<!\d)-?\d+(?:\.\d+)?", value or "")
    return round(float(match.group())) if match else None


def normalize(code: str) -> str:
    code = (code or "").upper()
    return ALIASES.get(code, code)


def contains_class(name: str) -> str:
    return f'contains(concat(" ", normalize-space(@class), " "), " {name} ")'


def parse_hourly(table) -> list[dict]:
    headers = table.xpath("./thead/tr/th[position()>1]")
    rows = table.xpath("./tbody/tr")
    result = []
    for head in headers:
        label = first(head, f'.//*[ {contains_class("hourly__time")} ]') or clean(" ".join(head.itertext()))
        if not label:
            continue
        result.append({"time": label, "inGame": "is-game-hour" in head.get("class", "").split()})
    for row in rows:
        metric = first(row, f'./td[{contains_class("hourly__label")}]').lower()
        field = {"precip": "precipPct", "temp": "tempF", "wind": "windMph", "gusts": "gustMph", "wind dir": "windDirection"}.get(metric)
        if not field:
            continue
        for slot, cell in zip(result, row.xpath("./td[position()>1]")):
            value = clean(" ".join(cell.itertext()))
            slot[field] = value if field == "windDirection" else number(value)
    return result


def parse_forecasts(page: str) -> dict[tuple[str, str, int, int], dict]:
    """Return source forecasts keyed by away/home and local calendar day."""
    document = lxml_html.fromstring(page)
    dates = {}
    for card in document.xpath(f'//a[{contains_class("cheat-card")}]'):
        link = card.get("href", "")
        date_text = first(card, f'.//*[ {contains_class("cheat-card__date")} ]')
        match = re.fullmatch(r"(\d{1,2})/(\d{1,2})", date_text)
        if link.startswith("#match-") and match:
            dates[link[1:]] = (int(match.group(1)), int(match.group(2)))

    forecasts = {}
    for article in document.xpath(f'//article[{contains_class("mlb-game-block")}]'):
        event_id = article.get("id", "")
        match = re.fullmatch(r"match-([a-z0-9]+)-([a-z0-9]+)", event_id, re.I)
        if not match or event_id not in dates:
            continue
        away, home = normalize(match.group(1)), normalize(match.group(2))
        summary = {}
        for cell in article.xpath(f'.//div[{contains_class("game-summary__cell")}]'):
            label = first(cell, f'.//*[ {contains_class("game-summary__primary-label")} ]').lower()
            value = first(cell, f'.//*[ {contains_class("game-summary__primary-value")} ]')
            if label:
                summary[label] = number(value)

        tables = article.xpath(f'.//table[{contains_class("hourly__table")}]')
        hourly = parse_hourly(tables[0]) if tables else []
        nbm_hourly = parse_hourly(tables[1]) if len(tables) > 1 else []
        game_hours = [hour for hour in hourly if hour.get("inGame")]
        first_hour = (game_hours or hourly or [{}])[0]
        forecast = {
            "tempF": summary.get("at kickoff", first_hour.get("tempF")),
            "precipPct": next((value for key, value in summary.items() if key in ("rain", "snow", "precip")), first_hour.get("precipPct")),
            "precipType": next((key.title() for key in summary if key in ("rain", "snow")), "Precip"),
            "windMph": summary.get("wind", first_hour.get("windMph")),
            "gustMph": first_hour.get("gustMph"),
            "windDirection": first_hour.get("windDirection"),
            "hourly": hourly,
            "nbmHourly": nbm_hourly,
            "sourceUrl": None,
        }
        if not any(forecast[key] is not None for key in ("tempF", "precipPct", "windMph")):
            continue
        forecasts[(*((away, home)), *dates[event_id])] = forecast
    return forecasts


def parse_schedule(scoreboards: list[dict], forecasts: dict, now: datetime) -> list[dict]:
    games_by_id = {}
    for schedule in scoreboards:
        week = schedule.get("week", {}).get("number")
        for event in schedule.get("events", []):
            try:
                kickoff = datetime.fromisoformat(event["date"].replace("Z", "+00:00"))
                if kickoff < now - timedelta(hours=5) or kickoff > now + timedelta(days=10):
                    continue
                if event.get("status", {}).get("type", {}).get("completed"):
                    continue
                contest = event["competitions"][0]
                teams = {team["homeAway"]: team["team"] for team in contest["competitors"]}
                away, home = teams["away"], teams["home"]
            except (KeyError, IndexError, ValueError, TypeError):
                continue
            local = kickoff.astimezone(EASTERN)
            key = (normalize(away.get("abbreviation", "")), normalize(home.get("abbreviation", "")), local.month, local.day)
            venue = contest.get("venue") or {}
            address = venue.get("address") or {}
            forecast = forecasts.get(key)
            if forecast:
                forecast = {**forecast, "sourceUrl": f"{SOURCE}/{local.date().isoformat()}/{key[0].lower()}-{key[1].lower()}"}
            games_by_id[str(event["id"])] = {
                "id": str(event["id"]),
                "week": week,
                "kickoffUtc": kickoff.isoformat().replace("+00:00", "Z"),
                "away": {"abbr": key[0], "name": away.get("displayName", key[0]), "logo": away.get("logo", "")},
                "home": {"abbr": key[1], "name": home.get("displayName", key[1]), "logo": home.get("logo", "")},
                "venue": venue.get("fullName", ""),
                "city": ", ".join(filter(None, (address.get("city"), address.get("state") or address.get("country")))),
                "indoor": bool(venue.get("indoor")),
                "forecast": forecast,
            }
    return sorted(games_by_id.values(), key=lambda game: (game["kickoffUtc"], game["id"]))


def build_snapshot(now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    page = get_text(SOURCE)
    if "MySportsWeather" not in page or "NFL Weather" not in page:
        raise ValueError("The MySportsWeather NFL page did not look like a valid forecast page")
    forecasts = parse_forecasts(page)
    primary = json.loads(get_text(SCOREBOARD + "?limit=100"))
    year = int(primary["season"]["year"])
    season_type = int(primary["season"]["type"])
    current_week = int(primary["week"]["number"])
    scoreboards = [primary]
    for week in (current_week + 1, current_week + 2):
        query = urlencode({"dates": year, "seasontype": season_type, "week": week, "limit": 100})
        scoreboards.append(json.loads(get_text(SCOREBOARD + "?" + query)))
    games = parse_schedule(scoreboards, forecasts, now)
    if not games:
        raise ValueError("ESPN returned no upcoming NFL games; retaining the last good snapshot")
    return {
        "season": year,
        "generatedAt": now.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "weatherSource": SOURCE,
        "scheduleSource": "ESPN",
        "games": games,
    }


def main() -> None:
    snapshot = build_snapshot()
    previous = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else None
    # Skip no-op commits: the generatedAt field is informational, not a data change.
    if previous and {k: v for k, v in previous.items() if k != "generatedAt"} == {k: v for k, v in snapshot.items() if k != "generatedAt"}:
        print(f"Weather unchanged: {len(snapshot['games'])} upcoming games")
        return
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temp = OUTPUT.with_suffix(".tmp")
    temp.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temp.replace(OUTPUT)
    available = sum(game["forecast"] is not None for game in snapshot["games"])
    print(f"Saved {len(snapshot['games'])} upcoming NFL games; {available} MySportsWeather forecasts")


if __name__ == "__main__":
    main()
