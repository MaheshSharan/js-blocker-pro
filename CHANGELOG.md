# Changelog

All notable changes to JS Blocker Pro will be documented in this file.

## [v2.0.0] - 2026-02-26

### Major Update: Intelligent Runtime Execution Control System

Complete transformation from simple toggle to programmable browser firewall with 10 advanced control layers.

### Added

#### Phase 1: Smart Script Discovery Engine
- Real-time detection of all JavaScript sources (external, inline, dynamic, module, WASM)
- Comprehensive metadata extraction (URL, origin, timing, size, execution state)
- Multi-select table interface with bulk actions
- Script scanning and analysis system

#### Phase 2: Script Classification Engine
- Automatic categorization into 6 types: Functional, UX, Tracking, Ads, Suspicious, Unknown
- Heuristic analysis using domain matching and filename patterns
- Content inspection for tracking/fingerprinting patterns
- Entropy calculation for obfuscation detection

#### Phase 3: Behavior Monitoring Layer
- Runtime API interception for 10 suspicious behaviors
- localStorage access and abuse detection
- Hidden iframe monitoring
- WebRTC probing detection
- Background beacon tracking
- Excessive timer detection
- WASM instantiation monitoring
- Canvas, WebGL, and audio fingerprinting detection

#### Phase 4: Dependency Mapping
- Parent-child script relationship tracking
- Visual dependency tree with expandable view
- Dependency chain blocking capability
- Performance-based dependency detection

#### Phase 5: Execution Control Modes
- 5 domain-aware control modes: Normal, Banking (Strict), Social (Balanced), Privacy, Developer (Relaxed)
- Context-based automatic rule application
- Mode-specific blocking policies

#### Phase 6: Runtime Permission Prompts
- Real-time permission prompts for suspicious actions
- Three permission levels: Block, Allow Once, Allow Always
- Permission management for canvas, WebRTC, WASM
- Global prompt toggle
- Beautiful popup UI with detailed explanations

#### Phase 7: Execution Timing Control
- Script execution delay system
- Three delay triggers: user interaction, scroll, time-based
- Configurable delay durations
- Visual execution status indicators
- Complete timing interception and control

#### Phase 8: WASM Monitoring
- Dedicated WebAssembly detection
- WASM-specific permission prompts
- Default suspicious classification
- Independent WASM blocking control

#### Phase 9: Local AI Trust Scoring
- Multi-factor trust score calculation (0-100)
- Analysis of category, origin, behaviors, dependencies, type
- Four recommendation levels: Safe, Neutral, Caution, Block
- Color-coded trust badges
- AI summary panel with score distribution
- 100% local processing (no external calls)

#### Phase 10: Policy Engine
- Visual rule builder interface
- 6 policy conditions: third-party, tracking, ads, fingerprinting, low trust, pre-interaction
- Checkbox-based condition selection
- Automatic policy application
- Programmable firewall behavior

### Technical Improvements
- Migrated to Manifest V3
- Modular class-based architecture (BehaviorMonitor, DependencyTracker, ScriptClassifier, ExecutionTimingController)
- Code organization: reduced content.js from 617 to 534 lines
- Improved performance with efficient API usage
- Enhanced UI with multiple panels and views
- Comprehensive test suite with 37 unit tests (100% pass rate)
- Edge case documentation with 80+ scenarios

### UI Enhancements
- Script Intelligence Panel with sortable table
- Horizontal scrollbar for table viewport
- Download button for external scripts
- Delay configuration panel
- Permission prompt dialogs
- AI Trust Analysis view
- Policy Builder interface
- Dependency tree visualization
- Clean button styling (removed unnecessary icons)

### Fixed
- Back button icon and styling
- Popup persistence during scan operations
- Table viewport scrolling
- Download functionality for script files
- Phase 7 timing control implementation
- Entropy calculation test accuracy

---

## [v1.0.0] - 2024-10-21

### Initial Release

- Toggle JavaScript on/off globally with a single click
- Basic enable/disable functionality
- Simple popup interface

