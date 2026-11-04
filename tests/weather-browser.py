#!/usr/bin/env python3
"""Desktop/mobile smoke tests for the standalone weather tab."""

import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
GAMES = json.loads((ROOT / "weather/data/nfl.json").read_text(encoding="utf-8"))["games"]
AVAILABLE = sum(bool(game["forecast"]) for game in GAMES)
PENDING = sum(not game["forecast"] and not game["indoor"] for game in GAMES)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def navigate(page, group, target):
    # The redesigned site routes through the visible grouped navigation;
    # the original .positions buttons deliberately remain hidden in Clean mode.
    page.locator(f'#shuaCleanNav [data-shua-group="{group}"] .shua-clean-trigger').click()
    page.locator(f'#shuaCleanNav [data-shua-target="{target}"]').click()


def open_weather(page, phone, url):
    page.goto(url, wait_until="domcontentloaded", timeout=45000)
    page.locator('.positions [data-pos="WEATHER"]').wait_for(state="attached")
    navigate(page, "tools", "WEATHER")
    page.locator('#shuaWeatherSection .wx-game').first.wait_for(state="visible", timeout=30000)
    assert page.locator('#shuaWeatherSection .wx-game').count() == len(GAMES)
    assert page.locator("body.shua-weather-open").count() == 1


def check_weather(page, phone, url):
    open_weather(page, phone, url)
    weather = page.locator("#shuaWeatherSection")
    assert weather.locator("#wxFreshness").is_visible()
    assert "Source checked" in weather.locator("#wxFreshness").inner_text()
    assert weather.locator('.wx-game .wx-source-link, .wx-game .wx-pending-link').count() == 0, \
        'Game cards should not show per-game forecast links'
    for game in GAMES:
        if game['indoor'] and not game['forecast']:
            indoor = weather.locator(f'[data-weather-game="{game["id"]}"]')
            assert indoor.locator('.wx-matchup').count() == 1, \
                f'Indoor {game["home"]["name"]} must use a full weather card'
            assert indoor.locator('.wx-impact-indoor').count() == 1
            assert indoor.locator('.wx-metrics').count() == 1
            assert 'Forecast pending' not in indoor.inner_text()
    weather.locator('[data-wx-filter="ready"]').click()
    assert weather.locator(".wx-game").count() == AVAILABLE
    if AVAILABLE:
        # Past games are deliberately folded into a collapsed section. Choose
        # a visible current forecast rather than an invisible previous card.
        # The current visual design collapses hourly data behind a one-tap
        # analysis disclosure; open that real control before checking it.
        weather.locator('.wx-game:visible .shua-wx-game-details > summary').first.click()
        preview = weather.locator(".wx-game:visible .wx-hour-preview:visible").first
        preview.wait_for(state="visible", timeout=12000)
        assert preview.locator(".wx-preview-hour").count() >= 1
        assert ":" in preview.locator(".wx-preview-hour strong").first.inner_text()
        assert preview.locator(".wx-preview-hour small").first.inner_text() in ("AM", "PM")
        assert preview.locator('.wx-preview-sky[role="img"]').count() >= 1
        weather.locator(".wx-game:visible .wx-details summary").first.click()
        nws = weather.locator(".wx-details[open] .wx-hourly-block").first
        assert nws.get_by_text("NWS hourly forecast").first.is_visible()
        assert nws.locator(".wx-hour-col").count() >= 1
        assert ":" in nws.locator(".wx-hour-clock").first.inner_text()
        assert nws.locator(".wx-hour-period").first.inner_text() in ("AM", "PM")
        first_game = next(game for game in GAMES if game["forecast"])
        first_forecast = first_game["forecast"]
        if any(hour.get("sky") for hour in first_forecast["hourly"]):
            assert nws.locator('.wx-hour-emoji[role="img"]').count() >= 1
            if first_forecast["nbmHourly"]:
                nbm = weather.locator(".wx-hourly-block").nth(1)
                assert nbm.locator('.wx-hour-emoji[role="img"]').count() >= 1
        if (first_game["home"]["abbr"] == "SEA" and first_game["kickoffUtc"].startswith("2026-11-")
                and any(hour.get("sky") == "sun" and hour.get("time") == "8 PM"
                        for hour in first_forecast["hourly"])):
            eight_pm = preview.locator(".wx-preview-hour").filter(
                has=page.locator("strong", has_text="8:00")
            ).first
            assert eight_pm.locator(".wx-preview-sky").inner_text() == "🌙", \
                "Clear weather after local sunset should use a moon, not a sun"
        if phone and len(first_forecast["hourly"]) <= 5:
            widths = nws.locator(".wx-hourly-scroll").evaluate("el => ({total: el.scrollWidth, visible: el.clientWidth})")
            assert widths["total"] <= widths["visible"] + 2, f"Hourly columns should fit phone width: {widths}"
    weather.locator('[data-wx-filter="all"]').click()
    weather.locator("#wxSearch").fill("jax")
    assert weather.locator(".wx-game").count() == 1
    assert "Jacksonville" in weather.locator(".wx-game").inner_text()
    weather.locator("#wxSearch").fill("")
    weather.locator('[data-wx-filter="pending"]').click()
    assert weather.locator(".wx-game").count() == PENDING
    weather.locator('[data-wx-filter="all"]').click()
    assert weather.locator(".wx-game").count() == len(GAMES)

    if phone:
        bounds = weather.evaluate("el => ({right: el.getBoundingClientRect().right, width: window.innerWidth})")
        assert bounds["right"] <= bounds["width"] + 8, f"Weather tab overflow: {bounds}"
    navigate(page, "rankings", "HOME")
    assert page.locator("body.shua-weather-open").count() == 0
    assert weather.is_hidden()


def main():
    handler = partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/"
    try:
        with sync_playwright() as playwright:
            for engine_name in ("chromium", "webkit"):
                engine = getattr(playwright, engine_name)
                browser = engine.launch(headless=True)
                try:
                    for phone in (False, True):
                        context = browser.new_context(
                            viewport={"width": 390, "height": 844} if phone else {"width": 1440, "height": 900},
                            device_scale_factor=3 if phone else 1,
                            is_mobile=phone,
                            has_touch=phone,
                        )
                        page = context.new_page()
                        # Static weather snapshot and site assets are local; avoid
                        # unrelated network API/headshot flakiness in smoke tests.
                        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(url) else route.abort())
                        check_weather(page, phone, url)
                        print(f"PASS {engine_name} {'phone' if phone else 'desktop'}: Weather nav, cards, filters, hourly & exit")
                        context.close()
                finally:
                    browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
