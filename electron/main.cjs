// Electron main — packages the app as a fullscreen portrait kiosk (.exe via
// electron-builder). Everything (HTML/CSS/JS, images, fonts) is loaded from the
// bundled files inside the app — nothing is downloaded. Only game data goes to
// Supabase (the shared leaderboard / question pool).
const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('node:path');

const DEV_URL = process.env.ELECTRON_START_URL;
const DIST = path.join(__dirname, '..', 'dist');

let win;

function loadLocal(page) {
  if (DEV_URL) win.loadURL(page === 'admin' ? `${DEV_URL}/admin.html` : DEV_URL);
  else win.loadFile(path.join(DIST, page === 'admin' ? 'admin.html' : 'index.html'));
}

function createWindow() {
  win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadLocal('game');

  // Kiosk hardening: never navigate away from the bundled app, never open popups.
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:') && !(DEV_URL && url.startsWith(DEV_URL))) e.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

app.whenReady().then(() => {
  createWindow();

  // On-site staff shortcuts (chrome is hidden in kiosk mode):
  globalShortcut.register('CommandOrControl+Shift+A', () => loadLocal('admin')); // settings console
  globalShortcut.register('CommandOrControl+Shift+G', () => loadLocal('game')); // back to game
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit()); // exit

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());
