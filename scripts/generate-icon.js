#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// SVG icon template - same as in the app
const iconSVG = `
<svg width="256" height="256" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iconGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#a78bfa"/>
      <stop offset="1" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="8" fill="url(#iconGrad)"/>
  <path d="M16 8v10m0 0l4-4m-4 4l-4-4M10 22h12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

// Save SVG file
const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');
const pngPath = path.join(publicDir, 'icon.png');

fs.writeFileSync(svgPath, iconSVG.trim());

console.log('✅ SVG icon created:', svgPath);
console.log('\n📝 To create PNG and ICO files:');
console.log('   1. Install: npm install -g sharp-cli');
console.log('   2. Convert SVG to PNG (256x256): npx sharp -i public/icon.svg -o public/icon.png resize 256 256');
console.log('   3. Install png2icons: npm install -g png2icons');
console.log('   4. Convert PNG to ICO: npx png2icons public/icon.png public/icon.ico -icns');
console.log('\nOr use an online converter:');
console.log('   - https://cloudconvert.com/svg-to-png');
console.log('   - https://convertio.co/png-ico/');
console.log('\n💡 For now, using SVG fallback. Build will use default icon.');
