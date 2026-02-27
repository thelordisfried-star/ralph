import time
from playwright.sync_api import sync_playwright

def verify_flowchart():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the flowchart app
        # Note: The app is running on port 5173 with base path /ralph/
        url = "http://localhost:5173/ralph/"
        print(f"Navigating to {url}")

        try:
            page.goto(url, wait_until="networkidle")

            # Wait for the React Flow component to render
            # We look for the controls or a node to ensure it's loaded
            print("Waiting for flowchart to render...")
            page.wait_for_selector(".react-flow__renderer", timeout=10000)

            # Allow some time for animations/transitions
            time.sleep(2)

            # Take a screenshot of the initial state
            screenshot_path = "flowchart_verification.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

            # Verify some nodes are present (indicates app is working)
            nodes = page.locator(".custom-node")
            count = nodes.count()
            print(f"Found {count} custom nodes")

            if count > 0:
                print("Verification SUCCESS: Flowchart rendered with nodes.")
            else:
                print("Verification WARNING: No custom nodes found.")

        except Exception as e:
            print(f"Verification FAILED: {e}")
            # Take error screenshot if possible
            try:
                page.screenshot(path="error_state.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    verify_flowchart()
