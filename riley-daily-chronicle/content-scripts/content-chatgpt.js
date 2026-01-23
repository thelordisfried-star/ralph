/**
 * Riley's Daily Chronicle - ChatGPT Content Script
 * Monitors conversations on chat.openai.com and chatgpt.com
 */

(function() {
  'use strict';

  const PLATFORM = 'chatgpt';
  const MAX_RESPONSE_PREVIEW = 500;

  const processedMessages = new Set();
  let sessionStartTime = Date.now();
  let currentConversationId = null;
  let messageCount = 0;

  console.log('[Chronicle] ChatGPT monitor initialized');

  /**
   * Extract conversation ID from URL
   */
  function getConversationId() {
    const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : 'new-chat';
  }

  /**
   * Detect tools used in the response
   */
  function detectToolsUsed(element) {
    const tools = [];
    const text = element.textContent.toLowerCase();

    // Check for code blocks
    if (element.querySelector('pre code') || element.querySelector('.code-block')) {
      tools.push('code');
    }

    // Check for browsing/web search
    if (text.includes('browsing') || text.includes('searched') ||
        element.querySelector('[class*="browsing"]')) {
      tools.push('web_search');
    }

    // Check for DALL-E/image generation
    if (text.includes('dall-e') || text.includes('generated image') ||
        element.querySelector('img[src*="openai"]')) {
      tools.push('dalle');
    }

    // Check for code interpreter
    if (text.includes('code interpreter') || text.includes('analyzed') ||
        element.querySelector('[class*="interpreter"]')) {
      tools.push('code_interpreter');
    }

    // Check for file analysis
    if (text.includes('file') && (text.includes('uploaded') || text.includes('analyzing'))) {
      tools.push('file_analysis');
    }

    // Check for Canvas
    if (element.querySelector('[class*="canvas"]') || text.includes('canvas')) {
      tools.push('canvas');
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
   * Extract message content
   */
  function extractMessageContent(element) {
    const contentSelectors = [
      '.markdown',
      '.prose',
      '[class*="message-content"]',
      '.text-base',
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
   * Determine message type
   */
  function getMessageType(element) {
    // Check for user message indicators
    if (element.getAttribute('data-message-author-role') === 'user' ||
        element.classList.contains('user-message') ||
        element.querySelector('[data-message-author-role="user"]')) {
      return 'user';
    }

    // Check for assistant message indicators
    if (element.getAttribute('data-message-author-role') === 'assistant' ||
        element.classList.contains('assistant-message') ||
        element.querySelector('[data-message-author-role="assistant"]') ||
        element.querySelector('.gpt-icon') ||
        element.querySelector('[class*="gpt"]')) {
      return 'assistant';
    }

    // Check parent containers
    const parent = element.closest('[data-message-author-role]');
    if (parent) {
      return parent.getAttribute('data-message-author-role') || 'assistant';
    }

    // Fallback based on position/structure
    const allMessages = document.querySelectorAll('[data-testid*="conversation-turn"]');
    const index = Array.from(allMessages).indexOf(element);
    return index % 2 === 0 ? 'user' : 'assistant';
  }

  /**
   * Process and send message
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
   * Check nodes for messages
   */
  function checkForNewMessages(nodes) {
    nodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const messageSelectors = [
        '[data-testid*="conversation-turn"]',
        '[data-message-author-role]',
        '[class*="ConversationItem"]',
        '[class*="message"]'
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
   * Initial scan
   */
  function scanExistingMessages() {
    console.log('[Chronicle] Scanning existing messages...');

    const messageSelectors = [
      '[data-testid*="conversation-turn"]',
      '[data-message-author-role]'
    ];

    messageSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        const type = getMessageType(element);
        processMessage(element, type);
      });
    });
  }

  /**
   * Set up observer
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
   * Track navigation
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
