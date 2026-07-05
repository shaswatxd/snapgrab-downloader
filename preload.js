const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // App functions
  getStatus: () => ipcRenderer.invoke('get-status'),
  setupYtDlp: () => ipcRenderer.invoke('setup-ytdlp'),
  setupFfmpeg: () => ipcRenderer.invoke('setup-ffmpeg'),
  fetchInfo: (url) => ipcRenderer.invoke('fetch-info', url),
  startDownload: (opts) => ipcRenderer.invoke('start-download', opts),
  startBatchDownload: (opts) => ipcRenderer.invoke('start-batch-download', opts),
  cancelDownload: (id) => ipcRenderer.invoke('cancel-download', id),
  getFiles: () => ipcRenderer.invoke('get-files'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  openFile: (name) => ipcRenderer.invoke('open-file', name),
  deleteFile: (name) => ipcRenderer.invoke('delete-file', name),
  getFilePath: (name) => ipcRenderer.invoke('get-file-path', name),
  getDownloadsDir: () => ipcRenderer.invoke('get-downloads-dir'),
  setDownloadsDir: () => ipcRenderer.invoke('set-downloads-dir'),

  // Clipboard
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),

  // Settings & Updates
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  checkYtDlpUpdate: (force) => ipcRenderer.invoke('check-ytdlp-update', force),
  checkFfmpegUpdate: (force) => ipcRenderer.invoke('check-ffmpeg-update', force),
  getBinVersions: () => ipcRenderer.invoke('get-bin-versions'),
  getAppUpdateState: () => ipcRenderer.invoke('get-app-update-state'),
  checkAppUpdate: (force) => ipcRenderer.invoke('check-app-update', force),
  installAppUpdate: () => ipcRenderer.invoke('install-app-update'),

  // Listeners
  onSetupProgress: (cb) => ipcRenderer.on('setup-progress', (_, p) => cb(p)),
  onSetupStatus: (cb) => ipcRenderer.on('setup-status', (_, s) => cb(s)),
  onDownloadProgress: (id, cb) => ipcRenderer.on(`dl-progress:${id}`, (_, d) => cb(d)),
  onDownloadComplete: (id, cb) => ipcRenderer.on(`dl-complete:${id}`, (_, d) => cb(d)),
  onDownloadError: (id, cb) => ipcRenderer.on(`dl-error:${id}`, (_, d) => cb(d)),
  onUpdaterStatus: (cb) => ipcRenderer.on('updater-status', (_, s) => cb(s)),
  onUpdaterProgress: (cb) => ipcRenderer.on('updater-progress', (_, p) => cb(p)),
  onAppUpdateStatus: (cb) => ipcRenderer.on('app-update-status', (_, s) => cb(s)),

  removeListeners: (id) => {
    ipcRenderer.removeAllListeners(`dl-progress:${id}`);
    ipcRenderer.removeAllListeners(`dl-complete:${id}`);
    ipcRenderer.removeAllListeners(`dl-error:${id}`);
  },
});
