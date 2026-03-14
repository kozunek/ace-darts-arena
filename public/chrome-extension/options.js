// ─── Options page logic v2.1 ───
const bAPI = typeof browser !== "undefined" ? browser : chrome;

const SETTINGS_GROUPS = {
  autoSubmitSettings: [
    { key: "autoSubmitLeagueMatches", label: "Automatyczne zgłaszanie meczów ligowych", desc: "Wynik zostanie wysłany automatycznie po zakończeniu meczu na Autodarts" },
    { key: "openEdartAfterSubmit", label: "Otwórz eDART po zgłoszeniu", desc: "Automatycznie otwórz stronę eDART po wysłaniu wyniku" },
  ],
  notificationSettings: [
    { key: "notifications", label: "Wszystkie powiadomienia", desc: "Globalne włączenie/wyłączenie powiadomień systemowych" },
    { key: "showLeagueNotifications", label: "Powiadomienia o meczach ligowych", desc: "Pokaż powiadomienie gdy wykryty zostanie mecz ligowy" },
    { key: "leagueNotificationsOnly", label: "Tylko powiadomienia ligowe", desc: "Ignoruj mecze towarzyskie, reaguj tylko na ligowe" },
  ],
  otherSettings: [
    { key: "autodartsTokenCapture", label: "Przechwytywanie tokena Autodarts", desc: "Automatycznie zapisuj token do pobierania statystyk" },
  ],
};

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg || "✅ Zapisano";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1500);
}

function createToggleRow(setting, config) {
  const row = document.createElement("div");
  row.className = "setting-row";

  const info = document.createElement("div");
  info.className = "setting-info";
  info.innerHTML = `<div class="setting-label">${setting.label}</div><div class="setting-desc">${setting.desc}</div>`;

  const toggle = document.createElement("div");
  toggle.className = `toggle ${config[setting.key] ? "active" : ""}`;

  toggle.addEventListener("click", async () => {
    const current = await PlayerConfig.getSetting(setting.key);
    await PlayerConfig.setSetting(setting.key, !current);
    toggle.classList.toggle("active");
    showToast();
  });

  row.appendChild(info);
  row.appendChild(toggle);
  return row;
}

document.addEventListener("DOMContentLoaded", async () => {
  const config = await PlayerConfig.get();
  const currentTheme = config.theme || "dark";

  // Apply theme
  document.body.className = `theme-${currentTheme}`;

  // ─── Theme selector ───
  const themeOptions = document.querySelectorAll(".theme-option");
  themeOptions.forEach((el) => {
    if (el.dataset.theme === currentTheme) el.classList.add("active");

    el.addEventListener("click", async () => {
      const theme = el.dataset.theme;
      await PlayerConfig.setSetting("theme", theme);
      document.body.className = `theme-${theme}`;
      themeOptions.forEach((o) => o.classList.remove("active"));
      el.classList.add("active");
      showToast("✅ Motyw zmieniony");
    });
  });

  // ─── Toggle settings ───
  for (const [containerId, settings] of Object.entries(SETTINGS_GROUPS)) {
    const container = document.getElementById(containerId);
    if (!container) continue;
    for (const setting of settings) {
      container.appendChild(createToggleRow(setting, config));
    }
  }

  // ─── Debug buttons ───
  document.getElementById("clearCache")?.addEventListener("click", () => {
    bAPI.storage.local.remove(["autodarts_last_match", "autodarts_last_match_timestamp", "autodarts_league_match", "autodarts_league_match_timestamp"]);
    showToast("🗑️ Cache wyczyszczony");
  });

  document.getElementById("clearHistory")?.addEventListener("click", () => {
    bAPI.storage.local.remove(["match_history"]);
    showToast("📜 Historia wyczyszczona");
  });

  document.getElementById("clearToken")?.addEventListener("click", () => {
    bAPI.storage.local.remove(["autodarts_token", "token_timestamp"]);
    showToast("🔑 Token usunięty");
  });
});
