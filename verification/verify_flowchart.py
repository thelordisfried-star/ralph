from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        print("Navigating to http://localhost:5173/ralph/")
        page.goto("http://localhost:5173/ralph/")

        # Wait for the flowchart to load
        page.wait_for_selector(".react-flow__renderer")

        print("Checking initial state")
        expect(page.locator(".step-counter")).to_contain_text("Step 1/10")

        # Click Next 3 times
        next_button = page.get_by_role("button", name="Next >")

        print("Clicking Next 1")
        next_button.click()
        page.wait_for_timeout(500) # wait for animation/react update

        print("Clicking Next 2")
        next_button.click()
        page.wait_for_timeout(500)

        print("Clicking Next 3")
        next_button.click()
        page.wait_for_timeout(500)

        print("Verifying state after 3 clicks")
        expect(page.locator(".step-counter")).to_contain_text("Step 4/10")

        print("Taking optimized screenshot")
        page.screenshot(path="verification/optimized.png")

        browser.close()

if __name__ == "__main__":
    run()
