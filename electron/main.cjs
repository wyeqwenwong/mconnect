// Electron main — packages the React game client as a fullscreen portrait
// kiosk (.exe via electron-builder). GDD §9. Loads the built dist/index.html,
// or the Vite dev server when ELECTRON_START_URL is set.
const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('node:path');

const DEV_URL = process.env.ELECTRON_START_URL;

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    backgroundColor: '#0b0b0c',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Emergency exit for on-site staff (kiosk hides normal chrome).
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit());
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());
