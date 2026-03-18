import time
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:3000/ralph/')
        page.wait_for_selector('.custom-node', timeout=5000)
        # Give React Flow a moment to render completely
        time.sleep(2)
        page.screenshot(path='verification/screenshot.png')
        browser.close()
        print("Screenshot saved to verification/screenshot.png")

if __name__ == '__main__':
    main()
