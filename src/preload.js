const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scanner', {
  runScan: () => ipcRenderer.invoke('run-scan'),
  fixStartup: () => ipcRenderer.invoke('fix-startup'),
  fixRam: () => ipcRenderer.invoke('fix-ram'),
  fixDisk: () => ipcRenderer.invoke('fix-disk'),
  fixDefender: () => ipcRenderer.invoke('fix-defender'),
  fixDuplicates: () => ipcRenderer.invoke('fix-duplicates'),
});