from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir=".")
        page = context.new_page()
        page.goto("http://localhost:3000/ralph/")

        # Wait for ReactFlow to be ready
        page.wait_for_selector(".react-flow", timeout=10000)

        # Click "Next" a few times to show node transitions
        for _ in range(5):
            page.click("button:has-text('Next >')")
            page.wait_for_timeout(500)

        page.screenshot(path="screenshot.png")
        print("Screenshot saved to screenshot.png")

        # Click once more to add an edge
        page.click("button:has-text('Next >')")
        page.wait_for_timeout(500)

        context.close()
        browser.close()
        print("Video saved.")

if __name__ == "__main__":
    main()
