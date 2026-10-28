import asyncio
from playwright.async_api import async_playwright
import http.server
import socketserver
import threading
import time

PORT = 8088

def start_server():
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

async def main():
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(1)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # 1. Desktop 1280x800 Test
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()
        await page.goto(f"http://localhost:{PORT}/index.html")

        # Wait for video duration
        duration_el = page.locator('#duration-time')
        await page.wait_for_function("document.getElementById('duration-time').textContent !== '00:00'")
        dur_text = await duration_el.text_content()
        print(f"Desktop duration text on load: {dur_text}")

        # Screenshot initial state
        await page.screenshot(path="screenshot_desktop.png")

        # Toggle play
        await page.click('#play-pause-btn')
        await asyncio.sleep(0.5)

        # Speed menu test
        await page.click('#speed-btn')
        await asyncio.sleep(0.3)
        await page.screenshot(path="screenshot_speed_menu.png")

        # Click a speed option
        await page.click('button[data-speed="1.5"]')
        await asyncio.sleep(0.3)

        # Re-check duration after reload / cached load
        await page.reload()
        await page.wait_for_function("document.getElementById('duration-time').textContent !== '00:00'")
        dur_text_reloaded = await duration_el.text_content()
        print(f"Desktop duration text after reload: {dur_text_reloaded}")

        await context.close()

        # 2. Mobile 390px Test
        context_mobile = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            is_mobile=True,
            has_touch=True
        )
        page_m = await context_mobile.new_page()
        await page_m.goto(f"http://localhost:{PORT}/index.html")
        await page_m.wait_for_function("document.getElementById('duration-time').textContent !== '00:00'")

        await page_m.screenshot(path="screenshot_mobile_390.png")

        # Mobile tap video to toggle controls
        video_box = await page_m.locator('#video-container').bounding_box()
        await page_m.touchscreen.tap(video_box['x'] + video_box['width']/2, video_box['y'] + video_box['height']/2)
        await asyncio.sleep(0.3)
        await page_m.screenshot(path="screenshot_mobile_tap.png")

        await context_mobile.close()

        # 3. Mobile 320px Test
        context_small = await browser.new_context(
            viewport={'width': 320, 'height': 568},
            is_mobile=True,
            has_touch=True
        )
        page_s = await context_small.new_page()
        await page_s.goto(f"http://localhost:{PORT}/index.html")
        await page_s.wait_for_function("document.getElementById('duration-time').textContent !== '00:00'")
        await page_s.screenshot(path="screenshot_mobile_320.png")
        await context_small.close()

        await browser.close()

asyncio.run(main())
