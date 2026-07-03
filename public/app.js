// ═══════════════════════════════════════════════════════════════
// SnapGrab — Desktop App Frontend (Full Featured)
// ═══════════════════════════════════════════════════════════════

let currentVideoInfo = null;
let selectedFormat = 'mp4';
let batchFormat = 'mp4';
let plFormat = 'mp4';
let isYtMusicContent = false;

// ─── DOM ────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const urlInput = $('urlInput');
const btnFetch = $('btnFetch');
const btnDownload = $('btnDownload');
const btnHistory = $('btnHistory');
const btnOpenFolder = $('btnOpenFolder');
const btnSetup = $('btnSetup');
const btnCloseHistory = $('btnCloseHistory');
const statusBanner = $('statusBanner');
const fetchingLoader = $('fetchingLoader');
const videoCard = $('videoCard');
const playlistCard = $('playlistCard');
const activeDownloads = $('activeDownloads');
const downloadsList = $('downloadsList');
const historyPanel = $('historyPanel');
const historyList = $('historyList');
const qualitySection = $('qualitySection');
const singleMode = $('singleMode');
const batchMode = $('batchMode');
const batchUrls = $('batchUrls');
const batchCount = $('batchCount');
const btnBatchDownload = $('btnBatchDownload');
const playerModal = $('playerModal');
const videoPlayer = $('videoPlayer');
const audioPlayer = $('audioPlayer');

// ─── Window Controls ────────────────────────────────────────────
$('btnMin').addEventListener('click', () => window.api.minimize());
$('btnMax').addEventListener('click', () => window.api.maximize());
$('btnClose').addEventListener('click', () => window.api.close());

// ─── Init ───────────────────────────────────────────────────────
async function init() {
  try {
    const status = await window.api.getStatus();
    if (!status.ytdlp) statusBanner.classList.remove('hidden');
    if (!status.ffmpeg) $('ffmpegBanner').classList.remove('hidden');
    // Show current download path
    const dir = await window.api.getDownloadsDir();
    $('savePath').textContent = dir;

    // Listen to background updates
    window.api.onUpdaterStatus((data) => {
      handleUpdaterStatus(data);
    });
    
    window.api.onUpdaterProgress((data) => {
      handleUpdaterProgress(data);
    });
  } catch { showToast('Failed to check status', 'error'); }
}
init();

// ─── Change Save Location ───────────────────────────────────────
$('btnChangePath').addEventListener('click', async () => {
  const newDir = await window.api.setDownloadsDir();
  if (newDir) {
    $('savePath').textContent = newDir;
    showToast('Download folder changed!', 'success');
  }
});

// ─── Mode Tabs (Single / Batch) ─────────────────────────────────
document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const mode = tab.dataset.mode;
    singleMode.classList.toggle('hidden', mode !== 'single');
    batchMode.classList.toggle('hidden', mode !== 'batch');
    videoCard.classList.add('hidden');
    playlistCard.classList.add('hidden');
  });
});

$('btnBatch').addEventListener('click', () => {
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.mode-tab[data-mode="batch"]').classList.add('active');
  singleMode.classList.add('hidden');
  batchMode.classList.remove('hidden');
});

// ─── URL Input ──────────────────────────────────────────────────
urlInput.addEventListener('input', () => { btnFetch.disabled = !urlInput.value.trim(); });
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && urlInput.value.trim()) fetchVideoInfo(); });
btnFetch.addEventListener('click', fetchVideoInfo);

// ─── Fetch Video Info ───────────────────────────────────────────
async function fetchVideoInfo() {
  const url = urlInput.value.trim();
  if (!url) return;
  videoCard.classList.add('hidden');
  playlistCard.classList.add('hidden');
  fetchingLoader.classList.remove('hidden');
  btnFetch.disabled = true;
  try {
    const data = await window.api.fetchInfo(url);
    currentVideoInfo = data;
    isYtMusicContent = data.isYtMusic || url.includes('music.youtube.com');
    
    // Default to MP3 for YouTube Music content
    if (isYtMusicContent) {
      // Set single format to MP3
      selectedFormat = 'mp3';
      document.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
      const mp3Tab = document.querySelector('.format-tab[data-format="mp3"]');
      if (mp3Tab) mp3Tab.classList.add('active');
      qualitySection.style.display = 'none';
      
      // Set playlist format to MP3
      plFormat = 'mp3';
      document.querySelectorAll('.pl-format-tab').forEach(t => t.classList.remove('active'));
      const plMp3Tab = document.querySelector('.pl-format-tab[data-format="mp3"]');
      if (plMp3Tab) plMp3Tab.classList.add('active');
      $('plQualitySection').style.display = 'none';
    }
    
    if (data.isPlaylist) {
      displayPlaylist(data);
    } else {
      displayVideoInfo(data);
    }
  } catch (err) {
    showToast(err.message || 'Failed to fetch video info', 'error');
  } finally {
    fetchingLoader.classList.add('hidden');
    btnFetch.disabled = false;
  }
}

function displayVideoInfo(info) {
  $('videoThumb').src = info.thumbnail || '';
  $('videoTitle').textContent = info.title || 'Unknown';
  $('videoUploader').textContent = info.uploader || '';
  $('videoDuration').textContent = formatDuration(info.duration);
  $('videoViews').textContent = info.view_count ? `${formatNumber(info.view_count)} views` : '';
  
  // Add YT Music badge if applicable
  const existingBadge = document.querySelector('.video-card .yt-music-badge');
  if (existingBadge) existingBadge.remove();
  
  if (isYtMusicContent) {
    const badge = document.createElement('span');
    badge.className = 'yt-music-badge';
    badge.textContent = 'YT Music';
    $('videoUploader').appendChild(badge);
  }
  
  videoCard.classList.remove('hidden');
}

function displayPlaylist(data) {
  $('playlistTitle').textContent = data.title || 'Playlist';
  $('playlistCount').textContent = `${data.count} ${isYtMusicContent ? 'songs' : 'videos'}`;
  
  // Add YT Music badge if applicable
  const existingBadge = document.querySelector('.yt-music-badge');
  if (existingBadge) existingBadge.remove();
  
  if (isYtMusicContent) {
    const badge = document.createElement('span');
    badge.className = 'yt-music-badge';
    badge.textContent = 'YT Music';
    $('playlistCount').appendChild(badge);
  }
  
  const container = $('playlistItems');
  container.innerHTML = data.items.slice(0, 50).map((item, i) => `
    <div class="playlist-item">
      <span class="playlist-item-num">${i + 1}</span>
      <span class="playlist-item-title">${escapeHtml(item.title || 'Unknown')}</span>
      <span class="playlist-item-dur">${formatDuration(item.duration)}</span>
    </div>
  `).join('');
  if (data.count > 50) {
    container.innerHTML += `<div class="playlist-item"><span class="playlist-item-num">...</span><span class="playlist-item-title" style="color:var(--text-muted)">and ${data.count - 50} more</span></div>`;
  }
  playlistCard.classList.remove('hidden');
}

// ─── Format Tabs (Single) ───────────────────────────────────────
document.querySelectorAll('.format-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    selectedFormat = tab.dataset.format;
    qualitySection.style.display = selectedFormat === 'mp3' ? 'none' : 'block';
  });
});

// ─── Playlist Format Tabs ───────────────────────────────────────
document.querySelectorAll('.pl-format-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.pl-format-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    plFormat = tab.dataset.format;
    $('plQualitySection').style.display = plFormat === 'mp3' ? 'none' : 'block';
  });
});

// ─── Batch Format Tabs ──────────────────────────────────────────
document.querySelectorAll('.batch-format-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.batch-format-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    batchFormat = tab.dataset.format;
  });
});

// ─── Batch URL counter ──────────────────────────────────────────
batchUrls.addEventListener('input', () => {
  const urls = batchUrls.value.split('\n').filter(u => u.trim());
  batchCount.textContent = `${urls.length} URL${urls.length !== 1 ? 's' : ''}`;
  btnBatchDownload.disabled = urls.length === 0;
});

// ─── Download (Single) ─────────────────────────────────────────
btnDownload.addEventListener('click', startDownload);

async function startDownload() {
  const url = urlInput.value.trim();
  if (!url) return;
  const quality = document.querySelector('input[name="quality"]:checked')?.value || 'best';
  try {
    const { downloadId } = await window.api.startDownload({ url, format: selectedFormat, quality });
    addDownloadItem(downloadId, currentVideoInfo?.title || url);
    listenToProgress(downloadId);
    showToast('Download started!', 'success');
  } catch (err) { showToast(err.message || 'Download failed', 'error'); }
}

// ─── Download (Playlist) ────────────────────────────────────────
$('btnPlaylistDownload').addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) return;
  const quality = document.querySelector('input[name="plquality"]:checked')?.value || 'best';
  try {
    const { downloadId } = await window.api.startDownload({ url, format: plFormat, quality, isPlaylist: true });
    addDownloadItem(downloadId, (currentVideoInfo?.title || 'Playlist') + ` (${currentVideoInfo?.count || '?'} videos)`);
    listenToProgress(downloadId);
    showToast('Playlist download started!', 'success');
  } catch (err) { showToast(err.message || 'Failed', 'error'); }
});

// ─── Download (Batch) ───────────────────────────────────────────
btnBatchDownload.addEventListener('click', async () => {
  const urls = batchUrls.value.split('\n').map(u => u.trim()).filter(Boolean);
  if (urls.length === 0) return;
  try {
    const { downloadIds } = await window.api.startBatchDownload({ urls, format: batchFormat, quality: 'best' });
    downloadIds.forEach(({ downloadId, url }) => {
      addDownloadItem(downloadId, url.substring(0, 60));
      listenToProgress(downloadId);
    });
    showToast(`${downloadIds.length} downloads started!`, 'success');
    batchUrls.value = '';
    batchCount.textContent = '0 URLs';
  } catch (err) { showToast(err.message || 'Batch failed', 'error'); }
});

// ─── Download Item UI ───────────────────────────────────────────
function addDownloadItem(id, title) {
  activeDownloads.classList.remove('hidden');
  const item = document.createElement('div');
  item.className = 'download-item'; item.id = `dl-${id}`;
  item.innerHTML = `
    <div class="download-item-header">
      <span class="download-item-title">${escapeHtml(title.substring(0, 70))}</span>
      <span class="download-item-status" id="status-${id}">Starting...</span>
    </div>
    <div class="progress-bar-container">
      <div class="progress-bar-fill" id="progress-${id}" style="width: 0%"></div>
    </div>
    <div class="download-item-meta">
      <span id="meta-${id}">Preparing...</span>
      <button class="btn-cancel" onclick="cancelDownload('${id}')">Cancel</button>
    </div>`;
  downloadsList.prepend(item);
}

function listenToProgress(id) {
  window.api.onDownloadProgress(id, (data) => {
    const bar = $(`progress-${id}`), status = $(`status-${id}`), meta = $(`meta-${id}`);
    if (!bar) return;
    if (data.percent != null) bar.style.width = Math.min(data.percent, 100) + '%';
    if (data.status === 'merging') {
      status.textContent = 'Merging...';
      meta.textContent = data.message || 'Processing...';
    } else if (data.status === 'playlist') {
      status.textContent = data.message;
      meta.textContent = `Video ${data.currentItem} of ${data.totalItems}`;
    } else if (data.status === 'skipped') {
      // Show skipped videos as a warning, not error
      status.textContent = 'Skipped';
      status.style.color = '#f59e0b'; // Amber color for warnings
      meta.textContent = data.message || 'Video unavailable';
    } else if (data.percent != null) {
      status.textContent = Math.round(data.percent) + '%';
      meta.textContent = `${data.totalSize || ''} • ${data.speed || ''} • ETA: ${data.eta || ''}`;
    }
  });

  window.api.onDownloadComplete(id, (data) => {
    const item = $(`dl-${id}`), bar = $(`progress-${id}`);
    const status = $(`status-${id}`), meta = $(`meta-${id}`);
    if (!item) return;
    item.classList.add('download-complete');
    bar.style.width = '100%';
    status.textContent = '✓ Complete';
    status.style.color = ''; // Reset color
    meta.textContent = data.filename || 'Done';
    const cancelBtn = item.querySelector('.btn-cancel');
    if (cancelBtn) cancelBtn.remove();
    showToast('Download complete!', 'success');
    window.api.removeListeners(id);
  });

  window.api.onDownloadError(id, (data) => {
    const status = $(`status-${id}`), meta = $(`meta-${id}`);
    if (status) {
      status.textContent = '✗ Failed';
      status.style.color = '#ef4444'; // Red for errors
    }
    if (meta) meta.textContent = data.message || 'Failed';
    showToast('Download failed', 'error');
    window.api.removeListeners(id);
  });
}

window.cancelDownload = async function(id) {
  await window.api.cancelDownload(id);
  const item = $(`dl-${id}`);
  if (item) item.remove();
  if (downloadsList.children.length === 0) activeDownloads.classList.add('hidden');
  showToast('Cancelled', 'info');
  window.api.removeListeners(id);
};

// ─── Setup yt-dlp ───────────────────────────────────────────────
btnSetup.addEventListener('click', async () => {
  btnSetup.textContent = 'Installing...'; btnSetup.disabled = true;
  try {
    const r = await window.api.setupYtDlp();
    if (r.success) { statusBanner.classList.add('hidden'); showToast('yt-dlp installed! ✅', 'success'); }
  } catch (err) {
    showToast('Setup failed: ' + err.message, 'error');
    btnSetup.textContent = 'Retry'; btnSetup.disabled = false;
  }
});

// ─── Setup FFmpeg ───────────────────────────────────────────────
$('btnSetupFfmpeg').addEventListener('click', async () => {
  const btn = $('btnSetupFfmpeg');
  const statusText = $('ffmpegStatusText');
  btn.textContent = 'Installing...'; btn.disabled = true;
  
  window.api.onSetupStatus((msg) => {
    statusText.textContent = msg;
  });
  
  try {
    const r = await window.api.setupFfmpeg();
    if (r.success) {
      $('ffmpegBanner').classList.add('hidden');
      showToast('FFmpeg installed! 🎬', 'success');
    }
  } catch (err) {
    showToast('FFmpeg setup failed: ' + err.message, 'error');
    statusText.textContent = 'Failed. Click to retry.';
    btn.textContent = 'Retry'; btn.disabled = false;
  }
});

// ─── History ────────────────────────────────────────────────────
btnHistory.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
  toggleHistory();
});
btnCloseHistory.addEventListener('click', () => historyPanel.classList.add('hidden'));

async function toggleHistory() {
  if (!historyPanel.classList.contains('hidden')) { historyPanel.classList.add('hidden'); return; }
  const files = await window.api.getFiles();
  if (files.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No downloaded files yet</div>';
  } else {
    historyList.innerHTML = files.map(f => {
      const isVideo = ['mp4','webm','mkv','avi','mov'].includes(f.ext);
      const isAudio = ['mp3','m4a','wav','flac','ogg','aac'].includes(f.ext);
      const iconClass = isVideo ? 'video' : isAudio ? 'audio' : 'other';
      const canPlay = isVideo || isAudio;
      return `<div class="history-item">
        <div class="file-icon ${iconClass}">${f.ext}</div>
        <div class="file-info" onclick="window.api.openFile('${escapeAttr(f.name)}')">
          <div class="file-name">${escapeHtml(f.name)}</div>
          <div class="file-size">${formatBytes(f.size)} • ${new Date(f.date).toLocaleDateString()}</div>
        </div>
        <div class="history-item-actions">
          ${canPlay ? `<button class="btn-play" title="Play" onclick="playFile('${escapeAttr(f.name)}', '${f.ext}')">▶</button>` : ''}
          <button class="btn-delete" title="Delete" onclick="deleteFile('${escapeAttr(f.name)}', this)">✕</button>
        </div>
      </div>`;
    }).join('');
  }
  historyPanel.classList.remove('hidden');
}

// ─── Video Player ───────────────────────────────────────────────
window.playFile = async function(name, ext) {
  const filePath = await window.api.getFilePath(name);
  if (!filePath) { showToast('File not found', 'error'); return; }

  const isAudio = ['mp3','m4a','wav','flac','ogg','aac'].includes(ext);
  $('playerTitle').textContent = name;

  if (isAudio) {
    videoPlayer.classList.add('hidden');
    audioPlayer.classList.remove('hidden');
    audioPlayer.src = `file://${filePath}`;
    audioPlayer.play();
  } else {
    audioPlayer.classList.add('hidden');
    videoPlayer.classList.remove('hidden');
    videoPlayer.src = `file://${filePath}`;
    videoPlayer.play();
  }
  playerModal.classList.remove('hidden');
};

$('btnClosePlayer').addEventListener('click', closePlayer);
$('playerBackdrop').addEventListener('click', closePlayer);

function closePlayer() {
  videoPlayer.pause(); videoPlayer.src = '';
  audioPlayer.pause(); audioPlayer.src = '';
  playerModal.classList.add('hidden');
}

// ─── Delete File ────────────────────────────────────────────────
window.deleteFile = async function(name, btn) {
  const result = await window.api.deleteFile(name);
  if (result.success) {
    const item = btn.closest('.history-item');
    if (item) item.remove();
    showToast('File deleted', 'info');
  }
};

// ─── Open Folder ────────────────────────────────────────────────
btnOpenFolder.addEventListener('click', () => window.api.openFolder());

// ─── Toast ──────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const c = $('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; }, 3000);
  setTimeout(() => t.remove(), 3500);
}

// ─── Utilities ──────────────────────────────────────────────────
function formatDuration(sec) {
  if (!sec) return '';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}
function formatNumber(n) {
  if (n >= 1e9) return (n/1e9).toFixed(1)+'B';
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return String(n);
}
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const u = ['B','KB','MB','GB']; let i = 0;
  while (bytes >= 1024 && i < u.length-1) { bytes /= 1024; i++; }
  return bytes.toFixed(1)+' '+u[i];
}
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function escapeAttr(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

// ─── Settings & Updates Panel ─────────────────────────────────────
const btnSettings = $('btnSettings');
const settingsPanel = $('settingsPanel');
const btnCloseSettings = $('btnCloseSettings');
const btnSettingsChangePath = $('btnSettingsChangePath');
const settingsSavePath = $('settingsSavePath');
const chkAutoUpdateYtdlp = $('chkAutoUpdateYtdlp');
const chkAutoUpdateFfmpeg = $('chkAutoUpdateFfmpeg');
const ytdlpVersionText = $('ytdlpVersionText');
const ytdlpUpdateStatus = $('ytdlpUpdateStatus');
const btnUpdateYtdlp = $('btnUpdateYtdlp');
const ffmpegVersionText = $('ffmpegVersionText');
const ffmpegUpdateStatus = $('ffmpegUpdateStatus');
const btnUpdateFfmpeg = $('btnUpdateFfmpeg');

btnSettings.addEventListener('click', toggleSettings);
btnCloseSettings.addEventListener('click', () => settingsPanel.classList.add('hidden'));

async function toggleSettings() {
  if (!settingsPanel.classList.contains('hidden')) {
    settingsPanel.classList.add('hidden');
    return;
  }
  historyPanel.classList.add('hidden'); // Close history panel
  await refreshSettingsUI();
  settingsPanel.classList.remove('hidden');
}

async function refreshSettingsUI() {
  try {
    const activeSettings = await window.api.getSettings();
    settingsSavePath.textContent = activeSettings.downloadsDir || 'Not set';
    chkAutoUpdateYtdlp.checked = !!activeSettings.autoUpdateYtdlp;
    chkAutoUpdateFfmpeg.checked = !!activeSettings.autoUpdateFfmpeg;
    
    // Fetch current binary versions
    const versions = await window.api.getBinVersions();
    ytdlpVersionText.textContent = versions.ytdlp;
    ffmpegVersionText.textContent = versions.ffmpeg;
  } catch (err) {
    showToast('Failed to load settings: ' + err.message, 'error');
  }
}

// Toggle Auto Updates
chkAutoUpdateYtdlp.addEventListener('change', async () => {
  await window.api.saveSettings({ autoUpdateYtdlp: chkAutoUpdateYtdlp.checked });
  showToast('Settings saved!', 'success');
});

chkAutoUpdateFfmpeg.addEventListener('change', async () => {
  await window.api.saveSettings({ autoUpdateFfmpeg: chkAutoUpdateFfmpeg.checked });
  showToast('Settings saved!', 'success');
});

// Change Path from Settings
btnSettingsChangePath.addEventListener('click', async () => {
  const newDir = await window.api.setDownloadsDir();
  if (newDir) {
    $('savePath').textContent = newDir;
    settingsSavePath.textContent = newDir;
    showToast('Download folder changed!', 'success');
  }
});

// Manual Updates
btnUpdateYtdlp.addEventListener('click', async () => {
  btnUpdateYtdlp.disabled = true;
  btnUpdateYtdlp.textContent = 'Checking...';
  ytdlpUpdateStatus.textContent = 'Checking for updates...';
  ytdlpUpdateStatus.style.color = 'var(--text-secondary)';
  try {
    const result = await window.api.checkYtDlpUpdate(true); // force = true
    if (result.success) {
      if (result.updated) {
        showToast(`yt-dlp updated to ${result.version}`, 'success');
      } else {
        showToast('yt-dlp is already up to date', 'info');
      }
    } else {
      showToast('yt-dlp update failed: ' + (result.error || 'unknown error'), 'error');
    }
  } catch (err) {
    showToast('Failed to check yt-dlp updates: ' + err.message, 'error');
  } finally {
    btnUpdateYtdlp.disabled = false;
    btnUpdateYtdlp.textContent = 'Update';
  }
});

btnUpdateFfmpeg.addEventListener('click', async () => {
  btnUpdateFfmpeg.disabled = true;
  btnUpdateFfmpeg.textContent = 'Checking...';
  ffmpegUpdateStatus.textContent = 'Checking for updates...';
  ffmpegUpdateStatus.style.color = 'var(--text-secondary)';
  try {
    const result = await window.api.checkFfmpegUpdate(true); // force = true
    if (result.success) {
      if (result.updated) {
        showToast(`FFmpeg updated to build ${result.version.substring(0, 10)}`, 'success');
      } else {
        showToast('FFmpeg is already up to date', 'info');
      }
    } else {
      showToast('FFmpeg update failed: ' + (result.error || 'unknown error'), 'error');
    }
  } catch (err) {
    showToast('Failed to check FFmpeg updates: ' + err.message, 'error');
  } finally {
    btnUpdateFfmpeg.disabled = false;
    btnUpdateFfmpeg.textContent = 'Update';
  }
});

// Background updater status logging handlers
function handleUpdaterStatus(data) {
  const statusEl = data.type === 'ytdlp' ? ytdlpUpdateStatus : ffmpegUpdateStatus;
  const versionEl = data.type === 'ytdlp' ? ytdlpVersionText : ffmpegVersionText;
  const btnEl = data.type === 'ytdlp' ? btnUpdateYtdlp : btnUpdateFfmpeg;

  if (statusEl) {
    statusEl.textContent = data.message;
    if (data.status === 'error') {
      statusEl.style.color = 'var(--error)';
    } else if (data.status === 'updated' || data.status === 'uptodate') {
      statusEl.style.color = 'var(--success)';
    } else {
      statusEl.style.color = 'var(--warning)';
    }
  }

  if (data.version && versionEl) {
    versionEl.textContent = data.version;
  }

  if (btnEl) {
    if (data.status === 'updating' || data.status === 'extracting') {
      btnEl.disabled = true;
      btnEl.textContent = 'Updating...';
    } else {
      btnEl.disabled = false;
      btnEl.textContent = 'Update';
    }
  }

  if (data.status === 'updated') {
    showToast(data.message, 'success');
  } else if (data.status === 'error') {
    showToast(data.message, 'error');
  }
}

function handleUpdaterProgress(data) {
  const statusEl = data.type === 'ytdlp' ? ytdlpUpdateStatus : ffmpegUpdateStatus;
  if (statusEl) {
    statusEl.textContent = `Downloading: ${data.percent}%`;
    statusEl.style.color = 'var(--warning)';
  }
}
