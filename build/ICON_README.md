# Icon Setup Guide

## Current Status
- ✅ SVG icon created: `build/icon.svg`
- ❌ ICO file needed: `build/icon.ico`

## Quick Fix (Online Conversion)

### Method 1: CloudConvert (Recommended)
1. Visit: https://cloudconvert.com/svg-to-ico
2. Upload: `build/icon.svg`
3. Settings:
   - Width: 256px
   - Height: 256px
   - Include sizes: 16, 32, 48, 64, 128, 256
4. Download as: `icon.ico`
5. Save to: `build/icon.ico`

### Method 2: Convertio
1. Visit: https://convertio.co/svg-ico/
2. Upload `build/icon.svg`
3. Convert and download
4. Save as `build/icon.ico`

### Method 3: ICO Convert
1. Visit: https://icoconvert.com/
2. Upload `build/icon.svg`
3. Select multi-size: 16x16, 32x32, 48x48, 256x256
4. Download and save as `build/icon.ico`

## After Conversion

Once you have `build/icon.ico`, run:

```bash
npm run push
```

The new icon will be used in:
- ✅ Windows installer
- ✅ Installed application
- ✅ Desktop shortcuts
- ✅ Taskbar
- ✅ Add/Remove Programs

## Icon Design

The icon uses:
- Purple gradient (#a78bfa → #6366f1)
- Download arrow symbol
- Rounded corners (8px radius)
- White stroke (2.5px width)

Same as the app's logo for brand consistency!
