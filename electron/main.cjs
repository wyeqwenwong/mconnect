// Electron main — packages the app as a fullscreen portrait kiosk (.exe via
// electron-builder). Everything (HTML/CSS/JS, images, fonts) is loaded from the
// bundled files inside the app — nothing is downloaded. Only game data goes to
// Supabase (the shared leaderboard / question pool).
const { app, BrowserWindow, Menu, globalShortcut, screen } = require('electron');
const path = require('node:path');

const DEV_URL = process.env.ELECTRON_START_URL;
const DIST = path.join(__dirname, '..', 'dist');

let win;

function loadLocal(page) {
  if (DEV_URL) win.loadURL(page === 'admin' ? `${DEV_URL}/admin.html` : DEV_URL);
  else win.loadFile(path.join(DIST, page === 'admin' ? 'admin.html' : 'index.html'));
}

// Re-assert fullscreen kiosk on whatever display we're on (handles the panel
// being rotated or its resolution changing at runtime). The in-app UI scales
// itself to the window size, so a vertical panel is filled edge-to-edge.
function fitToDisplay() {
  if (!win || win.isDestroyed()) return;
  win.setKiosk(true);
  win.setFullScreen(true);
}

function createWindow() {
  const { bounds } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    fullscreen: true,
    kiosk: true,
    frame: false, // no title bar / window header
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Kiosk: let the looping background music start without a click gesture.
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  loadLocal('game');
  win.once('ready-to-show', fitToDisplay);

  // Kiosk hardening: never navigate away from the bundled app, never open popups.
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:') && !(DEV_URL && url.startsWith(DEV_URL))) e.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Disable the physical/OS keyboard during the GAME — players use only the
  // on-screen keyboard. The admin console still needs a real keyboard, so it is
  // left enabled there. (Staff global shortcuts below are unaffected — they are
  // handled at the OS level before the page sees them.)
  win.webContents.on('before-input-event', (event, input) => {
    const onAdmin = win.webContents.getURL().includes('admin.html');
    if (!onAdmin && input.type === 'keyDown') event.preventDefault();
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null); // remove the menu bar entirely
  createWindow();

  // Keep filling the panel if it is rotated / resolution changes at runtime.
  screen.on('display-metrics-changed', fitToDisplay);
  screen.on('display-added', fitToDisplay);
  screen.on('display-removed', fitToDisplay);

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
