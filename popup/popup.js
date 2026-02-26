// popup/popup.js
document.addEventListener('DOMContentLoaded', function() {
  // Main view elements
  const jsToggle = document.getElementById('jsToggle');
  const status = document.getElementById('status');
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
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const disableSelectedBtn = document.getElementById('disableSelectedBtn');
  const allowSelectedBtn = document.getElementById('allowSelectedBtn');
  const scanStatus = document.getElementById('scanStatus');
  const scriptTableBody = document.getElementById('scriptTableBody');

  let discoveredScripts = [];
  let disabledScriptIds = new Set();

  // Load initial state
  chrome.storage.sync.get(['jsDisabled', 'blockedScripts', 'disabledScriptIds'], function(data) {
    jsToggle.checked = data.jsDisabled || false;
    status.textContent = data.jsDisabled ? 'JavaScript Disabled' : 'JavaScript Enabled';
    blockedScripts.value = (data.blockedScripts || []).join('\n');
    disabledScriptIds = new Set(data.disabledScriptIds || []);
  });

  // Main view functionality
  jsToggle.addEventListener('change', function() {
    const isDisabled = jsToggle.checked;
    chrome.storage.sync.set({jsDisabled: isDisabled});
    status.textContent = isDisabled ? 'JavaScript Disabled' : 'JavaScript Enabled';
    chrome.runtime.sendMessage({action: "toggleJS", value: isDisabled});
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
          displayScripts(discoveredScripts);
          scanStatus.textContent = `Found ${discoveredScripts.length} script(s)`;
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
      
      row.innerHTML = `
        <td><input type="checkbox" data-script-id="${script.id}"></td>
        <td class="script-name" title="${script.url}">${getScriptName(script.url)}</td>
        <td class="script-source">${script.source}</td>
        <td><span class="script-type type-${script.type}">${script.type}</span></td>
        <td><span class="category-badge category-${script.category.toLowerCase()}">${script.category}</span></td>
        <td>${script.timing}</td>
        <td>${script.size}</td>
        <td><span class="script-status ${isDisabled ? 'status-blocked' : 'status-active'}">${isDisabled ? 'Blocked' : 'Active'}</span></td>
      `;
      
      const checkbox = row.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', function() {
        updateRowSelection(checkbox);
      });
      
      scriptTableBody.appendChild(row);
    });
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