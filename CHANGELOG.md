# Changelog

All notable changes to this AI Chatbot Extension project will be documented in this file.

## [v0.9.2] - 2024-12-XX

### 🔧 Major Bug Fixes

#### 1. HTML Attachment Information Loss Fix
- **Problem**: HTML attachment content was not being sent to AI, causing AI to be unable to answer page-related questions
- **Solution**: 
  - Modified `sendMessageToBackground()` to send complete message including attachments
  - Fixed message transmission logic in `content.js`
  - Added proper attachment content handling
- **Files**: `content/content.js`, `background/background.js`

#### 2. Markdown Table Rendering Fix
- **Problem**: Markdown tables were rendered as separate rows instead of complete tables
- **Solution**:
  - Implemented `processCompleteTable()` function for unified table processing
  - Enhanced table separator filtering with regex `/^[\s\|:\-]+$/`
  - Disabled legacy `processTableRow()` to prevent duplicate tables
  - Added proper header/data row styling with zebra striping
- **Files**: `content/content.js`, `content/sidebar.css`

#### 3. Sidebar Resize Functionality
- **Problem**: Users couldn't adjust sidebar width
- **Solution**:
  - Added resize handle with drag functionality
  - Implemented width constraints (300px - 800px)
  - Added visual feedback during resize
  - Persistent width storage in browser settings
  - Dynamic page margin adjustment
- **Files**: `content/content.js`, `content/sidebar.css`, `background/background.js`

#### 4. Excessive Line Breaks Fix
- **Problem**: Too many `<br>` tags causing excessive white space
- **Solution**:
  - Implemented conditional `<br>` generation logic
  - Excluded special elements (headers, lists, tables) from automatic `<br>` insertion
  - Added next-line checking to prevent unnecessary breaks
  - Optimized spacing in details/summary tags
- **Files**: `content/content.js`

#### 5. Dash Separator Processing Fix
- **Problem**: "---" characters appearing as text instead of horizontal rules
- **Solution**:
  - Added markdown horizontal rule processing (`---`, `***`, `___`)
  - Enhanced table separator filtering patterns
  - Implemented `processHorizontalRule()` function with proper styling
  - Added standalone separator line removal
- **Files**: `content/content.js`

### 🎨 UI/UX Improvements

#### Sidebar Enhancements
- **Resizable sidebar**: Drag left edge to adjust width (300px - 800px)
- **Visual feedback**: Hover effects and resize indicators
- **Persistent settings**: Width preferences saved across sessions

#### Table Rendering
- **Professional styling**: Proper borders, padding, and alternating row colors
- **Header distinction**: Bold headers with different background color
- **Responsive design**: Tables adapt to sidebar width

#### Message Formatting
- **Clean spacing**: Reduced excessive white space between elements
- **Horizontal rules**: Markdown separators render as visual lines
- **Consistent typography**: Improved readability and visual hierarchy

### 🧪 Testing & Documentation

#### Test Files Added
- `test-html-attachment.html` - HTML attachment functionality testing
- `test-table-rendering.html` - Table rendering and resize testing  
- `test-table-fix.html` - Table header processing testing
- `test-br-spacing.html` - Line break spacing testing
- `test-dash-separator.html` - Dash separator processing testing
- `test-resize-debug.html` - Sidebar resize debugging

#### Documentation Added
- `HTML_ATTACHMENT_FIX_GUIDE.md` - HTML attachment fix guide
- `TABLE_AND_RESIZE_FIX_GUIDE.md` - Table and resize feature guide
- `TABLE_HEADER_FIX_GUIDE.md` - Table header processing guide
- `RESIZE_TROUBLESHOOTING_GUIDE.md` - Resize troubleshooting guide
- `BR_SPACING_FIX_GUIDE.md` - Line break spacing fix guide
- `DASH_SEPARATOR_FIX_GUIDE.md` - Dash separator fix guide

### 🔧 Technical Details

#### Code Architecture Improvements
- **Modular table processing**: Centralized table handling logic
- **Enhanced message formatting**: Safer XSS-resistant content processing
- **Improved event handling**: Better resize and interaction management
- **Settings management**: Extended settings schema for new features

#### Performance Optimizations
- **Reduced DOM manipulation**: Batch processing for table creation
- **Efficient resize handling**: Optimized drag event processing
- **Memory management**: Proper event cleanup and reference management

#### Browser Compatibility
- **CSS improvements**: Better cross-browser styling consistency
- **JavaScript enhancements**: Modern ES6+ features with fallbacks
- **Extension API**: Proper Chrome Extension Manifest V3 compliance

### 🐛 Bug Fixes Summary

1. **HTML Attachment**: Fixed content transmission to AI backend
2. **Table Rendering**: Fixed broken table display and duplicate creation
3. **Sidebar Resize**: Added missing resize functionality with constraints
4. **Line Spacing**: Fixed excessive white space in AI responses
5. **Dash Separators**: Fixed "---" text appearing instead of horizontal rules

### 📊 Impact

- **User Experience**: Significantly improved readability and functionality
- **AI Interaction**: Enhanced AI's ability to process page content
- **Customization**: Added user control over interface sizing
- **Visual Quality**: Professional-looking tables and formatting
- **Reliability**: Reduced rendering issues and improved consistency

### 🔄 Migration Notes

- **Settings**: New `sidebarWidth` setting added (default: 400px)
- **CSS**: Updated sidebar styles for resize functionality
- **JavaScript**: Enhanced message processing logic
- **Backward Compatibility**: All existing functionality preserved

---

## Previous Versions

### [v0.9.1] - Previous Release
- Basic chatbot functionality
- HTML attachment feature (with bugs)
- Simple table rendering (with issues)
- Fixed sidebar width
- Basic message formatting