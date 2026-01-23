/**
 * Riley's Daily Chronicle - Copilot Content Script
 * Monitors conversations on copilot.microsoft.com
 */

(function() {
  'use strict';

  const PLATFORM = 'copilot';
  const MAX_RESPONSE_PREVIEW = 500;

  const processedMessages = new Set();
  let sessionStartTime = Date.now();
  let currentConversationId = null;
  let messageCount = 0;

  console.log('[Chronicle] Copilot monitor initialized');

  /**
   * Extract conversation ID
   */
  function getConversationId() {
    // Copilot uses query params or session storage
    const urlParams = new URLSearchParams(window.location.search);
    const convId = urlParams.get('convid') || urlParams.get('id');
    return convId || 'copilot-session-' + Date.now();
  }

  /**
   * Detect tools used
   */
  function detectToolsUsed(element) {
    const tools = [];
    const text = element.textContent.toLowerCase();

    if (element.querySelector('pre code') || element.querySelector('[class*="code"]')) {
      tools.push('code');
    }

    if (text.includes('searched') || text.includes('bing') || text.includes('web')) {
      tools.push('bing_search');
    }

    if (element.querySelector('img') || text.includes('generated') || text.includes('image')) {
      tools.push('dalle');
    }

    if (text.includes('designer') || text.includes('create')) {
      tools.push('designer');
    }

    if (text.includes('notebook') || text.includes('document')) {
      tools.push('notebook');
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
      /https:\/\/onedrive\.live\.com\/[^\s<>"]+/g,
      /https:\/\/[\w-]+\.sharepoint\.com\/[^\s<>"]+/g
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
      '.ac-textBlock',
      '[class*="message-content"]',
      '.prose',
      '[class*="text"]',
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
    if (element.classList.contains('user-message') ||
        element.querySelector('[class*="user"]') ||
        element.getAttribute('data-author') === 'user' ||
        element.closest('[class*="user"]')) {
      return 'user';
    }

    // Check for Copilot response
    if (element.classList.contains('bot-message') ||
        element.querySelector('[class*="bot"]') ||
        element.querySelector('[class*="copilot"]') ||
        element.getAttribute('data-author') === 'bot') {
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
        '[class*="message"]',
        '[class*="Message"]',
        '[class*="turn"]',
        '[class*="Turn"]',
        'cib-message-group',
        'cib-message'
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
      '[class*="message"]',
      '[class*="Message"]',
      'cib-message-group',
      'cib-message'
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
