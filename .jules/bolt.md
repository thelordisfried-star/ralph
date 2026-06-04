## 2025-06-04 - React Flow Edge Visibility Stroke Bug
**Learning:** When using functional state setters to toggle edge visibility styles (e.g., `opacity: 0`), React Flow edges might still be faintly visible or cause visual artifacts if the `stroke` property isn't explicitly set to 'transparent'.
**Action:** Always toggle the `stroke` property (e.g., '#222' to 'transparent') alongside `opacity` and `animated` properties when dynamically hiding edges via style mutations.

## 2025-06-04 - Vite ReferenceError Debugging in Playwright
**Learning:** During UI verification with Playwright, a blank page causing `wait_for_selector` timeouts can mask underlying React initialization errors (like `ReferenceError` from incorrect map instantiation ordering).
**Action:** Attach `pageerror` and `console` event listeners to the Playwright `page` object *before* navigation to capture and expose Vite/React client-side compilation errors immediately instead of waiting for a timeout.
