from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:3000/ralph/')
        page.wait_for_load_state('networkidle')

        # Click Next twice to see more steps
        page.click('button:has-text("Next")')
        page.wait_for_timeout(500)
        page.click('button:has-text("Next")')
        page.wait_for_timeout(500)

        page.screenshot(path='verification/ui_step_3.png')
        browser.close()

if __name__ == "__main__":
    verify_ui()
