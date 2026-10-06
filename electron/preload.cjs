const { contextBridge, ipcRenderer } = require('electron');

const subscribe = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = (_event, message) => listener(message);
  ipcRenderer.on('launcher:event', handler);
  return () => ipcRenderer.removeListener('launcher:event', handler);
};

contextBridge.exposeInMainWorld('launcher', {
  isDesktop: true,
  getState: () => ipcRenderer.invoke('launcher:get-state'),
  login: (credentials) => ipcRenderer.invoke('launcher:login', credentials),
  logout: () => ipcRenderer.invoke('launcher:logout'),
  saveSettings: (settings) => ipcRenderer.invoke('launcher:save-settings', settings),
  chooseGameDir: () => ipcRenderer.invoke('launcher:choose-game-dir'),
  launch: (options) => ipcRenderer.invoke('launcher:launch', options),
  openExternal: (url) => ipcRenderer.invoke('launcher:open-external', url),
  windowControl: (action) => ipcRenderer.invoke('launcher:window-control', action),
  onEvent: subscribe,
});
