#!/usr/bin/env python3
"""Publish a small, source-attributed NFL weather snapshot for the static site.

Both the fixture list and its forecasts come from MySportsWeather's public NFL
page. The optional previous snapshot supplies team/venue metadata and week
numbers, so a blocked third-party scoreboard cannot stop weather updates.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from lxml import html as lxml_html


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "weather" / "data" / "nfl.json"
SOURCE = "https://mysportsweather.com/nfl"
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
        hour = {"time": label, "inGame": "is-game-hour" in head.get("class", "").split()}
        # MySportsWeather's NWS header contains a real sky-condition SVG.
        # Keep that source condition instead of guessing from precipitation %.
        icon_classes = " ".join(head.xpath(".//*[@class]/@class"))
        icon = re.search(r"(?:^|\s)wx-icon--([a-z0-9-]+)(?:\s|$)", icon_classes)
        if icon:
            hour["sky"] = icon.group(1)
        result.append(hour)
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


def week_start(kickoff: datetime):
    """NFL weeks start Thursday; Monday games belong to the preceding week."""
    day = kickoff.astimezone(EASTERN).date()
    return day - timedelta(days=(day.weekday() - 3) % 7)


def kickoff_from_card(date_text: str, time_text: str, now: datetime) -> datetime | None:
    date_match = re.fullmatch(r"(\d{1,2})/(\d{1,2})", date_text)
    time_match = re.search(r"(\d{1,2}):?(\d{2})?\s*(AM|PM)", time_text, re.I)
    if not date_match or not time_match:
        return None
    month, day = map(int, date_match.groups())
    hour = int(time_match.group(1)) % 12 + (12 if time_match.group(3).upper() == "PM" else 0)
    minute = int(time_match.group(2) or 0)
    candidates = []
    for year in (now.year - 1, now.year, now.year + 1):
        try:
            kickoff = datetime(year, month, day, hour, minute, tzinfo=EASTERN).astimezone(timezone.utc)
        except ValueError:
            continue
        candidates.append(kickoff)
    return min(candidates, key=lambda value: abs((value - now).total_seconds())) if candidates else None


def parse_source_games(page: str, forecasts: dict, now: datetime, previous: dict | None = None) -> list[dict]:
    """Use the source's own game cards, including those without forecasts."""
    document = lxml_html.fromstring(page)
    old_games = (previous or {}).get("games") or []
    anchors = []
    for game in old_games:
        try:
            if isinstance(game.get("week"), int) and game.get("kickoffUtc"):
                anchors.append((week_start(datetime.fromisoformat(game["kickoffUtc"].replace("Z", "+00:00"))), game["week"]))
        except (KeyError, ValueError, TypeError):
            continue
    articles = {article.get("id"): article for article in document.xpath(f'//article[{contains_class("mlb-game-block")}]')}
    games = []
    seen = set()
    for card in document.xpath(f'//a[{contains_class("cheat-card")}]'):
        event_id = card.get("href", "").lstrip("#")
        match = re.fullmatch(r"match-([a-z0-9]+)-([a-z0-9]+)", event_id, re.I)
        if not match:
            continue
        away, home = normalize(match.group(1)), normalize(match.group(2))
        date_text = first(card, f'.//*[{contains_class("cheat-card__date")}]')
        time_text = first(card, f'.//*[{contains_class("cheat-card__time")}]')
        kickoff = kickoff_from_card(date_text, time_text, now)
        if not kickoff or kickoff < now - timedelta(hours=5) or kickoff > now + timedelta(days=10):
            continue
        key = (away, home, kickoff.astimezone(EASTERN).month, kickoff.astimezone(EASTERN).day)
        if key in seen:
            continue
        seen.add(key)
        old = next((g for g in old_games if normalize(g.get("away", {}).get("abbr", "")) == away and
                    normalize(g.get("home", {}).get("abbr", "")) == home and
                    str(g.get("kickoffUtc", "")) and
                    datetime.fromisoformat(g["kickoffUtc"].replace("Z", "+00:00")).astimezone(EASTERN).date() ==
                    kickoff.astimezone(EASTERN).date()), None)
        article = articles.get(event_id)
        labels = article.xpath(f'.//*[{contains_class("matchup-team")}]/span/text()') if article is not None else []
        labels = [clean(s) for s in labels if clean(s)]
        venue_nodes = article.xpath(f'.//*[{contains_class("mlb-game-block__venue")}]') if article is not None else []
        # The venue element may contain a nested roof-status badge. Keep its
        # text out of the city field (e.g. "Madrid, ES", not "ES Retractable roof").
        venue_text = clean(venue_nodes[0].text or "") if venue_nodes else ""
        venue, _, city = venue_text.partition(" · ")
        roof_text = first(article, f'.//*[{contains_class("venue-roof-flag")}]') if article is not None else ""
        article_classes = article.get("class", "") if article is not None else ""
        indoor = bool(re.search(r"indoor|fixed roof|dome", roof_text, re.I) or "is-roof-closed" in article_classes)
        prior_venue = old.get("venue", "") if old else ""
        prior_city = old.get("city", "") if old else ""
        prior_indoor = bool(old.get("indoor")) if old else False
        week = old.get("week") if old else None
        if not isinstance(week, int) and anchors:
            anchor, anchor_week = min(anchors, key=lambda entry: abs((week_start(kickoff) - entry[0]).days))
            week = anchor_week + (week_start(kickoff) - anchor).days // 7
            if not 1 <= week <= 18:
                week = None
        def team_info(code, position):
            old_team = old.get(position, {}) if old else {}
            name = labels[0 if position == "away" else 1] if len(labels) >= 2 else old_team.get("name", code)
            slug = {"WAS": "wsh", "SF": "sf", "TB": "tb", "GB": "gb", "KC": "kc", "LV": "lv", "NE": "ne", "NO": "no", "LAR": "lar"}.get(code, code.lower())
            return {"abbr": code, "name": name, "logo": old_team.get("logo") or f"https://a.espncdn.com/i/teamlogos/nfl/500/{slug}.png"}
        forecast = forecasts.get(key)
        if forecast:
            forecast = {**forecast, "sourceUrl": f"{SOURCE}#{event_id}"}
        games.append({
            "id": old.get("id") if old else f"msw-{kickoff.date().isoformat()}-{away.lower()}-{home.lower()}",
            "week": week,
            "kickoffUtc": kickoff.isoformat().replace("+00:00", "Z"),
            "away": team_info(away, "away"), "home": team_info(home, "home"),
            "venue": venue or prior_venue, "city": city or prior_city,
            "indoor": indoor or prior_indoor,
            "forecast": forecast,
        })
    return sorted(games, key=lambda game: (game["kickoffUtc"], game["id"]))


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
    previous = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else None
    games = parse_source_games(page, forecasts, now, previous)
    if not games:
        raise ValueError("MySportsWeather returned no upcoming NFL games; retaining the last good snapshot")
    return {
        "season": now.astimezone(EASTERN).year,
        "generatedAt": now.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "weatherSource": SOURCE,
        "scheduleSource": "MySportsWeather",
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
