# Coupon Clipper Chrome Extension

Automatically clip digital coupons on store websites with one click!

## Features

- 🏷️ **One-click coupon clipping** - Clip all available coupons instantly
- 📎 **Smart detection** - Skips already clipped coupons
- 🎯 **Floating action button** - Quick access directly on coupon pages
- ✨ **Beautiful interface** - Modern, user-friendly popup design
- 🔄 **Real-time feedback** - Shows progress and results
- 🏪 **Multi-store support** - Works on Kroger family stores

## Supported Stores

- CVS
- Walgreens
- Kroger
- Ralphs  
- Fred Meyer
- King Supers
- Smith's Food and Drug

## Installation

### Method 1: Load as Unpacked Extension (Recommended for development)

1. **Download the files:**
   - Create a new folder called `coupon-clipper-extension`
   - Save all the code files from above into this folder:
     - `manifest.json`
     - `popup.html` 
     - `popup.js`
     - `content.js`

2. **Create simple icons** (optional but recommended):
   - Create simple 16x16, 32x32, 48x48, and 128x128 pixel PNG icons
   - Name them `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
   - Or download free icons from sites like flaticon.com

3. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select your `coupon-clipper-extension` folder
   - The extension should now appear in your extensions list

4. **Pin the extension:**
   - Click the extensions puzzle piece icon in Chrome toolbar
   - Find "Coupon Clipper" and click the pin icon to keep it visible

## How to Use

### Method 1: Extension Popup
1. Navigate to any supported store's coupon page
2. Click the Coupon Clipper extension icon in your toolbar
3. Click "Clip All Coupons" or "Clip Available Only"
4. Watch as all coupons are automatically clipped!

### Method 2: Floating Action Button
1. Navigate to any coupon page on supported stores
2. Look for the floating ✂️ button in the bottom-right corner
3. Click it to instantly clip all available coupons
4. Get real-time notifications showing progress

## File Structure

```
coupon-clipper-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── content.js            # Page interaction script
├── icon16.png           # 16x16 icon (optional)
├── icon32.png           # 32x32 icon (optional)
├── icon48.png           # 48x48 icon (optional)
└── icon128.png          # 128x128 icon (optional)
```

## Troubleshooting

**Extension doesn't appear:**
- Make sure you enabled Developer mode in chrome://extensions/
- Check that all files are in the same folder
- Refresh the extensions page

**No coupons found:**
- Ensure you're on the coupons page of a supported store
- Try refreshing the page and waiting a moment for it to load
- Check that the page has coupon buttons with "Clip" text

**Buttons not clicking:**
- Some sites may have rate limiting - the extension adds delays between clicks
- Try using "Clip Available Only" if some coupons are already clipped
- Refresh the page and try again

## Privacy & Security

- This extension only runs on grocery store coupon pages
- No data is collected or sent to external servers
- All functionality happens locally in your browser
- Only accesses the specific coupon pages you visit

## Contributing

Feel free to modify the code to add support for additional grocery stores or improve functionality!

## Disclaimer

This extension is for personal use only. Please be respectful of the websites you use it on and don't overload their servers.
