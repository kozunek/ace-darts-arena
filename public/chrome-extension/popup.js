document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const infoEl = document.getElementById('info');
  const stepsEl = document.getElementById('steps');
  const copyBtn = document.getElementById('copyBtn');
  const openBtn = document.getElementById('openAutodarts');

  chrome.storage.local.get(['autodarts_token', 'token_timestamp'], (result) => {
    if (result.autodarts_token) {
      const age = Date.now() - (result.token_timestamp || 0);
      const fresh = age < 300000; // 5 min
      const mins = Math.floor(age / 60000);

      statusEl.className = 'status connected';
      statusEl.innerHTML = `<span class="icon">✅</span> Token ${fresh ? 'aktywny' : 'może być nieaktualny'}`;
      
      infoEl.innerHTML = `Token przechwycony ${mins < 1 ? 'przed chwilą' : mins + ' min temu'}`;
      
      const preview = result.autodarts_token.substring(0, 20) + '...';
      infoEl.innerHTML += `<div class="token-preview">${preview}</div>`;

      copyBtn.style.display = 'block';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(result.autodarts_token).then(() => {
          copyBtn.textContent = '✅ Skopiowano!';
          setTimeout(() => { copyBtn.textContent = '📋 Kopiuj token'; }, 2000);
        });
      };

      if (!fresh) {
        stepsEl.style.display = 'block';
      }
    } else {
      statusEl.className = 'status disconnected';
      statusEl.innerHTML = '<span class="icon">❌</span> Brak tokena — zaloguj się do Autodarts';
      stepsEl.style.display = 'block';
    }
  });

  openBtn.onclick = () => {
    chrome.tabs.create({ url: 'https://play.autodarts.io' });
  };
});
