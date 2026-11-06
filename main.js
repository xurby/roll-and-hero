// Roll & Hero desktop app (Electron). The game itself is index.html, the same
// single page that runs in a browser; this file only opens it in a window.
const { app, BrowserWindow, session, shell, Menu, ipcMain } = require('electron');
const path = require('path');

// Videos may start playing without a click first (same as the browser setting)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// One window only: opening the app again brings the existing window forward
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win = null;
  let videoMadeFullscreen = false; // the window went fullscreen for a video (not by you pressing F11)

  // While a video plays (with Fullscreen on in Display), the whole window goes
  // fullscreen; after the video it goes back to a window. If you were already
  // fullscreen yourself, it stays that way.
  ipcMain.on('rh-fullscreen', (e, on) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    if (on) {
      if (!w.isFullScreen()) { w.setFullScreen(true); videoMadeFullscreen = true; }
    } else if (videoMadeFullscreen) {
      videoMadeFullscreen = false;
      if (w.isFullScreen()) w.setFullScreen(false);
    }
  });
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  function createWindow() {
    win = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 760,
      minHeight: 600,
      title: 'Roll & Hero',
      backgroundColor: '#171716',
      icon: path.join(__dirname, 'assets', 'icon.png'),
      autoHideMenuBar: true, // press Alt to show the menu
      show: true, // appear right away: the page shows its own loading screen while it starts
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        spellcheck: false,
        preload: path.join(__dirname, 'preload.js')
      }
    });
    // tell the page when the window enters or leaves fullscreen (F11, Esc, the menu...)
    win.on('enter-full-screen', () => win.webContents.send('rh-fullscreen-changed', true));
    win.on('leave-full-screen', () => { videoMadeFullscreen = false; win.webContents.send('rh-fullscreen-changed', false); });

    // Links to websites open in the normal browser, never inside the app
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (e, url) => {
      if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
    });

    win.loadFile(path.join(__dirname, 'index.html'));
  }

  // The only permissions the game needs: folder access (your videos), fullscreen, and the
  // clipboard for "Copy as text". Everything else (camera, microphone, location,
  // notifications, USB...) is refused, and only the game's own page (a local file) gets any.
  const ALLOWED_PERMISSIONS = new Set(['fileSystem', 'fullscreen', 'clipboard-sanitized-write']);
  function isGamePage(wc, origin) {
    let url = origin || '';
    try { if (wc && !wc.isDestroyed()) url = wc.getURL() || url; } catch (e) { /* use the origin */ }
    return url.startsWith('file:');
  }

  app.whenReady().then(() => {
    // Folder access is remembered, so folders reconnect by themselves on the next start.
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) =>
      callback(ALLOWED_PERMISSIONS.has(permission) && isGamePage(wc, details && details.requestingUrl)));
    session.defaultSession.setPermissionCheckHandler((wc, permission, origin) =>
      ALLOWED_PERMISSIONS.has(permission) && isGamePage(wc, origin));
    session.defaultSession.setDevicePermissionHandler(() => false); // no USB / serial / HID devices

    // A short menu (Alt shows it): reload, fullscreen, zoom, developer tools
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Game', submenu: [{ role: 'reload', label: 'Reload' }, { type: 'separator' }, { role: 'quit' }] },
      { label: 'View', submenu: [
        { role: 'togglefullscreen' }, { type: 'separator' },
        { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' },
        { role: 'toggleDevTools' }
      ] }
    ]));

    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => app.quit());
}
