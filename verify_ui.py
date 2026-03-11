from playwright.sync_api import sync_playwright
import time

def verify_flowchart():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the flowchart app
        page.goto("http://localhost:3000/ralph/")

        # Wait for ReactFlow to render some nodes
        page.wait_for_selector(".react-flow__node")

        # Take an initial screenshot
        page.screenshot(path="verification_initial.png")

        # Click the 'Next' button a few times to test interaction and memoization impact
        next_btn = page.get_by_role("button", name="Next >")
        for _ in range(3):
            next_btn.click()
            time.sleep(0.5)

        # Take a final screenshot after interaction
        page.screenshot(path="verification_interacted.png")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    verify_flowchart()
