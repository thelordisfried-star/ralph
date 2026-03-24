import os
import subprocess
import time
from playwright.sync_api import sync_playwright

def verify():
    # Start dev server
    server_process = subprocess.Popen(
        ["bun", "x", "vite", "--host", "0.0.0.0", "--port", "3000"],
        cwd="flowchart",
        env={**os.environ, "__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS": ".com"},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(3)  # Wait for server to start

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            # Capture video
            context = browser.new_context(record_video_dir="verification_videos/")
            page = context.new_page()

            page.goto("http://localhost:3000/ralph/")
            time.sleep(2)

            # Click next a few times to test graph updates
            for _ in range(3):
                page.click("button:has-text('Next >')")
                time.sleep(0.5)

            # Wait for any animations
            time.sleep(1)

            # Capture screenshot
            page.screenshot(path="verification_screenshot.png")

            context.close()
            browser.close()
            print("Verification complete. Media saved.")
    finally:
        server_process.terminate()
        server_process.wait()

if __name__ == "__main__":
    verify()
