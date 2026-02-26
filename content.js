// content.js - Main Content Script
// Organized into modular sections for maintainability

(function() {
  'use strict';

  // ============================================================================
  // BEHAVIOR MONITOR MODULE
  // ============================================================================
  
  class BehaviorMonitor {
    constructor() {
      this.behaviorFlags = new Map();
      this.monitoringActive = false;
      this.permissionPromptEnabled = true;
      this.allowedActions = new Map(); // scriptUrl -> Set of allowed actions
      this.pendingRequests = new Map(); // requestId -> resolve function
    }

    setPermissionPromptEnabled(enabled) {
      this.permissionPromptEnabled = enabled;
    }

    async requestPermission(scriptUrl, action, category) {
      // Check if already allowed
      const allowed = this.allowedActions.get(scriptUrl);
      if (allowed && allowed.has(action)) {
        return true;
      }

      // If prompts disabled, allow by default
      if (!this.permissionPromptEnabled) {
        return true;
      }

      // Create permission request
      const requestId = `${Date.now()}-${Math.random()}`;
      
      return new Promise((resolve) => {
        this.pendingRequests.set(requestId, resolve);
        
        // Send message to background to show prompt
        chrome.runtime.sendMessage({
          action: 'showPermissionPrompt',
          requestId: requestId,
          scriptUrl: scriptUrl,
          actionType: action,
          category: category
        });

        // Timeout after 30 seconds - default to block
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            resolve(false);
          }
        }, 30000);
      });
    }

    handlePermissionResponse(requestId, decision, scriptUrl, actionType) {
      const resolve = this.pendingRequests.get(requestId);
      if (!resolve) return;

      this.pendingRequests.delete(requestId);

      if (decision === 'allow-always') {
        if (!this.allowedActions.has(scriptUrl)) {
          this.allowedActions.set(scriptUrl, new Set());
        }
        this.allowedActions.get(scriptUrl).add(actionType);
        resolve(true);
      } else if (decision === 'allow-once') {
        resolve(true);
      } else {
        resolve(false);
      }
    }

    start() {
      if (this.monitoringActive) return;
      this.monitoringActive = true;

      this.monitorLocalStorage();
      this.monitorIframes();
      this.monitorWebRTC();
      this.monitorBeacons();
      this.monitorTimers();
      this.monitorWASM();
      this.monitorCanvas();
      this.monitorWebGL();
      this.monitorAudioContext();
    }

    addFlag(scriptIdentifier, flag) {
      if (!this.behaviorFlags.has(scriptIdentifier)) {
        this.behaviorFlags.set(scriptIdentifier, new Set());
      }
      this.behaviorFlags.get(scriptIdentifier).add(flag);
    }

    getFlags() {
      const flags = {};
      this.behaviorFlags.forEach((value, key) => {
        flags[key] = Array.from(value);
      });
      return flags;
    }

    getScriptIdentifier() {
      const stack = new Error().stack;
      if (stack) {
        const match = stack.match(/https?:\/\/[^\s)]+/);
        if (match) return match[0];
      }
      return 'unknown';
    }

    monitorLocalStorage() {
      const originalSetItem = Storage.prototype.setItem;
      const originalGetItem = Storage.prototype.getItem;
      const accessCount = new Map();
      const self = this;

      Storage.prototype.setItem = function(key, value) {
        const scriptId = self.getScriptIdentifier();
        const count = accessCount.get(scriptId) || 0;
        accessCount.set(scriptId, count + 1);
        
        if (count > 10) {
          self.addFlag(scriptId, 'storage-abuse');
        } else {
          self.addFlag(scriptId, 'storage-access');
        }
        
        return originalSetItem.apply(this, arguments);
      };

      Storage.prototype.getItem = function(key) {
        const scriptId = self.getScriptIdentifier();
        self.addFlag(scriptId, 'storage-access');
        return originalGetItem.apply(this, arguments);
      };
    }

    monitorIframes() {
      const self = this;
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'IFRAME') {
              const scriptId = self.getScriptIdentifier();
              const style = window.getComputedStyle(node);
              if (style.display === 'none' || 
                  style.visibility === 'hidden' || 
                  node.style.width === '0px' || 
                  node.style.height === '0px') {
                self.addFlag(scriptId, 'hidden-iframe');
              }
            }
          });
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }

    monitorWebRTC() {
      if (!window.RTCPeerConnection) return;
      
      const OriginalRTC = window.RTCPeerConnection;
      const self = this;
      
      window.RTCPeerConnection = async function(...args) {
        const scriptId = self.getScriptIdentifier();
        const allowed = await self.requestPermission(scriptId, 'webrtc-probe', 'tracking');
        
        if (allowed) {
          self.addFlag(scriptId, 'webrtc-probe');
          return new OriginalRTC(...args);
        } else {
          self.addFlag(scriptId, 'webrtc-probe-blocked');
          throw new Error('WebRTC access denied by user');
        }
      };
    }

    monitorBeacons() {
      const self = this;
      
      if (navigator.sendBeacon) {
        const originalBeacon = navigator.sendBeacon;
        navigator.sendBeacon = function(...args) {
          const scriptId = self.getScriptIdentifier();
          self.addFlag(scriptId, 'beacon');
          return originalBeacon.apply(this, arguments);
        };
      }

      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        if (options && options.keepalive) {
          const scriptId = self.getScriptIdentifier();
          self.addFlag(scriptId, 'beacon');
        }
        return originalFetch.apply(this, arguments);
      };
    }

    monitorTimers() {
      const timerCounts = new Map();
      const self = this;
      
      const originalSetInterval = window.setInterval;
      window.setInterval = function(...args) {
        const scriptId = self.getScriptIdentifier();
        const count = timerCounts.get(scriptId) || 0;
        timerCounts.set(scriptId, count + 1);
        
        if (count > 5) {
          self.addFlag(scriptId, 'excessive-timers');
        }
        
        return originalSetInterval.apply(this, arguments);
      };
    }

    monitorWASM() {
      if (!window.WebAssembly) return;
      
      const originalInstantiate = WebAssembly.instantiate;
      const self = this;
      
      WebAssembly.instantiate = async function(...args) {
        const scriptId = self.getScriptIdentifier();
        const allowed = await self.requestPermission(scriptId, 'wasm-load', 'suspicious');
        
        if (allowed) {
          self.addFlag(scriptId, 'wasm-usage');
          return originalInstantiate.apply(this, arguments);
        } else {
          self.addFlag(scriptId, 'wasm-usage-blocked');
          throw new Error('WebAssembly instantiation denied by user');
        }
      };
    }

    monitorCanvas() {
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      const self = this;

      HTMLCanvasElement.prototype.toDataURL = async function(...args) {
        const scriptId = self.getScriptIdentifier();
        const allowed = await self.requestPermission(scriptId, 'canvas-read', 'fingerprinting');
        
        if (allowed) {
          self.addFlag(scriptId, 'fingerprint-canvas');
          return originalToDataURL.apply(this, arguments);
        } else {
          self.addFlag(scriptId, 'fingerprint-canvas-blocked');
          return 'data:,'; // Return empty data URL
        }
      };

      CanvasRenderingContext2D.prototype.getImageData = async function(...args) {
        const scriptId = self.getScriptIdentifier();
        const allowed = await self.requestPermission(scriptId, 'canvas-read', 'fingerprinting');
        
        if (allowed) {
          self.addFlag(scriptId, 'fingerprint-canvas');
          return originalGetImageData.apply(this, arguments);
        } else {
          self.addFlag(scriptId, 'fingerprint-canvas-blocked');
          // Return empty ImageData
          return new ImageData(1, 1);
        }
      };
    }

    monitorWebGL() {
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      const self = this;
      
      WebGLRenderingContext.prototype.getParameter = function(param) {
        if (param === 37445 || param === 37446) {
          const scriptId = self.getScriptIdentifier();
          self.addFlag(scriptId, 'fingerprint-webgl');
        }
        return originalGetParameter.apply(this, arguments);
      };
    }

    monitorAudioContext() {
      if (!window.AudioContext && !window.webkitAudioContext) return;
      
      const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
      const self = this;
      
      window.AudioContext = function(...args) {
        const scriptId = self.getScriptIdentifier();
        self.addFlag(scriptId, 'fingerprint-audio');
        return new OriginalAudioContext(...args);
      };
      
      if (window.webkitAudioContext) {
        window.webkitAudioContext = window.AudioContext;
      }
    }
  }

  // ============================================================================
  // DEPENDENCY TRACKER MODULE
  // ============================================================================
  
  class DependencyTracker {
    constructor() {
      this.scriptDependencies = new Map();
    }

    start() {
      this.interceptScriptCreation();
      this.interceptAppendChild();
      this.interceptInsertBefore();
      this.monitorPerformance();
    }

    getDependencies() {
      const deps = {};
      this.scriptDependencies.forEach((value, key) => {
        deps[key] = value;
      });
      return deps;
    }

    getDependencyInfo(scriptUrl) {
      const data = this.scriptDependencies.get(scriptUrl);
      if (!data) {
        return { parent: null, childCount: 0, children: [] };
      }
      return {
        parent: data.parent,
        childCount: data.children.length,
        children: data.children
      };
    }

    recordDependency(childUrl, parentUrl) {
      if (!childUrl || !parentUrl || childUrl === parentUrl) return;

      if (!this.scriptDependencies.has(parentUrl)) {
        this.scriptDependencies.set(parentUrl, { parent: null, children: [] });
      }

      if (!this.scriptDependencies.has(childUrl)) {
        this.scriptDependencies.set(childUrl, { parent: null, children: [] });
      }

      const parentData = this.scriptDependencies.get(parentUrl);
      const childData = this.scriptDependencies.get(childUrl);

      if (!parentData.children.includes(childUrl)) {
        parentData.children.push(childUrl);
      }

      if (!childData.parent) {
        childData.parent = parentUrl;
      }
    }

    getCurrentExecutingScript() {
      if (document.currentScript && document.currentScript.src) {
        return document.currentScript.src;
      }

      try {
        const stack = new Error().stack;
        if (stack) {
          const matches = stack.match(/https?:\/\/[^\s)]+\.js[^\s)]*/g);
          if (matches && matches.length > 0) {
            for (const match of matches) {
              if (!match.includes('chrome-extension://')) {
                return match.split(':')[0];
              }
            }
          }
        }
      } catch (e) {}

      return null;
    }

    findScriptInitiator(scriptUrl) {
      const entries = performance.getEntriesByName(scriptUrl);
      if (entries.length > 0) {
        const allScripts = performance.getEntriesByType('resource')
          .filter(e => e.initiatorType === 'script' || e.name.match(/\.js/));
        
        const currentIndex = allScripts.findIndex(e => e.name === scriptUrl);
        if (currentIndex > 0) {
          return allScripts[currentIndex - 1].name;
        }
      }
      return null;
    }

    interceptScriptCreation() {
      const originalCreateElement = document.createElement;
      const self = this;
      
      document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        
        if (tagName.toLowerCase() === 'script') {
          const currentScript = self.getCurrentExecutingScript();
          
          const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
          Object.defineProperty(element, 'src', {
            set: function(value) {
              if (currentScript) {
                self.recordDependency(value, currentScript);
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
    }

    interceptAppendChild() {
      const originalAppendChild = Node.prototype.appendChild;
      const self = this;
      
      Node.prototype.appendChild = function(child) {
        if (child.tagName === 'SCRIPT' && child.src) {
          const currentScript = self.getCurrentExecutingScript();
          if (currentScript) {
            self.recordDependency(child.src, currentScript);
          }
        }
        return originalAppendChild.call(this, child);
      };
    }

    interceptInsertBefore() {
      const originalInsertBefore = Node.prototype.insertBefore;
      const self = this;
      
      Node.prototype.insertBefore = function(newNode, referenceNode) {
        if (newNode.tagName === 'SCRIPT' && newNode.src) {
          const currentScript = self.getCurrentExecutingScript();
          if (currentScript) {
            self.recordDependency(newNode.src, currentScript);
          }
        }
        return originalInsertBefore.call(this, newNode, referenceNode);
      };
    }

    monitorPerformance() {
      if (!window.PerformanceObserver) return;
      
      const self = this;
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.initiatorType === 'script') {
              const initiator = self.findScriptInitiator(entry.name);
              if (initiator) {
                self.recordDependency(entry.name, initiator);
              }
            }
          }
        });
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {}
    }
  }

  // ============================================================================
  // SCRIPT CLASSIFIER MODULE
  // ============================================================================
  
  class ScriptClassifier {
    constructor() {
      this.trackingDomains = [
        'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
        'facebook.net', 'connect.facebook.net', 'analytics.twitter.com',
        'scorecardresearch.com', 'quantserve.com', 'hotjar.com',
        'mouseflow.com', 'crazyegg.com', 'mixpanel.com', 'segment.com',
        'amplitude.com', 'heap.io', 'fullstory.com', 'logrocket.com'
      ];

      this.adDomains = [
        'googlesyndication.com', 'adservice.google.com', 'doubleclick.net',
        'advertising.com', 'adsystem.com', 'adnxs.com', 'rubiconproject.com',
        'pubmatic.com', 'openx.net', 'criteo.com', 'outbrain.com', 'taboola.com'
      ];

      this.cdnDomains = [
        'cloudflare.com', 'jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com',
        'ajax.googleapis.com', 'code.jquery.com', 'stackpath.bootstrapcdn.com',
        'maxcdn.bootstrapcdn.com', 'cdn.jsdelivr.net'
      ];
    }

    classify(url, scriptOrigin, pageOrigin, content) {
      if (this.trackingDomains.some(domain => url.includes(domain))) return 'Tracking';
      if (this.adDomains.some(domain => url.includes(domain))) return 'Ads';

      const urlLower = url.toLowerCase();
      
      if (urlLower.match(/analytics|tracking|tracker|pixel|beacon|telemetry|metrics/)) return 'Tracking';
      if (urlLower.match(/\bad[sv]?[_.-]|advertisement|banner|sponsor/)) return 'Ads';
      if (urlLower.match(/jquery|bootstrap|react|vue|angular|animation|carousel|slider|modal|tooltip|dropdown/)) return 'UX';
      if (urlLower.match(/main|app|core|bundle|vendor|polyfill|runtime|chunk/)) return 'Functional';

      if (content) {
        const suspiciousPatterns = [
          /canvas.*fingerprint/i, /webgl.*fingerprint/i, /audiocontext/i,
          /navigator\.plugins/i, /screen\.(width|height)/i, /navigator\.userAgent/i,
          /document\.cookie/i, /localStorage\.getItem/i, /btoa|atob/i
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(content))) return 'Suspicious';
        if (content.match(/google.*analytics|ga\(|gtag\(|fbq\(/i)) return 'Tracking';
      }

      const filename = url.split('/').pop().split('?')[0];
      if (this.calculateEntropy(filename) > 4.5) return 'Suspicious';

      if (scriptOrigin !== pageOrigin && !this.cdnDomains.some(domain => url.includes(domain))) return 'Unknown';
      if (this.cdnDomains.some(domain => url.includes(domain))) return 'Functional';
      if (scriptOrigin === pageOrigin) return 'Functional';

      return 'Unknown';
    }

    calculateEntropy(str) {
      const len = str.length;
      const frequencies = {};
      
      for (let i = 0; i < len; i++) {
        frequencies[str[i]] = (frequencies[str[i]] || 0) + 1;
      }
      
      let entropy = 0;
      for (const char in frequencies) {
        const p = frequencies[char] / len;
        entropy -= p * Math.log2(p);
      }
      
      return entropy;
    }
  }

  // ============================================================================
  // MAIN ORCHESTRATOR
  // ============================================================================

  const behaviorMonitor = new BehaviorMonitor();
  const dependencyTracker = new DependencyTracker();
  const scriptClassifier = new ScriptClassifier();

  let delayedScriptsConfig = {};
  let userInteracted = false;
  let userScrolled = false;

  behaviorMonitor.start();
  dependencyTracker.start();

  // Track user interactions for delayed execution
  document.addEventListener('click', () => { userInteracted = true; }, { once: true, capture: true });
  document.addEventListener('scroll', () => { userScrolled = true; }, { once: true, capture: true });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scanScripts') {
      sendResponse({ scripts: discoverAllScripts() });
    } else if (request.action === 'getBehaviorFlags') {
      sendResponse({ flags: behaviorMonitor.getFlags() });
    } else if (request.action === 'getDependencies') {
      sendResponse({ dependencies: dependencyTracker.getDependencies() });
    } else if (request.action === 'permissionResponse') {
      behaviorMonitor.handlePermissionResponse(
        request.requestId,
        request.decision,
        request.scriptUrl,
        request.actionType
      );
      sendResponse({ success: true });
    } else if (request.action === 'setPermissionPromptEnabled') {
      behaviorMonitor.setPermissionPromptEnabled(request.enabled);
      sendResponse({ success: true });
    } else if (request.action === 'updateDelayedScripts') {
      delayedScriptsConfig = request.delayedScripts;
      sendResponse({ success: true });
    }
    return true;
  });

  // Load delayed scripts config from storage
  chrome.storage.sync.get(['delayedScripts'], function(data) {
    if (data.delayedScripts) {
      delayedScriptsConfig = data.delayedScripts;
    }
  });

  function discoverAllScripts() {
    const scripts = [];
    const pageOrigin = window.location.origin;
    const performanceEntries = performance.getEntriesByType('resource');
    const currentFlags = behaviorMonitor.getFlags();

    // External Scripts
    document.querySelectorAll('script[src]').forEach((script, index) => {
      const src = script.src;
      const scriptOrigin = new URL(src).origin;
      const perfEntry = performanceEntries.find(e => e.name === src);
      
      scripts.push({
        id: generateScriptId(src, 'external', index),
        url: src,
        source: scriptOrigin === pageOrigin ? 'First Party' : 'Third Party',
        type: script.type === 'module' ? 'module' : 'external',
        timing: perfEntry ? `${Math.round(perfEntry.duration)}ms` : 'N/A',
        size: perfEntry ? formatBytes(Math.round(perfEntry.transferSize || 0)) : 'N/A',
        state: 'active',
        category: scriptClassifier.classify(src, scriptOrigin, pageOrigin, null),
        behaviors: currentFlags[src] || [],
        dependency: dependencyTracker.getDependencyInfo(src)
      });
    });

    // Inline Scripts
    document.querySelectorAll('script:not([src])').forEach((script, index) => {
      if (script.textContent.trim()) {
        const content = script.textContent;
        const hash = simpleHash(content);
        const inlineId = `inline-${hash}`;

        scripts.push({
          id: generateScriptId(hash, 'inline', index),
          url: inlineId,
          source: 'First Party',
          type: 'inline',
          timing: 'N/A',
          size: formatBytes(new Blob([content]).size),
          state: 'active',
          category: scriptClassifier.classify(inlineId, pageOrigin, pageOrigin, content),
          behaviors: currentFlags[inlineId] || [],
          dependency: dependencyTracker.getDependencyInfo(inlineId)
        });
      }
    });

    // Dynamic Scripts
    performanceEntries.filter(e => e.initiatorType === 'script' && e.name.match(/\.js(\?|$)/))
      .forEach((entry, index) => {
        const url = entry.name;
        const scriptOrigin = new URL(url).origin;

        scripts.push({
          id: generateScriptId(url, 'dynamic', index),
          url: url,
          source: scriptOrigin === pageOrigin ? 'First Party' : 'Third Party',
          type: 'dynamic',
          timing: `${Math.round(entry.duration)}ms`,
          size: formatBytes(Math.round(entry.transferSize || 0)),
          state: 'active',
          category: scriptClassifier.classify(url, scriptOrigin, pageOrigin, null),
          behaviors: currentFlags[url] || [],
          dependency: dependencyTracker.getDependencyInfo(url)
        });
      });

    // WASM
    performanceEntries.filter(e => e.name.match(/\.wasm(\?|$)/))
      .forEach((entry, index) => {
        scripts.push({
          id: generateScriptId(entry.name, 'wasm', index),
          url: entry.name,
          source: 'WASM',
          type: 'wasm',
          timing: `${Math.round(entry.duration)}ms`,
          size: formatBytes(Math.round(entry.transferSize || 0)),
          state: 'active',
          category: 'Suspicious',
          behaviors: currentFlags[entry.name] || [],
          dependency: dependencyTracker.getDependencyInfo(entry.name)
        });
      });

    return scripts;
  }

  function generateScriptId(identifier, type, index) {
    return `${type}-${simpleHash(identifier)}-${index}`;
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
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
