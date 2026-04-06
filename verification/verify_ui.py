from playwright.sync_api import sync_playwright
import time

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Setup context to record video
        context = browser.new_context(record_video_dir="verification/videos/")
        page = context.new_page()

        print("Navigating to local server...")
        # App is accessed at /ralph/ locally due to Vite config base
        page.goto("http://localhost:3000/ralph/")

        print("Waiting for initial render...")
        time.sleep(2)

        print("Clicking 'Next >' multiple times to verify node render logic...")
        next_button = page.locator("button:has-text('Next >')")

        for _ in range(5):
            if next_button.is_enabled():
                next_button.click()
                time.sleep(1)

        print("Capturing screenshot...")
        page.screenshot(path="verification/screenshot.png")

        print("Closing context to save video...")
        context.close()
        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    verify_ui()
