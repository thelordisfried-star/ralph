const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("geminiAPI", {
  // ── Chat ──────────────────────────────────────────────────────────────
  chat: (payload) => ipcRenderer.invoke("gemini:chat", payload),
  chatWithImage: (payload) => ipcRenderer.invoke("gemini:chatWithImage", payload),
  chatStream: (payload) => ipcRenderer.invoke("gemini:chatStream", payload),

  onStreamChunk: (callback) => {
    const handler = (_event, chunk) => callback(chunk);
    ipcRenderer.on("gemini:stream-chunk", handler);
    return () => ipcRenderer.removeListener("gemini:stream-chunk", handler);
  },
  onStreamEnd: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("gemini:stream-end", handler);
    return () => ipcRenderer.removeListener("gemini:stream-end", handler);
  },

  // ── Capture ───────────────────────────────────────────────────────────
  captureScreenshot: () => ipcRenderer.invoke("capture:screenshot"),
  readClipboard: () => ipcRenderer.invoke("clipboard:read"),

  // ── Config ────────────────────────────────────────────────────────────
  getConfig: () => ipcRenderer.invoke("config:get"),
  setConfig: (cfg) => ipcRenderer.invoke("config:set", cfg),

  // ── History ───────────────────────────────────────────────────────────
  saveHistory: (id, data) => ipcRenderer.invoke("history:save", { id, data }),
  loadHistory: (id) => ipcRenderer.invoke("history:load", id),
  listHistory: () => ipcRenderer.invoke("history:list"),
  deleteHistory: (id) => ipcRenderer.invoke("history:delete", id),

  // ── Window controls ───────────────────────────────────────────────────
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  openExternal: (url) => ipcRenderer.send("open:external", url),

  // ── Events from main ─────────────────────────────────────────────────
  onNewChat: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("new-chat", handler);
    return () => ipcRenderer.removeListener("new-chat", handler);
  },
});
