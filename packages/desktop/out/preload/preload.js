// packages/desktop/src/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("axiomDesktop", {
  // ── Platform ───────────────────────────────────────────────
  getPlatform: () => import_electron.ipcRenderer.invoke("app:get-platform"),
  openExternal: (url) => import_electron.ipcRenderer.invoke("app:open-external", url),
  openDataDir: () => import_electron.ipcRenderer.invoke("app:open-data-dir"),
  restartSidecar: () => import_electron.ipcRenderer.invoke("app:restart-sidecar"),
  // ── Sidecar status ─────────────────────────────────────────
  // Returns unsubscribe function
  onSidecarStatus: (cb) => {
    const handler = (_, s) => cb(s);
    import_electron.ipcRenderer.on("sidecar:status", handler);
    return () => import_electron.ipcRenderer.removeListener("sidecar:status", handler);
  },
  // Dev only — sidecar stdout in browser console
  onSidecarLog: (cb) => {
    const handler = (_, log) => cb(log);
    import_electron.ipcRenderer.on("sidecar:log", handler);
    return () => import_electron.ipcRenderer.removeListener("sidecar:log", handler);
  },
  // ── Updates ────────────────────────────────────────────────
  onUpdateAvailable: (cb) => {
    const handler = (_, info) => cb(info);
    import_electron.ipcRenderer.on("update:available", handler);
    return () => import_electron.ipcRenderer.removeListener("update:available", handler);
  },
  onUpdateProgress: (cb) => {
    const handler = (_, p) => cb(p);
    import_electron.ipcRenderer.on("update:progress", handler);
    return () => import_electron.ipcRenderer.removeListener("update:progress", handler);
  },
  installUpdate: () => import_electron.ipcRenderer.send("update:install")
});
