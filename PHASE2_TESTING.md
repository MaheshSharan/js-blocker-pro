# PHASE 2 - Script Classification Engine - TESTING GUIDE

## What Was Built

✅ Automatic script classification system
✅ Heuristic-based categorization
✅ Known tracking and ad domain detection
✅ Filename pattern analysis
✅ Inline script content analysis
✅ Entropy calculation for obfuscated scripts
✅ Category column in Script Intelligence Panel
✅ Color-coded category badges

## Categories

### Functional (Green)
- Core application scripts
- Main bundles, vendors, polyfills
- First-party scripts
- CDN-hosted libraries (jQuery, Bootstrap, etc.)

### UX (Blue)
- UI libraries (React, Vue, Angular)
- Animation libraries
- Interactive components (carousels, modals, tooltips)
- User interface enhancements

### Tracking (Orange)
- Analytics scripts (Google Analytics, Mixpanel, Segment)
- User behavior tracking
- Session recording (Hotjar, FullStory)
- Metrics and telemetry

### Ads (Red)
- Advertisement networks
- Ad serving scripts
- Sponsored content loaders
- Ad exchanges

### Suspicious (Purple)
- High entropy filenames (obfuscated)
- Fingerprinting attempts (canvas, WebGL, audio)
- Unusual API usage patterns
- WASM files (by default)
- Base64 encoding/decoding in inline scripts

### Unknown (Gray)
- Third-party scripts not matching other patterns
- Scripts without clear indicators
- Unrecognized domains

## Classification Heuristics

### Domain-Based Detection
- Tracking domains: google-analytics.com, mixpanel.com, segment.com, etc.
- Ad domains: googlesyndication.com, doubleclick.net, criteo.com, etc.
- CDN domains: cloudflare.com, jsdelivr.net, cdnjs.cloudflare.com, etc.

### Filename Pattern Matching
- Tracking: analytics, tracking, tracker, pixel, beacon, telemetry, metrics
- Ads: ad, ads, adv, advertisement, banner, sponsor
- UX: jquery, bootstrap, react, vue, angular, animation, carousel, slider
- Functional: main, app, core, bundle, vendor, polyfill, runtime, chunk

### Inline Script Content Analysis
Detects suspicious patterns:
- Canvas fingerprinting
- WebGL fingerprinting
- AudioContext usage
- Navigator.plugins enumeration
- Screen dimension collection
- User agent sniffing
- Cookie manipulation
- localStorage access
- Base64 encoding/decoding

### Entropy Calculation
- Measures filename randomness
- High entropy (>4.5) indicates obfuscation
- Example: `a7f3k9m2.js` has higher entropy than `analytics.js`

## How to Test

### 1. Test on News Sites (Heavy Tracking/Ads)
Visit: https://cnn.com or https://forbes.com
- Expect: Multiple "Tracking" (orange) badges
- Expect: Multiple "Ads" (red) badges
- Expect: Some "Functional" (green) for core site functionality

### 2. Test on GitHub (Mostly Functional)
Visit: https://github.com
- Expect: Mostly "Functional" (green) badges
- Expect: Few or no "Tracking" badges
- Expect: "UX" (blue) for UI components

### 3. Test on E-commerce Sites
Visit: https://amazon.com or https://ebay.com
- Expect: Mix of "Functional", "Tracking", and "Ads"
- Expect: "Suspicious" for any fingerprinting scripts

### 4. Test Inline Script Classification
Create a test HTML file with inline scripts:
```html
<!DOCTYPE html>
<html>
<head>
  <script>
    // Should be classified as Suspicious
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var fingerprint = canvas.toDataURL();
  </script>
  <script>
    // Should be classified as Tracking
    gtag('config', 'GA_MEASUREMENT_ID');
  </script>
  <script>
    // Should be classified as Functional
    function init() {
      console.log('App initialized');
    }
  </script>
</head>
<body></body>
</html>
```

### 5. Verify Category Display
- Open extension popup
- Click scan button
- Verify: Category column appears between "Type" and "Timing"
- Verify: Each script has a colored badge
- Verify: Badge colors match category:
  - Green = Functional
  - Blue = UX
  - Orange = Tracking
  - Red = Ads
  - Purple = Suspicious
  - Gray = Unknown

### 6. Test Classification Accuracy
Visit various sites and verify:
- Google Analytics scripts → "Tracking"
- jQuery from CDN → "Functional"
- Facebook Pixel → "Tracking"
- Google Ads → "Ads"
- Obfuscated filenames → "Suspicious"

### 7. Test Filtering by Category
Future enhancement: Filter scripts by category
(Not implemented yet, but classification is ready)

## Expected Results

### High-Traffic Commercial Sites
- 30-50% Tracking
- 10-20% Ads
- 30-40% Functional
- 5-10% UX
- 5-10% Suspicious/Unknown

### Developer/Technical Sites
- 70-80% Functional
- 10-20% UX
- 5-10% Tracking
- 0-5% Ads
- 0-5% Suspicious

### Personal Blogs
- 50-60% Functional
- 20-30% Tracking (if using analytics)
- 10-20% UX
- 0-10% Ads

## Known Limitations (Phase 2)

- Classification is heuristic-based (not 100% accurate)
- New tracking/ad domains may not be recognized
- Inline scripts require content analysis (limited patterns)
- No machine learning (intentionally - local only)
- Cannot detect runtime behavior changes (Phase 3)

## Next Phase Preview

Phase 3 will add:
- Runtime behavior monitoring
- API usage tracking (canvas, WebRTC, localStorage)
- Hidden iframe detection
- Background fetch beacon monitoring
- Excessive timer detection
- Behavior flags in the UI (🟣 🟢 🟠 🔵 🔴)
