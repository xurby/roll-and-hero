// Gives the game page two small desktop-only powers: putting the app window into
// fullscreen (like F11) while a video plays, and picking several folders at once.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rhDesktop', {
  setFullscreen: (on) => ipcRenderer.send('rh-fullscreen', !!on),
  onFullscreenChange: (cb) => ipcRenderer.on('rh-fullscreen-changed', (_e, on) => cb(!!on)),
  // the Windows folder dialog, several folders at once; returns their paths
  pickFolders: (startDir, single) => ipcRenderer.invoke('rh-pick-folders', startDir, !!single),
  // read folders picked above by their path (their files are opened as rhfile:// addresses)
  listDir: (dir) => ipcRenderer.invoke('rh-list-dir', dir),
  dirExists: (dir) => ipcRenderer.invoke('rh-dir-exists', dir),
  // the ready-made pack this app was started from ({ root, manifest }), or null
  pack: ipcRenderer.sendSync('rh-pack-info')
});
