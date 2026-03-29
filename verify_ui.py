from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="verification_videos")
        page = context.new_page()

        # Navigate to the locally running app
        page.goto("http://localhost:3000/ralph/")

        # Wait for the first custom node to appear
        page.wait_for_selector('.custom-node')

        # Take an initial screenshot
        page.screenshot(path="verification_videos/step1.png")

        # Click the "Next >" button a few times
        next_button = page.get_by_text("Next >")

        for i in range(4):
            next_button.click()
            page.wait_for_timeout(500)  # Wait for animation

        # Take a screenshot after 5 steps
        page.screenshot(path="verification_videos/step5.png")

        # Click "Reset" button
        reset_button = page.get_by_text("Reset")
        reset_button.click()
        page.wait_for_timeout(500)

        # Final screenshot back at step 1
        page.screenshot(path="verification_videos/reset.png")

        context.close()
        browser.close()

if __name__ == "__main__":
    verify_ui()
