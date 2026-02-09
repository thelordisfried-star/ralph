const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  screen,
  desktopCapturer,
  clipboard,
  dialog,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ── Paths ──────────────────────────────────────────────────────────────────
const CONFIG_DIR = path.join(app.getPath("userData"), "gemini-desktop");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const HISTORY_DIR = path.join(CONFIG_DIR, "conversations");

if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
if (!fs.existsSync(HISTORY_DIR))
  fs.mkdirSync(HISTORY_DIR, { recursive: true });

// ── Config ─────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  apiKey: "",
  model: "gemini-2.0-flash",
  theme: "dark",
  globalShortcut: "CommandOrControl+Shift+G",
  startMinimized: false,
  alwaysOnTop: false,
  windowBounds: { width: 480, height: 700 },
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) };
    }
  } catch (_) {}
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

let config = loadConfig();

// ── Gemini client ──────────────────────────────────────────────────────────
let genAI = null;
let geminiModel = null;

function initGemini() {
  if (!config.apiKey) return false;
  try {
    genAI = new GoogleGenerativeAI(config.apiKey);
    geminiModel = genAI.getGenerativeModel({ model: config.model });
    return true;
  } catch (e) {
    console.error("Failed to init Gemini:", e.message);
    return false;
  }
}

// ── Window management ──────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;

function createWindow() {
  const { width, height } = config.windowBounds;
  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 380,
    minHeight: 500,
    frame: false,
    transparent: false,
    resizable: true,
    skipTaskbar: false,
    alwaysOnTop: config.alwaysOnTop,
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("resize", () => {
    const [w, h] = mainWindow.getSize();
    config.windowBounds = { width: w, height: h };
    saveConfig(config);
  });

  if (config.startMinimized) mainWindow.hide();
}

// ── Tray ───────────────────────────────────────────────────────────────────
function createTray() {
  // Create a simple 16x16 tray icon programmatically
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      createTrayIconDataURL(),
      "base64"
    )
  );
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("Gemini Desktop");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Gemini",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: "New Chat",
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send("new-chat");
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createTrayIconDataURL() {
  // Minimal 16x16 PNG (blue diamond) encoded as base64
  return "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAaklEQVQ4T2NkoBAwUqifYdAb8P9/" +
    "A8P/fwwMDIyMDAz/GRj+MzD8Z2BgBLIYGBgZGMBsRiAbxGZkYACpA8sxMDCCaRCNbABYHMkAZBcR" +
    "coHBaAMuF1DFBcO3FBg2pQBVCgKalgMAAPmuIBFHivOaAAAAAElFTkSuQmCC";
}

// ── Global shortcut ────────────────────────────────────────────────────────
function registerGlobalShortcut() {
  globalShortcut.unregisterAll();
  try {
    globalShortcut.register(config.globalShortcut, () => {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (e) {
    console.error("Failed to register shortcut:", e.message);
  }
}

// ── IPC Handlers ───────────────────────────────────────────────────────────

// Chat with Gemini (text only)
ipcMain.handle("gemini:chat", async (_event, { messages, systemPrompt }) => {
  if (!geminiModel) {
    if (!initGemini()) return { error: "API key not configured. Open Settings to add your Gemini API key." };
  }
  try {
    const chat = geminiModel.startChat({
      history: messages.slice(0, -1).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
      systemInstruction: systemPrompt || undefined,
    });
    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMsg.content);
    const text = result.response.text();
    return { text };
  } catch (e) {
    return { error: e.message };
  }
});

// Chat with image (multimodal)
ipcMain.handle("gemini:chatWithImage", async (_event, { prompt, imageBase64, mimeType }) => {
  if (!geminiModel) {
    if (!initGemini()) return { error: "API key not configured." };
  }
  try {
    const imagePart = {
      inlineData: { data: imageBase64, mimeType: mimeType || "image/png" },
    };
    const result = await geminiModel.generateContent([prompt, imagePart]);
    const text = result.response.text();
    return { text };
  } catch (e) {
    return { error: e.message };
  }
});

// Streaming chat
ipcMain.handle("gemini:chatStream", async (event, { messages, systemPrompt }) => {
  if (!geminiModel) {
    if (!initGemini()) return { error: "API key not configured." };
  }
  try {
    const chat = geminiModel.startChat({
      history: messages.slice(0, -1).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
      systemInstruction: systemPrompt || undefined,
    });
    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessageStream(lastMsg.content);

    let fullText = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      mainWindow.webContents.send("gemini:stream-chunk", chunkText);
    }
    mainWindow.webContents.send("gemini:stream-end");
    return { text: fullText };
  } catch (e) {
    mainWindow.webContents.send("gemini:stream-end");
    return { error: e.message };
  }
});

// Screenshot capture
ipcMain.handle("capture:screenshot", async () => {
  try {
    mainWindow.hide();
    // Small delay to let the window hide
    await new Promise((r) => setTimeout(r, 300));

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
    });

    mainWindow.show();

    if (sources.length > 0) {
      const screenshot = sources[0].thumbnail;
      return {
        dataUrl: screenshot.toDataURL(),
        base64: screenshot.toPNG().toString("base64"),
      };
    }
    return { error: "No screen source found" };
  } catch (e) {
    mainWindow.show();
    return { error: e.message };
  }
});

// Clipboard read
ipcMain.handle("clipboard:read", () => {
  const text = clipboard.readText();
  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    return {
      type: "image",
      base64: image.toPNG().toString("base64"),
      dataUrl: image.toDataURL(),
    };
  }
  return { type: "text", text };
});

// Config
ipcMain.handle("config:get", () => config);
ipcMain.handle("config:set", (_event, newConfig) => {
  config = { ...config, ...newConfig };
  saveConfig(config);
  if (newConfig.apiKey || newConfig.model) initGemini();
  if (newConfig.globalShortcut) registerGlobalShortcut();
  if (newConfig.alwaysOnTop !== undefined) mainWindow.setAlwaysOnTop(newConfig.alwaysOnTop);
  return config;
});

// Conversation history persistence
ipcMain.handle("history:save", (_event, { id, data }) => {
  const filePath = path.join(HISTORY_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return true;
});

ipcMain.handle("history:load", (_event, id) => {
  const filePath = path.join(HISTORY_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
  return null;
});

ipcMain.handle("history:list", () => {
  const files = fs.readdirSync(HISTORY_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const data = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, f), "utf8"));
    return { id: f.replace(".json", ""), title: data.title || "Untitled", date: data.date };
  });
});

ipcMain.handle("history:delete", (_event, id) => {
  const filePath = path.join(HISTORY_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

// Window controls
ipcMain.on("window:minimize", () => mainWindow.minimize());
ipcMain.on("window:maximize", () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on("window:close", () => mainWindow.hide());

// Open external links
ipcMain.on("open:external", (_event, url) => {
  shell.openExternal(url);
});

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  initGemini();
  createWindow();
  createTray();
  registerGlobalShortcut();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
