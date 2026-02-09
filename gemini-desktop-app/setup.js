#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const home = process.env.HOME || process.env.USERPROFILE;
const platform = process.platform;

let configDir;
if (platform === "win32") {
  configDir = path.join(process.env.APPDATA, "gemini-desktop", "gemini-desktop");
} else if (platform === "darwin") {
  configDir = path.join(home, "Library", "Application Support", "gemini-desktop", "gemini-desktop");
} else {
  configDir = path.join(home, ".config", "gemini-desktop", "gemini-desktop");
}

const configFile = path.join(configDir, "config.json");
const historyDir = path.join(configDir, "conversations");

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
    if (fs.existsSync(configFile)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configFile, "utf8")) };
    }
  } catch (_) {}
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg) {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log("\n  ╔══════════════════════════════════════╗");
  console.log("  ║       GEMINI DESKTOP — SETUP         ║");
  console.log("  ╚══════════════════════════════════════╝\n");

  const config = loadConfig();

  if (config.apiKey) {
    console.log(`  Current API key: ${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}`);
    console.log(`  Current model:   ${config.model}`);
    console.log(`  Current theme:   ${config.theme}\n`);
  }

  const apiKey = await ask("  Gemini API key (paste & enter): ");
  if (apiKey.trim()) {
    config.apiKey = apiKey.trim();
  }

  const models = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-pro-preview-05-06",
    "gemini-2.5-flash-preview-04-17",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ];
  console.log("\n  Models:");
  models.forEach((m, i) => console.log(`    ${i + 1}. ${m}`));
  const modelChoice = await ask(`\n  Pick a model [1-${models.length}] (enter to keep ${config.model}): `);
  if (modelChoice.trim() && models[parseInt(modelChoice) - 1]) {
    config.model = models[parseInt(modelChoice) - 1];
  }

  const theme = await ask("  Theme — dark or light (enter to keep): ");
  if (theme.trim() === "dark" || theme.trim() === "light") {
    config.theme = theme.trim();
  }

  const shortcut = await ask("  Global shortcut (enter to keep): ");
  if (shortcut.trim()) {
    config.globalShortcut = shortcut.trim();
  }

  saveConfig(config);

  console.log("\n  Config saved to: " + configFile);
  console.log("  Run `npm start` to launch Gemini Desktop.\n");

  rl.close();
}

main().catch((e) => {
  console.error(e);
  rl.close();
  process.exit(1);
});
