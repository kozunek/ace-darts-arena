// ─── Options page logic ───
const SETTINGS_UI = [
  { key: "autoSubmitLeagueMatches", label: "Automatyczne zgłaszanie meczów ligowych", desc: "Wynik zostanie wysłany automatycznie po zakończeniu meczu na Autodarts" },
  { key: "showLeagueNotifications", label: "Powiadomienia o meczach ligowych", desc: "Pokaż powiadomienie gdy wykryty zostanie mecz ligowy" },
  { key: "openEdartAfterSubmit", label: "Otwórz eDART po zgłoszeniu", desc: "Automatycznie otwórz stronę eDART po wysłaniu wyniku" },
  { key: "autodartsTokenCapture", label: "Przechwytywanie tokena Autodarts", desc: "Automatycznie zapisuj token do pobierania statystyk" },
  { key: "leagueNotificationsOnly", label: "Tylko powiadomienia ligowe", desc: "Ignoruj mecze towarzyskie, reaguj tylko na ligowe" },
  { key: "notifications", label: "Wszystkie powiadomienia", desc: "Globalne włączenie/wyłączenie powiadomień" },
];

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("settings");
  const savedMsg = document.getElementById("savedMsg");
  const config = await PlayerConfig.get();

  for (const setting of SETTINGS_UI) {
    const row = document.createElement("div");
    row.className = "setting";

    const labelDiv = document.createElement("div");
    labelDiv.className = "setting-label";
    labelDiv.innerHTML = `${setting.label}<small>${setting.desc}</small>`;

    const toggle = document.createElement("div");
    toggle.className = `toggle ${config[setting.key] ? "active" : ""}`;
    toggle.dataset.key = setting.key;

    toggle.addEventListener("click", async () => {
      const current = await PlayerConfig.getSetting(setting.key);
      await PlayerConfig.setSetting(setting.key, !current);
      toggle.classList.toggle("active");
      savedMsg.classList.add("show");
      setTimeout(() => savedMsg.classList.remove("show"), 1500);
    });

    row.appendChild(labelDiv);
    row.appendChild(toggle);
    container.appendChild(row);
  }
});
