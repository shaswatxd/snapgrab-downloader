# SnapGrab — Premium Desktop Media Downloader

SnapGrab is an ultra-modern, glassmorphic desktop application for downloading video and audio files from 1,000+ websites. Built on **Electron**, it acts as a premium GUI wrapper around **yt-dlp** and **FFmpeg**, offering high-speed concurrent downloads, advanced quality merging, and a built-in media player.

## 🚀 Key Features

- **1,000+ Sites Supported:** Works seamlessly with YouTube, YouTube Music, Instagram, Twitter/X, TikTok, Facebook, SoundCloud, Spotify, Reddit, and more.
- **Dynamic Quality Selection:** Muxes independent HD video streams (1080p, 2K, 4K) and audio tracks into MP4 containers using an integrated FFmpeg engine.
- **High-Fidelity Audio Extraction:** Converts video streams directly to high-quality MP3 tracks.
- **Concurrent Processing:** Support for single URL downloads, full playlist parsing, and batch queues (multiple URLs on separate lines).
- **Collapsible History & Built-In Player:** Review downloaded files and play videos/audio instantly inside the app.
- **Robust Auto-Updates:** Startup background checks keep yt-dlp and FFmpeg updated silently to prevent downloading breakages.
- **Writable Environment Protection:** Binaries are managed in user-writable `%APPDATA%` paths to prevent administrator privilege prompts on Windows.

---

## 🛠️ Tech Stack

- **Framework:** Electron (v41.2.1)
- **Frontend:** Vanilla HTML5, CSS3 (Custom Glassmorphic Dark UI), JavaScript
- **Core Utility Engines:** yt-dlp, FFmpeg, FFprobe (bundled and managed dynamically)
- **Packaging:** electron-builder (compiles to NSIS installer & Portable Executable)

---

## 📦 Directory Structure

```
├── bin/                 # Raw yt-dlp/FFmpeg executable binaries (packaged via extraResources)
├── dist/                # Output binaries (Setup Installer & Portable Edition)
├── public/              # Electron GUI frontend source code (HTML, CSS, JS)
├── website/             # Product landing page website
│   ├── index.html       # Landing page structure
│   └── style.css        # Product site styles
├── main.js              # Electron main process (IPC handlers, downloader spawning, auto-updates)
├── preload.js           # Secure IPC bridge context definition
├── package.json         # Scripts, configurations, and build targets
└── .gitignore           # Keeps heavy binaries out of the git tree
```

---

## 💻 Development & Build Setup

### Prerequisites
Make sure you have Node.js installed on your system.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Application Locally
```bash
npm run dev
```

### 3. Build Setup Installer
This runs `electron-builder` and generates an NSIS installer and a portable execution package in the `dist/` directory:
```bash
npm run build
```

---

## 🌐 Landing Page Website
The `website/` directory contains a premium, single-page landing website that describes the product. You can deploy it directly to GitHub Pages or any static host to showcase your application.

## Automatic Releases & In-App Updates

Every push to the `main` branch triggers `.github/workflows/release.yml`. The workflow assigns a new `1.1.x` build version and publishes the NSIS installer, portable build, blockmap, and `latest.yml` to a public GitHub Release.

Installed NSIS builds check that release feed automatically and download new app versions in the background. Once ready, **Settings & Updates → Restart & Update** installs the release. The portable edition can be replaced manually from the website. The website uses stable `releases/latest/download/...` links, so its HTML does not need editing for each version.

---

## 📄 License
Released under the All Rights Reserved license. Created for high-performance media downloading.
