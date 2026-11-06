// Gives the game page one small desktop-only power: putting the app window into
// fullscreen (like F11) while a video plays, and back to a window afterwards.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rhDesktop', {
  setFullscreen: (on) => ipcRenderer.send('rh-fullscreen', !!on),
  onFullscreenChange: (cb) => ipcRenderer.on('rh-fullscreen-changed', (_e, on) => cb(!!on))
});
