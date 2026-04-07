"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("axiomDesktop", {
  // ── Platform ───────────────────────────────────────────────
  getPlatform: () => electron.ipcRenderer.invoke("app:get-platform"),
  openExternal: (url) => electron.ipcRenderer.invoke("app:open-external", url),
  openDataDir: () => electron.ipcRenderer.invoke("app:open-data-dir"),
  restartSidecar: () => electron.ipcRenderer.invoke("app:restart-sidecar"),
  // ── Sidecar status ─────────────────────────────────────────
  // Returns unsubscribe function
  onSidecarStatus: (cb) => {
    const handler = (_, s) => cb(s);
    electron.ipcRenderer.on("sidecar:status", handler);
    return () => electron.ipcRenderer.removeListener("sidecar:status", handler);
  },
  // Dev only — sidecar stdout in browser console
  onSidecarLog: (cb) => {
    const handler = (_, log) => cb(log);
    electron.ipcRenderer.on("sidecar:log", handler);
    return () => electron.ipcRenderer.removeListener("sidecar:log", handler);
  },
  // ── Updates ────────────────────────────────────────────────
  onUpdateAvailable: (cb) => {
    const handler = (_, info) => cb(info);
    electron.ipcRenderer.on("update:available", handler);
    return () => electron.ipcRenderer.removeListener("update:available", handler);
  },
  onUpdateProgress: (cb) => {
    const handler = (_, p) => cb(p);
    electron.ipcRenderer.on("update:progress", handler);
    return () => electron.ipcRenderer.removeListener("update:progress", handler);
  },
  installUpdate: () => electron.ipcRenderer.send("update:install")
});
