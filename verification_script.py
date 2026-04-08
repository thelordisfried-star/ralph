from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('http://localhost:3000/ralph/')

        # Click next button a few times
        next_button = page.locator('button:has-text("Next >")')

        # Click 5 times
        for _ in range(5):
            next_button.click()
            page.wait_for_timeout(500)

        page.screenshot(path='flowchart_step_6.png')

        # Click reset
        reset_button = page.locator('.reset-btn')
        reset_button.click()
        page.wait_for_timeout(500)

        page.screenshot(path='flowchart_reset.png')

        browser.close()

if __name__ == "__main__":
    verify_ui()
