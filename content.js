// content.js - Script Discovery Engine

(function() {
  'use strict';

  // Listen for scan requests from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scanScripts') {
      const scripts = discoverAllScripts();
      sendResponse({ scripts });
    }
    return true;
  });

  function discoverAllScripts() {
    const scripts = [];
    const pageOrigin = window.location.origin;
    const performanceEntries = performance.getEntriesByType('resource');

    // 1. Detect External Scripts
    const scriptElements = document.querySelectorAll('script[src]');
    scriptElements.forEach((script, index) => {
      const src = script.src;
      const scriptOrigin = new URL(src).origin;
      const isFirstParty = scriptOrigin === pageOrigin;
      
      // Find performance timing
      const perfEntry = performanceEntries.find(e => e.name === src);
      const loadTime = perfEntry ? Math.round(perfEntry.duration) : 0;
      const size = perfEntry ? Math.round(perfEntry.transferSize || 0) : 0;

      scripts.push({
        id: generateScriptId(src, 'external', index),
        url: src,
        source: isFirstParty ? 'First Party' : 'Third Party',
        type: script.type === 'module' ? 'module' : 'external',
        timing: loadTime ? `${loadTime}ms` : 'N/A',
        size: size ? formatBytes(size) : 'N/A',
        state: 'active',
        async: script.async,
        defer: script.defer,
        integrity: script.integrity || null,
        category: classifyScript(src, scriptOrigin, pageOrigin, null)
      });
    });

    // 2. Detect Inline Scripts
    const inlineScripts = document.querySelectorAll('script:not([src])');
    inlineScripts.forEach((script, index) => {
      if (script.textContent.trim()) {
        const content = script.textContent;
        const hash = simpleHash(content);
        const size = new Blob([content]).size;

        scripts.push({
          id: generateScriptId(hash, 'inline', index),
          url: `inline-${hash}`,
          source: 'First Party',
          type: 'inline',
          timing: 'N/A',
          size: formatBytes(size),
          state: 'active',
          contentPreview: content.substring(0, 100),
          category: classifyScript(`inline-${hash}`, pageOrigin, pageOrigin, content)
        });
      }
    });

    // 3. Detect Dynamically Injected Scripts (from performance API)
    const dynamicScripts = performanceEntries.filter(entry => {
      return entry.initiatorType === 'script' && 
             entry.name.match(/\.js(\?|$)/) &&
             !Array.from(scriptElements).some(s => s.src === entry.name);
    });

    dynamicScripts.forEach((entry, index) => {
      const url = entry.name;
      const scriptOrigin = new URL(url).origin;
      const isFirstParty = scriptOrigin === pageOrigin;

      scripts.push({
        id: generateScriptId(url, 'dynamic', index),
        url: url,
        source: isFirstParty ? 'First Party' : 'Third Party',
        type: 'dynamic',
        timing: `${Math.round(entry.duration)}ms`,
        size: formatBytes(Math.round(entry.transferSize || 0)),
        state: 'active',
        category: classifyScript(url, scriptOrigin, pageOrigin, null)
      });
    });

    // 4. Detect WASM (WebAssembly)
    const wasmEntries = performanceEntries.filter(entry => 
      entry.name.match(/\.wasm(\?|$)/)
    );

    wasmEntries.forEach((entry, index) => {
      const scriptOrigin = new URL(entry.name).origin;
      scripts.push({
        id: generateScriptId(entry.name, 'wasm', index),
        url: entry.name,
        source: 'WASM',
        type: 'wasm',
        timing: `${Math.round(entry.duration)}ms`,
        size: formatBytes(Math.round(entry.transferSize || 0)),
        state: 'active',
        category: 'Suspicious' // WASM is often suspicious
      });
    });

    return scripts;
  }

  // PHASE 2: Script Classification Engine
  function classifyScript(url, scriptOrigin, pageOrigin, content) {
    // Known tracking domains
    const trackingDomains = [
      'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
      'facebook.net', 'connect.facebook.net', 'analytics.twitter.com',
      'scorecardresearch.com', 'quantserve.com', 'hotjar.com',
      'mouseflow.com', 'crazyegg.com', 'mixpanel.com', 'segment.com',
      'amplitude.com', 'heap.io', 'fullstory.com', 'logrocket.com'
    ];

    const adDomains = [
      'googlesyndication.com', 'adservice.google.com', 'doubleclick.net',
      'advertising.com', 'adsystem.com', 'adnxs.com', 'rubiconproject.com',
      'pubmatic.com', 'openx.net', 'criteo.com', 'outbrain.com', 'taboola.com'
    ];

    const cdnDomains = [
      'cloudflare.com', 'jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com',
      'ajax.googleapis.com', 'code.jquery.com', 'stackpath.bootstrapcdn.com',
      'maxcdn.bootstrapcdn.com', 'cdn.jsdelivr.net'
    ];

    // Check if tracking domain
    if (trackingDomains.some(domain => url.includes(domain))) {
      return 'Tracking';
    }

    // Check if ad domain
    if (adDomains.some(domain => url.includes(domain))) {
      return 'Ads';
    }

    // Check filename patterns
    const urlLower = url.toLowerCase();
    
    // Tracking patterns
    if (urlLower.match(/analytics|tracking|tracker|pixel|beacon|telemetry|metrics/)) {
      return 'Tracking';
    }

    // Ad patterns
    if (urlLower.match(/\bad[sv]?[_.-]|advertisement|banner|sponsor/)) {
      return 'Ads';
    }

    // UX patterns (UI libraries, animations, interactions)
    if (urlLower.match(/jquery|bootstrap|react|vue|angular|animation|carousel|slider|modal|tooltip|dropdown/)) {
      return 'UX';
    }

    // Functional patterns (core functionality)
    if (urlLower.match(/main|app|core|bundle|vendor|polyfill|runtime|chunk/)) {
      return 'Functional';
    }

    // Check for inline script content
    if (content) {
      const suspiciousPatterns = [
        /canvas.*fingerprint/i,
        /webgl.*fingerprint/i,
        /audiocontext/i,
        /navigator\.plugins/i,
        /screen\.(width|height|availWidth|availHeight)/i,
        /navigator\.userAgent/i,
        /document\.cookie/i,
        /localStorage\.getItem/i,
        /btoa|atob/i // Base64 encoding/decoding
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(content))) {
        return 'Suspicious';
      }

      // Check for tracking indicators
      if (content.match(/google.*analytics|ga\(|gtag\(|fbq\(/i)) {
        return 'Tracking';
      }
    }

    // Check filename entropy (high entropy = obfuscated/suspicious)
    const filename = url.split('/').pop().split('?')[0];
    const entropy = calculateEntropy(filename);
    
    if (entropy > 4.5) {
      return 'Suspicious';
    }

    // Third-party scripts that aren't CDN
    if (scriptOrigin !== pageOrigin && !cdnDomains.some(domain => url.includes(domain))) {
      return 'Unknown';
    }

    // CDN scripts are likely functional
    if (cdnDomains.some(domain => url.includes(domain))) {
      return 'Functional';
    }

    // First-party scripts default to functional
    if (scriptOrigin === pageOrigin) {
      return 'Functional';
    }

    return 'Unknown';
  }

  function calculateEntropy(str) {
    const len = str.length;
    const frequencies = {};
    
    for (let i = 0; i < len; i++) {
      const char = str[i];
      frequencies[char] = (frequencies[char] || 0) + 1;
    }
    
    let entropy = 0;
    for (const char in frequencies) {
      const p = frequencies[char] / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }

  function generateScriptId(identifier, type, index) {
    return `${type}-${simpleHash(identifier)}-${index}`;
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

})();
