// Content script - runs on play.autodarts.io
// Intercepts the Keycloak/OIDC token from storage

(function() {
  function getAutodartsToken() {
    // OIDC client stores tokens with keys like:
    // oidc.user:https://login.autodarts.io/realms/autodarts:autodarts-app
    // or similar patterns
    
    const storages = [localStorage, sessionStorage];
    
    for (const storage of storages) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        
        try {
          const value = storage.getItem(key);
          if (!value) continue;
          
          // Look for OIDC user entries (oidc-client-ts format)
          if (key.startsWith('oidc.user:') || key.includes('autodarts')) {
            const parsed = JSON.parse(value);
            if (parsed.access_token) {
              console.log('[eDART] Found OIDC token in key:', key);
              return parsed.access_token;
            }
          }
          
          // Also check for any JSON with access_token
          if (value.includes('access_token')) {
            const parsed = JSON.parse(value);
            if (parsed.access_token) {
              console.log('[eDART] Found access_token in key:', key);
              return parsed.access_token;
            }
          }
        } catch (e) {
          // Not JSON, skip
        }
      }
    }

    return null;
  }

  // Also intercept fetch to capture token from API requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const request = args[0];
    const options = args[1] || {};
    
    const url = typeof request === 'string' ? request : request?.url;
    if (url && url.includes('api.autodarts.io')) {
      let authHeader = null;
      
      if (options.headers) {
        if (options.headers instanceof Headers) {
          authHeader = options.headers.get('Authorization');
        } else if (typeof options.headers === 'object') {
          authHeader = options.headers.Authorization || options.headers.authorization;
        }
      }
      
      if (!authHeader && request instanceof Request) {
        authHeader = request.headers?.get('Authorization');
      }
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        console.log('[eDART] Captured token from fetch request to:', url.substring(0, 60));
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
      console.log('[eDART] Captured token from XHR to:', this._url.substring(0, 60));
      chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
    }
    return originalSetRequestHeader.apply(this, arguments);
  };

  // Try to get token from storage immediately
  const token = getAutodartsToken();
  if (token) {
    console.log('[eDART] Token found in storage on page load');
    chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
  } else {
    console.log('[eDART] No token found yet, will retry...');
    console.log('[eDART] localStorage keys:', Array.from({length: localStorage.length}, (_, i) => localStorage.key(i)));
    console.log('[eDART] sessionStorage keys:', Array.from({length: sessionStorage.length}, (_, i) => sessionStorage.key(i)));
  }

  // Periodically check for token updates
  setInterval(() => {
    const t = getAutodartsToken();
    if (t) {
      chrome.storage.local.set({ autodarts_token: t, token_timestamp: Date.now() });
    }
  }, 10000);
})();
