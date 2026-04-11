from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(record_video_dir="verification/videos")
        page = context.new_page()

        # Base URL path is '/ralph/' as configured in vite.config.ts
        page.goto("http://localhost:3000/ralph/")

        # Wait for the react flow container to be visible
        page.wait_for_selector(".react-flow", state="visible", timeout=5000)

        # Give the graph a moment to render
        time.sleep(2)

        # Interact with the graph (e.g. click 'Next' a few times to test re-rendering / layout)
        try:
            next_btn = page.locator("button:has-text('Next')")
            for _ in range(3):
                next_btn.click()
                time.sleep(0.5)
        except Exception as e:
            print(f"Could not click 'Next': {e}")

        time.sleep(1)

        # Take a screenshot
        page.screenshot(path="verification/flowchart_optimized.png")

        context.close()
        browser.close()

if __name__ == "__main__":
    main()
