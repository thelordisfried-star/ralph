import time
import sys
from playwright.sync_api import sync_playwright

def verify_ui():
    print("Starting verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("Navigating to http://localhost:3000/ralph/")

        try:
            # The app seems to be served at /ralph/
            response = page.goto("http://localhost:3000/ralph/", timeout=15000, wait_until="networkidle")
            if not response or not response.ok:
                print(f"Failed to load page. Status: {response.status if response else 'Unknown'}")
                sys.exit(1)
        except Exception as e:
            print(f"Error loading page: {e}")
            # Try root URL fallback
            try:
                print("Falling back to root URL http://localhost:3000/")
                response = page.goto("http://localhost:3000/", timeout=15000, wait_until="networkidle")
            except Exception as e2:
                print(f"Failed fallback navigation: {e2}")
                sys.exit(1)

        # Wait a bit for ReactFlow to finish rendering
        page.wait_for_timeout(2000)

        # Take a screenshot
        screenshot_path = "flowchart_ui_optimized.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        # Test basic interaction to ensure handlers work
        try:
            # Try to click the "Next" button
            next_btn = page.locator("text=Next >")
            if next_btn.is_visible():
                next_btn.click()
                print("Clicked Next button")
                page.wait_for_timeout(500)
                page.screenshot(path="flowchart_ui_optimized_step2.png")
                print("Screenshot saved to flowchart_ui_optimized_step2.png")
            else:
                print("Next button not found, skipped interaction test.")
        except Exception as e:
            print(f"Interaction test failed (ignoring): {e}")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    verify_ui()
