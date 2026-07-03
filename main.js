const { app, BrowserWindow, ipcMain, shell, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const https = require('https');
const { autoUpdater } = require('electron-updater');

// ─── Paths ──────────────────────────────────────────────────────
const USER_DATA_DIR = app.getPath('userData');
const BIN_DIR = path.join(USER_DATA_DIR, 'bin');
const PACKAGED_BIN_DIR = path.join(app.isPackaged ? process.resourcesPath : __dirname, 'bin');
let DOWNLOADS_DIR = path.join(app.getPath('downloads'), 'SnapGrab');
const YT_DLP_PATH = path.join(BIN_DIR, 'yt-dlp.exe');
const SETTINGS_PATH = path.join(USER_DATA_DIR, 'settings.json');

// Ensure bin directory exists
if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

// Default Settings
let settings = {
  downloadsDir: DOWNLOADS_DIR,
  autoUpdateYtdlp: true,
  autoUpdateFfmpeg: true,
  autoUpdateApp: true,
  lastAppVersion: "",
  localFfmpegTag: "none"
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      settings = { ...settings, ...data };
      if (settings.downloadsDir && fs.existsSync(settings.downloadsDir)) {
        DOWNLOADS_DIR = settings.downloadsDir;
      }
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
  return settings;
}

function saveSettings(newSettings) {
  try {
    settings = { ...settings, ...newSettings };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

// Load settings on startup
loadSettings();
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

// Copy packaged binaries to writable userData directory on startup
function initializeBinaries() {
  const currentAppVersion = app.getVersion();
  const lastVersion = settings.lastAppVersion || '';
  const isAppUpdated = currentAppVersion !== lastVersion;

  const binaries = ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe'];
  for (const bin of binaries) {
    const destPath = path.join(BIN_DIR, bin);
    const srcPath = path.join(PACKAGED_BIN_DIR, bin);

    if (fs.existsSync(srcPath)) {
      let shouldCopy = !fs.existsSync(destPath);
      if (isAppUpdated && fs.existsSync(destPath)) {
        try {
          const srcStat = fs.statSync(srcPath);
          const destStat = fs.statSync(destPath);
          if (srcStat.mtimeMs > destStat.mtimeMs) {
            shouldCopy = true;
          }
        } catch (e) {
          shouldCopy = true;
        }
      }

      if (shouldCopy) {
        try {
          fs.copyFileSync(srcPath, destPath);
          console.log(`Copied ${bin} to ${destPath}`);
        } catch (err) {
          console.error(`Error copying ${bin}:`, err);
        }
      }
    }
  }

  if (isAppUpdated) {
    saveSettings({ lastAppVersion: currentAppVersion });
  }
}

let mainWindow;
let ytdlpUpdateTask = null;
let ffmpegUpdateTask = null;
let appUpdaterInitialized = false;
let appUpdateState = {
  status: 'idle',
  currentVersion: app.getVersion(),
  availableVersion: null,
  percent: 0,
  downloaded: false,
  message: 'Ready to check for updates'
};

function sendAppUpdateStatus(patch) {
  appUpdateState = { ...appUpdateState, ...patch };
  mainWindow?.webContents.send('app-update-status', appUpdateState);
}

function setupAppUpdater() {
  if (appUpdaterInitialized || !app.isPackaged) return;
  appUpdaterInitialized = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    sendAppUpdateStatus({
      status: 'checking',
      percent: 0,
      downloaded: false,
      message: 'Checking for a SnapGrab update...'
    });
  });
  autoUpdater.on('update-available', (info) => {
    sendAppUpdateStatus({
      status: 'downloading',
      availableVersion: info.version,
      message: `SnapGrab ${info.version} is available. Downloading...`
    });
  });
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent || 0);
    sendAppUpdateStatus({
      status: 'downloading',
      percent,
      message: `Downloading app update: ${percent}%`
    });
  });
  autoUpdater.on('update-not-available', (info) => {
    sendAppUpdateStatus({
      status: 'uptodate',
      availableVersion: info?.version || app.getVersion(),
      percent: 0,
      downloaded: false,
      message: 'SnapGrab is up to date'
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    sendAppUpdateStatus({
      status: 'downloaded',
      availableVersion: info.version,
      percent: 100,
      downloaded: true,
      message: `SnapGrab ${info.version} is ready. Restart to install.`
    });
  });
  autoUpdater.on('error', (err) => {
    sendAppUpdateStatus({
      status: 'error',
      downloaded: false,
      message: `App update failed: ${err.message}`
    });
  });
}

async function checkForAppUpdates(force = false) {
  const activeSettings = loadSettings();
  if (!force && activeSettings.autoUpdateApp === false) {
    return { success: false, reason: 'disabled', state: appUpdateState };
  }
  if (!app.isPackaged) {
    sendAppUpdateStatus({
      status: 'development',
      message: 'App updates are available in installed builds',
      currentVersion: app.getVersion()
    });
    return { success: true, skipped: true, reason: 'development', state: appUpdateState };
  }

  setupAppUpdater();
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      success: true,
      updateInfo: result?.updateInfo || null,
      state: appUpdateState
    };
  } catch (err) {
    sendAppUpdateStatus({ status: 'error', message: `App update failed: ${err.message}` });
    return { success: false, error: err.message, state: appUpdateState };
  }
}

function runYtDlpUpdate(force = false) {
  if (ytdlpUpdateTask) return ytdlpUpdateTask;
  ytdlpUpdateTask = checkAndAutoUpdateYtDlp(force).finally(() => {
    ytdlpUpdateTask = null;
  });
  return ytdlpUpdateTask;
}

function runFfmpegUpdate(force = false) {
  if (ffmpegUpdateTask) return ffmpegUpdateTask;
  ffmpegUpdateTask = checkAndAutoUpdateFfmpeg(force).finally(() => {
    ffmpegUpdateTask = null;
  });
  return ffmpegUpdateTask;
}

// ─── Single Instance Lock ───────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ─── Create Window ──────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 750,
    minWidth: 650,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'public', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  initializeBinaries();
  createWindow();
  setupAppUpdater();
  
  // Run background updates after 3 seconds
  mainWindow?.once('ready-to-show', () => {
    setTimeout(() => {
      runYtDlpUpdate().catch(console.error);
      runFfmpegUpdate().catch(console.error);
      checkForAppUpdates().catch(console.error);
    }, 3000);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Window Controls ────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

// ─── yt-dlp & ffmpeg checks ────────────────────────────────────
function isYtDlpAvailable() {
  if (fs.existsSync(YT_DLP_PATH)) return YT_DLP_PATH;
  try {
    const result = execSync('where yt-dlp', { encoding: 'utf-8' }).trim();
    if (result) return 'yt-dlp';
  } catch {}
  return null;
}

function isFfmpegAvailable() {
  return !!findFfmpeg();
}

function findFfmpeg() {
  // 1. Check our own bin folder first
  const localFfmpeg = path.join(BIN_DIR, 'ffmpeg.exe');
  if (fs.existsSync(localFfmpeg)) return BIN_DIR;

  // 2. Check winget install location
  const wingetPath = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  try {
    if (fs.existsSync(wingetPath)) {
      const dirs = fs.readdirSync(wingetPath).filter(d => d.toLowerCase().includes('ffmpeg'));
      for (const dir of dirs) {
        const binDir = path.join(wingetPath, dir);
        const subDirs = fs.readdirSync(binDir);
        for (const sub of subDirs) {
          const binPath = path.join(binDir, sub, 'bin', 'ffmpeg.exe');
          if (fs.existsSync(binPath)) return path.join(binDir, sub, 'bin');
        }
      }
    }
  } catch {}

  // 3. Check system PATH
  try {
    const result = execSync('where ffmpeg', { encoding: 'utf-8' }).trim().split('\n')[0].trim();
    if (result && fs.existsSync(result)) return path.dirname(result);
  } catch {}
  return null;
}

// Check if Node.js is available for yt-dlp JS runtime
function isNodeAvailable() {
  try {
    execSync('node --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Download ffmpeg to our bin folder
function downloadFfmpeg() {
  return new Promise((resolve, reject) => {
    if (findFfmpeg()) return resolve({ success: true, message: 'Already available' });

    const zipPath = path.join(BIN_DIR, 'ffmpeg.zip');
    const url = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';

    mainWindow?.webContents.send('setup-status', 'Downloading FFmpeg (~130MB)...');

    const file = fs.createWriteStream(zipPath);
    const request = (urlToFetch) => {
      https.get(urlToFetch, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) return request(response.headers.location);
        const total = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const pct = Math.round((downloaded / total) * 100);
            mainWindow?.webContents.send('setup-progress', pct);
            mainWindow?.webContents.send('setup-status', `Downloading FFmpeg... ${pct}%`);
          }
        });
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          mainWindow?.webContents.send('setup-status', 'Extracting FFmpeg...');
          // Extract using PowerShell
          const extractCmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${BIN_DIR}' -Force; $ffDir = Get-ChildItem '${BIN_DIR}' -Directory -Filter 'ffmpeg-*' | Select-Object -First 1; if($ffDir) { Copy-Item (Join-Path $ffDir.FullName 'bin\\ffmpeg.exe') '${BIN_DIR}\\ffmpeg.exe' -Force; Copy-Item (Join-Path $ffDir.FullName 'bin\\ffprobe.exe') '${BIN_DIR}\\ffprobe.exe' -Force; Remove-Item $ffDir.FullName -Recurse -Force }; Remove-Item '${zipPath}' -Force"`;
          const proc = spawn('cmd', ['/c', extractCmd], { stdio: 'ignore' });
          proc.on('close', (code) => {
            if (code === 0 && fs.existsSync(path.join(BIN_DIR, 'ffmpeg.exe'))) {
              resolve({ success: true, message: 'FFmpeg installed!' });
            } else {
              reject(new Error('Failed to extract FFmpeg'));
            }
          });
        });
      }).on('error', (err) => {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        reject(err);
      });
    };
    request(url);
  });
}

// Base args for all yt-dlp commands
function baseArgs() {
  const args = [];
  // Add Node.js runtime only if available
  if (isNodeAvailable()) {
    args.push('--js-runtimes', 'nodejs');
  }
  // Add ffmpeg location
  const ffmpegDir = findFfmpeg();
  if (ffmpegDir) {
    args.push('--ffmpeg-location', ffmpegDir);
  }
  return args;
}

// ─── IPC: Status ────────────────────────────────────────────────
ipcMain.handle('get-status', () => ({
  ytdlp: !!isYtDlpAvailable(),
  ffmpeg: isFfmpegAvailable(),
  nodejs: isNodeAvailable(),
  downloadsDir: DOWNLOADS_DIR,
}));

// ─── IPC: Setup FFmpeg ──────────────────────────────────────────
ipcMain.handle('setup-ffmpeg', async () => {
  try {
    return await downloadFfmpeg();
  } catch (err) {
    throw err;
  }
});

ipcMain.handle('get-downloads-dir', () => DOWNLOADS_DIR);

ipcMain.handle('set-downloads-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Choose Download Folder',
    defaultPath: DOWNLOADS_DIR,
  });
  if (!result.canceled && result.filePaths[0]) {
    DOWNLOADS_DIR = result.filePaths[0];
    saveSettings({ downloadsDir: DOWNLOADS_DIR });
    return DOWNLOADS_DIR;
  }
  return null;
});

// ─── IPC: Setup yt-dlp ─────────────────────────────────────────
ipcMain.handle('setup-ytdlp', () => {
  return new Promise((resolve, reject) => {
    if (isYtDlpAvailable()) return resolve({ success: true, message: 'Already available' });
    const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    const file = fs.createWriteStream(YT_DLP_PATH);
    const request = (urlToFetch) => {
      https.get(urlToFetch, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) return request(response.headers.location);
        const total = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) mainWindow?.webContents.send('setup-progress', Math.round((downloaded / total) * 100));
        });
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve({ success: true, message: 'yt-dlp installed!' }); });
      }).on('error', (err) => {
        if (fs.existsSync(YT_DLP_PATH)) fs.unlinkSync(YT_DLP_PATH);
        reject(err);
      });
    };
    request(url);
  });
});

// ─── IPC: Settings & Updates ────────────────────────────────────
ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', (event, newSettings) => {
  saveSettings(newSettings);
  return { success: true };
});

ipcMain.handle('check-ytdlp-update', async (event, force = false) => {
  return await runYtDlpUpdate(force);
});

ipcMain.handle('check-ffmpeg-update', async (event, force = false) => {
  return await runFfmpegUpdate(force);
});

ipcMain.handle('get-app-update-state', () => appUpdateState);

ipcMain.handle('check-app-update', async (event, force = false) => {
  return await checkForAppUpdates(force);
});

ipcMain.handle('install-app-update', () => {
  if (!app.isPackaged || !appUpdateState.downloaded) {
    return { success: false, error: 'No downloaded app update is ready' };
  }
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return { success: true };
});

ipcMain.handle('get-bin-versions', async () => {
  const localYtdlp = await getLocalYtDlpVersion() || 'Not installed';
  const localFfmpeg = fs.existsSync(path.join(BIN_DIR, 'ffmpeg.exe')) 
    ? (settings.localFfmpegTag !== 'none' ? `Build ${settings.localFfmpegTag.substring(0, 10)}` : 'Installed')
    : 'Not installed';
  return {
    ytdlp: localYtdlp,
    ffmpeg: localFfmpeg
  };
});

// ─── Updater helper functions ──────────────────────────────────
function getLocalYtDlpVersion() {
  return new Promise((resolve) => {
    if (!fs.existsSync(YT_DLP_PATH)) return resolve(null);
    const proc = spawn(YT_DLP_PATH, ['--version']);
    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        resolve(null);
      }
    });
  });
}

function getLatestYtDlpVersion() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/yt-dlp/yt-dlp/releases/latest',
      headers: {
        'User-Agent': 'SnapGrab-Downloader-App'
      }
    };
    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch release info: ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(body);
          resolve(release.tag_name);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadYtDlpBinary(version) {
  return new Promise((resolve, reject) => {
    const tempPath = YT_DLP_PATH + '.new';
    const file = fs.createWriteStream(tempPath);
    const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';

    const request = (urlToFetch) => {
      https.get(urlToFetch, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          return request(response.headers.location);
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(tempPath, () => {});
          return reject(new Error(`Failed to download yt-dlp: ${response.statusCode}`));
        }

        const total = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
        
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const pct = Math.round((downloaded / total) * 100);
            mainWindow?.webContents.send('updater-progress', { type: 'ytdlp', percent: pct });
          }
        });

        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          try {
            if (fs.existsSync(YT_DLP_PATH)) {
              fs.unlinkSync(YT_DLP_PATH);
            }
            fs.renameSync(tempPath, YT_DLP_PATH);
            resolve();
          } catch (err) {
            fs.unlink(tempPath, () => {});
            reject(err);
          }
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(tempPath, () => {});
        reject(err);
      });
    };
    request(url);
  });
}

async function checkAndAutoUpdateYtDlp(force = false) {
  try {
    const activeSettings = loadSettings();
    if (!force && activeSettings.autoUpdateYtdlp === false) {
      console.log('Auto-update for yt-dlp is disabled.');
      return { success: false, reason: 'disabled' };
    }

    console.log('Checking for yt-dlp updates...');
    const localVersion = await getLocalYtDlpVersion();
    const latestVersion = await getLatestYtDlpVersion();

    if (!localVersion || localVersion !== latestVersion) {
      console.log(`Update available for yt-dlp: ${localVersion} -> ${latestVersion}`);
      mainWindow?.webContents.send('updater-status', { type: 'ytdlp', status: 'updating', message: `Updating yt-dlp to ${latestVersion}...` });
      
      await downloadYtDlpBinary(latestVersion);
      
      mainWindow?.webContents.send('updater-status', { type: 'ytdlp', status: 'updated', message: `yt-dlp updated to ${latestVersion}!`, version: latestVersion });
      return { success: true, updated: true, version: latestVersion };
    } else {
      console.log(`yt-dlp is up to date: ${localVersion}`);
      mainWindow?.webContents.send('updater-status', { type: 'ytdlp', status: 'uptodate', message: `yt-dlp is up to date.`, version: localVersion });
      return { success: true, updated: false, version: localVersion };
    }
  } catch (err) {
    console.error('Error auto-updating yt-dlp:', err);
    mainWindow?.webContents.send('updater-status', { type: 'ytdlp', status: 'error', message: `Failed to update yt-dlp: ${err.message}` });
    return { success: false, error: err.message };
  }
}

function getLatestFfmpegTag() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/BtbN/FFmpeg-Builds/releases',
      headers: {
        'User-Agent': 'SnapGrab-Downloader-App'
      }
    };
    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch FFmpeg release: ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const releases = JSON.parse(body);
          const latest = releases.find(r => r.name && r.name.toLowerCase().includes('latest')) || releases[0];
          resolve(latest ? latest.published_at : 'latest');
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadAndExtractFfmpeg() {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(BIN_DIR, 'ffmpeg.zip');
    const url = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';

    const file = fs.createWriteStream(zipPath);
    const request = (urlToFetch) => {
      https.get(urlToFetch, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          return request(response.headers.location);
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(zipPath, () => {});
          return reject(new Error(`Failed to download FFmpeg: ${response.statusCode}`));
        }

        const total = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
        
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const pct = Math.round((downloaded / total) * 100);
            mainWindow?.webContents.send('updater-progress', { type: 'ffmpeg', percent: pct });
          }
        });

        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          mainWindow?.webContents.send('updater-status', { type: 'ffmpeg', status: 'extracting', message: 'Extracting FFmpeg...' });
          
          // Extract using PowerShell
          const extractCmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${BIN_DIR}' -Force; $ffDir = Get-ChildItem '${BIN_DIR}' -Directory -Filter 'ffmpeg-*' | Select-Object -First 1; if($ffDir) { Copy-Item (Join-Path $ffDir.FullName 'bin\\ffmpeg.exe') '${BIN_DIR}\\ffmpeg.exe' -Force; Copy-Item (Join-Path $ffDir.FullName 'bin\\ffprobe.exe') '${BIN_DIR}\\ffprobe.exe' -Force; Remove-Item $ffDir.FullName -Recurse -Force }; Remove-Item '${zipPath}' -Force"`;
          const proc = spawn('cmd', ['/c', extractCmd], { stdio: 'ignore' });
          proc.on('close', (code) => {
            if (code === 0 && fs.existsSync(path.join(BIN_DIR, 'ffmpeg.exe'))) {
              resolve();
            } else {
              reject(new Error('Failed to extract FFmpeg'));
            }
          });
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(zipPath, () => {});
        reject(err);
      });
    };
    request(url);
  });
}

async function checkAndAutoUpdateFfmpeg(force = false) {
  try {
    const activeSettings = loadSettings();
    if (!force && activeSettings.autoUpdateFfmpeg === false) {
      console.log('Auto-update for FFmpeg is disabled.');
      return { success: false, reason: 'disabled' };
    }

    console.log('Checking for FFmpeg updates...');
    const localTag = activeSettings.localFfmpegTag || 'none';
    const latestTag = await getLatestFfmpegTag();

    if (localTag !== latestTag || !fs.existsSync(path.join(BIN_DIR, 'ffmpeg.exe'))) {
      console.log(`Update available for FFmpeg: ${localTag} -> ${latestTag}`);
      mainWindow?.webContents.send('updater-status', { type: 'ffmpeg', status: 'updating', message: `Updating FFmpeg...` });
      
      await downloadAndExtractFfmpeg();
      
      saveSettings({ localFfmpegTag: latestTag });
      
      mainWindow?.webContents.send('updater-status', { type: 'ffmpeg', status: 'updated', message: `FFmpeg updated to build ${latestTag.substring(0, 10)}!`, version: `Build ${latestTag.substring(0, 10)}` });
      return { success: true, updated: true, version: latestTag };
    } else {
      console.log(`FFmpeg is up to date: ${localTag}`);
      mainWindow?.webContents.send('updater-status', { type: 'ffmpeg', status: 'uptodate', message: `FFmpeg is up to date.`, version: `Build ${localTag.substring(0, 10)}` });
      return { success: true, updated: false, version: localTag };
    }
  } catch (err) {
    console.error('Error auto-updating FFmpeg:', err);
    mainWindow?.webContents.send('updater-status', { type: 'ffmpeg', status: 'error', message: `Failed to update FFmpeg: ${err.message}` });
    return { success: false, error: err.message };
  }
}

// ─── IPC: Fetch video info (single or playlist) ────────────────
ipcMain.handle('fetch-info', (event, url) => {
  return new Promise((resolve, reject) => {
    const ytdlpPath = isYtDlpAvailable();
    if (!ytdlpPath) return reject(new Error('yt-dlp not available'));

    // Detect if URL is YouTube Music
    const isYtMusic = url.includes('music.youtube.com');

    // First try: check if it's a playlist
    const proc = spawn(ytdlpPath, [...baseArgs(), '--dump-json', '--flat-playlist', url]);
    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.stderr.on('data', (d) => { errorOutput += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(errorOutput || 'Failed to fetch'));
      try {
        // Multiple JSON objects = playlist
        const lines = output.trim().split('\n').filter(l => l.trim());
        if (lines.length > 1) {
          // It's a playlist
          const items = lines.map(l => {
            try {
              const info = JSON.parse(l);
              return {
                title: info.title,
                url: info.url || info.webpage_url || info.original_url,
                duration: info.duration,
                thumbnail: info.thumbnail || info.thumbnails?.[0]?.url,
              };
            } catch { return null; }
          }).filter(Boolean);

          // Extract actual playlist title from first item or playlist metadata
          let playlistTitle = 'Playlist';
          if (items.length > 0) {
            // Try to get playlist title from the first item's playlist field
            try {
              const firstInfo = JSON.parse(lines[0]);
              if (firstInfo.playlist) playlistTitle = firstInfo.playlist;
              else if (firstInfo.playlist_title) playlistTitle = firstInfo.playlist_title;
              else if (firstInfo.playlist_id) playlistTitle = `Playlist ${firstInfo.playlist_id}`;
            } catch {}
          }

          resolve({
            isPlaylist: true,
            count: items.length,
            title: playlistTitle,
            items,
            isYtMusic, // Flag for YouTube Music content
          });
        } else {
          // Single video - get full info
          const singleProc = spawn(ytdlpPath, [...baseArgs(), '--dump-json', '--no-playlist', url]);
          let singleOutput = '';
          let singleErr = '';
          singleProc.stdout.on('data', (d) => { singleOutput += d.toString(); });
          singleProc.stderr.on('data', (d) => { singleErr += d.toString(); });
          singleProc.on('close', (c) => {
            if (c !== 0) return reject(new Error(singleErr || 'Failed'));
            try {
              const info = JSON.parse(singleOutput);
              resolve({
                isPlaylist: false,
                title: info.title,
                thumbnail: info.thumbnail,
                duration: info.duration,
                uploader: info.uploader || info.channel,
                view_count: info.view_count,
                webpage_url: info.webpage_url,
                isYtMusic: isYtMusic || (info.extractor && info.extractor.includes('YoutubeMusic')),
              });
            } catch { reject(new Error('Failed to parse info')); }
          });
        }
      } catch { reject(new Error('Failed to parse info')); }
    });
  });
});

// ─── Format quality maps ────────────────────────────────────────
// CRITICAL: bestaudio[ext=m4a] ensures audio is in mp4-compatible format
// Without [ext=m4a], yt-dlp may download opus/webm audio which cannot be merged into mp4
// Fallback chain: try best match → fall back to lower quality → fall back to any format
const VIDEO_QUALITY_MAP = {
  'best': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio/best[ext=mp4]/best',
  '1080': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
  '720':  'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
  '480':  'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
};

function getFormatArgs(format, quality) {
  if (format === 'mp3') {
    return ['-x', '--audio-format', 'mp3', '--audio-quality', '0'];
  } else if (format === 'mp4') {
    return ['-f', VIDEO_QUALITY_MAP[quality] || VIDEO_QUALITY_MAP.best, '--merge-output-format', 'mp4', '--remux-video', 'mp4'];
  } else if (format === 'webm') {
    return ['-f', 'bestvideo[ext=webm]+bestaudio[ext=webm]/bestvideo+bestaudio/best'];
  } else {
    return ['-f', 'best'];
  }
}

// ─── IPC: Download (single + playlist) ─────────────────────────
const activeDownloads = new Map();

ipcMain.handle('start-download', (event, { url, format, quality, isPlaylist }) => {
  const ytdlpPath = isYtDlpAvailable();
  if (!ytdlpPath) throw new Error('yt-dlp not available');

  const downloadId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const outputTemplate = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');
  const playlistOutputTemplate = path.join(DOWNLOADS_DIR, '%(playlist_id|Unknown_Playlist)s', '%(playlist_index)02d - %(title)s.%(ext)s');

  let args = [
    ...baseArgs(),
    '-o', isPlaylist ? playlistOutputTemplate : outputTemplate,
    '--newline',
    '--retries', '10',
    '--extractor-retries', '10',
    '--file-access-retries', '5',
    '--throttled-rate', '100K',
  ];

  if (isPlaylist) {
    args.push('--yes-playlist', '--ignore-errors');
  } else {
    args.push('--no-playlist');
  }

  // Add format args (includes -f, --merge-output-format, --remux-video etc.)
  args.push(...getFormatArgs(format, quality));
  args.push(url);

  const proc = spawn(ytdlpPath, args);
  activeDownloads.set(downloadId, proc);
  let lastFilename = '';
  let currentItem = 0;
  let totalItems = 0;

  proc.stdout.on('data', (data) => {
    const line = data.toString().trim();

    // Playlist progress: [download] Downloading item X of Y
    const playlistMatch = line.match(/\[download\]\s+Downloading item (\d+) of (\d+)/i);
    if (playlistMatch) {
      currentItem = parseInt(playlistMatch[1]);
      totalItems = parseInt(playlistMatch[2]);
      mainWindow?.webContents.send(`dl-progress:${downloadId}`, {
        percent: 0, status: 'playlist',
        message: `Downloading ${currentItem} of ${totalItems}`,
        currentItem, totalItems,
      });
    }

    // Regular progress
    const progressMatch = line.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+~?\s*(\S+)\s+at\s+(\S+)\s+ETA\s+(\S+)/);
    if (progressMatch) {
      let overallPercent = parseFloat(progressMatch[1]);
      if (totalItems > 0) {
        overallPercent = ((currentItem - 1) / totalItems * 100) + (overallPercent / totalItems);
      }
      mainWindow?.webContents.send(`dl-progress:${downloadId}`, {
        percent: totalItems > 0 ? overallPercent : parseFloat(progressMatch[1]),
        totalSize: progressMatch[2],
        speed: progressMatch[3],
        eta: progressMatch[4],
        currentItem, totalItems,
      });
    }

    const destMatch = line.match(/\[(?:download|Merger|ExtractAudio)\]\s+Destination:\s+(.+)/);
    if (destMatch) lastFilename = destMatch[1];

    const alreadyMatch = line.match(/\[download\]\s+(.+)\s+has already been downloaded/);
    if (alreadyMatch) lastFilename = alreadyMatch[1];

    if (line.includes('[Merger]') || line.includes('Merging formats')) {
      mainWindow?.webContents.send(`dl-progress:${downloadId}`, {
        percent: 99, status: 'merging', message: 'Merging video + audio...',
      });
    }
  });

  proc.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg.startsWith('WARNING:')) return; // ignore warnings
    
    // For playlists, filter out "video unavailable" errors (these are skipped gracefully)
    if (isPlaylist) {
      const unavailablePatterns = [
        'Video unavailable',
        'This video is not available',
        'Video is private',
        'Video unavailable',
        'Sign in to confirm',
        'This video is private',
        'This video has been removed',
        'This video is no longer available',
        'Private video',
        'This content is not available',
        'This item is not available',
      ];
      
      // Check if this is an unavailable video error (not fatal for playlist)
      const isUnavailable = unavailablePatterns.some(p => msg.includes(p));
      if (isUnavailable) {
        // Send as a warning/skip message, not a fatal error
        mainWindow?.webContents.send(`dl-progress:${downloadId}`, {
          percent: null,
          status: 'skipped',
          message: `Skipped: ${msg.substring(0, 100)}`,
        });
        return; // Don't send as error - video will be skipped
      }
    }
    
    mainWindow?.webContents.send(`dl-error:${downloadId}`, { message: msg });
  });

  proc.on('close', (code) => {
    activeDownloads.delete(downloadId);
    if (code === 0 || isPlaylist) {
      // For playlists, even if some videos failed, consider it complete
      mainWindow?.webContents.send(`dl-complete:${downloadId}`, {
        filename: lastFilename ? path.basename(lastFilename) : 'Download complete',
        path: lastFilename,
      });
    } else {
      mainWindow?.webContents.send(`dl-error:${downloadId}`, { message: `Failed (code ${code})` });
    }
  });

  return { downloadId };
});

// ─── IPC: Batch Download (multiple URLs) ────────────────────────
ipcMain.handle('start-batch-download', async (event, { urls, format, quality }) => {
  const downloadIds = [];
  const ytdlpPath = isYtDlpAvailable();
  if (!ytdlpPath) throw new Error('yt-dlp not available');

  for (const url of urls) {
    const downloadId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const outputTemplate = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');
    let args = [
      ...baseArgs(),
      '-o', outputTemplate,
      '--newline',
      '--no-playlist',
      '--retries', '10',
      '--extractor-retries', '10',
      '--file-access-retries', '5',
      '--throttled-rate', '100K',
      ...getFormatArgs(format, quality),
      url.trim(),
    ];

    const proc = spawn(ytdlpPath, args);
    activeDownloads.set(downloadId, proc);
    let lastFilename = '';

    proc.stdout.on('data', (data) => {
      const line = data.toString().trim();
      const progressMatch = line.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+~?\s*(\S+)\s+at\s+(\S+)\s+ETA\s+(\S+)/);
      if (progressMatch) {
        mainWindow?.webContents.send(`dl-progress:${downloadId}`, {
          percent: parseFloat(progressMatch[1]),
          totalSize: progressMatch[2], speed: progressMatch[3], eta: progressMatch[4],
        });
      }
      const destMatch = line.match(/\[(?:download|Merger|ExtractAudio)\]\s+Destination:\s+(.+)/);
      if (destMatch) lastFilename = destMatch[1];
      if (line.includes('[Merger]')) {
        mainWindow?.webContents.send(`dl-progress:${downloadId}`, { percent: 99, status: 'merging', message: 'Merging...' });
      }
    });

    proc.stderr.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg.startsWith('WARNING:')) return;
      mainWindow?.webContents.send(`dl-error:${downloadId}`, { message: msg });
    });

    proc.on('close', (code) => {
      activeDownloads.delete(downloadId);
      if (code === 0) {
        mainWindow?.webContents.send(`dl-complete:${downloadId}`, {
          filename: lastFilename ? path.basename(lastFilename) : 'Done', path: lastFilename,
        });
      } else {
        mainWindow?.webContents.send(`dl-error:${downloadId}`, { message: `Failed (code ${code})` });
      }
    });

    downloadIds.push({ downloadId, url: url.trim() });
  }

  return { downloadIds };
});

// ─── IPC: Cancel ────────────────────────────────────────────────
ipcMain.handle('cancel-download', (event, id) => {
  const proc = activeDownloads.get(id);
  if (proc) { proc.kill('SIGTERM'); activeDownloads.delete(id); return { success: true }; }
  return { success: false };
});

// ─── IPC: File operations ───────────────────────────────────────
ipcMain.handle('get-files', () => {
  try {
    return getAllFiles(DOWNLOADS_DIR).sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch { return []; }
});

function getAllFiles(dir, baseDir = dir) {
  let results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, baseDir));
    } else {
      results.push({
        name: path.relative(baseDir, fullPath),
        fullPath,
        size: stat.size,
        date: stat.mtime,
        ext: path.extname(item).replace('.', ''),
      });
    }
  }
  return results;
}

ipcMain.handle('open-folder', () => shell.openPath(DOWNLOADS_DIR));

ipcMain.handle('open-file', (event, name) => {
  // name could be relative path
  const filepath = path.join(DOWNLOADS_DIR, name);
  if (fs.existsSync(filepath)) shell.openPath(filepath);
});

ipcMain.handle('delete-file', (event, name) => {
  const filepath = path.join(DOWNLOADS_DIR, name);
  if (fs.existsSync(filepath)) { fs.unlinkSync(filepath); return { success: true }; }
  return { success: false };
});

ipcMain.handle('get-file-path', (event, name) => {
  const filepath = path.join(DOWNLOADS_DIR, name);
  if (fs.existsSync(filepath)) return filepath;
  return null;
});

ipcMain.handle('choose-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'], title: 'Choose Downloads Folder',
  });
  if (!result.canceled && result.filePaths[0]) return result.filePaths[0];
  return null;
});
