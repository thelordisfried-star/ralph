from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    os.makedirs("verification/screenshots", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Record video
        context = browser.new_context(record_video_dir="verification/videos/")
        page = context.new_page()

        print("Loading page...")
        page.goto("http://localhost:3000/ralph/")
        page.wait_for_selector(".react-flow__renderer")
        time.sleep(1)

        page.screenshot(path="verification/screenshots/initial.png")
        print("Captured initial state.")

        next_btn = page.locator("button:has-text('Next >')")

        for i in range(5):
            next_btn.click()
            time.sleep(0.5)
            page.screenshot(path=f"verification/screenshots/step_{i+2}.png")

        print("Captured 5 steps.")

        prev_btn = page.locator("button:has-text('< Prev')")
        for i in range(3):
            prev_btn.click()
            time.sleep(0.5)
            page.screenshot(path=f"verification/screenshots/back_step_{5-i}.png")

        print("Captured 3 previous steps.")

        reset_btn = page.locator("button:has-text('Reset')")
        reset_btn.click()
        time.sleep(1)
        page.screenshot(path="verification/screenshots/reset.png")
        print("Captured reset state.")

        context.close()
        browser.close()
        print("UI Verification Complete. Check verification/screenshots and verification/videos.")

if __name__ == "__main__":
    run_verification()
