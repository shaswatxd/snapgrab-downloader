#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const SVGtoICO = require('svg-to-ico');

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

async function generateIcon() {
  log('\n🎨 Generating ICO file from SVG...\n', 'cyan');

  const svgPath = path.join(__dirname, '..', 'build', 'icon.svg');
  const icoPath = path.join(__dirname, '..', 'build', 'icon.ico');

  if (!fs.existsSync(svgPath)) {
    log('❌ Error: build/icon.svg not found!', 'red');
    process.exit(1);
  }

  try {
    log('📁 SVG file path: ' + svgPath, 'blue');
    log('🔄 Converting SVG to ICO (multiple sizes)...', 'blue');
    
    // svg-to-ico expects named parameters
    await SVGtoICO({
      input_name: svgPath,
      output_name: icoPath,
      sizes: [16, 24, 32, 48, 64, 128, 256]
    });

    log('\n✅ Success! Icon generated:', 'green');
    log(`   📂 ${icoPath}`, 'cyan');
    log(`   📐 Sizes: 16, 24, 32, 48, 64, 128, 256`, 'cyan');
    log('\n🚀 Now run: npm run push', 'yellow');
    log('   The new icon will appear in installer and app!\n', 'green');
  } catch (error) {
    log('\n❌ Error generating ICO:', 'red');
    console.error(error);
    process.exit(1);
  }
}

generateIcon();
