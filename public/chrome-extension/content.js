// Content script - runs on play.autodarts.io
// Intercepts the Keycloak token from localStorage/sessionStorage

(function() {
  function getAutodartsToken() {
    // Keycloak stores tokens in localStorage
    // Try various known storage keys
    const keycloakKeys = [
      'kc-callback-autodarts',
      'kc-callback-autodarts-app',
    ];

    // Search all localStorage keys for Keycloak token data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        // Check if this looks like a Keycloak token
        if (value.includes('access_token') || value.includes('token')) {
          const parsed = JSON.parse(value);
          if (parsed.access_token) {
            return parsed.access_token;
          }
          if (parsed.token) {
            return parsed.token;
          }
        }
      } catch (e) {
        // Not JSON, skip
      }
    }

    // Also try sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      
      try {
        const value = sessionStorage.getItem(key);
        if (!value) continue;
        
        if (value.includes('access_token') || value.includes('token')) {
          const parsed = JSON.parse(value);
          if (parsed.access_token) {
            return parsed.access_token;
          }
        }
      } catch (e) {
        // Not JSON, skip
      }
    }

    return null;
  }

  // Also intercept XHR/fetch to capture the token from API requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const request = args[0];
    const options = args[1] || {};
    
    // Check if this is an autodarts API request with auth header
    const url = typeof request === 'string' ? request : request?.url;
    if (url && url.includes('api.autodarts.io')) {
      const authHeader = options.headers?.Authorization || 
                         options.headers?.authorization ||
                         (request instanceof Request ? request.headers?.get('Authorization') : null);
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
      }
    }
    
    return originalFetch.apply(this, args);
  };

  // Also intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (this._url && this._url.includes('api.autodarts.io') && 
        name.toLowerCase() === 'authorization' && value.startsWith('Bearer ')) {
      const token = value.replace('Bearer ', '');
      chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
    }
    return originalSetRequestHeader.apply(this, arguments);
  };

  // Try to get token from storage immediately
  const token = getAutodartsToken();
  if (token) {
    chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
  }

  // Periodically check for token updates
  setInterval(() => {
    const t = getAutodartsToken();
    if (t) {
      chrome.storage.local.set({ autodarts_token: t, token_timestamp: Date.now() });
    }
  }, 30000);
})();
