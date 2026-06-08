import { app, BrowserWindow } from 'electron';
import path from 'path';
import { TrayManager } from './tray';
import { registerIpcHandlers } from './ipc';

// Enforce single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 480,
    height: 640,
    show: false,
    skipTaskbar: true,
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

app.on('ready', () => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  mainWindow = createWindow();
  // PollEngine.triggerNow wired here in a later unit; pass stub for scaffold
  trayManager = new TrayManager(mainWindow, () => {});
  registerIpcHandlers(() => mainWindow);
});

app.on('second-instance', () => {
  if (!mainWindow) {
    // Window was closed (not quit); reopen it
    mainWindow = createWindow();
    if (trayManager) {
      // Re-wire tray to the new window reference
      trayManager.updateWindow(mainWindow);
    }
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

// Keep app running when windows close — tray app lifecycle
app.on('window-all-closed', () => {
  // intentionally empty: tray app persists until explicit Quit
});

app.on('before-quit', () => {
  trayManager?.destroy();
});
