# Edge Case Testing Guide - JS Blocker Pro

## Test Environment Setup
1. Load extension in Chrome: `chrome://extensions/` → Load unpacked
2. Open browser console (F12) for error checking
3. Test on various websites with different script patterns

---

## Phase 1: Script Discovery Edge Cases

### Test 1.1: Empty Page
- **URL**: `about:blank`
- **Expected**: No scripts found, no errors
- **Test**: Click scan button
- **Pass Criteria**: Shows "Found 0 script(s)"

### Test 1.2: Page with Only Inline Scripts
- **URL**: Create test HTML with only `<script>` tags (no src)
- **Expected**: Detects inline scripts only
- **Pass Criteria**: All scripts show type "inline"

### Test 1.3: Page with Dynamic Script Injection
- **URL**: Any SPA (React/Vue app)
- **Expected**: Detects dynamically loaded scripts
- **Pass Criteria**: Shows "dynamic" type scripts

### Test 1.4: Page with Module Scripts
- **URL**: Modern site using ES6 modules
- **Expected**: Detects module type
- **Pass Criteria**: Shows "module" type

### Test 1.5: Very Large Script (>10MB)
- **URL**: Site with large bundle
- **Expected**: Handles large files without crash
- **Pass Criteria**: Shows size correctly, no freeze

### Test 1.6: Script with Special Characters in URL
- **URL**: Script with `?`, `&`, `#` in URL
- **Expected**: Parses URL correctly
- **Pass Criteria**: Full URL displayed in tooltip

---

## Phase 2: Classification Edge Cases

### Test 2.1: Unknown Domain
- **Script**: `https://random-unknown-domain.xyz/script.js`
- **Expected**: Classified as "Unknown"
- **Pass Criteria**: Gray badge, category = Unknown

### Test 2.2: Mixed Signals (CDN + Tracking Name)
- **Script**: `https://cdn.jsdelivr.net/analytics.js`
- **Expected**: Classified based on domain priority
- **Pass Criteria**: Should be "Functional" (CDN wins)

### Test 2.3: Obfuscated Filename
- **Script**: `a7f3k9m2x8q1.js`
- **Expected**: High entropy → Suspicious
- **Pass Criteria**: Purple badge, category = Suspicious

### Test 2.4: Inline Script with Fingerprinting
```html
<script>
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var data = canvas.toDataURL();
</script>
```
- **Expected**: Classified as Suspicious
- **Pass Criteria**: Category = Suspicious

### Test 2.5: First-Party Script Named "ads.js"
- **Script**: `https://example.com/ads.js` (same domain)
- **Expected**: Conflict between name and origin
- **Pass Criteria**: Should classify based on name pattern

---

## Phase 3: Behavior Monitoring Edge Cases

### Test 3.1: Rapid localStorage Access
- **Action**: Script calls localStorage 100 times
- **Expected**: Flags as "storage-abuse"
- **Pass Criteria**: 🟠 badge appears

### Test 3.2: Hidden Iframe with 0x0 Size
```javascript
const iframe = document.createElement('iframe');
iframe.style.width = '0px';
iframe.style.height = '0px';
document.body.appendChild(iframe);
```
- **Expected**: Flags as "hidden-iframe"
- **Pass Criteria**: 🔴 badge appears

### Test 3.3: Multiple Behavior Flags
- **Action**: Script does canvas + localStorage + beacon
- **Expected**: Shows all 3 flags
- **Pass Criteria**: Multiple emoji badges (🟣 🟢 🟠)

### Test 3.4: Permission Prompt Timeout
- **Action**: Show permission prompt, wait 30+ seconds
- **Expected**: Auto-denies after timeout
- **Pass Criteria**: Script blocked, no hang

### Test 3.5: Rapid Permission Requests
- **Action**: Script requests 10 permissions quickly
- **Expected**: Handles queue properly
- **Pass Criteria**: Shows prompts sequentially, no crash

---

## Phase 4: Dependency Mapping Edge Cases

### Test 4.1: Circular Dependencies
- **Setup**: Script A loads B, B loads A
- **Expected**: Detects and prevents infinite loop
- **Pass Criteria**: No crash, shows relationship

### Test 4.2: Deep Dependency Chain
- **Setup**: A → B → C → D → E (5 levels)
- **Expected**: Maps entire chain
- **Pass Criteria**: Tree view shows all levels

### Test 4.3: Script with No Dependencies
- **Setup**: Standalone script
- **Expected**: Shows "—" in Deps column
- **Pass Criteria**: No parent, no children

### Test 4.4: Script Loaded Multiple Times
- **Setup**: Same script loaded twice
- **Expected**: Shows both instances
- **Pass Criteria**: Different IDs, same URL

---

## Phase 5: Control Modes Edge Cases

### Test 5.1: Switch Modes Mid-Scan
- **Action**: Scan → Change mode → Observe
- **Expected**: Auto-applies new rules
- **Pass Criteria**: Scripts re-evaluated, status updates

### Test 5.2: Banking Mode on Heavy Site
- **URL**: News site with 50+ scripts
- **Expected**: Blocks most scripts
- **Pass Criteria**: 80%+ blocked

### Test 5.3: Developer Mode on Same Site
- **Expected**: Blocks only ads
- **Pass Criteria**: <20% blocked

### Test 5.4: Mode Persistence
- **Action**: Set mode → Close popup → Reopen
- **Expected**: Mode remembered
- **Pass Criteria**: Dropdown shows saved mode

---

## Phase 6: Permission Prompts Edge Cases

### Test 6.1: Prompt While Popup Closed
- **Action**: Close popup, trigger canvas read
- **Expected**: Prompt window opens
- **Pass Criteria**: Separate window appears

### Test 6.2: Multiple Prompts Simultaneously
- **Action**: Trigger canvas + WebRTC + WASM
- **Expected**: Queues prompts
- **Pass Criteria**: Shows one at a time

### Test 6.3: Allow Always Then Revoke
- **Action**: Allow always → Disable prompts → Re-enable
- **Expected**: Remembers "always" decision
- **Pass Criteria**: No re-prompt for same script

### Test 6.4: Block Then Allow Once
- **Action**: Block → Refresh → Allow once
- **Expected**: Works this time only
- **Pass Criteria**: Next refresh prompts again

### Test 6.5: Prompts Disabled Globally
- **Action**: Disable permission toggle
- **Expected**: All actions allowed by default
- **Pass Criteria**: No prompts appear

---

## Phase 7: Timing Control Edge Cases

### Test 7.1: Delay Script That's Already Loaded
- **Action**: Page loads → Scan → Delay script
- **Expected**: Applies to future loads only
- **Pass Criteria**: Shows "Delayed" status

### Test 7.2: Interaction Delay on Non-Interactive Page
- **Setup**: Delay until interaction, but page has no clickable elements
- **Expected**: Script waits indefinitely
- **Pass Criteria**: Never executes until click

### Test 7.3: Time Delay of 0 Seconds
- **Action**: Set time delay to 0
- **Expected**: Executes immediately
- **Pass Criteria**: No actual delay

### Test 7.4: Time Delay of 60 Seconds
- **Action**: Set max delay (60s)
- **Expected**: Waits full minute
- **Pass Criteria**: Script executes after 60s

### Test 7.5: Multiple Delay Types on Same Page
- **Setup**: Script A = interaction, Script B = scroll, Script C = time
- **Expected**: Each triggers independently
- **Pass Criteria**: Different execution times

### Test 7.6: Scroll Delay on Non-Scrollable Page
- **Setup**: Page shorter than viewport
- **Expected**: Never triggers
- **Pass Criteria**: Script never executes

---

## Phase 8: WASM Monitoring Edge Cases

### Test 8.1: Page with No WASM
- **Expected**: No WASM indicators
- **Pass Criteria**: No "WASM" badges

### Test 8.2: WASM with Permission Denied
- **Action**: Deny WASM load
- **Expected**: Throws error, script fails
- **Pass Criteria**: Error caught, no crash

### Test 8.3: Multiple WASM Modules
- **Setup**: Page loads 3 WASM files
- **Expected**: All detected separately
- **Pass Criteria**: 3 rows with "WASM" indicator

---

## Phase 9: Trust Scoring Edge Cases

### Test 9.1: Script with Conflicting Signals
- **Setup**: First-party + Tracking category
- **Expected**: Calculates net score
- **Pass Criteria**: Score between 30-60 (neutral)

### Test 9.2: Perfect Score Script
- **Setup**: First-party + Functional + No behaviors
- **Expected**: Score = 85 (50+20+15)
- **Pass Criteria**: Green badge (safe)

### Test 9.3: Worst Score Script
- **Setup**: Third-party + Ads + Fingerprinting + WASM
- **Expected**: Score near 0
- **Pass Criteria**: Red badge (block)

### Test 9.4: Score Tooltip
- **Action**: Hover over trust badge
- **Expected**: Shows scoring factors
- **Pass Criteria**: Tooltip lists all factors

### Test 9.5: AI Summary with No Scripts
- **Expected**: Shows 0 for all categories
- **Pass Criteria**: No crash, displays zeros

---

## Phase 10: Policy Engine Edge Cases

### Test 10.1: Policy with No Conditions
- **Action**: Click "Apply Policy" with nothing checked
- **Expected**: Error message
- **Pass Criteria**: Shows "Select at least one condition"

### Test 10.2: Policy Matching All Scripts
- **Setup**: Select all conditions
- **Expected**: Blocks everything
- **Pass Criteria**: All scripts show "Blocked"

### Test 10.3: Policy Matching No Scripts
- **Setup**: Conditions that match nothing
- **Expected**: Blocks 0 scripts
- **Pass Criteria**: Message shows "blocked 0 script(s)"

### Test 10.4: Policy on Empty Scan
- **Action**: Apply policy before scanning
- **Expected**: No effect
- **Pass Criteria**: No errors

### Test 10.5: Multiple Policy Applications
- **Action**: Apply policy → Apply again
- **Expected**: Idempotent (same result)
- **Pass Criteria**: Count doesn't change

---

## UI/UX Edge Cases

### Test UI.1: Popup on Restricted Page
- **URL**: `chrome://extensions/`
- **Expected**: Shows error message
- **Pass Criteria**: "Unable to scan" message

### Test UI.2: Very Long Script Name
- **Script**: `https://example.com/very-long-script-name-that-exceeds-normal-length.js`
- **Expected**: Truncates with ellipsis
- **Pass Criteria**: Tooltip shows full name

### Test UI.3: 100+ Scripts on Page
- **URL**: Heavy site with many scripts
- **Expected**: Table scrolls, no lag
- **Pass Criteria**: Smooth scrolling, all visible

### Test UI.4: Rapid Button Clicking
- **Action**: Click "Block Selected" 10 times rapidly
- **Expected**: Handles gracefully
- **Pass Criteria**: No duplicate actions, no crash

### Test UI.5: Download Inline Script
- **Action**: Click download on inline script
- **Expected**: Button disabled
- **Pass Criteria**: No download triggered

### Test UI.6: Download Failed (CORS)
- **Script**: Cross-origin script with CORS block
- **Expected**: Shows error message
- **Pass Criteria**: "Failed to fetch" message

### Test UI.7: Horizontal Scroll
- **Action**: Resize popup to narrow width
- **Expected**: Horizontal scrollbar appears
- **Pass Criteria**: Can scroll to see all columns

---

## Performance Edge Cases

### Test P.1: Memory Leak Check
- **Action**: Scan → Back → Scan → Repeat 50 times
- **Expected**: Memory stable
- **Pass Criteria**: No continuous memory growth

### Test P.2: Large Inline Script (1MB+)
- **Setup**: Inline script with huge content
- **Expected**: Handles without freeze
- **Pass Criteria**: Scans in <5 seconds

### Test P.3: Rapid Tab Switching
- **Action**: Open popup → Switch tab → Switch back
- **Expected**: State preserved
- **Pass Criteria**: Scan results still visible

---

## Security Edge Cases

### Test S.1: XSS in Script URL
- **Script**: URL with `<script>alert(1)</script>`
- **Expected**: Escaped properly
- **Pass Criteria**: No alert, shows as text

### Test S.2: SQL Injection in Script Name
- **Script**: URL with `'; DROP TABLE--`
- **Expected**: Treated as string
- **Pass Criteria**: No errors, displays safely

### Test S.3: Malicious Script Content
- **Setup**: Inline script with malicious code
- **Expected**: Detected as suspicious
- **Pass Criteria**: High trust score penalty

---

## Integration Edge Cases

### Test I.1: Extension Update
- **Action**: Update extension while popup open
- **Expected**: Graceful reload
- **Pass Criteria**: No data loss

### Test I.2: Browser Restart
- **Action**: Set settings → Restart browser
- **Expected**: Settings persist
- **Pass Criteria**: All toggles/modes remembered

### Test I.3: Sync Across Devices
- **Action**: Change settings → Check on another device
- **Expected**: Syncs via Chrome sync
- **Pass Criteria**: Settings match (if sync enabled)

---

## How to Run Tests

1. **Automated Unit Tests**:
   ```javascript
   // In browser console
   JSBlockerTests.runAll();
   ```

2. **Manual Edge Case Testing**:
   - Follow each test case above
   - Check pass criteria
   - Document any failures

3. **Test Sites**:
   - Simple: `example.com`
   - Heavy: `cnn.com`, `forbes.com`
   - SPA: `github.com`, `twitter.com`
   - Technical: `stackoverflow.com`

4. **Report Format**:
   ```
   Test ID: [e.g., 1.1]
   Status: PASS/FAIL
   Notes: [Any observations]
   ```

---

## Expected Results Summary

- **All unit tests**: 100% pass rate
- **Edge cases**: 95%+ pass rate (some browser limitations acceptable)
- **No crashes**: Extension should never crash browser
- **No data loss**: Settings should always persist
- **Performance**: <5s scan time for 100 scripts
