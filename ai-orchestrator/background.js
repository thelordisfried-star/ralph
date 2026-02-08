// Background script for AI Orchestration Toolkit

// Initialize storage if empty
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['conversationState'], (result) => {
    if (!result.conversationState) {
      chrome.storage.local.set({
        conversationState: {
          participants: [],
          messages: [],
          currentIndex: 0,
          isRunning: false
        }
      });
    }
  });
});

// Helper to get state
function getState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['conversationState'], (result) => {
      resolve(result.conversationState || {
        participants: [],
        messages: [],
        currentIndex: 0,
        isRunning: false
      });
    });
  });
}

// Helper to set state
function setState(newState) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ conversationState: newState }, resolve);
  });
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  // Async handling wrapper
  (async () => {
    try {
      switch (request.action) {
        case 'registerParticipant':
          await registerParticipant(request.participant, sender.tab.id);
          sendResponse({ success: true });
          break;

        case 'extractText':
          // Request text extraction from content script with enhanced retry mechanism
          let extractResponse = null;
          // Increase retry attempts for extraction as generation can take time
          const maxExtractRetries = 10;
          for (let i = 0; i < maxExtractRetries; i++) {
            extractResponse = await new Promise(resolve => {
              // Check if tab still exists before sending message
              if (!sender.tab) {
                  resolve({ success: false, error: 'Sender tab is undefined' });
                  return;
              }

              chrome.tabs.get(sender.tab.id, async (tab) => {
                if (chrome.runtime.lastError) {
                  resolve({ success: false, error: 'Tab no longer exists' });
                  return;
                }

                chrome.tabs.sendMessage(sender.tab.id, {
                  action: 'extractText'
                }, response => {
                  // If we get a response, resolve immediately
                  if (response) {
                    resolve(response);
                  } else if (chrome.runtime.lastError) {
                    // If there's an error, resolve with error info
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                  } else {
                    // If no response, wait a shorter time and try again
                    setTimeout(() => resolve(null), 500); // Increased wait time slightly
                  }
                });
              });
            });

            if (extractResponse && extractResponse.success) {
              break;
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          sendResponse(extractResponse);
          break;

        case 'injectText':
          // Send text to content script for injection with enhanced retry mechanism
          let injectResponse = null;
          for (let i = 0; i < 5; i++) {
            injectResponse = await new Promise(resolve => {
              // Check if tab still exists before sending message
              if (!sender.tab) {
                  resolve({ success: false, error: 'Sender tab is undefined' });
                  return;
              }

              chrome.tabs.get(sender.tab.id, async (tab) => {
                if (chrome.runtime.lastError) {
                  resolve({ success: false, error: 'Tab no longer exists' });
                  return;
                }

                chrome.tabs.sendMessage(sender.tab.id, {
                  action: 'injectText',
                  text: request.text
                }, response => {
                  if (response) {
                    resolve(response);
                  } else if (chrome.runtime.lastError) {
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                  } else {
                    setTimeout(() => resolve(null), 200);
                  }
                });
              });
            });

            if (injectResponse && injectResponse.success) {
              break;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
          }

          sendResponse(injectResponse);
          break;

        case 'startConversation':
          await startConversation(request.participants, request.initialPrompt);
          sendResponse({ success: true });
          break;

        case 'pauseConversation':
          await pauseConversation();
          sendResponse({ success: true });
          break;

        case 'resetConversation':
          await resetConversation();
          sendResponse({ success: true });
          break;

        case 'getState':
          const state = await getState();
          sendResponse({ state: state });
          break;

        case 'saveConversation':
          // In a real implementation, this would save to a separate storage area
          console.log('Saving conversation:', request.name);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});

async function registerParticipant(participant, tabId) {
  let state = await getState();

  // Check if participant already exists
  const existingIndex = state.participants.findIndex(p => p.id === participant.id);

  if (existingIndex >= 0) {
    // Update existing participant
    state.participants[existingIndex] = { ...participant, tabId };
  } else {
    // Add new participant
    state.participants.push({ ...participant, tabId });
  }

  await setState(state);
  console.log('Registered participant:', participant, 'with tabId:', tabId);
}

async function startConversation(participants, initialPrompt) {
  let state = await getState();
  state.participants = participants;
  state.messages = [{
    sender: 'user',
    text: initialPrompt,
    timestamp: new Date().toISOString()
  }];
  state.currentIndex = 0;
  state.isRunning = true;

  await setState(state);

  // Notify popup of state change
  chrome.runtime.sendMessage({
    action: 'stateUpdated',
    state: state
  }).catch(() => {}); // Catch error if popup is closed

  // Start the conversation loop
  processConversation();
}

async function processConversation() {
  let state = await getState();

  if (!state.isRunning || state.currentIndex >= state.participants.length) {
    return;
  }

  const currentParticipant = state.participants[state.currentIndex];

  try {
    // Inject the accumulated context into the current participant's tab
    const context = buildContext(state);

    // Send text with optimized retry mechanism
    let injectSuccess = false;
    let injectError = null;

    for (let i = 0; i < 3; i++) {
      const response = await new Promise(resolve => {
        chrome.tabs.sendMessage(currentParticipant.tabId, {
          action: 'injectText',
          text: context
        }, resolve);
      });

      if (response && response.success) {
        injectSuccess = true;
        break;
      } else if (response && response.error) {
        injectError = response.error;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!injectSuccess) {
      throw new Error(`Failed to inject text to ${currentParticipant.name}: ${injectError || 'Unknown error'}`);
    }

    // Wait for the AI to respond with improved detection
    await waitForResponse(currentParticipant.tabId, currentParticipant.id);

    // Extract the response with optimized retry mechanism
    let extractedResponse = null;
    let extractError = null;

    // Increased retries for final extraction after waitForResponse signals completion
    for (let i = 0; i < 5; i++) {
      extractedResponse = await new Promise(resolve => {
        chrome.tabs.sendMessage(currentParticipant.tabId, {
          action: 'extractText'
        }, resolve);
      });

      if (extractedResponse && extractedResponse.success) {
        break;
      } else if (extractedResponse && extractedResponse.error) {
        extractError = extractedResponse.error;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!extractedResponse || !extractedResponse.success) {
      throw new Error(`Failed to extract response from ${currentParticipant.name}: ${extractError || 'Unknown error'}`);
    }

    // Add response to messages
    state = await getState(); // Refresh state before update
    if (!state.isRunning) return; // Check if stopped while waiting

    state.messages.push({
      sender: currentParticipant.id,
      text: extractedResponse.text,
      timestamp: new Date().toISOString()
    });

    // Notify popup of state change
    chrome.runtime.sendMessage({
      action: 'stateUpdated',
      state: state
    }).catch(() => {}); // Catch error if popup is closed

    // Move to next participant
    state.currentIndex++;

    // Loop back to the beginning if we want continuous conversation
    if (state.currentIndex >= state.participants.length) {
      state.currentIndex = 0; // Reset to beginning for continuous conversation
    }

    await setState(state);

    // Continue conversation
    setTimeout(processConversation, 1000); // Small delay between AIs

  } catch (error) {
    console.error('Error in conversation processing:', error);
    state = await getState();
    state.isRunning = false;
    await setState(state);

    // Notify user of error
    chrome.runtime.sendMessage({
      action: 'errorOccurred',
      error: error.message
    }).catch(() => {});
  }
}

function buildContext(state) {
  let context = "Continue the conversation with the following context:\n\n";

  state.messages.forEach((message) => {
    const senderName = message.sender === 'user' ? 'User' :
      state.participants.find(p => p.id === message.sender)?.name || message.sender;
    context += `${senderName}: ${message.text}\n\n`;
  });

  return context;
}

function waitForResponse(tabId, serviceId) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    // Increased timeout for long responses (e.g. GPT-4 thinking)
    const maxAttempts = 60; // 60 * 2s = 120s = 2 minutes active checking

    const checkInterval = setInterval(() => {
      chrome.tabs.sendMessage(tabId, {
        action: 'checkResponse'
      }, (response) => {
        // Handle message passing errors (e.g. tab closed)
        if (chrome.runtime.lastError) {
             clearInterval(checkInterval);
             reject(new Error(`Connection error with ${serviceId}: ${chrome.runtime.lastError.message}`));
             return;
        }

        // If we get a response and it has a response, resolve
        if (response && response.hasResponse) {
          clearInterval(checkInterval);
          resolve();
          return;
        }

        // If we get an explicit error from content script
        if (response && response.error) {
          // Log but don't fail immediately, retry
          console.warn(`Error checking response from ${serviceId}: ${response.error}`);
        }

        // Increment attempts and check if we've exceeded max
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          // Resolve anyway, and let extraction attempt one last time
          console.warn(`Timeout waiting for response from ${serviceId}, proceeding to extraction attempt.`);
          resolve();
        }
      });
    }, 2000); // Check every 2 seconds

    // Additional absolute timeout safety net
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 180000); // 3 minutes
  });
}

async function pauseConversation() {
  let state = await getState();
  state.isRunning = false;
  await setState(state);
}

async function resetConversation() {
  await setState({
    participants: [],
    messages: [],
    currentIndex: 0,
    isRunning: false
  });
}
