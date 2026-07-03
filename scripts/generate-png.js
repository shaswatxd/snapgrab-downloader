#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

log('\n🎨 Generating PNG from SVG...\n', 'cyan');

const svgPath = path.join(__dirname, '..', 'build', 'icon.svg');
const pngPath = path.join(__dirname, '..', 'public', 'icon.png');

const svgContent = fs.readFileSync(svgPath, 'utf-8');

// Create a 256x256 PNG from SVG using Canvas
const sharp = require('sharp');

sharp(Buffer.from(svgContent))
  .resize(256, 256)
  .png()
  .toFile(pngPath)
  .then(() => {
    log('✅ PNG icon created:', 'green');
    log(`   📂 ${pngPath}`, 'cyan');
    log('   📐 Size: 256x256\n', 'cyan');
  })
  .catch((error) => {
    log('⚠️  Sharp failed, trying alternative method...', 'blue');
    
    // Fallback: Copy SVG as PNG (Windows will handle it)
    const publicDir = path.dirname(pngPath);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // For development, copy SVG to public folder
    const publicSvgPath = path.join(publicDir, 'icon.svg');
    fs.copyFileSync(svgPath, publicSvgPath);
    
    log('✅ Icon copied to public folder', 'green');
    log(`   📂 ${publicSvgPath}\n`, 'cyan');
  });
