from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="verification/")
        page = context.new_page()

        # Navigate to the local server
        page.goto("http://localhost:3000/ralph/")
        page.wait_for_selector(".notepad-window")

        # Click next a few times to show graph interacting
        next_button = page.locator("button:has-text('Next')")
        for _ in range(3):
            next_button.click()
            page.wait_for_timeout(500)

        page.screenshot(path="verification/screenshot.png")

        context.close()
        browser.close()

if __name__ == "__main__":
    verify_ui()
