from playwright.sync_api import sync_playwright

def run(playwright):
    print("Launching browser...")
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    print("Navigating to app...")
    # Go to the app
    try:
        page.goto("http://localhost:5173/ralph/")
    except Exception as e:
        print(f"Error navigating: {e}")
        browser.close()
        return

    print("Waiting for first node...")
    # Wait for the first node
    try:
        page.wait_for_selector('text="You write a PRD"', timeout=5000)
    except Exception as e:
        print(f"Error finding first node: {e}")
        page.screenshot(path="verification/error.png")
        browser.close()
        return

    # Verify the first node is visible
    print("First node found.")

    # Click Next
    print("Clicking Next...")
    page.click('button:has-text("Next >")')

    # Wait for the second node "Convert to prd.json"
    print("Waiting for second node...")
    try:
        page.wait_for_selector('text="Convert to prd.json"', state="visible", timeout=5000)
    except Exception as e:
        print(f"Error finding second node: {e}")
        page.screenshot(path="verification/error_next.png")
        browser.close()
        return

    print("Second node found after clicking Next.")

    print("Waiting for note...")
    try:
        # Check for note-node class
        page.wait_for_selector('.note-node', state="visible", timeout=5000)
    except Exception as e:
        print(f"Error finding note: {e}")
        page.screenshot(path="verification/error_note.png")
        browser.close()
        return

    print("Note found.")

    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/flowchart_render.png")

    browser.close()
    print("Done.")

with sync_playwright() as playwright:
    run(playwright)
