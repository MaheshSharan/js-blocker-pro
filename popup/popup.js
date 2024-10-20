// popup/popup.js
document.addEventListener('DOMContentLoaded', function() {
  const jsToggle = document.getElementById('jsToggle');
  const status = document.getElementById('status');
  const blockedScripts = document.getElementById('blockedScripts');
  const saveBlockedScripts = document.getElementById('saveBlockedScripts');
  const saveMessage = document.getElementById('saveMessage');

  chrome.storage.sync.get(['jsDisabled', 'blockedScripts'], function(data) {
    jsToggle.checked = data.jsDisabled || false;
    status.textContent = data.jsDisabled ? 'JavaScript Disabled' : 'JavaScript Enabled';
    blockedScripts.value = (data.blockedScripts || []).join('\n');
  });

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

  function showMessage(text, type) {
    saveMessage.textContent = text;
    saveMessage.className = `message show ${type}`;
    setTimeout(() => {
      saveMessage.className = 'message';
    }, 3000);
  }
});