#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log(`\n🔄 ${description}...`, 'cyan');
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    log(`✅ ${description} - Done!`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} - Failed!`, 'red');
    console.error(error.message);
    return false;
  }
}

function getPackageVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  return packageData.version;
}

async function main() {
  log('\n╔════════════════════════════════════════╗', 'bright');
  log('║   SnapGrab Release & Deploy Script    ║', 'bright');
  log('╚════════════════════════════════════════╝\n', 'bright');

  const startTime = Date.now();

  // Step 1: Git Status Check
  log('📊 Checking git status...', 'blue');
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim()) {
      log('📝 Found changes to commit', 'yellow');
    } else {
      log('✨ Working directory is clean', 'green');
    }
  } catch (error) {
    log('⚠️  Could not check git status', 'yellow');
  }

  // Step 2: Git Add
  if (!execCommand('git add .', 'Adding files to git')) {
    process.exit(1);
  }

  // Step 3: Git Commit
  log('\n🔄 Attempting to commit changes...', 'cyan');
  try {
    execSync('git commit -m "update"', { encoding: 'utf-8', stdio: 'inherit' });
    log('✅ Changes committed!', 'green');
  } catch (error) {
    log('ℹ️  Nothing to commit or commit failed', 'yellow');
  }

  // Step 4: Version Bump
  const oldVersion = getPackageVersion();
  if (!execCommand('npm version patch', `Version bump (current: ${oldVersion})`)) {
    log('⚠️  Version bump failed, continuing...', 'yellow');
  }
  const newVersion = getPackageVersion();
  log(`📦 Version: ${oldVersion} → ${newVersion}`, 'bright');

  // Step 5: Git Push with Tags
  if (!execCommand('git push --follow-tags', 'Pushing to GitHub')) {
    log('❌ Git push failed! Aborting...', 'red');
    process.exit(1);
  }

  // Step 6: Clean Build Directory
  if (!execCommand('npm run clean', 'Cleaning build directory')) {
    log('⚠️  Clean failed, continuing...', 'yellow');
  }

  // Step 7: Build & Release
  if (!execCommand('npm run release', 'Building and publishing release')) {
    log('❌ Release failed!', 'red');
    process.exit(1);
  }

  // Step 8: Deploy Website to Vercel
  if (!execCommand('cd website && vercel --prod', 'Deploying website to Vercel')) {
    log('❌ Vercel deployment failed!', 'red');
    process.exit(1);
  }

  // Success Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  log('\n╔════════════════════════════════════════╗', 'green');
  log('║         🎉 SUCCESS! 🎉                 ║', 'green');
  log('╚════════════════════════════════════════╝', 'green');
  log(`\n✨ Version ${newVersion} released successfully!`, 'bright');
  log(`⏱️  Total time: ${duration}s`, 'cyan');
  log(`\n🔗 GitHub Release: https://github.com/shaswatxd/snapgrab-downloader/releases/tag/v${newVersion}`, 'blue');
  log(`🌐 Website: https://snapgrab-eight.vercel.app\n`, 'blue');
}

// Run the script
main().catch(error => {
  log('\n❌ Script failed with error:', 'red');
  console.error(error);
  process.exit(1);
});
