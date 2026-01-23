/**
 * Riley's Daily Chronicle - Gemini Content Script
 * Monitors conversations on gemini.google.com
 */

(function() {
  'use strict';

  const PLATFORM = 'gemini';
  const MAX_RESPONSE_PREVIEW = 500;

  const processedMessages = new Set();
  let sessionStartTime = Date.now();
  let currentConversationId = null;
  let messageCount = 0;

  console.log('[Chronicle] Gemini monitor initialized');

  /**
   * Extract conversation ID
   */
  function getConversationId() {
    const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : 'gemini-session-' + Date.now();
  }

  /**
   * Detect tools used
   */
  function detectToolsUsed(element) {
    const tools = [];
    const text = element.textContent.toLowerCase();

    if (element.querySelector('pre code') || element.querySelector('code-block')) {
      tools.push('code');
    }

    if (text.includes('searched') || text.includes('google search')) {
      tools.push('google_search');
    }

    if (element.querySelector('img') || text.includes('generated image')) {
      tools.push('imagen');
    }

    if (text.includes('youtube') || text.includes('video')) {
      tools.push('youtube');
    }

    if (text.includes('maps') || text.includes('location')) {
      tools.push('maps');
    }

    if (text.includes('gmail') || text.includes('email')) {
      tools.push('gmail');
    }

    if (text.includes('drive') || text.includes('docs') || text.includes('sheets')) {
      tools.push('workspace');
    }

    return tools;
  }

  /**
   * Extract Drive URLs
   */
  function extractDriveUrls(text) {
    const drivePatterns = [
      /https:\/\/drive\.google\.com\/[^\s<>"]+/g,
      /https:\/\/docs\.google\.com\/[^\s<>"]+/g,
      /https:\/\/sheets\.google\.com\/[^\s<>"]+/g,
      /https:\/\/slides\.google\.com\/[^\s<>"]+/g
    ];

    const urls = [];
    drivePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) urls.push(...matches);
    });

    return [...new Set(urls)];
  }

  /**
   * Generate message ID
   */
  function generateMessageId(content) {
    const hash = content.slice(0, 100) + Date.now();
    return btoa(hash).slice(0, 16);
  }

  /**
   * Extract message content
   */
  function extractMessageContent(element) {
    const contentSelectors = [
      '.markdown-main-panel',
      '.model-response-text',
      '.query-text',
      '.prose',
      '[class*="content"]',
      'p'
    ];

    for (const selector of contentSelectors) {
      const content = element.querySelector(selector);
      if (content && content.textContent.trim()) {
        return content.textContent.trim();
      }
    }

    return element.textContent.trim();
  }

  /**
   * Get message type
   */
  function getMessageType(element) {
    // Check for user indicators
    if (element.classList.contains('user-query') ||
        element.querySelector('[class*="query"]') ||
        element.querySelector('[class*="user"]') ||
        element.getAttribute('data-author') === 'user') {
      return 'user';
    }

    // Check for Gemini response
    if (element.classList.contains('model-response') ||
        element.querySelector('[class*="response"]') ||
        element.querySelector('[class*="model"]') ||
        element.getAttribute('data-author') === 'model') {
      return 'assistant';
    }

    return 'assistant';
  }

  /**
   * Process message
   */
  function processMessage(element, type) {
    const content = extractMessageContent(element);
    if (!content || content.length < 2) return;

    const messageId = generateMessageId(content);
    if (processedMessages.has(messageId)) return;

    processedMessages.add(messageId);
    messageCount++;

    const conversationId = getConversationId();
    if (conversationId !== currentConversationId) {
      currentConversationId = conversationId;
      sessionStartTime = Date.now();
    }

    const messageData = {
      type: 'NEW_MESSAGE',
      data: {
        platform: PLATFORM,
        timestamp: new Date().toISOString(),
        conversationId: conversationId,
        conversationUrl: window.location.href,
        messageType: type,
        content: content.slice(0, MAX_RESPONSE_PREVIEW),
        contentLength: content.length,
        toolsUsed: type === 'assistant' ? detectToolsUsed(element) : [],
        driveUrls: extractDriveUrls(content),
        sessionDuration: Math.round((Date.now() - sessionStartTime) / 1000),
        messageIndex: messageCount
      }
    };

    console.log(`[Chronicle] Captured ${type} message:`, messageData.data.content.slice(0, 50) + '...');

    chrome.runtime.sendMessage(messageData).catch(err => {
      console.warn('[Chronicle] Failed to send message:', err);
    });
  }

  /**
   * Check for new messages
   */
  function checkForNewMessages(nodes) {
    nodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const messageSelectors = [
        '[class*="conversation-turn"]',
        '[class*="query"]',
        '[class*="response"]',
        '[class*="message"]',
        'message-content'
      ];

      messageSelectors.forEach(selector => {
        if (node.matches && node.matches(selector)) {
          const type = getMessageType(node);
          processMessage(node, type);
        }

        const elements = node.querySelectorAll ? node.querySelectorAll(selector) : [];
        elements.forEach(element => {
          const type = getMessageType(element);
          processMessage(element, type);
        });
      });
    });
  }

  /**
   * Scan existing messages
   */
  function scanExistingMessages() {
    console.log('[Chronicle] Scanning existing messages...');

    const messageSelectors = [
      '[class*="conversation-turn"]',
      '[class*="query"]',
      '[class*="response"]'
    ];

    messageSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        const type = getMessageType(element);
        processMessage(element, type);
      });
    });
  }

  /**
   * Setup observer
   */
  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          checkForNewMessages(Array.from(mutation.addedNodes));
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[Chronicle] MutationObserver active');
    return observer;
  }

  /**
   * Navigation tracking
   */
  function setupNavigationTracking() {
    let lastUrl = window.location.href;

    const checkUrl = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log('[Chronicle] Navigation detected:', lastUrl);

        const newConversationId = getConversationId();
        if (newConversationId !== currentConversationId) {
          currentConversationId = newConversationId;
          sessionStartTime = Date.now();
          messageCount = 0;
          processedMessages.clear();
          setTimeout(scanExistingMessages, 1000);
        }
      }
    };

    setInterval(checkUrl, 1000);
    window.addEventListener('popstate', checkUrl);
  }

  /**
   * Notify ready
   */
  function notifyReady() {
    chrome.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_READY',
      data: {
        platform: PLATFORM,
        url: window.location.href,
        conversationId: getConversationId()
      }
    }).catch(err => {
      console.warn('[Chronicle] Failed to notify ready:', err);
    });
  }

  // Initialize
  function init() {
    currentConversationId = getConversationId();
    setupObserver();
    setupNavigationTracking();
    setTimeout(scanExistingMessages, 2000);
    notifyReady();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
