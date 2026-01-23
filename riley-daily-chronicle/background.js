/**
 * Riley's Daily Chronicle - Background Service Worker
 * Aggregates data from content scripts and manages storage
 */

// Storage keys
const STORAGE_KEY_TODAY = 'chronicle_today';
const STORAGE_KEY_ARCHIVE = 'chronicle_archive';
const STORAGE_KEY_SETTINGS = 'chronicle_settings';

// Platform display names
const PLATFORM_NAMES = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  grok: 'Grok',
  gemini: 'Gemini',
  copilot: 'Copilot'
};

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get hour of day from timestamp
 */
function getHourFromTimestamp(timestamp) {
  return new Date(timestamp).getHours();
}

/**
 * Get time period (morning/afternoon/evening) from timestamp
 */
function getTimePeriod(timestamp) {
  const hour = getHourFromTimestamp(timestamp);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Initialize today's data structure
 */
function createDayStructure(date) {
  return {
    date: date,
    sessions: [],
    conversations: {},
    stats: {
      totalSessions: 0,
      platformBreakdown: {
        claude: 0,
        chatgpt: 0,
        grok: 0,
        gemini: 0,
        copilot: 0
      },
      totalPrompts: 0,
      totalResponses: 0,
      totalDuration: 0,
      toolsUsed: {},
      driveUrls: [],
      timePeriods: {
        morning: { prompts: 0, responses: 0 },
        afternoon: { prompts: 0, responses: 0 },
        evening: { prompts: 0, responses: 0 }
      }
    },
    highlights: {
      longestConversation: null,
      mostActiveHour: null,
      quotableResponses: []
    }
  };
}

/**
 * Get or create today's data
 */
async function getTodayData() {
  const today = getTodayString();

  try {
    const result = await chrome.storage.local.get([STORAGE_KEY_TODAY]);
    let data = result[STORAGE_KEY_TODAY];

    // If no data or different day, create new structure
    if (!data || data.date !== today) {
      // Archive previous day if exists
      if (data && data.date !== today) {
        await archiveDay(data);
      }

      data = createDayStructure(today);
      await chrome.storage.local.set({ [STORAGE_KEY_TODAY]: data });
    }

    return data;
  } catch (error) {
    console.error('[Chronicle] Error getting today data:', error);
    return createDayStructure(today);
  }
}

/**
 * Archive a completed day
 */
async function archiveDay(dayData) {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY_ARCHIVE]);
    const archive = result[STORAGE_KEY_ARCHIVE] || {};

    archive[dayData.date] = dayData;

    // Keep only last 30 days
    const dates = Object.keys(archive).sort().reverse();
    if (dates.length > 30) {
      dates.slice(30).forEach(date => delete archive[date]);
    }

    await chrome.storage.local.set({ [STORAGE_KEY_ARCHIVE]: archive });
    console.log('[Chronicle] Archived day:', dayData.date);
  } catch (error) {
    console.error('[Chronicle] Error archiving day:', error);
  }
}

/**
 * Update today's data with new message
 */
async function processNewMessage(messageData) {
  try {
    const data = await getTodayData();
    const {
      platform,
      timestamp,
      conversationId,
      conversationUrl,
      messageType,
      content,
      contentLength,
      toolsUsed,
      driveUrls,
      sessionDuration
    } = messageData;

    // Create session entry
    const session = {
      platform,
      timestamp,
      conversationId,
      conversationUrl,
      messageType,
      content,
      contentLength,
      toolsUsed: toolsUsed || [],
      driveUrls: driveUrls || [],
      duration: sessionDuration || 0
    };

    // Add to sessions
    data.sessions.push(session);

    // Update conversation tracking
    if (!data.conversations[conversationId]) {
      data.conversations[conversationId] = {
        platform,
        url: conversationUrl,
        startTime: timestamp,
        messageCount: 0,
        totalLength: 0
      };
      data.stats.totalSessions++;
    }

    data.conversations[conversationId].messageCount++;
    data.conversations[conversationId].totalLength += contentLength;
    data.conversations[conversationId].lastTime = timestamp;

    // Update stats
    data.stats.platformBreakdown[platform]++;

    if (messageType === 'user') {
      data.stats.totalPrompts++;
    } else {
      data.stats.totalResponses++;
    }

    // Track tools used
    if (toolsUsed && toolsUsed.length > 0) {
      toolsUsed.forEach(tool => {
        data.stats.toolsUsed[tool] = (data.stats.toolsUsed[tool] || 0) + 1;
      });
    }

    // Track Drive URLs
    if (driveUrls && driveUrls.length > 0) {
      data.stats.driveUrls.push(...driveUrls);
      data.stats.driveUrls = [...new Set(data.stats.driveUrls)];
    }

    // Update time period stats
    const period = getTimePeriod(timestamp);
    if (messageType === 'user') {
      data.stats.timePeriods[period].prompts++;
    } else {
      data.stats.timePeriods[period].responses++;
    }

    // Update duration
    data.stats.totalDuration = Math.max(data.stats.totalDuration, sessionDuration || 0);

    // Update highlights - longest conversation
    const conv = data.conversations[conversationId];
    if (!data.highlights.longestConversation ||
        conv.messageCount > (data.conversations[data.highlights.longestConversation]?.messageCount || 0)) {
      data.highlights.longestConversation = conversationId;
    }

    // Track quotable responses (longer AI responses)
    if (messageType === 'assistant' && contentLength > 200 && data.highlights.quotableResponses.length < 10) {
      data.highlights.quotableResponses.push({
        platform,
        content: content.slice(0, 200),
        timestamp
      });
    }

    // Save updated data
    await chrome.storage.local.set({ [STORAGE_KEY_TODAY]: data });

    console.log(`[Chronicle] Processed ${messageType} from ${platform}, total: ${data.sessions.length} messages`);

    return data;
  } catch (error) {
    console.error('[Chronicle] Error processing message:', error);
  }
}

/**
 * Get stats summary for popup
 */
async function getStatsSummary() {
  const data = await getTodayData();

  return {
    date: data.date,
    totalMessages: data.sessions.length,
    totalPrompts: data.stats.totalPrompts,
    totalResponses: data.stats.totalResponses,
    platforms: data.stats.platformBreakdown,
    toolsUsed: Object.keys(data.stats.toolsUsed).length,
    driveUrls: data.stats.driveUrls.length,
    timePeriods: data.stats.timePeriods,
    mostActivePlatform: Object.entries(data.stats.platformBreakdown)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'
  };
}

/**
 * Get full chronicle data for newspaper view
 */
async function getChronicleData() {
  const data = await getTodayData();

  // Organize sessions by time period
  const organized = {
    morning: [],
    afternoon: [],
    evening: []
  };

  data.sessions.forEach(session => {
    const period = getTimePeriod(session.timestamp);
    organized[period].push(session);
  });

  // Get conversation summaries
  const conversationSummaries = Object.entries(data.conversations).map(([id, conv]) => ({
    id,
    ...conv,
    platformName: PLATFORM_NAMES[conv.platform]
  })).sort((a, b) => b.messageCount - a.messageCount);

  // Get top quote
  const topQuote = data.highlights.quotableResponses[0]?.content || null;

  return {
    ...data,
    organized,
    conversationSummaries,
    topQuote,
    platformNames: PLATFORM_NAMES
  };
}

/**
 * Clear today's data (for fresh start)
 */
async function clearTodayData() {
  const today = getTodayString();
  const freshData = createDayStructure(today);
  await chrome.storage.local.set({ [STORAGE_KEY_TODAY]: freshData });
  console.log('[Chronicle] Today\'s data cleared');
  return freshData;
}

/**
 * Export data as JSON
 */
async function exportData() {
  const today = await getTodayData();
  const archiveResult = await chrome.storage.local.get([STORAGE_KEY_ARCHIVE]);
  const archive = archiveResult[STORAGE_KEY_ARCHIVE] || {};

  return {
    exportDate: new Date().toISOString(),
    today,
    archive
  };
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    switch (message.type) {
      case 'NEW_MESSAGE':
        return await processNewMessage(message.data);

      case 'CONTENT_SCRIPT_READY':
        console.log(`[Chronicle] Content script ready: ${message.data.platform} at ${message.data.url}`);
        return { status: 'acknowledged' };

      case 'GET_STATS':
        return await getStatsSummary();

      case 'GET_CHRONICLE':
        return await getChronicleData();

      case 'CLEAR_TODAY':
        return await clearTodayData();

      case 'EXPORT_DATA':
        return await exportData();

      default:
        console.warn('[Chronicle] Unknown message type:', message.type);
        return { error: 'Unknown message type' };
    }
  };

  handleMessage().then(sendResponse).catch(error => {
    console.error('[Chronicle] Message handling error:', error);
    sendResponse({ error: error.message });
  });

  return true; // Keep channel open for async response
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Chronicle] Extension installed/updated:', details.reason);

  // Initialize today's data
  await getTodayData();

  // Set default settings
  const defaultSettings = {
    autoCapture: true,
    notifications: false,
    theme: 'art-deco'
  };

  const result = await chrome.storage.local.get([STORAGE_KEY_SETTINGS]);
  if (!result[STORAGE_KEY_SETTINGS]) {
    await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: defaultSettings });
  }
});

// Periodic cleanup (every hour)
chrome.alarms.create('dailyCheck', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyCheck') {
    // This will automatically archive yesterday if needed
    await getTodayData();
  }
});

console.log('[Chronicle] Background service worker initialized');
