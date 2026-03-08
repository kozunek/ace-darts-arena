// Content script that runs on eDART Polska pages
// Listens for token requests from the web app and provides the stored token

(function() {
  // Listen for token requests from the page
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'EDART_REQUEST_TOKEN') {
      chrome.storage.local.get(['autodarts_token', 'token_timestamp'], (result) => {
        window.postMessage({
          type: 'EDART_TOKEN_RESPONSE',
          token: result.autodarts_token || null,
          timestamp: result.token_timestamp || null,
          fresh: result.token_timestamp ? (Date.now() - result.token_timestamp < 600000) : false
        }, '*');
      });
    }
  });

  // Also proactively announce extension is installed
  window.postMessage({ type: 'EDART_EXTENSION_INSTALLED', version: '1.2.0' }, '*');
})();
