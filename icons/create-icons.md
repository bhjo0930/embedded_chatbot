# Extension Icons

The following icon files need to be created for the Chrome extension:

## Required Icons
- `icon16.png` - 16x16 pixels (toolbar)
- `icon48.png` - 48x48 pixels (extension management)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Icon Design Guidelines
- Use a robot/chatbot theme with modern design
- Colors: Blue gradient (#667eea to #764ba2) matching the UI
- Simple, recognizable design that works at small sizes
- PNG format with transparency

## Icon Creation Options

### Option 1: Use SVG to PNG Converter
Create an SVG version first, then convert to required sizes:

```svg
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="60" fill="url(#grad1)"/>
  <circle cx="50" cy="50" r="8" fill="white"/>
  <circle cx="78" cy="50" r="8" fill="white"/>
  <path d="M 45 75 Q 64 85 83 75" stroke="white" stroke-width="4" fill="none"/>
</svg>
```

### Option 2: Use Online Icon Generators
- favicon.io
- canva.com
- iconscout.com

### Option 3: Simple Emoji-based Icons
For quick testing, use the robot emoji (🤖) with background:
- Create simple PNG files with robot emoji on gradient background
- Resize to required dimensions

## Temporary Solution
Until proper icons are created, you can use placeholder PNGs or generate them programmatically.