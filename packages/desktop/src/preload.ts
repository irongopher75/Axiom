import { contextBridge, ipcRenderer } from 'electron';

// Minimal surface area.
// Every method here is an attack surface.
// Add nothing unless it is strictly required by the UI.

contextBridge.exposeInMainWorld('axiomDesktop', {

  // ── Platform ───────────────────────────────────────────────
  getPlatform: () =>
    ipcRenderer.invoke('app:get-platform'),

  openExternal: (url: string) =>
    ipcRenderer.invoke('app:open-external', url),

  openDataDir: () =>
    ipcRenderer.invoke('app:open-data-dir'),

  restartSidecar: () =>
    ipcRenderer.invoke('app:restart-sidecar'),

  // ── Sidecar status ─────────────────────────────────────────
  // Returns unsubscribe function
  onSidecarStatus: (cb: (s: { status: string }) => void) => {
    const handler = (_: unknown, s: { status: string }) => cb(s);
    ipcRenderer.on('sidecar:status', handler);
    return () => ipcRenderer.removeListener('sidecar:status', handler);
  },

  // Dev only — sidecar stdout in browser console
  onSidecarLog: (cb: (log: string) => void) => {
    const handler = (_: unknown, log: string) => cb(log);
    ipcRenderer.on('sidecar:log', handler);
    return () => ipcRenderer.removeListener('sidecar:log', handler);
  },

  // ── Updates ────────────────────────────────────────────────
  onUpdateAvailable: (cb: (info: any) => void) => {
    const handler = (_: unknown, info: any) => cb(info);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },

  onUpdateProgress: (cb: (progress: number) => void) => {
    const handler = (_: unknown, p: number) => cb(p);
    ipcRenderer.on('update:progress', handler);
    return () => ipcRenderer.removeListener('update:progress', handler);
  },

  installUpdate: () =>
    ipcRenderer.send('update:install'),
});
