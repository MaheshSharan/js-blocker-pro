// content.js - Script Discovery Engine + Behavior Monitoring + Dependency Mapping

(function() {
  'use strict';

  // Behavior monitoring state
  const behaviorFlags = new Map(); // scriptId -> Set of flags
  const monitoringActive = false;
  
  // Dependency tracking
  const scriptDependencies = new Map(); // scriptUrl -> { parent, children[] }
  const scriptLoadStack = []; // Track current execution stack

  // Listen for scan requests from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scanScripts') {
      const scripts = discoverAllScripts();
      sendResponse({ scripts });
    } else if (request.action === 'startMonitoring') {
      startBehaviorMonitoring();
      sendResponse({ success: true });
    } else if (request.action === 'getBehaviorFlags') {
      const flags = {};
      behaviorFlags.forEach((value, key) => {
        flags[key] = Array.from(value);
      });
      sendResponse({ flags });
    } else if (request.action === 'getDependencies') {
      const deps = {};
      scriptDependencies.forEach((value, key) => {
        deps[key] = value;
      });
      sendResponse({ dependencies: deps });
    }
    return true;
  });

  // PHASE 4: Dependency Mapping
  function trackDependencies() {
    // Intercept script creation
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(document, tagName);
      
      if (tagName.toLowerCase() === 'script') {
        const currentScript = getCurrentExecutingScript();
        
        // Override src setter to track when script URL is set
        const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
        Object.defineProperty(element, 'src', {
          set: function(value) {
            if (currentScript) {
              // Record dependency: currentScript loads this new script
              recordDependency(value, currentScript);
            }
            originalSrcDescriptor.set.call(this, value);
          },
          get: function() {
            return originalSrcDescriptor.get.call(this);
          }
        });
      }
      
      return element;
    };

    // Track appendChild to catch dynamic script injection
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function(child) {
      if (child.tagName === 'SCRIPT' && child.src) {
        const currentScript = getCurrentExecutingScript();
        if (currentScript) {
          recordDependency(child.src, currentScript);
        }
      }
      return originalAppendChild.call(this, child);
    };

    // Track insertBefore
    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function(newNode, referenceNode) {
      if (newNode.tagName === 'SCRIPT' && newNode.src) {
        const currentScript = getCurrentExecutingScript();
        if (currentScript) {
          recordDependency(newNode.src, currentScript);
        }
      }
      return originalInsertBefore.call(this, newNode, referenceNode);
    };

    // Monitor script execution via Performance Observer
    if (window.PerformanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.initiatorType === 'script') {
              // Find the initiator from the stack
              const initiator = findScriptInitiator(entry.name);
              if (initiator) {
                recordDependency(entry.name, initiator);
              }
            }
          }
        });
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('PerformanceObserver not available');
      }
    }
  }

  function getCurrentExecutingScript() {
    // Try to get current script from document.currentScript
    if (document.currentScript && document.currentScript.src) {
      return document.currentScript.src;
    }

    // Try to parse from error stack
    try {
      const stack = new Error().stack;
      if (stack) {
        const matches = stack.match(/https?:\/\/[^\s)]+\.js[^\s)]*/g);
        if (matches && matches.length > 0) {
          // Return the most recent script (not this content script)
          for (const match of matches) {
            if (!match.includes('chrome-extension://')) {
              return match.split(':')[0]; // Remove line numbers
            }
          }
        }
      }
    } catch (e) {
      // Stack trace not available
    }

    return null;
  }

  function findScriptInitiator(scriptUrl) {
    // Check performance entries for initiator
    const entries = performance.getEntriesByName(scriptUrl);
    if (entries.length > 0) {
      const entry = entries[0];
      // The initiator is typically the previous script in the waterfall
      const allScripts = performance.getEntriesByType('resource')
        .filter(e => e.initiatorType === 'script' || e.name.match(/\.js/));
      
      const currentIndex = allScripts.findIndex(e => e.name === scriptUrl);
      if (currentIndex > 0) {
        return allScripts[currentIndex - 1].name;
      }
    }
    return null;
  }

  function recordDependency(childUrl, parentUrl) {
    if (!childUrl || !parentUrl || childUrl === parentUrl) return;

    // Initialize parent entry
    if (!scriptDependencies.has(parentUrl)) {
      scriptDependencies.set(parentUrl, { parent: null, children: [] });
    }

    // Initialize child entry
    if (!scriptDependencies.has(childUrl)) {
      scriptDependencies.set(childUrl, { parent: null, children: [] });
    }

    // Record relationship
    const parentData = scriptDependencies.get(parentUrl);
    const childData = scriptDependencies.get(childUrl);

    if (!parentData.children.includes(childUrl)) {
      parentData.children.push(childUrl);
    }

    if (!childData.parent) {
      childData.parent = parentUrl;
    }
  }

  function buildDependencyTree() {
    // Build a tree structure from the dependency map
    const tree = [];
    const processed = new Set();

    scriptDependencies.forEach((data, url) => {
      if (!data.parent && !processed.has(url)) {
        // This is a root node
        tree.push(buildNode(url, processed));
      }
    });

    return tree;
  }

  function buildNode(url, processed) {
    if (processed.has(url)) {
      return { url, children: [], circular: true };
    }

    processed.add(url);
    const data = scriptDependencies.get(url);
    
    if (!data) {
      return { url, children: [] };
    }

    const node = {
      url,
      children: data.children.map(childUrl => buildNode(childUrl, processed))
    };

    return node;
  }

  // PHASE 3: Behavior Monitoring Layer
  function startBehaviorMonitoring() {
    if (window.behaviorMonitoringActive) return;
    window.behaviorMonitoringActive = true;

    // Monitor localStorage abuse
    monitorLocalStorage();
    
    // Monitor hidden iframe creation
    monitorIframes();
    
    // Monitor WebRTC probing
    monitorWebRTC();
    
    // Monitor background fetch beacons
    monitorBeacons();
    
    // Monitor excessive timers
    monitorTimers();
    
    // Monitor WASM instantiation
    monitorWASM();
    
    // Monitor canvas fingerprinting
    monitorCanvas();
    
    // Monitor WebGL fingerprinting
    monitorWebGL();
    
    // Monitor AudioContext fingerprinting
    monitorAudioContext();
  }

  function addBehaviorFlag(scriptIdentifier, flag) {
    if (!behaviorFlags.has(scriptIdentifier)) {
      behaviorFlags.set(scriptIdentifier, new Set());
    }
    behaviorFlags.get(scriptIdentifier).add(flag);
  }

  function getScriptIdentifier() {
    // Try to identify which script is calling
    const stack = new Error().stack;
    if (stack) {
      const match = stack.match(/https?:\/\/[^\s)]+/);
      if (match) return match[0];
    }
    return 'unknown';
  }

  function monitorLocalStorage() {
    const originalSetItem = Storage.prototype.setItem;
    const originalGetItem = Storage.prototype.getItem;
    const accessCount = new Map();

    Storage.prototype.setItem = function(key, value) {
      const scriptId = getScriptIdentifier();
      const count = accessCount.get(scriptId) || 0;
      accessCount.set(scriptId, count + 1);
      
      if (count > 10) {
        addBehaviorFlag(scriptId, 'storage-abuse');
      } else {
        addBehaviorFlag(scriptId, 'storage-access');
      }
      
      return originalSetItem.apply(this, arguments);
    };

    Storage.prototype.getItem = function(key) {
      const scriptId = getScriptIdentifier();
      addBehaviorFlag(scriptId, 'storage-access');
      return originalGetItem.apply(this, arguments);
    };
  }

  function monitorIframes() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'IFRAME') {
            const scriptId = getScriptIdentifier();
            
            // Check if hidden
            const style = window.getComputedStyle(node);
            if (style.display === 'none' || 
                style.visibility === 'hidden' || 
                node.style.width === '0px' || 
                node.style.height === '0px') {
              addBehaviorFlag(scriptId, 'hidden-iframe');
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function monitorWebRTC() {
    if (window.RTCPeerConnection) {
      const OriginalRTC = window.RTCPeerConnection;
      window.RTCPeerConnection = function(...args) {
        const scriptId = getScriptIdentifier();
        addBehaviorFlag(scriptId, 'webrtc-probe');
        return new OriginalRTC(...args);
      };
    }
  }

  function monitorBeacons() {
    if (navigator.sendBeacon) {
      const originalBeacon = navigator.sendBeacon;
      navigator.sendBeacon = function(...args) {
        const scriptId = getScriptIdentifier();
        addBehaviorFlag(scriptId, 'beacon');
        return originalBeacon.apply(this, arguments);
      };
    }

    // Monitor fetch with keepalive
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (options && options.keepalive) {
        const scriptId = getScriptIdentifier();
        addBehaviorFlag(scriptId, 'beacon');
      }
      return originalFetch.apply(this, arguments);
    };
  }

  function monitorTimers() {
    const timerCounts = new Map();
    
    const originalSetInterval = window.setInterval;
    window.setInterval = function(...args) {
      const scriptId = getScriptIdentifier();
      const count = timerCounts.get(scriptId) || 0;
      timerCounts.set(scriptId, count + 1);
      
      if (count > 5) {
        addBehaviorFlag(scriptId, 'excessive-timers');
      }
      
      return originalSetInterval.apply(this, arguments);
    };
  }

  function monitorWASM() {
    if (window.WebAssembly) {
      const originalInstantiate = WebAssembly.instantiate;
      WebAssembly.instantiate = function(...args) {
        const scriptId = getScriptIdentifier();
        addBehaviorFlag(scriptId, 'wasm-usage');
        return originalInstantiate.apply(this, arguments);
      };
    }
  }

  function monitorCanvas() {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      const scriptId = getScriptIdentifier();
      addBehaviorFlag(scriptId, 'fingerprint-canvas');
      return originalToDataURL.apply(this, arguments);
    };

    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const scriptId = getScriptIdentifier();
      addBehaviorFlag(scriptId, 'fingerprint-canvas');
      return originalGetImageData.apply(this, arguments);
    };
  }

  function monitorWebGL() {
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    
    WebGLRenderingContext.prototype.getParameter = function(param) {
      // Check if requesting renderer or vendor info
      if (param === 37445 || param === 37446) {
        const scriptId = getScriptIdentifier();
        addBehaviorFlag(scriptId, 'fingerprint-webgl');
      }
      return originalGetParameter.apply(this, arguments);
    };
  }

  function monitorAudioContext() {
    if (window.AudioContext || window.webkitAudioContext) {
      const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
      window.AudioContext = function(...args) {
        const scriptId = getScriptIdentifier();
        addBehaviorFlag(scriptId, 'fingerprint-audio');
        return new OriginalAudioContext(...args);
      };
      if (window.webkitAudioContext) {
        window.webkitAudioContext = window.AudioContext;
      }
    }
  }

  // Start monitoring immediately
  startBehaviorMonitoring();
  trackDependencies();

  function discoverAllScripts() {
    const scripts = [];
    const pageOrigin = window.location.origin;
    const performanceEntries = performance.getEntriesByType('resource');

    // Get current behavior flags
    const currentFlags = {};
    behaviorFlags.forEach((value, key) => {
      currentFlags[key] = Array.from(value);
    });

    // Get dependency information
    const depInfo = {};
    scriptDependencies.forEach((value, key) => {
      depInfo[key] = {
        parent: value.parent,
        childCount: value.children.length,
        children: value.children
      };
    });

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

      const scriptData = {
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
        category: classifyScript(src, scriptOrigin, pageOrigin, null),
        behaviors: currentFlags[src] || [],
        dependency: depInfo[src] || { parent: null, childCount: 0, children: [] }
      };

      scripts.push(scriptData);
    });

    // 2. Detect Inline Scripts
    const inlineScripts = document.querySelectorAll('script:not([src])');
    inlineScripts.forEach((script, index) => {
      if (script.textContent.trim()) {
        const content = script.textContent;
        const hash = simpleHash(content);
        const size = new Blob([content]).size;
        const inlineId = `inline-${hash}`;

        scripts.push({
          id: generateScriptId(hash, 'inline', index),
          url: inlineId,
          source: 'First Party',
          type: 'inline',
          timing: 'N/A',
          size: formatBytes(size),
          state: 'active',
          contentPreview: content.substring(0, 100),
          category: classifyScript(inlineId, pageOrigin, pageOrigin, content),
          behaviors: currentFlags[inlineId] || [],
          dependency: depInfo[inlineId] || { parent: null, childCount: 0, children: [] }
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
        category: classifyScript(url, scriptOrigin, pageOrigin, null),
        behaviors: currentFlags[url] || [],
        dependency: depInfo[url] || { parent: null, childCount: 0, children: [] }
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
        category: 'Suspicious', // WASM is often suspicious
        behaviors: currentFlags[entry.name] || [],
        dependency: depInfo[entry.name] || { parent: null, childCount: 0, children: [] }
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
