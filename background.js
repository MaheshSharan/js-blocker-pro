// background.js
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ jsDisabled: false, blockedScripts: [] });
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleJS") {
      updateJSBlockingRules(request.value);
    } else if (request.action === "updateBlockedScripts") {
      updateScriptBlockingRules(request.value);
    }
  });
  
  function updateJSBlockingRules(isDisabled) {
    const rule = {
      id: 1,
      priority: 1,
      action: { type: isDisabled ? "block" : "allow" },
      condition: {
        resourceTypes: ["script"]
      }
    };
  
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [rule]
    });
  }
  
  function updateScriptBlockingRules(blockedScripts) {
    const rules = blockedScripts.map((script, index) => ({
      id: index + 2,
      priority: 2,
      action: { type: "block" },
      condition: {
        urlFilter: script,
        resourceTypes: ["script"]
      }
    }));
  
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 2),
      addRules: rules
    });
  }