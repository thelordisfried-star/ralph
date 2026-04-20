// ── DOM Elements ───────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const chatArea = $("#chat-area");
const chatInput = $("#chat-input");
const btnSend = $("#btn-send");
const welcomeScreen = $("#welcome-screen");
const sidebar = $("#sidebar");
const conversationList = $("#conversation-list");
const modelSelector = $("#model-selector");
const statusDot = $("#status-dot");
const statusText = $("#status-text");
const attachmentPreview = $("#attachment-preview");
const attachmentImg = $("#attachment-img");
const attachmentLabel = $("#attachment-label");
const fileInput = $("#file-input");

// ── State ──────────────────────────────────────────────────────────────────
let conversations = [];
let currentConversation = null;
let isGenerating = false;
let systemPrompt = "";
let attachedImage = null; // { base64, dataUrl, mimeType }
let config = {};

// ── Initialize ─────────────────────────────────────────────────────────────
async function init() {
  config = await window.geminiAPI.getConfig();
  applyTheme(config.theme);
  modelSelector.value = config.model;
  await loadConversations();

  if (!config.apiKey) {
    showSettings();
  }
}

function applyTheme(theme) {
  document.body.classList.toggle("theme-light", theme === "light");
}

// ── Conversation Management ────────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createNewConversation() {
  const conv = {
    id: generateId(),
    title: "New Chat",
    date: new Date().toISOString(),
    messages: [],
  };
  conversations.unshift(conv);
  currentConversation = conv;
  renderConversationList();
  clearChatArea();
  chatInput.focus();
  return conv;
}

async function loadConversations() {
  const list = await window.geminiAPI.listHistory();
  conversations = [];
  for (const item of list) {
    const data = await window.geminiAPI.loadHistory(item.id);
    if (data) {
      conversations.push({ id: item.id, ...data });
    }
  }
  conversations.sort((a, b) => new Date(b.date) - new Date(a.date));
  renderConversationList();
}

async function saveCurrentConversation() {
  if (!currentConversation) return;
  await window.geminiAPI.saveHistory(currentConversation.id, {
    title: currentConversation.title,
    date: currentConversation.date,
    messages: currentConversation.messages,
  });
}

async function deleteConversation(id) {
  await window.geminiAPI.deleteHistory(id);
  conversations = conversations.filter((c) => c.id !== id);
  if (currentConversation && currentConversation.id === id) {
    currentConversation = null;
    clearChatArea();
  }
  renderConversationList();
}

function switchConversation(id) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;
  currentConversation = conv;
  renderConversationList();
  renderMessages();
}

function renderConversationList() {
  conversationList.innerHTML = "";
  for (const conv of conversations) {
    const div = document.createElement("div");
    div.className = "conversation-item" + (currentConversation && currentConversation.id === conv.id ? " active" : "");
    div.innerHTML = `
      <span class="conv-title">${escapeHtml(conv.title)}</span>
      <button class="conv-delete" data-id="${conv.id}" title="Delete">&#x2715;</button>
    `;
    div.addEventListener("click", (e) => {
      if (!e.target.classList.contains("conv-delete")) {
        switchConversation(conv.id);
      }
    });
    div.querySelector(".conv-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });
    conversationList.appendChild(div);
  }
}

// ── Chat Rendering ─────────────────────────────────────────────────────────
function clearChatArea() {
  chatArea.innerHTML = "";
  welcomeScreen.style.display = "flex";
  chatArea.appendChild(welcomeScreen);
}

function renderMessages() {
  chatArea.innerHTML = "";
  welcomeScreen.style.display = "none";

  if (!currentConversation || currentConversation.messages.length === 0) {
    chatArea.appendChild(welcomeScreen);
    welcomeScreen.style.display = "flex";
    return;
  }

  for (const msg of currentConversation.messages) {
    appendMessageBubble(msg.role, msg.content, msg.imageDataUrl);
  }
  scrollToBottom();
}

function appendMessageBubble(role, content, imageDataUrl) {
  welcomeScreen.style.display = "none";

  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "U" : "G";

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";

  if (imageDataUrl) {
    const img = document.createElement("img");
    img.src = imageDataUrl;
    img.alt = "Attached image";
    contentDiv.appendChild(img);
  }

  if (content) {
    contentDiv.innerHTML += renderMarkdown(content);
  }

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(contentDiv);
  chatArea.appendChild(msgDiv);
  scrollToBottom();

  return contentDiv;
}

function showTypingIndicator() {
  const div = document.createElement("div");
  div.className = "message model";
  div.id = "typing-indicator";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "G";

  const content = document.createElement("div");
  content.className = "message-content typing-indicator";
  content.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

  div.appendChild(avatar);
  div.appendChild(content);
  chatArea.appendChild(div);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ── Markdown Rendering (lightweight) ───────────────────────────────────────
function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  // Avoid nested wrapping
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Line breaks -> paragraphs
  html = html
    .split(/\n\n+/)
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (
        block.startsWith("<h") ||
        block.startsWith("<pre") ||
        block.startsWith("<ul") ||
        block.startsWith("<ol") ||
        block.startsWith("<blockquote") ||
        block.startsWith("<table")
      ) {
        return block;
      }
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");

  return html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ── Sending Messages ───────────────────────────────────────────────────────
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text && !attachedImage) return;
  if (isGenerating) return;

  if (!currentConversation) {
    createNewConversation();
  }

  // Handle screenshot request
  if (text.toLowerCase().includes("screenshot") && !attachedImage) {
    await captureScreenshot();
  }

  // Handle clipboard request
  if (text.toLowerCase().includes("clipboard") && !attachedImage) {
    await pasteClipboard();
  }

  const userMsg = {
    role: "user",
    content: text,
    imageDataUrl: attachedImage ? attachedImage.dataUrl : null,
  };
  currentConversation.messages.push(userMsg);
  appendMessageBubble("user", text, userMsg.imageDataUrl);

  // Update title from first message
  if (currentConversation.messages.length === 1) {
    currentConversation.title = text.slice(0, 50) + (text.length > 50 ? "..." : "");
    renderConversationList();
  }

  chatInput.value = "";
  chatInput.style.height = "auto";
  setGenerating(true);
  showTypingIndicator();

  try {
    let result;

    if (attachedImage) {
      // Multimodal request
      result = await window.geminiAPI.chatWithImage({
        prompt: text || "Describe this image in detail.",
        imageBase64: attachedImage.base64,
        mimeType: attachedImage.mimeType,
      });
      clearAttachment();
    } else {
      // Streaming text request
      const messages = currentConversation.messages
        .filter((m) => !m.imageDataUrl)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      removeTypingIndicator();
      const contentDiv = appendMessageBubble("model", "");
      let fullText = "";

      const unsubChunk = window.geminiAPI.onStreamChunk((chunk) => {
        fullText += chunk;
        contentDiv.innerHTML = renderMarkdown(fullText);
        scrollToBottom();
      });

      const unsubEnd = window.geminiAPI.onStreamEnd(() => {
        unsubChunk();
        unsubEnd();
      });

      result = await window.geminiAPI.chatStream({
        messages,
        systemPrompt: systemPrompt || undefined,
      });

      unsubChunk();
      unsubEnd();

      if (result.error) {
        contentDiv.innerHTML = `<span class="message-error">${escapeHtml(result.error)}</span>`;
        currentConversation.messages.push({
          role: "model",
          content: result.error,
        });
      } else {
        contentDiv.innerHTML = renderMarkdown(result.text);
        currentConversation.messages.push({
          role: "model",
          content: result.text,
        });
      }

      setGenerating(false);
      await saveCurrentConversation();
      return;
    }

    removeTypingIndicator();

    if (result.error) {
      appendMessageBubble("model", result.error);
      currentConversation.messages.push({
        role: "model",
        content: result.error,
      });
    } else {
      appendMessageBubble("model", result.text);
      currentConversation.messages.push({
        role: "model",
        content: result.text,
      });
    }
  } catch (err) {
    removeTypingIndicator();
    appendMessageBubble("model", "Error: " + err.message);
  }

  setGenerating(false);
  await saveCurrentConversation();
}

function setGenerating(val) {
  isGenerating = val;
  btnSend.disabled = val;
  statusDot.className = "status-dot" + (val ? "" : "");
  statusText.textContent = val ? "Generating..." : "Ready";
}

// ── Screenshot & Clipboard ─────────────────────────────────────────────────
async function captureScreenshot() {
  const result = await window.geminiAPI.captureScreenshot();
  if (result.error) {
    console.error("Screenshot error:", result.error);
    return;
  }
  attachedImage = {
    base64: result.base64,
    dataUrl: result.dataUrl,
    mimeType: "image/png",
  };
  showAttachment("Screenshot captured");
}

async function pasteClipboard() {
  const result = await window.geminiAPI.readClipboard();
  if (result.type === "image") {
    attachedImage = {
      base64: result.base64,
      dataUrl: result.dataUrl,
      mimeType: "image/png",
    };
    showAttachment("Image from clipboard");
  } else if (result.type === "text" && result.text) {
    chatInput.value = (chatInput.value ? chatInput.value + "\n\n" : "") + result.text;
    autoResize();
  }
}

function showAttachment(label) {
  if (attachedImage) {
    attachmentImg.src = attachedImage.dataUrl;
    attachmentLabel.textContent = label;
    attachmentPreview.classList.add("visible");
  }
}

function clearAttachment() {
  attachedImage = null;
  attachmentPreview.classList.remove("visible");
  attachmentImg.src = "";
}

// ── Image Upload ───────────────────────────────────────────────────────────
function handleFileUpload(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const base64 = dataUrl.split(",")[1];
    attachedImage = { base64, dataUrl, mimeType: file.type };
    showAttachment(file.name);
  };
  reader.readAsDataURL(file);
}

// ── Settings ───────────────────────────────────────────────────────────────
function showSettings() {
  $("#setting-api-key").value = config.apiKey || "";
  $("#setting-model").value = config.model || "gemini-2.0-flash";
  $("#setting-shortcut").value = config.globalShortcut || "CommandOrControl+Shift+G";
  $("#setting-theme").value = config.theme || "dark";
  $("#setting-always-on-top").checked = config.alwaysOnTop || false;
  $("#setting-start-minimized").checked = config.startMinimized || false;
  $("#settings-overlay").classList.add("visible");
}

async function saveSettings() {
  const newConfig = {
    apiKey: $("#setting-api-key").value.trim(),
    model: $("#setting-model").value,
    globalShortcut: $("#setting-shortcut").value.trim(),
    theme: $("#setting-theme").value,
    alwaysOnTop: $("#setting-always-on-top").checked,
    startMinimized: $("#setting-start-minimized").checked,
  };
  config = await window.geminiAPI.setConfig(newConfig);
  modelSelector.value = config.model;
  applyTheme(config.theme);
  $("#settings-overlay").classList.remove("visible");
}

// ── System Prompt ──────────────────────────────────────────────────────────
function showSystemPrompt() {
  $("#system-prompt-text").value = systemPrompt;
  $("#system-prompt-overlay").classList.add("visible");
}

// ── Auto-resize textarea ───────────────────────────────────────────────────
function autoResize() {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + "px";
}

// ── Event Listeners ────────────────────────────────────────────────────────

// Window controls
$("#btn-minimize").addEventListener("click", () => window.geminiAPI.minimize());
$("#btn-maximize").addEventListener("click", () => window.geminiAPI.maximize());
$("#btn-close").addEventListener("click", () => window.geminiAPI.close());

// Sidebar
$("#btn-toggle-sidebar").addEventListener("click", () => sidebar.classList.toggle("collapsed"));
$("#btn-new-chat").addEventListener("click", () => {
  createNewConversation();
});

// Model selector
modelSelector.addEventListener("change", async () => {
  config = await window.geminiAPI.setConfig({ model: modelSelector.value });
});

// Chat input
chatInput.addEventListener("input", autoResize);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

btnSend.addEventListener("click", sendMessage);

// Action buttons
$("#btn-screenshot").addEventListener("click", async () => {
  await captureScreenshot();
});

$("#btn-clipboard").addEventListener("click", async () => {
  await pasteClipboard();
});

$("#btn-upload-image").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) {
    handleFileUpload(fileInput.files[0]);
    fileInput.value = "";
  }
});

// Attachment
$("#attachment-remove").addEventListener("click", clearAttachment);

// Quick actions
document.querySelectorAll(".quick-action").forEach((btn) => {
  btn.addEventListener("click", () => {
    chatInput.value = btn.dataset.prompt;
    autoResize();
    chatInput.focus();
  });
});

// Settings
$("#btn-settings").addEventListener("click", showSettings);
$("#settings-close").addEventListener("click", () => $("#settings-overlay").classList.remove("visible"));
$("#settings-cancel").addEventListener("click", () => $("#settings-overlay").classList.remove("visible"));
$("#settings-save").addEventListener("click", saveSettings);
$("#settings-overlay").addEventListener("click", (e) => {
  if (e.target === $("#settings-overlay")) $("#settings-overlay").classList.remove("visible");
});

// System prompt
$("#btn-system-prompt").addEventListener("click", showSystemPrompt);
$("#system-prompt-close").addEventListener("click", () => {
  $("#system-prompt-overlay").classList.remove("visible");
});
$("#system-prompt-save").addEventListener("click", () => {
  systemPrompt = $("#system-prompt-text").value.trim();
  $("#system-prompt-overlay").classList.remove("visible");
});
$("#system-prompt-clear").addEventListener("click", () => {
  systemPrompt = "";
  $("#system-prompt-text").value = "";
  $("#system-prompt-overlay").classList.remove("visible");
});

document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $("#system-prompt-text").value = btn.dataset.preset;
  });
});

$("#system-prompt-overlay").addEventListener("click", (e) => {
  if (e.target === $("#system-prompt-overlay")) {
    $("#system-prompt-overlay").classList.remove("visible");
  }
});

// Drag & drop images
chatArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});

chatArea.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) handleFileUpload(file);
});

// Listen for new-chat from tray
window.geminiAPI.onNewChat(() => {
  createNewConversation();
});

// ── Boot ───────────────────────────────────────────────────────────────────
init();
