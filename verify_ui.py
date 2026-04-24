from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    page.goto("http://localhost:3000/ralph/")  # Application uses base URL path /ralph/
    page.wait_for_timeout(1000)

    # Click Next a few times to show state changes
    next_btn = page.locator("button:has-text('Next >')")
    for _ in range(5):
        next_btn.click()
        page.wait_for_timeout(500)

    # Click Reset to test the reset optimization
    reset_btn = page.locator("button.reset-btn")
    reset_btn.click()
    page.wait_for_timeout(1000)

    # Take screenshot at the key moment
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)  # Hold final state for the video

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={"width": 1280, "height": 720}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()  # MUST close context to save the video
            browser.close()