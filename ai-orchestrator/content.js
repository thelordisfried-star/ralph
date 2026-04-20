// Content script for AI Orchestration Toolkit
// This script runs on AI service pages (ChatGPT, Claude, Gemini, etc.)

// Detect which AI service we're on
function detectAIService() {
  if (window.location.hostname.includes('chat.openai.com') || window.location.hostname.includes('chatgpt.com')) {
    return 'chatgpt';
  } else if (window.location.hostname.includes('claude.ai')) {
    return 'claude';
  } else if (window.location.hostname.includes('gemini.google.com')) {
    return 'gemini';
  } else {
    return 'unknown';
  }
}

const aiService = detectAIService();

// Enhanced selectors for different AI services
const selectors = {
  chatgpt: {
    input: [
      '#prompt-textarea',
      'div[contenteditable="true"]',
      'textarea[data-id="root"]',
      'textarea[placeholder*="Send a message"]'
    ],
    sendButton: [
      '[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]', // Added this
      'button svg[data-testid="send-icon"]',
      'button.absolute.bottom-1.5.right-1.5' // Added generic class fallback
    ],
    responseContainer: 'div[class*="react-scroll-to-bottom"]',
    responseMessage: [
      'div[data-message-author-role="assistant"]',
      '.text-message[data-message-author-role="assistant"]', // Added more specific selector
      '.markdown.prose' // Added generic markdown selector for response content
    ],
    stopButton: [
      'button[aria-label="Stop generating"]',
      'button[aria-label="Stop"]'
    ]
  },
  claude: {
    input: [
      'div[contenteditable="true"][data-testid="composer"]', // Original likely correct
      'div[contenteditable="true"]', // Fallback
      '.ProseMirror' // Added common editor class
    ],
    sendButton: [
      'button[aria-label="Send Message"]',
      'button[aria-label="Send message"]', // Check capitalization
      'button[data-testid="send-button"]' // Added potential testid
    ],
    responseContainer: 'div[class*="font-stretch"]',
    responseMessage: [
      'div[data-test-render-count]',
      '.font-claude-message', // Added potential class
      '.grid-cols-1 .gap-2' // Added structural selector fallback
    ],
    stopButton: 'button[aria-label="Stop response"]'
  },
  gemini: {
    input: [
      'div[contenteditable="true"][role="textbox"]', // Added robust role selector
      'input[aria-label="Enter your prompt here"]',
      'inputarea'
    ],
    sendButton: [
      'button[aria-label="Send message"]', // Standard Gemini label
      'send-button',
      'button[aria-label="Send"]',
      'button.send-button'
    ],
    responseContainer: 'message-content',
    responseMessage: [
      'model-response',
      '.model-response-text', // Added class fallback
      'div[data-test-id="model-response"]' // Added potential data attribute
    ],
    stopButton: 'button[aria-label="Stop"]'
  }
};

// Helper function to find element using multiple selector strategies
function findElement(selectorList) {
  if (!Array.isArray(selectorList)) {
    selectorList = [selectorList];
  }

  for (const selector of selectorList) {
    try {
      const element = document.querySelector(selector);
      if (element) return element;
    } catch (e) {
      // Ignore invalid selectors
    }
  }
  return null;
}

// Helper to find all elements using multiple selector strategies
function findAllElements(selectorList) {
  if (!Array.isArray(selectorList)) {
    selectorList = [selectorList];
  }

  for (const selector of selectorList) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) return elements;
    } catch (e) {
      // Ignore invalid selectors
    }
  }
  return [];
}

// Get selectors for current service
const currentSelectors = selectors[aiService] || {};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  switch (request.action) {
    case 'extractText':
      extractText(sendResponse);
      return true; // Keep message channel open for async response

    case 'injectText':
      injectText(request.text, sendResponse);
      return true;

    case 'checkResponse':
      checkResponse(sendResponse);
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Enhanced text extraction with optimized retry mechanism
function extractText(sendResponse) {
  let attempts = 0;
  const maxAttempts = 3; // Reduced from 5
  const retryDelay = 300; // Reduced from 1000ms to 300ms

  function attemptExtract() {
    try {
      // General extraction logic using robust finders
      let responseElements = findAllElements(currentSelectors.responseMessage);

      // Fallback for Claude specifically if selectors fail
      if (aiService === 'claude' && responseElements.length === 0) {
        // Try looking for the last message container
        const messages = document.querySelectorAll('.font-claude-message');
        if (messages.length > 0) responseElements = messages;
      }

      if (responseElements.length > 0) {
        const lastResponse = responseElements[responseElements.length - 1];
        const text = lastResponse.innerText.trim();

        // Check if we have meaningful content
        if (text.length > 0) {
          // Check if still generating (streaming)
          const stopButton = findElement(currentSelectors.stopButton);
          if (stopButton) {
            // Still generating, wait shorter time
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(attemptExtract, retryDelay);
              return;
            }
          }

          sendResponse({ success: true, text: text });
          return;
        }
      }

      // If no response found, retry if we have attempts left
      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(attemptExtract, retryDelay);
      } else {
        sendResponse({ success: false, error: 'No response found after retries' });
      }
    } catch (error) {
      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(attemptExtract, retryDelay);
      } else {
        sendResponse({ success: false, error: error.message });
      }
    }
  }

  attemptExtract();
}

// Enhanced send function for ChatGPT with more reliable DOM manipulation
function sendToChatGPT(text) {
  try {
    // Try multiple selectors for the textarea
    const textarea = findElement(currentSelectors.input);

    if (!textarea) {
      console.error("Can't find ChatGPT's text box.");
      return { success: false, error: "Input element not found" };
    }

    // Clear any existing content
    textarea.value = '';
    // Handle contenteditable divs (newer ChatGPT UI often uses this)
    if (textarea.isContentEditable) {
        textarea.textContent = text;
    } else {
        textarea.value = text;
    }

    // Dispatch multiple types of input events to ensure React picks it up
    const inputEvent = new Event('input', { bubbles: true });
    const changeEvent = new Event('change', { bubbles: true });
    textarea.dispatchEvent(inputEvent);
    textarea.dispatchEvent(changeEvent);

    // Also try the composition events for better compatibility
    textarea.dispatchEvent(new CompositionEvent('compositionupdate', { data: text }));
    textarea.dispatchEvent(new CompositionEvent('compositionend', { data: text }));

    // Force a re-render by resetting height
    textarea.style.height = 'auto';

    // Try to trigger any React hooks by simulating typing
    if (textarea.dispatchEvent) {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    }

    // Wait for the UI to update and the send button to become active
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20; // Increased from previous attempts
      const interval = setInterval(() => {
        // Try multiple selectors for the send button
        const sendButton = findElement(currentSelectors.sendButton) ||
                          document.querySelector('form button[type="submit"]'); // Generic fallback

        if (sendButton && !sendButton.disabled && sendButton.getBoundingClientRect().width > 0) {
          clearInterval(interval);

          // Click the send button
          sendButton.click();

          // Verify the click worked by checking if the button becomes disabled or changes
          setTimeout(() => {
            if (sendButton.disabled || sendButton.getAttribute('disabled') !== null) {
              console.log("Successfully sent to ChatGPT!");
              resolve({ success: true });
            } else {
              // Try alternative click methods
              try {
                // Try focus and enter key
                textarea.focus();
                textarea.dispatchEvent(new KeyboardEvent('keydown', {
                  bubbles: true,
                  keyCode: 13,
                  which: 13
                }));
                console.log("Sent to ChatGPT using Enter key!");
                resolve({ success: true });
              } catch (e) {
                console.warn("Alternative click method failed:", e);
                resolve({ success: true }); // Assume success if we got this far
              }
            }
          }, 100);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error("Send button not found or not clickable after maximum attempts.");
          resolve({ success: false, error: "Send button not clickable" });
        }
        attempts++;
      }, 150); // Check every 150ms
    });
  } catch (error) {
    console.error("Error in sendToChatGPT:", error);
    return { success: false, error: error.message };
  }
}

// Enhanced Claude interaction with better response detection
function sendToClaude(text) {
  const inputElement = findElement(currentSelectors.input);

  if (!inputElement) {
    return { success: false, error: 'Input element not found' };
  }

  // Clear existing text and inject new text
  inputElement.innerHTML = '';
  inputElement.textContent = text; // Prefer textContent for security/correctness

  // Dispatch input events
  const inputEvent = new Event('input', { bubbles: true });
  inputElement.dispatchEvent(inputEvent);

  // Also dispatch composition events for better compatibility
  inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: text }));
  inputElement.dispatchEvent(new CompositionEvent('compositionend', { data: text }));

  // Find and click the send button
  setTimeout(() => {
    const sendButton = findElement(currentSelectors.sendButton);
    if (sendButton) {
      sendButton.click();
      return { success: true };
    } else {
      return { success: false, error: 'Send button not found' };
    }
  }, 200); // Reduced from 500ms to 200ms
}

// Enhanced Gemini interaction
function sendToGemini(text) {
  const inputElement = findElement(currentSelectors.input);

  if (!inputElement) {
    return { success: false, error: 'Input element not found' };
  }

  // Clear existing text and inject new text
  // Handle contenteditable vs input/textarea
  if (inputElement.isContentEditable) {
      inputElement.textContent = text;
  } else {
      inputElement.value = text;
  }

  const inputEvent = new Event('input', { bubbles: true });
  inputElement.dispatchEvent(inputEvent);

  // Also try composition events for better compatibility
  inputElement.dispatchEvent(new CompositionEvent('compositionupdate', { data: text }));
  inputElement.dispatchEvent(new CompositionEvent('compositionend', { data: text }));

  // Find and click the send button
  setTimeout(() => {
    const sendButton = findElement(currentSelectors.sendButton);

    if (sendButton) {
      sendButton.click();
      return { success: true };
    } else {
      return { success: false, error: 'Send button not found' };
    }
  }, 200); // Reduced from 500ms to 200ms
}

// Enhanced text injection with service-specific handling
function injectText(text, sendResponse) {
  try {
    // Special handling for ChatGPT
    if (aiService === 'chatgpt') {
      const result = sendToChatGPT(text);
      sendResponse(result);
      return;
    }

    // Special handling for Claude
    if (aiService === 'claude') {
      const result = sendToClaude(text);
      sendResponse(result);
      return;
    }

    // Special handling for Gemini
    if (aiService === 'gemini') {
      const result = sendToGemini(text);
      sendResponse(result);
      return;
    }

    // Fallback for unknown services
    sendResponse({ success: false, error: 'Unsupported AI service' });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Enhanced response checking with better detection
function checkResponse(sendResponse) {
  try {
    // Check if generating (streaming)
    const stopButton = findElement(currentSelectors.stopButton);
    if (stopButton) {
        // Still generating
        sendResponse({ success: true, hasResponse: false });
        return;
    }

    // Check for response elements
    const responseElements = findAllElements(currentSelectors.responseMessage);

    // Check if there are any responses
    if (responseElements.length > 0) {
      // Check if the last response has content
      const lastResponse = responseElements[responseElements.length - 1];
      const hasContent = lastResponse.innerText.trim().length > 0;

      sendResponse({ success: true, hasResponse: hasContent });
    } else {
      sendResponse({ success: true, hasResponse: false });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Register this tab with the background script when the page loads
window.addEventListener('load', () => {
  // Wait a shorter time for the page to fully load
  setTimeout(() => {
    chrome.runtime.sendMessage({
      action: 'registerParticipant',
      participant: {
        id: aiService,
        name: getServiceName(aiService),
        url: window.location.href
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Error registering participant:', chrome.runtime.lastError);
      } else {
        console.log('Successfully registered participant:', aiService);
      }
    });
  }, 500); // Reduced from 2000ms to 500ms
});

function getServiceName(service) {
  switch (service) {
    case 'chatgpt': return 'ChatGPT';
    case 'claude': return 'Claude';
    case 'gemini': return 'Gemini';
    default: return 'Unknown Service';
  }
}
