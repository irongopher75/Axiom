import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  nativeTheme,
  Tray,
  Menu,
  nativeImage,
} from 'electron';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import { Platform } from './platform';
import { setupUpdater } from './updater';

// ── App-level config ──────────────────────────────────────────
nativeTheme.themeSource = 'dark';
app.setName('AXIOM');

// ── State ─────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let sidecar: ChildProcess | null = null;
let sidecarReady = false;
let restartCount = 0;
const MAX_RESTARTS = 5;
const SIDECAR_PORT = 18432;

// ── Sidecar ───────────────────────────────────────────────────
function spawnSidecar(): Promise<void> {
  return new Promise((resolve, reject) => {
    const python = Platform.getPythonPath();
    const script = app.isPackaged
      ? path.join(process.resourcesPath, 'ml-engine', 'src', 'main.py')
      : path.join(__dirname, '../../../ml-engine/src/main.py');

    console.log(`[Sidecar] Spawning: ${python} ${script} --port ${SIDECAR_PORT}`);
    console.log(`[Sidecar] PYTHONPATH: ${Platform.getPythonLibPath()}`);
    sidecar = spawn(python, [
      script,
      '--port', String(SIDECAR_PORT),
      '--data-dir', Platform.getDataDir(),
      '--mode', 'sidecar',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONPATH: Platform.getPythonLibPath(),
        PYTHONUNBUFFERED: '1',
        PYTHONDONTWRITEBYTECODE: '1',
      },
    });

    const startupTimeout = setTimeout(() => {
      reject(new Error('Sidecar did not signal AXIOM_READY within 60s'));
    }, 60_000);

    sidecar.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();

      if (text.includes('AXIOM_READY') && !sidecarReady) {
        sidecarReady = true;
        restartCount = 0;
        clearTimeout(startupTimeout);
        updateTray('connected');
        broadcastSidecarStatus('ready');
        resolve();
      }

      // Pipe sidecar logs to DevTools in dev mode
      if (!app.isPackaged) {
        mainWindow?.webContents.send('sidecar:log', text);
      }
    });

    sidecar.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      console.error(`[Sidecar] STDERR: ${text}`);
      if (!app.isPackaged) {
        mainWindow?.webContents.send('sidecar:log', `[ERR] ${text}`);
      }
    });

    sidecar.on('exit', (code, signal) => {
      sidecarReady = false;
      updateTray('disconnected');
      broadcastSidecarStatus('crashed');

      if (restartCount < MAX_RESTARTS && !app.isQuitting) {
        restartCount++;
        const delay = Math.min(1000 * 2 ** restartCount, 30_000);
        console.log(`[Sidecar] Exited (${code}). Restart ${restartCount}/${MAX_RESTARTS} in ${delay}ms`);
        setTimeout(spawnSidecar, delay);
      } else {
        broadcastSidecarStatus('failed');
      }
    });
  });
}

// ── Window ────────────────────────────────────────────────────
async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    // Start maximized — this is a terminal, not a utility window
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,

    // Mac-native chrome
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },

    // Match the app's background — prevents white flash on load
    backgroundColor: '#000000',

    // Don't show until content is painted
    show: false,

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webgl: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });

  // Inject runtime config before React mounts
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow?.webContents.executeJavaScript(`
      window.__AXIOM_CONFIG__ = {
        apiBase:      'http://127.0.0.1:${SIDECAR_PORT}',
        wsBase:       'ws://127.0.0.1:${SIDECAR_PORT}',
        newsMongoWs:  '${process.env.AXIOM_NEWS_WS_URL ?? 'wss://news.axiom.app/feed'}',
        platform:     'desktop',
        dataDir:      '${Platform.getDataDir().replace(/\\/g, '\\\\')}',
        version:      '${app.getVersion()}',
      };
      console.log('[AXIOM] Config injected:', window.__AXIOM_CONFIG__);
    `);
  });

  // Show window once paint is complete — no flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
    // Maximize on first launch
    if (!hadPreviousSession()) {
      mainWindow?.maximize();
    }
  });

  if (app.isPackaged) {
    // SECURITY: Disable DevTools in production
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
    
    // SECURITY: Disable basic reload/inspect shortcuts
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if ((input.control || input.meta) && (input.key.toLowerCase() === 'r' || input.key.toLowerCase() === 'i')) {
        event.preventDefault();
      }
    });

    await mainWindow.loadFile(
      path.join(__dirname, '../renderer/index.html')
    );
    
    // SECURITY: High-level menu lockdown
    const menu = Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' },
      { role: 'windowMenu' },
      { role: 'help' }
    ]);
    Menu.setApplicationMenu(menu);

  } else {
    // Development: load from Vite dev server provided by electron-vite
    const url = process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173';
    await mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Tray ──────────────────────────────────────────────────────
function createTray(): void {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, '../resources/icons/tray.png')
  );

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('AXIOM Terminal');

  updateTray('starting');

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow?.show();
    }
  });
}

function updateTray(status: 'starting' | 'connected' | 'disconnected'): void {
  if (!tray) return;

  const menu = Menu.buildFromTemplate([
    {
      label: `AXIOM  ·  ${status.toUpperCase()}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open Terminal',
      click: () => { mainWindow?.show(); mainWindow?.focus(); },
    },
    {
      label: 'Restart ML Engine',
      click: () => {
        sidecar?.kill('SIGTERM');
        setTimeout(spawnSidecar, 2000);
      },
    },
    { type: 'separator' },
    {
      label: `Version ${app.getVersion()}`,
      enabled: false,
    },
    {
      label: 'Quit AXIOM',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
}

// ── IPC Handlers ──────────────────────────────────────────────
ipcMain.handle('app:get-platform', () => ({
  os: process.platform,
  arch: process.arch,
  version: app.getVersion(),
  dataDir: Platform.getDataDir(),
}));

ipcMain.handle('app:open-external', (_, url: string) => {
  // Validate URL before opening — security
  if (url.startsWith('https://')) {
    shell.openExternal(url);
  }
});

ipcMain.handle('app:open-data-dir', () => {
  shell.openPath(Platform.getDataDir());
});

ipcMain.handle('app:restart-sidecar', () => {
  sidecar?.kill('SIGTERM');
  sidecarReady = false;
  setTimeout(spawnSidecar, 2000);
});

// ── Helpers ───────────────────────────────────────────────────
function broadcastSidecarStatus(status: string): void {
  mainWindow?.webContents.send('sidecar:status', { status });
}

function hadPreviousSession(): boolean {
  // Check if layout file exists in data dir
  const { existsSync } = require('node:fs');
  return existsSync(
    path.join(Platform.getDataDir(), 'data', 'user.sqlite')
  );
}

// ── Lifecycle ─────────────────────────────────────────────────
app.whenReady().then(async () => {
  createTray();

  // Start sidecar — don't wait for ready before showing window
  // Window shows with "ML Engine Starting..." state
  // UI updates automatically when sidecar signals ready
  spawnSidecar().catch(console.error);

  await createWindow();
  setupUpdater(mainWindow!);
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
  else { mainWindow.show(); mainWindow.focus(); }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', (event) => {
  if (sidecar && !sidecarReady) return; // already dead

  event.preventDefault();

  // Give sidecar 3 seconds to flush DuckDB writes before force kill
  sidecar?.kill('SIGTERM');
  setTimeout(() => {
    sidecar?.kill('SIGKILL');
    app.exit(0);
  }, 3000);
});

// ── Security ──────────────────────────────────────────────────
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, url) => {
    const allowed = [
      'http://localhost:5173',
      'http://127.0.0.1:18432',
      'app://',
    ];
    if (!allowed.some(prefix => url.startsWith(prefix))) {
      event.preventDefault();
    }
  });
});

// Extend app type for isQuitting flag
declare global {
  namespace Electron {
    interface App {
      isQuitting: boolean;
    }
  }
}
(app as any).isQuitting = false;
