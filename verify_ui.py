from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(record_video_dir="videos/")
    page = context.new_page()
    page.goto("http://localhost:3000/ralph/")

    # Wait for React Flow to load
    page.wait_for_selector(".react-flow__pane")

    page.screenshot(path="screenshot.png")
    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
