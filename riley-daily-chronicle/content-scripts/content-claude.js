/**
 * Riley's Daily Chronicle - Claude.ai Content Script
 * Monitors conversations on claude.ai and captures interaction data
 */

(function() {
  'use strict';

  const PLATFORM = 'claude';
  const MAX_RESPONSE_PREVIEW = 500;

  // Track processed messages to avoid duplicates
  const processedMessages = new Set();

  // Session tracking
  let sessionStartTime = Date.now();
  let currentConversationId = null;
  let messageCount = 0;

  console.log('[Chronicle] Claude.ai monitor initialized');

  /**
   * Extract conversation ID from URL
   */
  function getConversationId() {
    const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Detect tools used in the conversation
   */
  function detectToolsUsed(element) {
    const tools = [];

    // Check for artifacts
    if (element.querySelector('[data-testid="artifact"]') ||
        element.textContent.includes('artifact') ||
        document.querySelector('[class*="artifact"]')) {
      tools.push('artifacts');
    }

    // Check for code blocks
    if (element.querySelector('pre code') || element.querySelector('.code-block')) {
      tools.push('code');
    }

    // Check for web search indicators
    if (element.textContent.includes('searched') ||
        element.querySelector('[class*="search"]')) {
      tools.push('web_search');
    }

    // Check for file analysis
    if (element.textContent.includes('analyzing') &&
        (element.textContent.includes('file') || element.textContent.includes('image'))) {
      tools.push('file_analysis');
    }

    return tools;
  }

  /**
   * Extract Google Drive URLs from text
   */
  function extractDriveUrls(text) {
    const drivePatterns = [
      /https:\/\/drive\.google\.com\/[^\s<>"]+/g,
      /https:\/\/docs\.google\.com\/[^\s<>"]+/g
    ];

    const urls = [];
    drivePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        urls.push(...matches);
      }
    });

    return [...new Set(urls)];
  }

  /**
   * Generate a unique message ID
   */
  function generateMessageId(content) {
    const hash = content.slice(0, 100) + Date.now();
    return btoa(hash).slice(0, 16);
  }

  /**
   * Extract message content from a message element
   */
  function extractMessageContent(element) {
    // Try different selectors for message content
    const contentSelectors = [
      '.prose',
      '[class*="message-content"]',
      '[class*="MessageContent"]',
      '.markdown',
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
   * Determine if element is a user message or AI response
   */
  function getMessageType(element) {
    // Check for human/user indicators
    if (element.classList.contains('human') ||
        element.querySelector('[data-testid="human-turn"]') ||
        element.closest('[data-testid="human-turn"]') ||
        element.getAttribute('data-is-human') === 'true') {
      return 'user';
    }

    // Check for AI indicators
    if (element.classList.contains('assistant') ||
        element.querySelector('[data-testid="assistant-turn"]') ||
        element.closest('[data-testid="assistant-turn"]') ||
        element.getAttribute('data-is-human') === 'false') {
      return 'assistant';
    }

    // Fallback: check for avatar or name indicators
    const text = element.textContent.toLowerCase();
    if (text.startsWith('you') || element.querySelector('[class*="human"]')) {
      return 'user';
    }

    return 'assistant';
  }

  /**
   * Process a new message and send to background script
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

    // Send to background script
    chrome.runtime.sendMessage(messageData).catch(err => {
      console.warn('[Chronicle] Failed to send message:', err);
    });
  }

  /**
   * Check new nodes for messages
   */
  function checkForNewMessages(nodes) {
    nodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      // Look for message containers
      const messageSelectors = [
        '[data-testid="human-turn"]',
        '[data-testid="assistant-turn"]',
        '[class*="ConversationTurn"]',
        '[class*="message"]',
        '[class*="Message"]'
      ];

      messageSelectors.forEach(selector => {
        // Check if the node itself matches
        if (node.matches && node.matches(selector)) {
          const type = getMessageType(node);
          processMessage(node, type);
        }

        // Check children
        const elements = node.querySelectorAll ? node.querySelectorAll(selector) : [];
        elements.forEach(element => {
          const type = getMessageType(element);
          processMessage(element, type);
        });
      });
    });
  }

  /**
   * Initial scan for existing messages
   */
  function scanExistingMessages() {
    console.log('[Chronicle] Scanning existing messages...');

    const messageSelectors = [
      '[data-testid="human-turn"]',
      '[data-testid="assistant-turn"]',
      '[class*="ConversationTurn"]'
    ];

    messageSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        const type = getMessageType(element);
        processMessage(element, type);
      });
    });
  }

  /**
   * Set up MutationObserver
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
   * Track page navigation (for SPA)
   */
  function setupNavigationTracking() {
    let lastUrl = window.location.href;

    const checkUrl = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log('[Chronicle] Navigation detected:', lastUrl);

        // Reset session tracking for new conversation
        const newConversationId = getConversationId();
        if (newConversationId !== currentConversationId) {
          currentConversationId = newConversationId;
          sessionStartTime = Date.now();
          messageCount = 0;
          processedMessages.clear();

          // Scan messages after navigation
          setTimeout(scanExistingMessages, 1000);
        }
      }
    };

    // Check URL periodically and on popstate
    setInterval(checkUrl, 1000);
    window.addEventListener('popstate', checkUrl);
  }

  /**
   * Notify background script that content script is ready
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

    // Delay initial scan to let page fully render
    setTimeout(scanExistingMessages, 2000);

    notifyReady();
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
