from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="verification/videos")
        page = context.new_page()

        # Navigate to the flowchart app
        page.goto("http://localhost:3000/ralph/")

        # Wait for the react flow container to be visible
        page.wait_for_selector(".react-flow")

        # Perform some interactions to trigger graph changes and re-renders
        # Click the 'Next' button a few times to show more nodes
        next_button = page.locator("button:has-text('Next')")
        for _ in range(3):
            next_button.click()
            page.wait_for_timeout(500)

        # Try panning the graph by clicking and dragging
        page.mouse.move(500, 500)
        page.mouse.down()
        page.mouse.move(600, 600)
        page.mouse.up()

        # Wait for any animations to finish
        page.wait_for_timeout(1000)

        # Take a screenshot
        page.screenshot(path="verification/flowchart_screenshot.png")

        # Close everything to save the video
        context.close()
        browser.close()

if __name__ == "__main__":
    verify()
