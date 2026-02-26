# JS Blocker Pro

A Chrome Extension that provides intelligent runtime JavaScript execution control. Evolved from a simple toggle into a programmable browser firewall with 10 advanced control layers.

## Installation

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension directory

## Features

### Phase 1: Smart Script Discovery
Detects all JavaScript sources on a page in real-time. Identifies external, inline, dynamic, module, and WASM scripts. Displays comprehensive metadata including URL, origin, load timing, size, and execution state in a sortable table.

### Phase 2: Script Classification
Automatically categorizes scripts into 6 types: Functional, UX, Tracking, Ads, Suspicious, and Unknown. Uses heuristic analysis including domain matching, filename entropy calculation, and content pattern inspection.

### Phase 3: Behavior Monitoring
Intercepts runtime API calls to track suspicious activities. Monitors localStorage access, hidden iframe creation, WebRTC probing, background beacons, excessive timers, WASM instantiation, and fingerprinting attempts (canvas, WebGL, audio).

### Phase 4: Dependency Mapping
Tracks parent-child relationships between scripts. Shows which scripts load other scripts in an expandable tree view. Enables blocking entire dependency chains.

### Phase 5: Execution Control Modes
Five domain-aware modes: Normal (manual), Banking (strict blocking), Social (balanced), Privacy (block third-party), and Developer (relaxed). Each mode automatically applies appropriate blocking rules.

### Phase 6: Runtime Permission Prompts
Real-time prompts when scripts attempt suspicious actions like canvas fingerprinting, WebRTC probing, or WASM loading. Three options: Block, Allow Once, or Allow Always. Can be globally toggled on/off.

### Phase 7: Execution Timing Control
Delay script execution instead of blocking. Three delay options: after user interaction (click), after scroll, or after time delay (configurable seconds). Useful for performance optimization.

### Phase 8: WASM Monitoring
Dedicated WebAssembly detection and control. WASM scripts are classified as suspicious by default and can be blocked or allowed via permission prompts.

### Phase 9: Local AI Trust Scoring
Calculates trust scores (0-100) using multi-factor analysis: category, origin, behaviors, dependencies, and type. Provides four recommendation levels: Safe, Neutral, Caution, Block. All processing is local with no external calls.

### Phase 10: Policy Engine
Create custom blocking rules using six conditions: third-party origin, tracking category, ads category, fingerprinting behavior, low trust score, or loads before interaction. Visual rule builder with checkbox selection.

## Usage

Click the extension icon to open the control panel. Use "Scan Scripts" to analyze the current page. Select scripts and choose actions: Block, Allow, or Delay. Switch between control modes for different security contexts. Create custom policies for automated blocking.

## Technical Details

Built with Manifest V3 using content scripts, service workers, and declarativeNetRequest API. Code is organized into modular classes: BehaviorMonitor, DependencyTracker, ScriptClassifier, and ExecutionTimingController. All settings persist via local storage.

## License

MIT License
