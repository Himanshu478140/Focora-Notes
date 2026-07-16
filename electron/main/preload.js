const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, scoped APIs to the Next.js React client context
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getVersions: () => ({
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }),
  
  drive: {
    connect: () => ipcRenderer.invoke('focora:drive-connect'),
    disconnect: () => ipcRenderer.invoke('focora:drive-disconnect'),
    status: () => ipcRenderer.invoke('focora:drive-status'),
    backup: (payload) => ipcRenderer.invoke('focora:drive-backup', payload),
    uploadImages: (chunk) => ipcRenderer.invoke('focora:drive-upload-images', chunk),
    restore: () => ipcRenderer.invoke('focora:drive-restore'),
    onProgress: (callback) => {
      const listener = (event, progress) => callback(progress);
      ipcRenderer.on('focora:drive-progress', listener);
      return () => {
        ipcRenderer.removeListener('focora:drive-progress', listener);
      };
    }
  }
});
