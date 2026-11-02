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


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def open_weather(page, phone, url):
    page.goto(url, wait_until="domcontentloaded", timeout=45000)
    page.locator('.positions [data-pos="WEATHER"]').wait_for(state="attached")
    if phone:
        page.locator("#phoneMenuButton").click()
        page.locator('#phoneMenuItems button[data-target="WEATHER"]').click()
    else:
        page.locator('.positions [data-pos="WEATHER"]').click()
    page.locator('#shuaWeatherSection .wx-game').first.wait_for(state="visible", timeout=30000)
    assert page.locator('#shuaWeatherSection .wx-game').count() == len(GAMES)
    assert page.locator("body.shua-weather-open").count() == 1


def check_weather(page, phone, url):
    open_weather(page, phone, url)
    weather = page.locator("#shuaWeatherSection")
    weather.locator('[data-wx-filter="ready"]').click()
    assert weather.locator(".wx-game").count() == AVAILABLE
    if AVAILABLE:
        weather.locator(".wx-game .wx-details summary").first.click()
        assert weather.get_by_text("NWS hourly forecast").first.is_visible()
    weather.locator('[data-wx-filter="all"]').click()
    weather.locator("#wxSearch").fill("jax")
    assert weather.locator(".wx-game").count() == 1
    assert "Jacksonville" in weather.locator(".wx-game").inner_text()
    weather.locator("#wxSearch").fill("")
    weather.locator('[data-wx-filter="pending"]').click()
    assert weather.locator(".wx-game").count() == len(GAMES) - AVAILABLE
    weather.locator('[data-wx-filter="all"]').click()
    assert weather.locator(".wx-game").count() == len(GAMES)

    if phone:
        bounds = weather.evaluate("el => ({right: el.getBoundingClientRect().right, width: window.innerWidth})")
        assert bounds["right"] <= bounds["width"] + 8, f"Weather tab overflow: {bounds}"
        page.locator("#phoneMenuButton").click()
        page.locator('#phoneMenuItems button[data-target="HOME"]').click()
    else:
        page.locator('.positions [data-pos="ALL"]').click()
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
