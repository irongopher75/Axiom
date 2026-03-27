import { BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

export function setupUpdater(window: BrowserWindow) {
  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', (info) => {
    window.webContents.send('update:available', info);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    window.webContents.send('update:progress', progressObj.percent);
  });

  autoUpdater.on('update-downloaded', () => {
    // Update is ready to install
  });

  ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall();
  });

  // Check for updates every hour
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 60 * 60 * 1000);

  // Initial check
  autoUpdater.checkForUpdatesAndNotify();
}
