# PHASE 1 - Smart Script Discovery Engine - TESTING GUIDE

## What Was Built

✅ Scan Mode with search icon in popup
✅ Real-time script detection system
✅ Script Intelligence Panel with table view
✅ Multi-select functionality
✅ Disable/Allow selected scripts
✅ Dynamic rule injection for blocking

## Features Implemented

### Script Detection
- External scripts (with src attribute)
- Inline scripts (embedded in HTML)
- Dynamically injected scripts (via Performance API)
- Module scripts (type="module")
- WASM files detection

### Script Information Captured
- Script URL/identifier
- Source (First Party vs Third Party)
- Type (external/inline/dynamic/module/wasm)
- Load timing (in milliseconds)
- File size (formatted)
- Execution state (active/blocked)

### User Interface
- Scan button (🔍) in header
- Script Intelligence Panel with:
  - Back button to return to main view
  - Rescan button to refresh data
  - Select All checkbox and button
  - Disable Selected button
  - Allow Selected button
  - Sortable table with columns:
    - Checkbox for selection
    - Script name
    - Source (1st/3rd party)
    - Type (with color coding)
    - Timing
    - Size
    - Status (Active/Blocked)

### Persistence
- Disabled script IDs stored in chrome.storage.sync
- Survives browser restarts
- Syncs across devices (if Chrome sync enabled)

## How to Test

1. **Load the Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this extension directory
   - Note: Version should now show 2.0

2. **Test Basic Scan**
   - Navigate to any website (e.g., https://github.com)
   - Click the extension icon
   - Click the 🔍 (scan) button
   - Verify: Script Intelligence Panel opens
   - Verify: Scripts are listed in the table
   - Verify: Each script shows name, source, type, timing, size, status

3. **Test Script Selection**
   - Click individual checkboxes
   - Verify: Row highlights when selected
   - Click "Select All" button
   - Verify: All checkboxes are checked
   - Click the header checkbox to deselect all
   - Verify: All checkboxes uncheck

4. **Test Disable Functionality**
   - Select one or more scripts
   - Click "Disable Selected"
   - Verify: Status changes to "Blocked" (red)
   - Verify: Success message appears
   - Close and reopen popup
   - Click scan again
   - Verify: Previously disabled scripts still show as "Blocked"

5. **Test Allow Functionality**
   - Select blocked scripts
   - Click "Allow Selected"
   - Verify: Status changes to "Active" (green)
   - Verify: Success message appears

6. **Test Rescan**
   - Click the 🔄 (rescan) button
   - Verify: Table refreshes with current page scripts
   - Verify: Blocked status persists

7. **Test Different Script Types**
   - Visit sites with various script types:
     - External: Most modern websites
     - Inline: Check view-source for `<script>` tags without src
     - Dynamic: Sites using lazy loading (scroll-triggered scripts)
     - Module: Sites using ES6 modules

8. **Test Back Navigation**
   - Click "← Back" button
   - Verify: Returns to main view
   - Verify: Original toggle and blocked scripts textarea still work

## Expected Behavior

- Scripts should be detected immediately on scan
- First-party scripts should be labeled correctly
- Third-party scripts should be identified
- Blocking should take effect on next page load
- Inline scripts show hash-based IDs
- Performance timing should show realistic values

## Known Limitations (Phase 1)

- Inline scripts cannot be blocked via URL (will be addressed in later phases)
- No classification yet (Category column not present - Phase 2)
- No behavior monitoring (Phase 3)
- No dependency mapping (Phase 4)
- Blocking requires page refresh to take effect

## Next Phase Preview

Phase 2 will add:
- Script classification (Functional/UX/Tracking/Ads/Suspicious/Unknown)
- Heuristic analysis
- Known tracking domain detection
- Category column in table
