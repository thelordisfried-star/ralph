from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        print("Navigating to app...")
        page.goto("http://localhost:5173/ralph/")

        # Wait for title
        page.wait_for_selector("text=Untitled - Notepad")
        print("Page loaded.")

        # Click Next a few times
        next_button = page.locator("button", has_text="Next >")

        # Initial state (Step 1)
        page.screenshot(path="verification/step1.png")

        # Step 2
        next_button.click()
        page.wait_for_timeout(500) # Wait for animation
        page.screenshot(path="verification/step2.png")

        # Step 3
        next_button.click()
        page.wait_for_timeout(500)
        page.screenshot(path="verification/step3.png")

        # Step 4 (should show edges)
        next_button.click()
        page.wait_for_timeout(500)
        page.screenshot(path="verification/step4.png")

        print("Screenshots taken.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
