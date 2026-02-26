// permission-prompt.js

document.addEventListener('DOMContentLoaded', function() {
  const scriptName = document.getElementById('scriptName');
  const actionType = document.getElementById('actionType');
  const scriptCategory = document.getElementById('scriptCategory');
  const promptMessage = document.getElementById('promptMessage');
  const blockBtn = document.getElementById('blockBtn');
  const allowOnceBtn = document.getElementById('allowOnceBtn');
  const allowAlwaysBtn = document.getElementById('allowAlwaysBtn');

  // Get permission request data from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const requestData = {
    scriptUrl: urlParams.get('script'),
    action: urlParams.get('action'),
    category: urlParams.get('category'),
    requestId: urlParams.get('requestId')
  };

  // Display request details
  scriptName.textContent = getScriptName(requestData.scriptUrl);
  scriptName.title = requestData.scriptUrl;
  actionType.textContent = getActionDisplayName(requestData.action);
  scriptCategory.textContent = requestData.category || 'Unknown';
  promptMessage.textContent = getActionMessage(requestData.action);

  // Button handlers
  blockBtn.addEventListener('click', function() {
    sendResponse('block');
  });

  allowOnceBtn.addEventListener('click', function() {
    sendResponse('allow-once');
  });

  allowAlwaysBtn.addEventListener('click', function() {
    sendResponse('allow-always');
  });

  function sendResponse(decision) {
    chrome.runtime.sendMessage({
      action: 'permissionResponse',
      requestId: requestData.requestId,
      decision: decision,
      scriptUrl: requestData.scriptUrl,
      actionType: requestData.action
    }, function() {
      window.close();
    });
  }

  function getScriptName(url) {
    if (!url) return 'Unknown';
    if (url.startsWith('inline-')) return 'Inline Script';
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').pop() || urlObj.hostname;
    } catch {
      return url;
    }
  }

  function getActionDisplayName(action) {
    const names = {
      'canvas-read': 'Canvas Fingerprinting',
      'webgl-read': 'WebGL Fingerprinting',
      'audio-fingerprint': 'Audio Fingerprinting',
      'webrtc-probe': 'WebRTC Connection',
      'wasm-load': 'WebAssembly Loading',
      'hidden-iframe': 'Hidden Iframe Creation',
      'beacon': 'Background Beacon'
    };
    return names[action] || action;
  }

  function getActionMessage(action) {
    const messages = {
      'canvas-read': 'This script is attempting to read canvas data, which can be used for fingerprinting your browser.',
      'webgl-read': 'This script is attempting to access WebGL information, which can be used for device fingerprinting.',
      'audio-fingerprint': 'This script is attempting to use AudioContext, which can be used for audio fingerprinting.',
      'webrtc-probe': 'This script is attempting to create a WebRTC connection, which can reveal your real IP address.',
      'wasm-load': 'This script is attempting to load WebAssembly code, which can be used for cryptomining or malicious purposes.',
      'hidden-iframe': 'This script is attempting to create a hidden iframe, which can be used for tracking or clickjacking.',
      'beacon': 'This script is attempting to send data in the background, which can be used for tracking.'
    };
    return messages[action] || 'This script is attempting a potentially suspicious action.';
  }
});
