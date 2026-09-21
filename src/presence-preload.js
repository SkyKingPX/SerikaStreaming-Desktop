const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('serikaDesktop', {
  updatePresence: (activity) => ipcRenderer.invoke('presence:update', activity),
  clearPresence: () => ipcRenderer.invoke('presence:clear'),
});
