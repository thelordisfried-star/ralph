// Popup script for AI Orchestration Toolkit

// DOM elements
const participantsList = document.getElementById('participantsList');
const initialPrompt = document.getElementById('initialPrompt');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const conversationLog = document.getElementById('conversationLog');
const saveName = document.getElementById('saveName');
const saveBtn = document.getElementById('saveBtn');

// Add event listeners
document.addEventListener('DOMContentLoaded', initializePopup);
startBtn.addEventListener('click', startConversation);
pauseBtn.addEventListener('click', pauseConversation);
resetBtn.addEventListener('click', resetConversation);
saveBtn.addEventListener('click', saveConversation);

// Utility functions for UI feedback
function showError(message) {
  // Create error element if it doesn't exist
  let errorElement = document.getElementById('error-message');
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.id = 'error-message';
    errorElement.style.color = '#d32f2f';
    errorElement.style.backgroundColor = '#ffebee';
    errorElement.style.padding = '10px';
    errorElement.style.margin = '10px 0';
    errorElement.style.borderRadius = '4px';
    errorElement.style.border = '1px solid #ffcdd2';
    errorElement.style.display = 'none';

    // Insert after the initial prompt
    initialPrompt.parentNode.insertBefore(errorElement, initialPrompt.nextSibling);
  }

  // Set error message and show
  errorElement.textContent = message;
  errorElement.style.display = 'block';

  // Hide error after 5 seconds
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, 5000);
}

function showLoadingIndicator(message) {
  // Remove existing loading indicator if present
  hideLoadingIndicator();

  // Create loading indicator
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'loading-indicator';
  loadingIndicator.textContent = message;
  loadingIndicator.style.padding = '10px';
  loadingIndicator.style.margin = '10px 0';
  loadingIndicator.style.backgroundColor = '#f0f0f0';
  loadingIndicator.style.borderRadius = '4px';
  loadingIndicator.style.textAlign = 'center';

  // Insert loading indicator after the initial prompt
  initialPrompt.parentNode.insertBefore(loadingIndicator, initialPrompt.nextSibling);
}

function hideLoadingIndicator() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator && loadingIndicator.parentNode) {
    loadingIndicator.parentNode.removeChild(loadingIndicator);
  }
}

// Initialize the popup
function initializePopup() {
  // Get the current state from background script
  chrome.runtime.sendMessage({
    action: 'getState'
  }, (response) => {
    if (response && response.state) {
      updateUI(response.state);
    }
  });

  // Listen for state updates from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'stateUpdated') {
      updateUI(request.state);
    }
  });
}

// Update the UI based on the current state
function updateUI(state) {
  // Update participants list
  updateParticipantsList(state.participants);

  // Update conversation log
  updateConversationLog(state.messages);

  // Update button states based on conversation status
  if (state.isRunning) {
    startBtn.disabled = true;
    pauseBtn.disabled = false;
  } else {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }
}

// Update the participants list
function updateParticipantsList(participants) {
  participantsList.innerHTML = '';

  if (participants.length === 0) {
    const li = document.createElement('li');
    li.className = 'participant-item';
    li.textContent = 'No active participants';
    participantsList.appendChild(li);
    return;
  }

  participants.forEach(participant => {
    const li = document.createElement('li');
    li.className = 'participant-item';

    const statusDiv = document.createElement('div');
    statusDiv.className = 'participant-status status-active';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'participant-name';
    nameDiv.textContent = participant.name;

    li.appendChild(statusDiv);
    li.appendChild(nameDiv);
    participantsList.appendChild(li);
  });
}

// Update the conversation log
function updateConversationLog(messages) {
  conversationLog.innerHTML = '';

  if (messages.length === 0) {
    conversationLog.innerHTML = '<div>No messages yet</div>';
    return;
  }

  messages.forEach(message => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${message.sender === 'user' ? 'user' : 'ai'}`;

    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = message.sender === 'user' ? 'User' : message.sender;

    const textDiv = document.createElement('div');
    textDiv.textContent = message.text;

    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(textDiv);
    conversationLog.appendChild(messageDiv);
  });

  // Scroll to bottom
  conversationLog.scrollTop = conversationLog.scrollHeight;
}

// Start the conversation
function startConversation() {
  const promptText = initialPrompt.value.trim();

  if (!promptText) {
    showError('Please enter an initial prompt');
    return;
  }

  // Show loading indicator
  showLoadingIndicator('Starting conversation...');

  // Disable buttons during conversation
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = false;

  // Get participants from background script
  chrome.runtime.sendMessage({
    action: 'getState'
  }, (response) => {
    if (response && response.state && response.state.participants) {
      const participants = response.state.participants;

      if (participants.length === 0) {
        // Remove loading indicator
        hideLoadingIndicator();
        // Re-enable start button
        startBtn.disabled = false;
        showError('No active participants detected. Please open AI service tabs.');
        return;
      }

      // Send start conversation request to background script
      chrome.runtime.sendMessage({
        action: 'startConversation',
        participants: participants,
        initialPrompt: promptText
      }, (response) => {
        // Remove loading indicator regardless of success/failure
        hideLoadingIndicator();

        if (response && response.success) {
          console.log('Conversation started successfully');
        } else {
          // Re-enable start button on failure
          startBtn.disabled = false;
          console.error('Failed to start conversation:', response?.error);
          showError('Failed to start conversation: ' + (response?.error || 'Unknown error'));
        }
      });
    } else {
      // Remove loading indicator if we can't get state
      hideLoadingIndicator();
      // Re-enable start button
      startBtn.disabled = false;
      console.error('Failed to get state');
      showError('Failed to get conversation state');
    }
  });
}

// Pause the conversation
function pauseConversation() {
  chrome.runtime.sendMessage({
    action: 'pauseConversation'
  }, (response) => {
    if (response && response.success) {
      console.log('Conversation paused');
    } else {
      console.error('Failed to pause conversation');
    }
  });
}

// Reset the conversation
function resetConversation() {
  // Show loading indicator
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'loading-indicator';
  loadingIndicator.textContent = 'Resetting conversation...';
  loadingIndicator.style.padding = '10px';
  loadingIndicator.style.margin = '10px 0';
  loadingIndicator.style.backgroundColor = '#f0f0f0';
  loadingIndicator.style.borderRadius = '4px';
  loadingIndicator.style.textAlign = 'center';

  // Insert loading indicator after the initial prompt
  initialPrompt.parentNode.insertBefore(loadingIndicator, initialPrompt.nextSibling);

  chrome.runtime.sendMessage({
    action: 'resetConversation'
  }, (response) => {
    // Remove loading indicator
    if (loadingIndicator.parentNode) {
      loadingIndicator.parentNode.removeChild(loadingIndicator);
    }

    if (response && response.success) {
      console.log('Conversation reset');
      // Clear the UI
      updateUI({
        participants: [],
        messages: [],
        currentIndex: 0,
        isRunning: false
      });
      initialPrompt.value = '';

      // Update button states
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      resetBtn.disabled = true;
    } else {
      console.error('Failed to reset conversation');
      alert('Failed to reset conversation');
    }
  });
}

// Save the conversation
function saveConversation() {
  const name = saveName.value.trim();

  if (!name) {
    alert('Please enter a name for the conversation');
    return;
  }

  chrome.runtime.sendMessage({
    action: 'saveConversation',
    name: name
  }, (response) => {
    if (response && response.success) {
      alert(`Conversation "${name}" saved successfully`);
      saveName.value = '';
    } else {
      alert('Failed to save conversation');
    }
  });
}
