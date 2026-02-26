# JS Blocker Pro - Intelligent Runtime Execution Control System

A Chrome Extension that evolved from a simple JavaScript toggle into a programmable browser firewall with AI-powered decision making.

## 🚀 Evolution Journey

**From:** Simple toggle to block all JavaScript  
**To:** Intelligent runtime control system with 10 advanced layers

## ✨ Features

### Phase 1: Smart Script Discovery Engine
- Real-time detection of all JavaScript sources
- Identifies external, inline, dynamic, module, and WASM scripts
- Extracts metadata: URL, origin, load timing, size, execution state
- Multi-select interface with bulk actions

### Phase 2: Script Classification Engine
- Automatic categorization into 6 types:
  - **Functional** (green) - Core application scripts
  - **UX** (blue) - UI libraries and enhancements
  - **Tracking** (orange) - Analytics and telemetry
  - **Ads** (red) - Advertisement networks
  - **Suspicious** (purple) - Obfuscated or fingerprinting
  - **Unknown** (gray) - Unrecognized patterns
- Heuristic analysis using domain matching, filename patterns, and content inspection
- Entropy calculation for obfuscation detection

### Phase 3: Behavior Monitoring Layer
- Runtime API interception for suspicious activities
- Tracks 10 behavior types with emoji indicators:
  - 🟣 Fingerprinting (canvas/webgl/audio)
  - 🟢 Storage Access
  - 🟠 Storage Abuse / Beaconing
  - 🔵 WASM Usage
  - 🔴 Suspicious (iframe/webrtc/timers)
- Monitors localStorage abuse, hidden iframes, WebRTC probing, beacons, excessive timers

### Phase 4: Dependency Mapping
- Detects parent-child script relationships
- Visual dependency tree with expandable view
- Shows ⬆️ for scripts loaded by others, ⬇️N for scripts loading N children
- Enables blocking entire dependency chains

### Phase 5: Execution Control Modes
- 5 domain-aware modes:
  - **Normal** - Manual control
  - **Banking (Strict)** - Block tracking, ads, suspicious, all 3rd party
  - **Social (Balanced)** - Block tracking, ads, suspicious only
  - **Privacy** - Block all third-party scripts
  - **Developer (Relaxed)** - Only block obvious ads
- Auto-apply blocking rules based on context

### Phase 6: Runtime Permission Prompts
- Real-time prompts for suspicious actions
- Three permission options: Block / Allow Once / Allow Always
- Covers canvas fingerprinting, WebRTC probing, WASM loading
- Beautiful popup UI with detailed explanations
- Global toggle to enable/disable prompts

### Phase 7: Execution Timing Control
- Delay script execution with 3 options:
  - 👆 After User Interaction (click/scroll)
  - 📜 After Scroll
  - ⏱️ After Time Delay (configurable seconds)
- Visual execution status badges
- Scripts can be delayed instead of blocked

### Phase 8: WASM Monitoring
- Dedicated WASM detection and control
- WASM indicator in execution column
- Permission prompts for WASM instantiation
- Classified as suspicious by default

### Phase 9: Local AI Suggestion Layer
- Lightweight trust scoring (0-100)
- Multi-factor analysis:
  - Category, source origin, behaviors, dependencies, type
- Four recommendation levels: Safe / Neutral / Caution / Block
- Color-coded trust badges with scoring factors
- AI Summary panel showing distribution
- 100% local - no cloud/network calls

### Phase 10: Policy Engine
- Rule-based blocking with visual builder
- 6 policy conditions:
  - Third-party scripts
  - Tracking category
  - Ads category
  - Fingerprinting behavior
  - Trust score below 30
  - Loads before user interaction
- Checkbox-based condition selection
- Automatic policy application
- Programmable firewall behavior

## 🎯 Use Cases

- **Privacy Protection** - Block tracking and fingerprinting
- **Security Hardening** - Prevent malicious script execution
- **Performance Optimization** - Delay non-critical scripts
- **Development Testing** - Analyze script dependencies
- **Ad Blocking** - Intelligent ad script detection
- **Banking Security** - Strict mode for sensitive sites

## 🛠️ Technical Architecture

- **Manifest V3** - Modern Chrome extension architecture
- **Content Scripts** - Runs at document_start for early interception
- **Service Worker** - Background coordination
- **declarativeNetRequest** - Efficient script blocking
- **Class-based Modules** - Organized, maintainable code
- **Local Storage** - Persistent settings and decisions

## 📊 UI Components

- **Main View** - Toggle controls and settings
- **Script Intelligence Panel** - Comprehensive script table
- **Delay Panel** - Timing control interface
- **Permission Prompts** - Runtime decision dialogs
- **AI Summary** - Trust score distribution
- **Policy Builder** - Rule creation interface
- **Dependency Tree** - Expandable relationship view

## 🔧 Installation

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension directory

## 📈 Statistics

- **10 Phases** - Complete feature set
- **534 Lines** - Organized content.js (down from 617)
- **6 Categories** - Script classification types
- **10 Behaviors** - Monitored suspicious actions
- **5 Modes** - Execution control profiles
- **6 Policies** - Rule-based conditions
- **100% Local** - No external dependencies

## 🎨 Color Coding

- **Green** - Safe/Functional/Active
- **Blue** - UX/Interaction-based
- **Orange** - Tracking/Caution/Delayed
- **Red** - Ads/Blocked/Suspicious
- **Purple** - Suspicious/WASM/Scroll-based
- **Gray** - Unknown/Neutral

## 🚦 Trust Score Factors

Positive factors:
- Functional category (+20)
- UX category (+10)
- First-party origin (+15)
- Inline script (+5)

Negative factors:
- Tracking (-30), Ads (-35), Suspicious (-40)
- Third-party (-10)
- Fingerprinting (-25)
- Storage abuse (-15)
- Hidden iframe (-20)
- WebRTC probing (-20)
- WASM usage (-15, -20 for type)
- Dynamic loading (-5)

## 🔐 Privacy

- All processing happens locally
- No data sent to external servers
- No cloud AI services
- Settings sync via Chrome's built-in sync (optional)

## 📝 Version History

- **v1.0** - Basic JavaScript toggle
- **v2.0** - Complete intelligent runtime control system (10 phases)

## 🤝 Contributing

This project demonstrates the evolution from a simple tool to a sophisticated system. Feel free to extend with additional features!

## 📄 License

MIT License - Feel free to use and modify

## 🎓 Learning Outcomes

This project showcases:
- Progressive feature development
- Chrome Extension Manifest V3
- Runtime API interception
- Heuristic classification
- Local AI scoring
- Policy-based automation
- Clean code organization
- User-centric design

---

**Built with ❤️ as a demonstration of systematic feature evolution**

From a simple toggle to a programmable browser firewall in 10 phases.
