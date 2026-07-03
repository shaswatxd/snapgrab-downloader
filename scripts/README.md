# SnapGrab Release Scripts

## 📦 Release Script (`release.js`)

Automated release script that handles the complete release workflow.

### What it does:

1. ✅ **Git Status Check** - Shows current changes
2. 📝 **Git Add** - Stages all changes
3. 💾 **Git Commit** - Commits with "update" message
4. 🔢 **Version Bump** - Automatically increments patch version
5. 🚀 **Git Push** - Pushes code and tags to GitHub
6. 🧹 **Clean Build** - Removes old build files
7. 🔨 **Build & Release** - Creates installers and publishes to GitHub
8. 🌐 **Deploy Website** - Deploys website to Vercel

### Usage:

```bash
npm run push
```

### Features:

- ✨ Colored console output for better visibility
- ⏱️ Shows execution time
- 📊 Displays version changes
- 🔗 Shows links to GitHub release and website
- ❌ Error handling with clear messages
- 🎯 Step-by-step progress tracking

### Output Example:

```
╔════════════════════════════════════════╗
║   SnapGrab Release & Deploy Script    ║
╚════════════════════════════════════════╝

🔄 Adding files to git...
✅ Adding files to git - Done!

🔄 Version bump (current: 1.1.7)...
✅ Version bump - Done!
📦 Version: 1.1.7 → 1.1.8

🔄 Pushing to GitHub...
✅ Pushing to GitHub - Done!

🔄 Building and publishing release...
✅ Building and publishing release - Done!

🔄 Deploying website to Vercel...
✅ Deploying website to Vercel - Done!

╔════════════════════════════════════════╗
║         🎉 SUCCESS! 🎉                 ║
╚════════════════════════════════════════╝

✨ Version 1.1.8 released successfully!
⏱️  Total time: 45.32s

🔗 GitHub Release: https://github.com/shaswatxd/snapgrab-downloader/releases/tag/v1.1.8
🌐 Website: https://snapgrab-eight.vercel.app
```

### Requirements:

- Node.js installed
- Git configured
- Vercel CLI installed and authenticated
- GitHub token configured (GH_TOKEN)

### Error Handling:

- Script will exit if critical steps fail (git push, build, deploy)
- Non-critical errors (like "nothing to commit") will show warnings but continue
- All errors are logged with clear messages
