// background.js
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ 
      jsDisabled: false, 
      blockedScripts: [],
      disabledScriptIds: [],
      permissionPromptsEnabled: true
    });
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleJS") {
      updateJSBlockingRules(request.value);
    } else if (request.action === "updateBlockedScripts") {
      updateScriptBlockingRules(request.value);
    } else if (request.action === "showPermissionPrompt") {
      showPermissionPrompt(request, sender.tab.id);
    } else if (request.action === "permissionResponse") {
      handlePermissionResponse(request, sender.tab.id);
    }
  });

  function showPermissionPrompt(requestData, tabId) {
    const params = new URLSearchParams({
      script: requestData.scriptUrl,
      action: requestData.actionType,
      category: requestData.category,
      requestId: requestData.requestId
    });

    chrome.windows.create({
      url: `permission-prompt.html?${params.toString()}`,
      type: 'popup',
      width: 450,
      height: 400,
      focused: true
    });
  }

  function handlePermissionResponse(response, tabId) {
    // Forward response back to content script
    chrome.tabs.sendMessage(tabId, {
      action: 'permissionResponse',
      requestId: response.requestId,
      decision: response.decision,
      scriptUrl: response.scriptUrl,
      actionType: response.actionType
    });
  }
  
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