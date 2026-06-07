const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getSettings: () => ipcRenderer.invoke('get-settings'),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
    exportData: (data) => ipcRenderer.invoke('export-data', data),
    importData: () => ipcRenderer.invoke('import-data')
});