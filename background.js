// background.js
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ 
      jsDisabled: false, 
      blockedScripts: [],
      disabledScriptIds: []
    });
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
      addRules: isDisabled ? [rule] : []
    });
  }
  
  function updateScriptBlockingRules(blockedScripts) {
    // Generate rules for each blocked script
    const rules = blockedScripts.map((script, index) => {
      // Handle both full URLs and patterns
      let urlFilter = script;
      
      // If it's a full URL, extract a pattern
      if (script.startsWith('http://') || script.startsWith('https://')) {
        try {
          const url = new URL(script);
          // Use the pathname as the filter, which is more flexible
          urlFilter = url.pathname.split('/').pop() || url.hostname;
        } catch (e) {
          // If URL parsing fails, use as-is
          urlFilter = script;
        }
      }
      
      return {
        id: index + 2,
        priority: 2,
        action: { type: "block" },
        condition: {
          urlFilter: urlFilter,
          resourceTypes: ["script"]
        }
      };
    });
  
    // Remove old rules (IDs 2-1001) and add new ones
    const removeIds = Array.from({ length: 1000 }, (_, i) => i + 2);
    
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeIds,
      addRules: rules
    });
  }