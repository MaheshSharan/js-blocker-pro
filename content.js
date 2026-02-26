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

    // PHASE 9: Local AI Suggestion Layer
    calculateTrustScore(scriptData) {
      let score = 50; // Start neutral
      const factors = [];

      // Category scoring
      if (scriptData.category === 'Functional') {
        score += 20;
        factors.push('Functional script (+20)');
      } else if (scriptData.category === 'UX') {
        score += 10;
        factors.push('UX enhancement (+10)');
      } else if (scriptData.category === 'Tracking') {
        score -= 30;
        factors.push('Tracking script (-30)');
      } else if (scriptData.category === 'Ads') {
        score -= 35;
        factors.push('Advertisement (-35)');
      } else if (scriptData.category === 'Suspicious') {
        score -= 40;
        factors.push('Suspicious behavior (-40)');
      }

      // Source scoring
      if (scriptData.source === 'First Party') {
        score += 15;
        factors.push('First-party (+15)');
      } else if (scriptData.source === 'Third Party') {
        score -= 10;
        factors.push('Third-party (-10)');
      }

      // Behavior flags scoring
      const behaviors = scriptData.behaviors || [];
      if (behaviors.includes('fingerprint-canvas') || behaviors.includes('fingerprint-webgl') || behaviors.includes('fingerprint-audio')) {
        score -= 25;
        factors.push('Fingerprinting detected (-25)');
      }
      if (behaviors.includes('storage-abuse')) {
        score -= 15;
        factors.push('Storage abuse (-15)');
      }
      if (behaviors.includes('hidden-iframe')) {
        score -= 20;
        factors.push('Hidden iframe (-20)');
      }
      if (behaviors.includes('webrtc-probe')) {
        score -= 20;
        factors.push('WebRTC probing (-20)');
      }
      if (behaviors.includes('beacon')) {
        score -= 10;
        factors.push('Background beaconing (-10)');
      }
      if (behaviors.includes('wasm-usage')) {
        score -= 15;
        factors.push('WASM usage (-15)');
      }

      // Dependency scoring
      if (scriptData.dependency && scriptData.dependency.parent) {
        score -= 5;
        factors.push('Loaded by another script (-5)');
      }
      if (scriptData.dependency && scriptData.dependency.childCount > 3) {
        score -= 10;
        factors.push('Loads many scripts (-10)');
      }

      // Type scoring
      if (scriptData.type === 'inline') {
        score += 5;
        factors.push('Inline script (+5)');
      } else if (scriptData.type === 'dynamic') {
        score -= 5;
        factors.push('Dynamically loaded (-5)');
      } else if (scriptData.type === 'wasm') {
        score -= 20;
        factors.push('WebAssembly (-20)');
      }

      // Clamp score between 0-100
      score = Math.max(0, Math.min(100, score));

      return {
        score: score,
        recommendation: this.getRecommendation(score),
        factors: factors
      };
    }

    getRecommendation(score) {
      if (score >= 70) return 'safe';
      if (score >= 40) return 'neutral';
      if (score >= 20) return 'caution';
      return 'block';
    }
  }

  // ============================================================================
  // EXECUTION TIMING CONTROLLER (PHASE 7)
  // ============================================================================

  class ExecutionTimingController {
    constructor() {
      this.delayedScripts = new Map(); // scriptUrl -> {element, config}
      this.delayConfig = {};
      this.userInteracted = false;
      this.userScrolled = false;
      this.originalCreateElement = document.createElement;
      this.originalAppendChild = Node.prototype.appendChild;
      this.originalInsertBefore = Node.prototype.insertBefore;
    }

    start() {
      this.trackUserInteractions();
      this.interceptScriptLoading();
    }

    setDelayConfig(config) {
      this.delayConfig = config;
    }

    trackUserInteractions() {
      const self = this;
      
      // Track first click
      document.addEventListener('click', () => {
        self.userInteracted = true;
        self.executeDelayedScripts('interaction');
      }, { once: true, capture: true });

      // Track first scroll
      document.addEventListener('scroll', () => {
        self.userScrolled = true;
        self.executeDelayedScripts('scroll');
      }, { once: true, capture: true });
    }

    interceptScriptLoading() {
      const self = this;

      // Intercept createElement for script tags
      document.createElement = function(tagName) {
        const element = self.originalCreateElement.call(document, tagName);
        
        if (tagName.toLowerCase() === 'script') {
          // Store original src setter
          const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
          
          Object.defineProperty(element, 'src', {
            set: function(value) {
              const scriptId = self.getScriptId(value);
              const delaySettings = self.delayConfig[scriptId];
              
              if (delaySettings && self.shouldDelay(delaySettings)) {
                // Store script for delayed execution
                self.delayedScripts.set(value, {
                  element: this,
                  config: delaySettings,
                  originalSrc: value
                });
                
                // Don't set src yet - will be set when conditions are met
                return;
              }
              
              // Normal execution
              originalSrcDescriptor.set.call(this, value);
            },
            get: function() {
              return originalSrcDescriptor.get.call(this);
            }
          });
        }
        
        return element;
      };

      // Intercept appendChild
      Node.prototype.appendChild = function(child) {
        if (child.tagName === 'SCRIPT' && child.src) {
          const scriptId = self.getScriptId(child.src);
          const delaySettings = self.delayConfig[scriptId];
          
          if (delaySettings && self.shouldDelay(delaySettings)) {
            // Store for delayed execution
            self.delayedScripts.set(child.src, {
              element: child,
              parent: this,
              config: delaySettings,
              originalSrc: child.src,
              method: 'appendChild'
            });
            
            // Don't append yet
            return child;
          }
        }
        
        return self.originalAppendChild.call(this, child);
      };

      // Intercept insertBefore
      Node.prototype.insertBefore = function(newNode, referenceNode) {
        if (newNode.tagName === 'SCRIPT' && newNode.src) {
          const scriptId = self.getScriptId(newNode.src);
          const delaySettings = self.delayConfig[scriptId];
          
          if (delaySettings && self.shouldDelay(delaySettings)) {
            // Store for delayed execution
            self.delayedScripts.set(newNode.src, {
              element: newNode,
              parent: this,
              referenceNode: referenceNode,
              config: delaySettings,
              originalSrc: newNode.src,
              method: 'insertBefore'
            });
            
            // Don't insert yet
            return newNode;
          }
        }
        
        return self.originalInsertBefore.call(this, newNode, referenceNode);
      };
    }

    getScriptId(url) {
      // Try to match script URL to stored IDs
      // This is a simplified version - in production you'd want better matching
      for (const scriptId in this.delayConfig) {
        if (scriptId.includes(this.simpleHash(url))) {
          return scriptId;
        }
        // Also try direct URL match
        if (url.includes(scriptId) || scriptId.includes(url)) {
          return scriptId;
        }
      }
      return null;
    }

    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    }

    shouldDelay(delaySettings) {
      const type = delaySettings.type;
      
      if (type === 'interaction') {
        return !this.userInteracted;
      } else if (type === 'scroll') {
        return !this.userScrolled;
      } else if (type === 'time') {
        // Time-based delays are always delayed initially
        return true;
      }
      
      return false;
    }

    executeDelayedScripts(triggerType) {
      const scriptsToExecute = [];
      
      this.delayedScripts.forEach((data, url) => {
        const config = data.config;
        
        // Check if this script should execute based on trigger
        if (triggerType === 'interaction' && config.type === 'interaction') {
          scriptsToExecute.push({ url, data });
        } else if (triggerType === 'scroll' && config.type === 'scroll') {
          scriptsToExecute.push({ url, data });
        } else if (triggerType === 'time' && config.type === 'time') {
          scriptsToExecute.push({ url, data });
        }
      });

      // Execute scripts
      scriptsToExecute.forEach(({ url, data }) => {
        this.executeScript(data);
        this.delayedScripts.delete(url);
      });
    }

    executeScript(data) {
      const element = data.element;
      const originalSrc = data.originalSrc;
      
      if (data.method === 'appendChild') {
        // Set src and append
        element.src = originalSrc;
        data.parent.appendChild(element);
      } else if (data.method === 'insertBefore') {
        // Set src and insert
        element.src = originalSrc;
        data.parent.insertBefore(element, data.referenceNode);
      } else {
        // Just set src (for createElement case)
        element.src = originalSrc;
      }
    }

    scheduleTimeBasedDelays() {
      this.delayedScripts.forEach((data, url) => {
        if (data.config.type === 'time') {
          const seconds = data.config.seconds || 5;
          setTimeout(() => {
            if (this.delayedScripts.has(url)) {
              this.executeScript(data);
              this.delayedScripts.delete(url);
            }
          }, seconds * 1000);
        }
      });
    }
  }

  // ============================================================================
  // MAIN ORCHESTRATOR
  // ============================================================================

  const behaviorMonitor = new BehaviorMonitor();
  const dependencyTracker = new DependencyTracker();
  const scriptClassifier = new ScriptClassifier();
  const timingController = new ExecutionTimingController();

  behaviorMonitor.start();
  dependencyTracker.start();
  timingController.start();

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
      timingController.setDelayConfig(request.delayedScripts);
      timingController.scheduleTimeBasedDelays();
      sendResponse({ success: true });
    }
    return true;
  });

  // Load delayed scripts config from storage
  chrome.storage.sync.get(['delayedScripts'], function(data) {
    if (data.delayedScripts) {
      timingController.setDelayConfig(data.delayedScripts);
      timingController.scheduleTimeBasedDelays();
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
      
      const scriptData = {
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
      };

      // Calculate trust score
      scriptData.trustScore = scriptClassifier.calculateTrustScore(scriptData);
      scripts.push(scriptData);
    });

    // Inline Scripts
    document.querySelectorAll('script:not([src])').forEach((script, index) => {
      if (script.textContent.trim()) {
        const content = script.textContent;
        const hash = simpleHash(content);
        const inlineId = `inline-${hash}`;

        const scriptData = {
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
        };

        scriptData.trustScore = scriptClassifier.calculateTrustScore(scriptData);
        scripts.push(scriptData);
      }
    });

    // Dynamic Scripts
    performanceEntries.filter(e => e.initiatorType === 'script' && e.name.match(/\.js(\?|$)/))
      .forEach((entry, index) => {
        const url = entry.name;
        const scriptOrigin = new URL(url).origin;

        const scriptData = {
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
        };

        scriptData.trustScore = scriptClassifier.calculateTrustScore(scriptData);
        scripts.push(scriptData);
      });

    // WASM
    performanceEntries.filter(e => e.name.match(/\.wasm(\?|$)/))
      .forEach((entry, index) => {
        const scriptData = {
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
        };

        scriptData.trustScore = scriptClassifier.calculateTrustScore(scriptData);
        scripts.push(scriptData);
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
