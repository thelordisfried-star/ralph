import time
from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        # We record a video to verify interactive performance is solid during steps
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="verification/videos/")
        page = context.new_page()

        print("Navigating to http://127.0.0.1:3000/ralph/")
        page.goto("http://127.0.0.1:3000/ralph/")

        # Wait for the initial node to render
        page.wait_for_selector(".custom-node")
        print("Flowchart rendered.")

        # Click next a few times to test graph updates
        for i in range(5):
            page.click("button:has-text('Next >')")
            time.sleep(0.5)

        print("Taking screenshot...")
        page.screenshot(path="verification/flowchart_screenshot.png", full_page=True)

        context.close()
        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    verify_ui()