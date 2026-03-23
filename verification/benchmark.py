from playwright.sync_api import sync_playwright
import time
import os

def run_benchmark():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Loading page...")
        try:
            page.goto("http://localhost:3000/ralph/")
        except Exception as e:
            print(f"Error loading port 3000, trying 5173: {e}")
            page.goto("http://localhost:5173/ralph/")

        page.wait_for_selector(".react-flow__renderer")

        # Give React Flow time to render initial nodes
        time.sleep(1)

        print("Starting benchmark...")
        next_btn = page.locator("button:has-text('Next >')")
        prev_btn = page.locator("button:has-text('< Prev')")
        reset_btn = page.locator("button:has-text('Reset')")

        # Test performance 10 times to get a good average
        total_time = 0
        iterations = 50

        for _ in range(iterations):
            start = time.perf_counter()
            next_btn.click()
            # Wait for any visual update
            page.wait_for_selector(".step-counter")
            end = time.perf_counter()
            total_time += (end - start)

            # Switch back and forth
            if page.locator("span.step-counter", has_text="Step 10").is_visible():
                while not prev_btn.is_disabled():
                    prev_btn.click()

        print(f"Average Next/Prev Click + Render Time (Playwright overhead included): {total_time / iterations * 1000:.2f}ms")

        browser.close()

if __name__ == "__main__":
    run_benchmark()
