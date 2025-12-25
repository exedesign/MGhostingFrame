const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File selection
    selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
    selectWatermarkImage: () => ipcRenderer.invoke('select-watermark-image'),
    selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
    validateVideo: (filePath) => ipcRenderer.invoke('validate-video', filePath),

    // Watermark operations
    embedWatermarkKey: (data) => ipcRenderer.invoke('embed-watermark-key', data),
    extractWatermarkKey: (data) => ipcRenderer.invoke('extract-watermark-key', data),
    extractWatermarkManual: (data) => ipcRenderer.invoke('extract-watermark-manual', data),

    // Records management
    getAllRecords: () => ipcRenderer.invoke('get-all-records'),
    getRecordById: (id) => ipcRenderer.invoke('get-record-by-id', id),
    exportRecords: () => ipcRenderer.invoke('export-records'),
    deleteAllHistory: () => ipcRenderer.invoke('delete-all-history'),

    // Utility
    cleanTemp: () => ipcRenderer.invoke('clean-temp'),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    
    // SMTP Settings
    getSMTPSettings: () => ipcRenderer.invoke('get-smtp-settings'),
    updateSMTPSettings: (settings) => ipcRenderer.invoke('update-smtp-settings', settings),
    sendTestEmail: (email) => ipcRenderer.invoke('send-test-email', email),
    getTestEmail: () => ipcRenderer.invoke('get-test-email'),
    saveTestEmail: (email) => ipcRenderer.invoke('save-test-email', email),
    
    // Default Email
    getDefaultEmail: () => ipcRenderer.invoke('get-default-email'),
    saveDefaultEmail: (email) => ipcRenderer.invoke('save-default-email', email),

    // Key Management
    generateUniqueKey: () => ipcRenderer.invoke('generate-unique-key'),
    checkKeyExists: (key) => ipcRenderer.invoke('check-key-exists', key),
    getNextKey: () => ipcRenderer.invoke('get-next-key'),
    searchByKey: (key) => ipcRenderer.invoke('search-by-key', key),

    // Progress listener
    onProgress: (callback) => {
        ipcRenderer.on('watermark-progress', (event, data) => callback(data));
    },

    // Watermark progress listener
    onWatermarkProgress: (callback) => {
        ipcRenderer.on('watermark-progress', (event, data) => callback(data));
    },

    // Remove progress listener
    removeProgressListener: () => {
        ipcRenderer.removeAllListeners('watermark-progress');
    }
});
