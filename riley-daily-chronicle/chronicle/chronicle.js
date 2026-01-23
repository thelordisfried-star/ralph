/**
 * Riley's Daily Chronicle - Chronicle Page Script
 * Auto-populates the 1920s newspaper with captured AI activity data
 */

const PLATFORM_NAMES = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  grok: 'Grok',
  gemini: 'Gemini',
  copilot: 'Copilot'
};

const TOOL_NAMES = {
  artifacts: 'Artifacts',
  code: 'Code',
  web_search: 'Web Search',
  bing_search: 'Bing Search',
  file_analysis: 'File Analysis',
  dalle: 'DALL-E',
  code_interpreter: 'Code Interpreter',
  canvas: 'Canvas',
  designer: 'Designer',
  notebook: 'Notebook'
};

let currentMode = 'auto';
let chronicleData = null;

/**
 * Format date for masthead
 */
function formatDate(dateString) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const date = dateString ? new Date(dateString + 'T12:00:00') : new Date();
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format time from ISO string
 */
function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Generate session HTML for time period
 */
function generateSessionHTML(sessions) {
  if (!sessions || sessions.length === 0) {
    return '<p class="placeholder">No activity captured for this period...</p>';
  }

  return sessions.map(session => {
    const platformClass = session.platform;
    const platformName = PLATFORM_NAMES[session.platform] || session.platform;
    const time = formatTime(session.timestamp);
    const content = session.content || 'No content preview available';
    const type = session.messageType === 'user' ? 'You asked' : 'AI responded';

    return `
      <div class="session-entry">
        <span class="platform-tag ${platformClass}">${platformName}</span>
        <span class="session-time">${time}</span>
        <div class="session-content">
          <strong>${type}:</strong> ${escapeHTML(content.slice(0, 150))}${content.length > 150 ? '...' : ''}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Generate conversation log entries
 */
function generateConversationLog(conversations) {
  if (!conversations || conversations.length === 0) {
    return '<p class="placeholder">No conversations recorded today...</p>';
  }

  return conversations.slice(0, 10).map(conv => {
    const platformName = PLATFORM_NAMES[conv.platform] || conv.platform;
    const startTime = formatTime(conv.startTime);

    return `
      <div class="conversation-entry ${conv.platform}">
        <div class="conversation-platform">${platformName} Conversation</div>
        <div class="conversation-time">Started: ${startTime} | Messages: ${conv.messageCount}</div>
        <div class="conversation-preview">
          Total characters exchanged: ${conv.totalLength.toLocaleString()}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Generate Drive URLs list
 */
function generateDriveLinks(urls) {
  if (!urls || urls.length === 0) {
    return '<p class="placeholder">No Google Drive links detected in conversations...</p>';
  }

  return urls.map(url => {
    const displayUrl = url.length > 60 ? url.slice(0, 60) + '...' : url;
    return `<a href="${escapeHTML(url)}" target="_blank" class="drive-link">${escapeHTML(displayUrl)}</a>`;
  }).join('');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Get most active platform
 */
function getMostActivePlatform(platforms) {
  const entries = Object.entries(platforms || {}).filter(([_, count]) => count > 0);
  if (entries.length === 0) return 'None yet';

  const [platform] = entries.sort((a, b) => b[1] - a[1])[0];
  return PLATFORM_NAMES[platform] || platform;
}

/**
 * Get active platforms list
 */
function getActivePlatformsList(platforms) {
  const active = Object.entries(platforms || {})
    .filter(([_, count]) => count > 0)
    .map(([platform]) => PLATFORM_NAMES[platform] || platform);

  return active.length > 0 ? active.join(', ') : 'None yet';
}

/**
 * Get tools used list
 */
function getToolsList(tools) {
  const toolEntries = Object.entries(tools || {});
  if (toolEntries.length === 0) return 'None detected';

  return toolEntries
    .map(([tool]) => TOOL_NAMES[tool] || tool)
    .join(', ');
}

/**
 * Calculate peak hour
 */
function getPeakHour(sessions) {
  if (!sessions || sessions.length === 0) return 'N/A';

  const hourCounts = {};
  sessions.forEach(session => {
    const hour = new Date(session.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  if (peakHour === undefined) return 'N/A';

  const hour = parseInt(peakHour);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${suffix}`;
}

/**
 * Generate top win based on data
 */
function getTopWin(data) {
  const totalMessages = data.sessions?.length || 0;
  if (totalMessages === 0) return 'Start your first AI conversation!';

  const platforms = Object.values(data.stats?.platformBreakdown || {}).filter(v => v > 0).length;

  if (totalMessages > 50) return `${totalMessages} messages across ${platforms} platforms!`;
  if (totalMessages > 20) return `Active day with ${totalMessages} AI interactions`;
  if (totalMessages > 0) return `${totalMessages} messages captured`;

  return 'Building your chronicle...';
}

/**
 * Generate journal content from longest conversation
 */
function generateJournalContent(data) {
  const longestConvId = data.highlights?.longestConversation;
  if (!longestConvId || !data.conversations?.[longestConvId]) {
    return '<p class="placeholder">Your most significant conversation will be highlighted here...</p>';
  }

  const conv = data.conversations[longestConvId];
  const platformName = PLATFORM_NAMES[conv.platform] || conv.platform;

  return `
    <p><strong>Today's deepest work:</strong> A ${conv.messageCount}-message conversation with ${platformName}.</p>
    <p>Total exchange: ${conv.totalLength.toLocaleString()} characters of collaborative thinking.</p>
    <p>This represents your most substantial AI interaction of the day.</p>
  `;
}

/**
 * Get quote of the day
 */
function getQuoteOfDay(data) {
  const quotes = data.highlights?.quotableResponses || [];
  if (quotes.length === 0) {
    return 'Notable AI insights from your conversations will appear here...';
  }

  const quote = quotes[0];
  const platformName = PLATFORM_NAMES[quote.platform] || quote.platform;
  return `"${quote.content}..." — ${platformName}`;
}

/**
 * Populate the chronicle with data
 */
function populateChronicle(data) {
  chronicleData = data;

  // Update date
  document.getElementById('currentDate').textContent = formatDate(data.date);

  // Update stats bar
  const activePlatforms = Object.values(data.stats?.platformBreakdown || {}).filter(v => v > 0).length;
  const toolsCount = Object.keys(data.stats?.toolsUsed || {}).length;

  document.getElementById('statMessages').textContent = data.sessions?.length || 0;
  document.getElementById('statPlatforms').textContent = activePlatforms;
  document.getElementById('statTools').textContent = toolsCount;
  document.getElementById('statDrive').textContent = data.stats?.driveUrls?.length || 0;

  // Populate time-based sections
  document.getElementById('morningAuto').innerHTML = generateSessionHTML(data.organized?.morning);
  document.getElementById('afternoonAuto').innerHTML = generateSessionHTML(data.organized?.afternoon);
  document.getElementById('eveningAuto').innerHTML = generateSessionHTML(data.organized?.evening);

  // Populate Drive section
  document.getElementById('driveAuto').innerHTML = generateDriveLinks(data.stats?.driveUrls);

  // Populate sidebar
  document.getElementById('topWinAuto').innerHTML = getTopWin(data);
  document.getElementById('conversationsAuto').innerHTML = Object.keys(data.conversations || {}).length.toString();
  document.getElementById('mostActiveAuto').innerHTML = getMostActivePlatform(data.stats?.platformBreakdown);
  document.getElementById('platformsAuto').innerHTML = getActivePlatformsList(data.stats?.platformBreakdown);
  document.getElementById('toolsAuto').innerHTML = getToolsList(data.stats?.toolsUsed);
  document.getElementById('peakHourAuto').innerHTML = getPeakHour(data.sessions);

  // Populate journal
  document.getElementById('journalAuto').innerHTML = generateJournalContent(data);

  // Populate quote
  document.getElementById('quoteAuto').innerHTML = `<p>${getQuoteOfDay(data)}</p>`;

  // Populate conversation log
  document.getElementById('conversationLog').innerHTML = generateConversationLog(data.conversationSummaries);
}

/**
 * Load chronicle data from background
 */
async function loadChronicleData() {
  document.body.classList.add('loading');

  try {
    const data = await chrome.runtime.sendMessage({ type: 'GET_CHRONICLE' });
    populateChronicle(data);
  } catch (error) {
    console.error('[Chronicle] Error loading data:', error);
    document.getElementById('currentDate').textContent = 'Error loading data - check extension';
  } finally {
    document.body.classList.remove('loading');
  }
}

/**
 * Toggle between auto and edit mode
 */
function setMode(mode) {
  currentMode = mode;

  // Update button states
  document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // Toggle body class
  document.body.classList.toggle('edit-mode', mode === 'edit');

  // Enable/disable contenteditable
  document.querySelectorAll('.editable').forEach(el => {
    el.contentEditable = mode === 'edit' ? 'true' : 'false';
  });
}

/**
 * Save to local storage
 */
function saveToLocalStorage() {
  const editableElements = document.querySelectorAll('.editable');
  const data = {};

  editableElements.forEach((el, index) => {
    data[`field_${index}`] = el.innerHTML;
  });

  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(`chronicle_manual_${today}`, JSON.stringify(data));

  alert('Today\'s Chronicle saved!');
}

/**
 * Load from local storage
 */
function loadFromLocalStorage() {
  const today = new Date().toISOString().split('T')[0];
  const saved = localStorage.getItem(`chronicle_manual_${today}`);

  if (saved) {
    const data = JSON.parse(saved);
    const editableElements = document.querySelectorAll('.editable');

    editableElements.forEach((el, index) => {
      if (data[`field_${index}`]) {
        el.innerHTML = data[`field_${index}`];
      }
    });

    alert('Saved manual entries loaded!');
  } else {
    alert('No saved manual entries found for today.');
  }
}

/**
 * Clear all manual entries
 */
function clearAll() {
  if (confirm('Clear all manual entries and start fresh?')) {
    document.querySelectorAll('.editable').forEach(el => {
      el.innerHTML = '';
    });
  }
}

/**
 * Export to PDF (opens print dialog)
 */
function exportPDF() {
  // Temporarily hide controls for printing
  document.querySelector('.mode-toggle').style.display = 'none';
  document.querySelector('.btn-container').style.display = 'none';

  window.print();

  // Restore controls
  document.querySelector('.mode-toggle').style.display = 'flex';
  document.querySelector('.btn-container').style.display = 'flex';
}

/**
 * Archive today's data
 */
async function archiveToday() {
  try {
    const data = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronicle-${data.today.date}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert('Chronicle archived as JSON file!');
  } catch (error) {
    console.error('[Chronicle] Archive error:', error);
    alert('Error archiving data. Check console for details.');
  }
}

// Event listeners
document.getElementById('autoModeBtn').addEventListener('click', () => setMode('auto'));
document.getElementById('editModeBtn').addEventListener('click', () => setMode('edit'));
document.getElementById('refreshBtn').addEventListener('click', loadChronicleData);
document.getElementById('exportBtn').addEventListener('click', exportPDF);
document.getElementById('archiveBtn').addEventListener('click', archiveToday);

// Make functions globally available for inline onclick handlers
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.clearAll = clearAll;

// Auto-save in edit mode
setInterval(() => {
  if (currentMode === 'edit') {
    const editableElements = document.querySelectorAll('.editable');
    let hasContent = false;

    editableElements.forEach(el => {
      if (el.innerHTML.trim()) hasContent = true;
    });

    if (hasContent) {
      saveToLocalStorage();
    }
  }
}, 120000); // Auto-save every 2 minutes

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setMode('auto');
  loadChronicleData();

  // Load any saved manual entries
  const today = new Date().toISOString().split('T')[0];
  const saved = localStorage.getItem(`chronicle_manual_${today}`);
  if (saved) {
    const data = JSON.parse(saved);
    const editableElements = document.querySelectorAll('.editable');
    editableElements.forEach((el, index) => {
      if (data[`field_${index}`]) {
        el.innerHTML = data[`field_${index}`];
      }
    });
  }
});
