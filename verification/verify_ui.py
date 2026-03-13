import time
from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('http://localhost:3000/ralph/')
        page.wait_for_selector('.react-flow', timeout=10000)
        time.sleep(2) # Allow elements to settle
        page.screenshot(path='verification/ui_screenshot.png')
        browser.close()

if __name__ == "__main__":
    verify_ui()
