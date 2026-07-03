#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

log('\n🎨 Icon Converter for SnapGrab\n', 'cyan');

const svgPath = path.join(__dirname, '..', 'build', 'icon.svg');
const icoPath = path.join(__dirname, '..', 'build', 'icon.ico');

if (!fs.existsSync(svgPath)) {
  log('❌ Error: build/icon.svg not found!', 'red');
  process.exit(1);
}

log('📁 SVG file found: build/icon.svg', 'green');
log('📝 Reading SVG content...', 'blue');

const svgContent = fs.readFileSync(svgPath, 'utf-8');

log('\n⚠️  Automatic conversion requires external tools.', 'yellow');
log('\n📌 Please convert manually using one of these options:\n', 'cyan');

log('Option 1: CloudConvert (Recommended)', 'green');
log('  → https://cloudconvert.com/svg-to-ico');
log('  → Upload: build/icon.svg');
log('  → Download as: icon.ico');
log('  → Save to: build/icon.ico\n');

log('Option 2: Convertio', 'green');
log('  → https://convertio.co/svg-ico/');
log('  → Upload and convert build/icon.svg\n');

log('Option 3: ICO Convert', 'green');
log('  → https://icoconvert.com/');
log('  → Select sizes: 16, 32, 48, 256\n');

log('💡 After conversion, run: npm run push', 'blue');
log('✨ The icon will appear in installer, app, and shortcuts!\n', 'cyan');
