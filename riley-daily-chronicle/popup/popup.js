/**
 * Riley's Daily Chronicle - Popup Script
 * Quick stats view and navigation
 */

const PLATFORM_NAMES = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  grok: 'Grok',
  gemini: 'Gemini',
  copilot: 'Copilot'
};

/**
 * Format date for display
 */
function formatDate(dateString) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const date = dateString ? new Date(dateString) : new Date();
  return date.toLocaleDateString('en-US', options);
}

/**
 * Update the stats display
 */
function updateStats(stats) {
  // Update date
  document.getElementById('currentDate').textContent = formatDate(stats.date);

  // Update main stats
  document.getElementById('totalMessages').textContent = stats.totalMessages || 0;
  document.getElementById('totalPrompts').textContent = stats.totalPrompts || 0;
  document.getElementById('totalResponses').textContent = stats.totalResponses || 0;

  // Count active platforms
  const activePlatforms = Object.values(stats.platforms || {}).filter(v => v > 0).length;
  document.getElementById('platformCount').textContent = activePlatforms;

  // Update platform bars
  updatePlatformBars(stats.platforms || {});

  // Update time distribution
  const timePeriods = stats.timePeriods || { morning: {}, afternoon: {}, evening: {} };
  document.getElementById('morningCount').textContent =
    (timePeriods.morning.prompts || 0) + (timePeriods.morning.responses || 0);
  document.getElementById('afternoonCount').textContent =
    (timePeriods.afternoon.prompts || 0) + (timePeriods.afternoon.responses || 0);
  document.getElementById('eveningCount').textContent =
    (timePeriods.evening.prompts || 0) + (timePeriods.evening.responses || 0);

  // Update highlights
  document.getElementById('mostActiveValue').textContent =
    PLATFORM_NAMES[stats.mostActivePlatform] || 'None yet';
  document.getElementById('toolsUsedValue').textContent = stats.toolsUsed || 0;
  document.getElementById('driveLinksValue').textContent = stats.driveUrls || 0;

  // Remove loading state
  document.body.classList.remove('loading');
}

/**
 * Update platform breakdown bars
 */
function updatePlatformBars(platforms) {
  const container = document.getElementById('platformBars');
  container.innerHTML = '';

  const maxValue = Math.max(...Object.values(platforms), 1);

  Object.entries(PLATFORM_NAMES).forEach(([key, name]) => {
    const count = platforms[key] || 0;
    const percentage = (count / maxValue) * 100;

    const bar = document.createElement('div');
    bar.className = 'platform-bar';
    bar.setAttribute('data-platform', key);

    bar.innerHTML = `
      <span class="platform-name">${name}</span>
      <div class="platform-bar-container">
        <div class="platform-bar-fill" style="width: ${percentage}%"></div>
      </div>
      <span class="platform-count">${count}</span>
    `;

    container.appendChild(bar);
  });
}

/**
 * Load stats from background
 */
async function loadStats() {
  document.body.classList.add('loading');

  try {
    const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    updateStats(stats);
  } catch (error) {
    console.error('[Chronicle Popup] Error loading stats:', error);
    document.getElementById('currentDate').textContent = 'Error loading data';
  }
}

/**
 * Open full chronicle page
 */
function openChronicle() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('chronicle/chronicle.html')
  });
}

// Event listeners
document.getElementById('openChronicle').addEventListener('click', openChronicle);
document.getElementById('refreshStats').addEventListener('click', loadStats);

// Initial load
document.addEventListener('DOMContentLoaded', loadStats);
