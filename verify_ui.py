from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(record_video_dir="verification/videos")
        page = context.new_page()

        print("Navigating to http://localhost:3000/ralph/")
        page.goto("http://localhost:3000/ralph/")
        page.wait_for_timeout(2000)

        print("Taking screenshot...")
        page.screenshot(path="verification/screenshot.png")

        print("Clicking Next several times to check transitions...")
        for _ in range(5):
            page.click("text=Next >")
            page.wait_for_timeout(500)

        print("Taking screenshot after clicking Next...")
        page.screenshot(path="verification/screenshot_after_next.png")

        print("Clicking Reset...")
        page.click("text=Reset")
        page.wait_for_timeout(1000)

        print("Taking screenshot after Reset...")
        page.screenshot(path="verification/screenshot_after_reset.png")

        context.close()
        browser.close()

if __name__ == "__main__":
    run()
