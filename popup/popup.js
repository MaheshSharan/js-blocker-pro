// popup/popup.js
document.addEventListener('DOMContentLoaded', function() {
  // Main view elements
  const jsToggle = document.getElementById('jsToggle');
  const status = document.getElementById('status');
  const permissionToggle = document.getElementById('permissionToggle');
  const permissionStatus = document.getElementById('permissionStatus');
  const blockedScripts = document.getElementById('blockedScripts');
  const saveBlockedScripts = document.getElementById('saveBlockedScripts');
  const saveMessage = document.getElementById('saveMessage');
  
  // View elements
  const mainView = document.getElementById('mainView');
  const scanView = document.getElementById('scanView');
  
  // Scan view elements
  const scanBtn = document.getElementById('scanBtn');
  const backBtn = document.getElementById('backBtn');
  const controlMode = document.getElementById('controlMode');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const disableSelectedBtn = document.getElementById('disableSelectedBtn');
  const allowSelectedBtn = document.getElementById('allowSelectedBtn');
  const delaySelectedBtn = document.getElementById('delaySelectedBtn');
  const scanStatus = document.getElementById('scanStatus');
  const scriptTableBody = document.getElementById('scriptTableBody');
  
  // Delay panel elements
  const delayPanel = document.getElementById('delayPanel');
  const closeDelayPanel = document.getElementById('closeDelayPanel');
  const applyDelayBtn = document.getElementById('applyDelayBtn');
  const delaySeconds = document.getElementById('delaySeconds');
  
  // AI and Policy elements
  const aiSummary = document.getElementById('aiSummary');
  const togglePolicyBuilder = document.getElementById('togglePolicyBuilder');
  const policyForm = document.getElementById('policyForm');
  const applyPolicyBtn = document.getElementById('applyPolicyBtn');

  let discoveredScripts = [];
  let disabledScriptIds = new Set();
  let delayedScripts = new Map(); // scriptId -> {type, seconds}
  let currentMode = 'normal';

  // Load initial state
  chrome.storage.sync.get(['jsDisabled', 'blockedScripts', 'disabledScriptIds', 'controlMode', 'permissionPromptsEnabled', 'delayedScripts'], function(data) {
    jsToggle.checked = data.jsDisabled || false;
    status.textContent = data.jsDisabled ? 'JavaScript Disabled' : 'JavaScript Enabled';
    
    const promptsEnabled = data.permissionPromptsEnabled !== false; // Default true
    permissionToggle.checked = promptsEnabled;
    permissionStatus.textContent = promptsEnabled ? 'Permission Prompts Enabled' : 'Permission Prompts Disabled';
    
    blockedScripts.value = (data.blockedScripts || []).join('\n');
    disabledScriptIds = new Set(data.disabledScriptIds || []);
    currentMode = data.controlMode || 'normal';
    if (controlMode) controlMode.value = currentMode;
    
    // Load delayed scripts
    if (data.delayedScripts) {
      delayedScripts = new Map(Object.entries(data.delayedScripts));
    }
  });

  // Main view functionality
  jsToggle.addEventListener('change', function() {
    const isDisabled = jsToggle.checked;
    chrome.storage.sync.set({jsDisabled: isDisabled});
    status.textContent = isDisabled ? 'JavaScript Disabled' : 'JavaScript Enabled';
    chrome.runtime.sendMessage({action: "toggleJS", value: isDisabled});
  });

  permissionToggle.addEventListener('change', function() {
    const enabled = permissionToggle.checked;
    chrome.storage.sync.set({permissionPromptsEnabled: enabled});
    permissionStatus.textContent = enabled ? 'Permission Prompts Enabled' : 'Permission Prompts Disabled';
    
    // Notify all tabs
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'setPermissionPromptEnabled',
          enabled: enabled
        }).catch(() => {}); // Ignore errors for tabs without content script
      });
    });
    
    showMessage(enabled ? 'Permission prompts enabled' : 'Permission prompts disabled', 'success');
  });

  saveBlockedScripts.addEventListener('click', function() {
    const scripts = blockedScripts.value.split('\n').filter(s => s.trim() !== '');
    chrome.storage.sync.set({blockedScripts: scripts}, function() {
      chrome.runtime.sendMessage({action: "updateBlockedScripts", value: scripts});
      showMessage('Blocked scripts saved successfully!', 'success');
    });
  });

  // Scan functionality
  scanBtn.addEventListener('click', function() {
    showScanView();
    
    // Get current tab and re-inject content script for fresh scan
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) {
        scanStatus.textContent = 'Error: No active tab';
        return;
      }

      const tabId = tabs[0].id;
      
      // Re-inject content script to ensure it's loaded
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }).then(() => {
        // Small delay to let content script initialize
        setTimeout(() => {
          performScan();
        }, 500);
      }).catch((error) => {
        // Content script might already be injected, just scan
        performScan();
      });
    });
  });

  backBtn.addEventListener('click', function() {
    showMainView();
  });

  controlMode.addEventListener('change', function() {
    currentMode = controlMode.value;
    chrome.storage.sync.set({ controlMode: currentMode });
    applyModeRules();
    showScanMessage(`Switched to ${getModeDisplayName(currentMode)} mode`, 'success');
  });

  function getModeDisplayName(mode) {
    const names = {
      'normal': 'Normal',
      'banking': 'Banking (Strict)',
      'social': 'Social (Balanced)',
      'privacy': 'Privacy',
      'developer': 'Developer (Relaxed)'
    };
    return names[mode] || mode;
  }

  function applyModeRules() {
    if (discoveredScripts.length === 0) return;

    // Clear current selections
    disabledScriptIds.clear();

    discoveredScripts.forEach(script => {
      if (shouldBlockInMode(script, currentMode)) {
        disabledScriptIds.add(script.id);
      }
    });

    saveDisabledScripts();
    updateTableDisplay();
  }

  function shouldBlockInMode(script, mode) {
    switch (mode) {
      case 'banking':
        // Strict: Block all tracking, ads, suspicious, and third-party
        return script.category === 'Tracking' ||
               script.category === 'Ads' ||
               script.category === 'Suspicious' ||
               script.source === 'Third Party';

      case 'social':
        // Balanced: Block tracking and ads, allow functional third-party
        return script.category === 'Tracking' ||
               script.category === 'Ads' ||
               script.category === 'Suspicious';

      case 'privacy':
        // Block all third-party scripts
        return script.source === 'Third Party';

      case 'developer':
        // Relaxed: Only block obvious ads
        return script.category === 'Ads';

      case 'normal':
      default:
        // Don't auto-block anything
        return false;
    }
  }

  selectAllCheckbox.addEventListener('change', function() {
    const checkboxes = scriptTableBody.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = selectAllCheckbox.checked;
      updateRowSelection(cb);
    });
  });

  selectAllBtn.addEventListener('click', function() {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.dispatchEvent(new Event('change'));
  });

  disableSelectedBtn.addEventListener('click', function() {
    const selected = getSelectedScripts();
    if (selected.length === 0) {
      showScanMessage('No scripts selected', 'error');
      return;
    }
    
    selected.forEach(script => {
      disabledScriptIds.add(script.id);
    });
    
    saveDisabledScripts();
    updateTableDisplay();
    showScanMessage(`Disabled ${selected.length} script(s)`, 'success');
  });

  allowSelectedBtn.addEventListener('click', function() {
    const selected = getSelectedScripts();
    if (selected.length === 0) {
      showScanMessage('No scripts selected', 'error');
      return;
    }
    
    selected.forEach(script => {
      disabledScriptIds.delete(script.id);
      delayedScripts.delete(script.id);
    });
    
    saveDisabledScripts();
    saveDelayedScripts();
    updateTableDisplay();
    showScanMessage(`Allowed ${selected.length} script(s)`, 'success');
  });

  delaySelectedBtn.addEventListener('click', function() {
    const selected = getSelectedScripts();
    if (selected.length === 0) {
      showScanMessage('No scripts selected', 'error');
      return;
    }
    delayPanel.classList.remove('hidden');
  });

  closeDelayPanel.addEventListener('click', function() {
    delayPanel.classList.add('hidden');
  });

  applyDelayBtn.addEventListener('click', function() {
    const selected = getSelectedScripts();
    if (selected.length === 0) {
      showScanMessage('No scripts selected', 'error');
      return;
    }

    const delayType = document.querySelector('input[name="delayType"]:checked').value;
    const seconds = delayType === 'time' ? parseInt(delaySeconds.value) || 5 : 0;

    selected.forEach(script => {
      delayedScripts.set(script.id, { type: delayType, seconds: seconds });
      // Remove from disabled if it was blocked
      disabledScriptIds.delete(script.id);
    });

    saveDelayedScripts();
    saveDisabledScripts();
    updateTableDisplay();
    delayPanel.classList.add('hidden');
    showScanMessage(`Applied delay to ${selected.length} script(s)`, 'success');
  });

  togglePolicyBuilder.addEventListener('click', function() {
    policyForm.classList.toggle('hidden');
  });

  applyPolicyBtn.addEventListener('click', function() {
    const conditions = Array.from(document.querySelectorAll('input[name="condition"]:checked'))
      .map(cb => cb.value);

    if (conditions.length === 0) {
      showScanMessage('Select at least one condition', 'error');
      return;
    }

    let blockedCount = 0;
    discoveredScripts.forEach(script => {
      if (matchesPolicy(script, conditions)) {
        disabledScriptIds.add(script.id);
        blockedCount++;
      }
    });

    saveDisabledScripts();
    updateTableDisplay();
    showScanMessage(`Policy applied: blocked ${blockedCount} script(s)`, 'success');
  });

  function matchesPolicy(script, conditions) {
    for (const condition of conditions) {
      if (condition === 'thirdParty' && script.source === 'Third Party') return true;
      if (condition === 'tracking' && script.category === 'Tracking') return true;
      if (condition === 'ads' && script.category === 'Ads') return true;
      if (condition === 'fingerprinting') {
        const behaviors = script.behaviors || [];
        if (behaviors.some(b => b.includes('fingerprint'))) return true;
      }
      if (condition === 'lowTrust' && script.trustScore && script.trustScore.score < 30) return true;
      if (condition === 'beforeInteraction' && script.type !== 'inline') return true;
    }
    return false;
  }

  function showMainView() {
    mainView.classList.remove('hidden');
    scanView.classList.add('hidden');
  }

  function showScanView() {
    mainView.classList.add('hidden');
    scanView.classList.remove('hidden');
  }

  function performScan() {
    scanStatus.textContent = 'Scanning...';
    scriptTableBody.innerHTML = '';
    aiSummary.classList.remove('show');
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) {
        scanStatus.textContent = 'Error: No active tab';
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, {action: 'scanScripts'}, function(response) {
        if (chrome.runtime.lastError) {
          scanStatus.textContent = 'Error: Unable to scan. Please refresh the page.';
          return;
        }

        if (response && response.scripts) {
          discoveredScripts = response.scripts;
          
          // Apply mode rules if not in normal mode
          if (currentMode !== 'normal') {
            applyModeRules();
          }
          
          displayScripts(discoveredScripts);
          displayAISummary(discoveredScripts);
          scanStatus.textContent = `Found ${discoveredScripts.length} script(s) - Mode: ${getModeDisplayName(currentMode)}`;
        } else {
          scanStatus.textContent = 'No scripts found';
        }
      });
    });
  }

  function displayAISummary(scripts) {
    const recommendations = {
      safe: 0,
      neutral: 0,
      caution: 0,
      block: 0
    };

    scripts.forEach(script => {
      if (script.trustScore) {
        recommendations[script.trustScore.recommendation]++;
      }
    });

    aiSummary.innerHTML = `
      <div class="ai-summary-title">🤖 AI Analysis</div>
      <div class="ai-stats">
        <div class="ai-stat">
          <span class="ai-stat-label">Safe</span>
          <span class="ai-stat-value stat-safe">${recommendations.safe}</span>
        </div>
        <div class="ai-stat">
          <span class="ai-stat-label">Neutral</span>
          <span class="ai-stat-value">${recommendations.neutral}</span>
        </div>
        <div class="ai-stat">
          <span class="ai-stat-label">Caution</span>
          <span class="ai-stat-value stat-caution">${recommendations.caution}</span>
        </div>
        <div class="ai-stat">
          <span class="ai-stat-label">Block</span>
          <span class="ai-stat-value stat-block">${recommendations.block}</span>
        </div>
      </div>
    `;
    aiSummary.classList.add('show');
  }

  function displayScripts(scripts) {
    scriptTableBody.innerHTML = '';
    
    scripts.forEach(script => {
      const row = document.createElement('tr');
      const isDisabled = disabledScriptIds.has(script.id);
      const isDelayed = delayedScripts.has(script.id);
      const behaviorBadges = getBehaviorBadges(script.behaviors || []);
      const dependencyInfo = getDependencyInfo(script);
      const execInfo = getExecInfo(script.id, script.type);
      const trustBadge = getTrustBadge(script.trustScore);
      
      row.innerHTML = `
        <td><input type="checkbox" data-script-id="${script.id}"></td>
        <td class="script-name" title="${script.url}">${getScriptName(script.url)}</td>
        <td class="script-source">${script.source}</td>
        <td><span class="script-type type-${script.type}">${script.type}</span></td>
        <td><span class="category-badge category-${script.category.toLowerCase()}">${script.category}</span></td>
        <td>${trustBadge}</td>
        <td class="behavior-cell">${behaviorBadges}</td>
        <td class="dependency-cell">${dependencyInfo}</td>
        <td>${execInfo}</td>
        <td><span class="script-status ${isDisabled ? 'status-blocked' : 'status-active'}">${isDisabled ? 'Blocked' : isDelayed ? 'Delayed' : 'Active'}</span></td>
      `;
      
      const checkbox = row.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', function() {
        updateRowSelection(checkbox);
      });

      // Add click handler for dependency expansion
      const depCell = row.querySelector('.dependency-cell');
      if (script.dependency && script.dependency.childCount > 0) {
        depCell.style.cursor = 'pointer';
        depCell.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleDependencyTree(row, script);
        });
      }
      
      scriptTableBody.appendChild(row);
    });
  }

  function getTrustBadge(trustScore) {
    if (!trustScore) return '<span class="trust-badge trust-neutral">?</span>';
    
    const score = trustScore.score;
    const rec = trustScore.recommendation;
    const title = trustScore.factors.join('\n');
    
    let className = 'trust-neutral';
    if (rec === 'safe') className = 'trust-safe';
    else if (rec === 'caution') className = 'trust-caution';
    else if (rec === 'block') className = 'trust-block';
    
    return `<span class="trust-badge ${className}" title="${title}">${score}</span>`;
  }

  function getExecInfo(scriptId, scriptType) {
    const delay = delayedScripts.get(scriptId);
    
    if (scriptType === 'wasm') {
      return '<span class="wasm-indicator">WASM</span>';
    }
    
    if (!delay) {
      return '<span class="exec-badge exec-immediate">Now</span>';
    }

    if (delay.type === 'interaction') {
      return '<span class="exec-badge exec-interaction">👆 Click</span>';
    } else if (delay.type === 'scroll') {
      return '<span class="exec-badge exec-scroll">📜 Scroll</span>';
    } else if (delay.type === 'time') {
      return `<span class="exec-badge exec-delayed">⏱️ ${delay.seconds}s</span>`;
    }

    return '<span class="exec-badge exec-immediate">Now</span>';
  }

  function getDependencyInfo(script) {
    const dep = script.dependency;
    if (!dep) {
      return '<span class="no-deps">—</span>';
    }

    let html = '';
    
    // Show parent indicator
    if (dep.parent) {
      const parentName = getScriptName(dep.parent);
      html += `<span class="dep-parent" title="Loaded by: ${dep.parent}">⬆️</span>`;
    }

    // Show children count
    if (dep.childCount > 0) {
      html += `<span class="dep-children" title="Loads ${dep.childCount} script(s)">⬇️${dep.childCount}</span>`;
    }

    return html || '<span class="no-deps">—</span>';
  }

  function toggleDependencyTree(row, script) {
    const existingTree = row.nextElementSibling;
    
    // If tree is already shown, hide it
    if (existingTree && existingTree.classList.contains('dependency-tree-row')) {
      existingTree.remove();
      return;
    }

    // Create tree row
    const treeRow = document.createElement('tr');
    treeRow.classList.add('dependency-tree-row');
    
    const treeCell = document.createElement('td');
    treeCell.colSpan = 10;
    
    const treeContent = document.createElement('div');
    treeContent.classList.add('dependency-tree');
    
    // Build tree HTML
    const dep = script.dependency;
    let treeHTML = '<div class="tree-header">📊 Dependency Chain:</div>';
    
    if (dep.parent) {
      treeHTML += `<div class="tree-parent">⬆️ Parent: <span class="tree-script">${getScriptName(dep.parent)}</span></div>`;
    }
    
    if (dep.children && dep.children.length > 0) {
      treeHTML += '<div class="tree-children">⬇️ Children:</div>';
      treeHTML += '<ul class="tree-list">';
      dep.children.forEach(child => {
        treeHTML += `<li class="tree-item">${getScriptName(child)}</li>`;
      });
      treeHTML += '</ul>';
    }
    
    treeContent.innerHTML = treeHTML;
    treeCell.appendChild(treeContent);
    treeRow.appendChild(treeCell);
    
    // Insert after current row
    row.parentNode.insertBefore(treeRow, row.nextSibling);
  }

  function getBehaviorBadges(behaviors) {
    if (!behaviors || behaviors.length === 0) {
      return '<span class="no-behavior">—</span>';
    }

    const flagMap = {
      'fingerprint-canvas': '🟣',
      'fingerprint-webgl': '🟣',
      'fingerprint-audio': '🟣',
      'storage-access': '🟢',
      'storage-abuse': '🟠',
      'beacon': '🟠',
      'hidden-iframe': '🔴',
      'webrtc-probe': '🔴',
      'excessive-timers': '🔴',
      'wasm-usage': '🔵'
    };

    const titleMap = {
      'fingerprint-canvas': 'Canvas Fingerprinting',
      'fingerprint-webgl': 'WebGL Fingerprinting',
      'fingerprint-audio': 'Audio Fingerprinting',
      'storage-access': 'Storage Access',
      'storage-abuse': 'Storage Abuse',
      'beacon': 'Beaconing',
      'hidden-iframe': 'Hidden Iframe',
      'webrtc-probe': 'WebRTC Probing',
      'excessive-timers': 'Excessive Timers',
      'wasm-usage': 'WASM Usage'
    };

    const uniqueBehaviors = [...new Set(behaviors)];
    const badges = uniqueBehaviors.map(behavior => {
      const flag = flagMap[behavior] || '⚠️';
      const title = titleMap[behavior] || behavior;
      return `<span class="behavior-flag" title="${title}">${flag}</span>`;
    });

    return badges.join(' ');
  }

  function updateRowSelection(checkbox) {
    const row = checkbox.closest('tr');
    if (checkbox.checked) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  }

  function getSelectedScripts() {
    const checkboxes = scriptTableBody.querySelectorAll('input[type="checkbox"]:checked');
    const selected = [];
    
    checkboxes.forEach(cb => {
      const scriptId = cb.dataset.scriptId;
      const script = discoveredScripts.find(s => s.id === scriptId);
      if (script) {
        selected.push(script);
      }
    });
    
    return selected;
  }

  function getScriptName(url) {
    if (url.startsWith('inline-')) {
      return url;
    }
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || urlObj.hostname;
    } catch {
      return url;
    }
  }

  function saveDisabledScripts() {
    const disabledArray = Array.from(disabledScriptIds);
    chrome.storage.sync.set({disabledScriptIds: disabledArray});
    
    // Convert script IDs to URL patterns for blocking
    const urlsToBlock = discoveredScripts
      .filter(s => disabledScriptIds.has(s.id))
      .map(s => s.url)
      .filter(url => !url.startsWith('inline-')); // Can't block inline via URL
    
    chrome.runtime.sendMessage({
      action: "updateBlockedScripts",
      value: urlsToBlock
    });
  }

  function saveDelayedScripts() {
    const delayedObj = {};
    delayedScripts.forEach((value, key) => {
      delayedObj[key] = value;
    });
    chrome.storage.sync.set({delayedScripts: delayedObj});
    
    // Send to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateDelayedScripts',
          delayedScripts: delayedObj
        }).catch(() => {});
      }
    });
  }

  function updateTableDisplay() {
    const rows = scriptTableBody.querySelectorAll('tr');
    rows.forEach(row => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const scriptId = checkbox.dataset.scriptId;
      const statusSpan = row.querySelector('.script-status');
      const isDisabled = disabledScriptIds.has(scriptId);
      const isDelayed = delayedScripts.has(scriptId);
      
      statusSpan.textContent = isDisabled ? 'Blocked' : isDelayed ? 'Delayed' : 'Active';
      statusSpan.className = `script-status ${isDisabled ? 'status-blocked' : 'status-active'}`;
      
      // Update exec column
      const script = discoveredScripts.find(s => s.id === scriptId);
      if (script) {
        const execCell = row.cells[7]; // Exec column
        execCell.innerHTML = getExecInfo(scriptId, script.type);
      }
    });
  }

  function showScanMessage(text, type) {
    scanStatus.textContent = text;
    scanStatus.style.backgroundColor = type === 'success' ? '#2a5d2a' : '#5d2a2a';
    setTimeout(() => {
      scanStatus.style.backgroundColor = '#2a2a2a';
    }, 2000);
  }

  function showMessage(text, type) {
    saveMessage.textContent = text;
    saveMessage.className = `message show ${type}`;
    setTimeout(() => {
      saveMessage.className = 'message';
    }, 3000);
  }
});