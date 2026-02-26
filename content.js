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
        integrity: script.integrity || null
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
          contentPreview: content.substring(0, 100)
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
        state: 'active'
      });
    });

    // 4. Detect WASM (WebAssembly)
    const wasmEntries = performanceEntries.filter(entry => 
      entry.name.match(/\.wasm(\?|$)/)
    );

    wasmEntries.forEach((entry, index) => {
      scripts.push({
        id: generateScriptId(entry.name, 'wasm', index),
        url: entry.name,
        source: 'WASM',
        type: 'wasm',
        timing: `${Math.round(entry.duration)}ms`,
        size: formatBytes(Math.round(entry.transferSize || 0)),
        state: 'active'
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
