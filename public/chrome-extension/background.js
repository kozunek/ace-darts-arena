// Background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTODARTS_TOKEN') {
    chrome.storage.local.get(['autodarts_token', 'token_timestamp'], (result) => {
      sendResponse({
        token: result.autodarts_token || null,
        timestamp: result.token_timestamp || null,
        fresh: result.token_timestamp ? (Date.now() - result.token_timestamp < 300000) : false // 5 min
      });
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'CLEAR_TOKEN') {
    chrome.storage.local.remove(['autodarts_token', 'token_timestamp']);
    sendResponse({ success: true });
    return true;
  }
});

// Listen for web requests to autodarts API to capture tokens
chrome.webRequest?.onBeforeSendHeaders?.addListener(
  (details) => {
    const authHeader = details.requestHeaders?.find(h => h.name.toLowerCase() === 'authorization');
    if (authHeader && authHeader.value?.startsWith('Bearer ')) {
      const token = authHeader.value.replace('Bearer ', '');
      chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
    }
  },
  { urls: ["https://api.autodarts.io/*"] },
  ["requestHeaders"]
);
