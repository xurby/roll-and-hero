// Roll & Hero desktop app (Electron). The game itself is index.html, the same
// single page that runs in a browser; this file only opens it in a window.
const { app, BrowserWindow, session, shell, Menu, ipcMain, dialog, protocol } = require('electron');
const path = require('path');

// Videos may start playing without a click first (same as the browser setting)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// rhfile://: how the page reads files in folders picked by path (must be set up before the app is ready)
protocol.registerSchemesAsPrivileged([{ scheme: 'rhfile', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true, bypassCSP: true } }]);

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
  // ---- Folders opened by their path (picked in the Windows folder dialog) ----
  // The page can only list and read inside folders you picked here; the list is kept in
  // rh-folders.json so they open again by themselves after a restart.
  const fs = require('fs');
  const { Readable } = require('stream');
  const rootsFile = () => path.join(app.getPath('userData'), 'rh-folders.json');
  let roots = null;
  const normP = p => path.resolve(String(p)).replace(/[\\/]+$/, '').toLowerCase();
  function loadRoots() {
    if (roots) return roots;
    roots = new Set();
    try { JSON.parse(fs.readFileSync(rootsFile(), 'utf8')).forEach(r => roots.add(normP(r))); } catch (e) { /* none yet */ }
    return roots;
  }
  function addRoots(list) {
    loadRoots();
    list.forEach(p => roots.add(normP(p)));
    try { fs.writeFileSync(rootsFile(), JSON.stringify([...roots])); } catch (e) { /* kept for this visit */ }
  }
  function isAllowed(p) {
    if (typeof p !== 'string' || !p) return false;
    const n = normP(p);
    if (pack) { const r = normP(pack.root); if (n === r || n.startsWith(r + path.sep)) return true; }
    for (const r of loadRoots()) if (n === r || n.startsWith(r + path.sep)) return true;
    return false;
  }
  ipcMain.handle('rh-list-dir', async (e, dir) => {
    if (!isAllowed(dir)) throw new Error('not a picked folder');
    const ents = await fs.promises.readdir(dir, { withFileTypes: true });
    const out = [];
    await Promise.all(ents.map(async d => {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) { out.push({ name: d.name, dir: true }); return; }
      if (!d.isFile()) return;
      try { const st = await fs.promises.stat(full); out.push({ name: d.name, dir: false, size: st.size, mtime: st.mtimeMs }); } catch (err) { /* unreadable: skip */ }
    }));
    return out;
  });
  ipcMain.handle('rh-dir-exists', async (e, dir) => {
    if (!isAllowed(dir)) return false;
    try { return (await fs.promises.stat(dir)).isDirectory(); } catch (err) { return false; }
  });
  const MIME = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8', '.srt': 'text/plain; charset=utf-8', '.vtt': 'text/vtt', '.zip': 'application/zip' };
  // rhfile://f/<path>: one file, with byte ranges so videos can seek
  async function serveFile(request) {
    let p;
    try { p = decodeURIComponent(new URL(request.url).pathname.slice(1)); } catch (e) { return new Response('bad path', { status: 400 }); }
    if (!isAllowed(p)) return new Response('not allowed', { status: 403 });
    let st;
    try { st = await fs.promises.stat(p); if (!st.isFile()) throw new Error('not a file'); } catch (e) { return new Response('not found', { status: 404 }); }
    const size = st.size;
    const headers = { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Range, Content-Length' };
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
    if (range && (range[1] || range[2])) {
      let start, end;
      if (range[1]) { start = +range[1]; end = range[2] ? Math.min(+range[2], size - 1) : size - 1; }
      else { start = Math.max(0, size - +range[2]); end = size - 1; }
      if (start >= size || start > end) return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': 'bytes */' + size } });
      return new Response(Readable.toWeb(fs.createReadStream(p, { start, end })), { status: 206, headers: { ...headers, 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': String(end - start + 1) } });
    }
    if (!size) return new Response(new Uint8Array(0), { status: 200, headers: { ...headers, 'Content-Length': '0' } });
    return new Response(Readable.toWeb(fs.createReadStream(p)), { status: 200, headers: { ...headers, 'Content-Length': String(size) } });
  }
  // ---- A ready-made pack: the app inside a folder that also holds the videos ----
  // "roll-and-hero-pack.json" next to the app (or one folder up) lists which folder is what.
  // Its folders can be read from wherever the pack was unzipped, and the pack keeps its own
  // settings (so it never mixes with another copy of the game on the same PC).
  const PACK_FILE = 'roll-and-hero-pack.json';
  let pack = null; // { root, manifest }
  (function findPack() {
    const exeDir = path.dirname(process.execPath);
    const dirs = [process.env.RH_PACK_DIR, exeDir, path.dirname(exeDir)].filter(Boolean);
    for (const d of dirs) {
      try {
        const manifest = JSON.parse(fs.readFileSync(path.join(d, PACK_FILE), 'utf8').replace(/^﻿/, ''));
        pack = { root: path.resolve(d), manifest };
        break;
      } catch (e) { /* not here */ }
    }
    if (pack) {
      const id = String(pack.manifest.id || 'pack').replace(/[^\w .-]+/g, '').slice(0, 40) || 'pack';
      try { app.setPath('userData', path.join(app.getPath('appData'), 'Roll & Hero - ' + id)); } catch (e) { /* default place */ }
    }
  })();
  ipcMain.on('rh-pack-info', e => { e.returnValue = pack; });
  // "Select folders…": the Windows folder dialog, several folders allowed (Ctrl / Shift + click).
  // The picked folders can then be read by the page (see above).
  ipcMain.handle('rh-pick-folders', async (e, startDir, single) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    const opts = single
      ? { title: 'Choose a folder', properties: ['openDirectory'] }
      : { title: 'Select folders (Ctrl or Shift + click for several)', properties: ['openDirectory', 'multiSelections'] };
    // open where folders were picked last time (if that folder still exists)
    if (typeof startDir === 'string' && startDir) { try { if (require('fs').statSync(startDir).isDirectory()) opts.defaultPath = startDir; } catch (err) { /* gone */ } }
    const r = await dialog.showOpenDialog(w, opts);
    if (r.canceled) return [];
    addRoots(r.filePaths);
    return r.filePaths;
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
    protocol.handle('rhfile', serveFile);
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
