from playwright.sync_api import sync_playwright

def verify_feature(page):
    page.goto('http://localhost:3000/ralph/')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)

    # Click Next a few times to show functionality
    for _ in range(3):
        page.click('button:has-text("Next")')
        page.wait_for_timeout(500)

    page.screenshot(path='verification/ui_final.png')
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="verification/video")
        page = context.new_page()
        try:
            verify_feature(page)
        finally:
            context.close()
            browser.close()
