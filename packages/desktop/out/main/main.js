"use strict";
const electron = require("electron");
const path = require("node:path");
const node_child_process = require("node:child_process");
const fs = require("node:fs");
const electronUpdater = require("electron-updater");
const _cache = {};
const Platform = {
  getDataDir() {
    const dir = electron.app.getPath("userData");
    const subdirs = ["data", "strategies", "themes", "plugins", "logs"];
    subdirs.forEach((sub) => {
      const subPath = path.join(dir, sub);
      if (!fs.existsSync(subPath)) {
        fs.mkdirSync(subPath, { recursive: true });
      }
    });
    return dir;
  },
  getPythonPath() {
    if (_cache.pythonPath) return _cache.pythonPath;
    let resolvedPath;
    if (electron.app.isPackaged) {
      const archPath = process.arch === "arm64" ? "arm64" : "x64";
      resolvedPath = path.join(
        process.resourcesPath,
        "python-runtime",
        "darwin",
        archPath,
        "bin",
        "python3"
      );
    } else {
      const venvPath = path.join(__dirname, "../../../ml-engine/venv/bin/python3");
      resolvedPath = fs.existsSync(venvPath) ? venvPath : process.env.AXIOM_PYTHON_PATH ?? "python3";
    }
    _cache.pythonPath = resolvedPath;
    return resolvedPath;
  },
  getPythonLibPath() {
    if (_cache.pythonLibPath) return _cache.pythonLibPath;
    const srcDir = path.join(__dirname, "../../../ml-engine/src");
    const appDir = path.join(srcDir, "app");
    const paths = [
      srcDir,
      appDir,
      path.join(appDir, "services"),
      path.join(appDir, "utils"),
      path.join(appDir, "core")
    ];
    const archPath = process.arch === "arm64" ? "arm64" : "x64";
    const packagesDir = electron.app.isPackaged ? path.join(process.resourcesPath, "python-runtime", "darwin", "packages-" + archPath) : paths.join(":");
    const existing = process.env.PYTHONPATH ?? "";
    const resolvedPath = existing ? `${packagesDir}:${existing}` : packagesDir;
    _cache.pythonLibPath = resolvedPath;
    return resolvedPath;
  },
  isAppleSilicon() {
    return process.arch === "arm64";
  },
  prefersDarkMode() {
    return true;
  }
};
function setupUpdater(window) {
  electronUpdater.autoUpdater.autoDownload = false;
  electronUpdater.autoUpdater.on("update-available", (info) => {
    window.webContents.send("update:available", info);
  });
  electronUpdater.autoUpdater.on("download-progress", (progressObj) => {
    window.webContents.send("update:progress", progressObj.percent);
  });
  electronUpdater.autoUpdater.on("update-downloaded", () => {
  });
  electron.ipcMain.on("update:install", () => {
    electronUpdater.autoUpdater.quitAndInstall();
  });
  setInterval(() => {
    electronUpdater.autoUpdater.checkForUpdatesAndNotify();
  }, 60 * 60 * 1e3);
  electronUpdater.autoUpdater.checkForUpdatesAndNotify();
}
electron.nativeTheme.themeSource = "dark";
electron.app.setName("AXIOM");
let mainWindow = null;
let tray = null;
let sidecar = null;
let sidecarReady = false;
let restartCount = 0;
const MAX_RESTARTS = 5;
const SIDECAR_PORT = 18432;
function spawnSidecar() {
  return new Promise((resolve, reject) => {
    const python = Platform.getPythonPath();
    const script = electron.app.isPackaged ? path.join(process.resourcesPath, "ml-engine", "src", "main.py") : path.join(__dirname, "../../../ml-engine/src/main.py");
    console.log(`[Sidecar] Spawning: ${python} ${script} --port ${SIDECAR_PORT}`);
    console.log(`[Sidecar] PYTHONPATH: ${Platform.getPythonLibPath()}`);
    sidecar = node_child_process.spawn(python, [
      script,
      "--port",
      String(SIDECAR_PORT),
      "--data-dir",
      Platform.getDataDir(),
      "--mode",
      "sidecar"
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONPATH: Platform.getPythonLibPath(),
        PYTHONUNBUFFERED: "1",
        PYTHONDONTWRITEBYTECODE: "1"
      }
    });
    const startupTimeout = setTimeout(() => {
      reject(new Error("Sidecar did not signal AXIOM_READY within 60s"));
    }, 6e4);
    sidecar.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      if (text.includes("AXIOM_READY") && !sidecarReady) {
        sidecarReady = true;
        restartCount = 0;
        clearTimeout(startupTimeout);
        updateTray("connected");
        broadcastSidecarStatus("ready");
        resolve();
      }
      if (!electron.app.isPackaged) {
        mainWindow?.webContents.send("sidecar:log", text);
      }
    });
    sidecar.stderr?.on("data", (chunk) => {
      const text = chunk.toString();
      console.error(`[Sidecar] STDERR: ${text}`);
      if (!electron.app.isPackaged) {
        mainWindow?.webContents.send("sidecar:log", `[ERR] ${text}`);
      }
    });
    sidecar.on("exit", (code, signal) => {
      sidecarReady = false;
      updateTray("disconnected");
      broadcastSidecarStatus("crashed");
      if (restartCount < MAX_RESTARTS && !electron.app.isQuitting) {
        restartCount++;
        const delay = Math.min(1e3 * 2 ** restartCount, 3e4);
        console.log(`[Sidecar] Exited (${code}). Restart ${restartCount}/${MAX_RESTARTS} in ${delay}ms`);
        setTimeout(spawnSidecar, delay);
      } else {
        broadcastSidecarStatus("failed");
      }
    });
  });
}
async function createWindow() {
  mainWindow = new electron.BrowserWindow({
    // Start maximized — this is a terminal, not a utility window
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    // Mac-native chrome
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    // Match the app's background — prevents white flash on load
    backgroundColor: "#000000",
    // Don't show until content is painted
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webgl: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, "../preload/preload.js")
    }
  });
  mainWindow.webContents.on("dom-ready", () => {
    mainWindow?.webContents.executeJavaScript(`
      window.__AXIOM_CONFIG__ = {
        apiBase:      'http://127.0.0.1:${SIDECAR_PORT}',
        wsBase:       'ws://127.0.0.1:${SIDECAR_PORT}',
        newsMongoWs:  '${process.env.AXIOM_NEWS_WS_URL ?? "wss://news.axiom.app/feed"}',
        platform:     'desktop',
        dataDir:      '${Platform.getDataDir().replace(/\\/g, "\\\\")}',
        version:      '${electron.app.getVersion()}',
      };
      console.log('[AXIOM] Config injected:', window.__AXIOM_CONFIG__);
    `);
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.focus();
    if (!hadPreviousSession()) {
      mainWindow?.maximize();
    }
  });
  if (electron.app.isPackaged) {
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow?.webContents.closeDevTools();
    });
    mainWindow.webContents.on("before-input-event", (event, input) => {
      if ((input.control || input.meta) && (input.key.toLowerCase() === "r" || input.key.toLowerCase() === "i")) {
        event.preventDefault();
      }
    });
    await mainWindow.loadFile(
      path.join(__dirname, "../renderer/index.html")
    );
    const menu = electron.Menu.buildFromTemplate([
      { role: "appMenu" },
      { role: "editMenu" },
      { role: "windowMenu" },
      { role: "help" }
    ]);
    electron.Menu.setApplicationMenu(menu);
  } else {
    const url = process.env["ELECTRON_RENDERER_URL"] || "http://localhost:5173";
    await mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function createTray() {
  const icon = electron.nativeImage.createFromPath(
    path.join(__dirname, "../resources/icons/tray.png")
  );
  tray = new electron.Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("AXIOM Terminal");
  updateTray("starting");
  tray.on("click", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow?.show();
    }
  });
}
function updateTray(status) {
  if (!tray) return;
  const menu = electron.Menu.buildFromTemplate([
    {
      label: `AXIOM  ·  ${status.toUpperCase()}`,
      enabled: false
    },
    { type: "separator" },
    {
      label: "Open Terminal",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      }
    },
    {
      label: "Restart ML Engine",
      click: () => {
        sidecar?.kill("SIGTERM");
        setTimeout(spawnSidecar, 2e3);
      }
    },
    { type: "separator" },
    {
      label: `Version ${electron.app.getVersion()}`,
      enabled: false
    },
    {
      label: "Quit AXIOM",
      click: () => {
        electron.app.isQuitting = true;
        electron.app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
}
electron.ipcMain.handle("app:get-platform", () => ({
  os: process.platform,
  arch: process.arch,
  version: electron.app.getVersion(),
  dataDir: Platform.getDataDir()
}));
electron.ipcMain.handle("app:open-external", (_, url) => {
  if (url.startsWith("https://")) {
    electron.shell.openExternal(url);
  }
});
electron.ipcMain.handle("app:open-data-dir", () => {
  electron.shell.openPath(Platform.getDataDir());
});
electron.ipcMain.handle("app:restart-sidecar", () => {
  sidecar?.kill("SIGTERM");
  sidecarReady = false;
  setTimeout(spawnSidecar, 2e3);
});
function broadcastSidecarStatus(status) {
  mainWindow?.webContents.send("sidecar:status", { status });
}
function hadPreviousSession() {
  const { existsSync } = require("node:fs");
  return existsSync(
    path.join(Platform.getDataDir(), "data", "user.sqlite")
  );
}
electron.app.whenReady().then(async () => {
  createTray();
  spawnSidecar().catch(console.error);
  await createWindow();
  setupUpdater(mainWindow);
});
electron.app.on("activate", () => {
  if (mainWindow === null) createWindow();
  else {
    mainWindow.show();
    mainWindow.focus();
  }
});
electron.app.on("before-quit", () => {
  electron.app.isQuitting = true;
});
electron.app.on("will-quit", (event) => {
  if (sidecar && !sidecarReady) return;
  event.preventDefault();
  sidecar?.kill("SIGTERM");
  setTimeout(() => {
    sidecar?.kill("SIGKILL");
    electron.app.exit(0);
  }, 3e3);
});
electron.app.on("web-contents-created", (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.on("will-navigate", (event, url) => {
    const allowed = [
      "http://localhost:5173",
      "http://127.0.0.1:18432",
      "app://"
    ];
    if (!allowed.some((prefix) => url.startsWith(prefix))) {
      event.preventDefault();
    }
  });
});
electron.app.isQuitting = false;
