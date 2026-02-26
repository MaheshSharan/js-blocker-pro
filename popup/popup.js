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
  const rescanBtn = document.getElementById('rescanBtn');
  const controlMode = document.getElementById('controlMode');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const disableSelectedBtn = document.getElementById('disableSelectedBtn');
  const allowSelectedBtn = document.getElementById('allowSelectedBtn');
  const scanStatus = document.getElementById('scanStatus');
  const scriptTableBody = document.getElementById('scriptTableBody');

  let discoveredScripts = [];
  let disabledScriptIds = new Set();
  let currentMode = 'normal';

  // Load initial state
  chrome.storage.sync.get(['jsDisabled', 'blockedScripts', 'disabledScriptIds', 'controlMode', 'permissionPromptsEnabled'], function(data) {
    jsToggle.checked = data.jsDisabled || false;
    status.textContent = data.jsDisabled ? 'JavaScript Disabled' : 'JavaScript Enabled';
    
    const promptsEnabled = data.permissionPromptsEnabled !== false; // Default true
    permissionToggle.checked = promptsEnabled;
    permissionStatus.textContent = promptsEnabled ? 'Permission Prompts Enabled' : 'Permission Prompts Disabled';
    
    blockedScripts.value = (data.blockedScripts || []).join('\n');
    disabledScriptIds = new Set(data.disabledScriptIds || []);
    currentMode = data.controlMode || 'normal';
    if (controlMode) controlMode.value = currentMode;
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
    performScan();
  });

  backBtn.addEventListener('click', function() {
    showMainView();
  });

  rescanBtn.addEventListener('click', function() {
    performScan();
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
    });
    
    saveDisabledScripts();
    updateTableDisplay();
    showScanMessage(`Allowed ${selected.length} script(s)`, 'success');
  });

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
          scanStatus.textContent = `Found ${discoveredScripts.length} script(s) - Mode: ${getModeDisplayName(currentMode)}`;
        } else {
          scanStatus.textContent = 'No scripts found';
        }
      });
    });
  }

  function displayScripts(scripts) {
    scriptTableBody.innerHTML = '';
    
    scripts.forEach(script => {
      const row = document.createElement('tr');
      const isDisabled = disabledScriptIds.has(script.id);
      const behaviorBadges = getBehaviorBadges(script.behaviors || []);
      const dependencyInfo = getDependencyInfo(script);
      
      row.innerHTML = `
        <td><input type="checkbox" data-script-id="${script.id}"></td>
        <td class="script-name" title="${script.url}">${getScriptName(script.url)}</td>
        <td class="script-source">${script.source}</td>
        <td><span class="script-type type-${script.type}">${script.type}</span></td>
        <td><span class="category-badge category-${script.category.toLowerCase()}">${script.category}</span></td>
        <td class="behavior-cell">${behaviorBadges}</td>
        <td class="dependency-cell">${dependencyInfo}</td>
        <td>${script.timing}</td>
        <td>${script.size}</td>
        <td><span class="script-status ${isDisabled ? 'status-blocked' : 'status-active'}">${isDisabled ? 'Blocked' : 'Active'}</span></td>
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

  function updateTableDisplay() {
    const rows = scriptTableBody.querySelectorAll('tr');
    rows.forEach(row => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const scriptId = checkbox.dataset.scriptId;
      const statusSpan = row.querySelector('.script-status');
      const isDisabled = disabledScriptIds.has(scriptId);
      
      statusSpan.textContent = isDisabled ? 'Blocked' : 'Active';
      statusSpan.className = `script-status ${isDisabled ? 'status-blocked' : 'status-active'}`;
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