// ─── Chrome/Firefox notification system ───
const _browserAPI = typeof browser !== "undefined" ? browser : chrome;

const Notifications = {
  async _shouldNotify() {
    const config = await PlayerConfig.get();
    return config.notifications;
  },

  async _shouldNotifyLeague() {
    const config = await PlayerConfig.get();
    return config.showLeagueNotifications;
  },

  _create(id, options) {
    _browserAPI.notifications.create(id, {
      type: "basic",
      iconUrl: "icon128.png",
      priority: 2,
      ...options,
    });
  },

  async leagueMatchDetected(player1, player2, leagueName, autodartsMatchId) {
    if (!(await this._shouldNotifyLeague())) return;
    this._create(`league-live-${autodartsMatchId}`, {
      title: "🎯 Mecz ligowy rozpoczęty!",
      message: `${player1} vs ${player2}\n${leagueName}\nWynik zostanie wysłany automatycznie po zakończeniu meczu.`,
      requireInteraction: false,
    });
  },

  async matchSubmitted(player1, player2, score, leagueName, status) {
    if (!(await this._shouldNotify())) return;
    const statusText = status === "completed"
      ? "Wynik zatwierdzony automatycznie!"
      : "Wynik wysłany — oczekuje na zatwierdzenie admina.";

    this._create(`league-submitted-${Date.now()}`, {
      title: "🎯 Mecz ligowy zgłoszony!",
      message: `${player1} vs ${player2} (${score})\n${leagueName}\n${statusText}`,
      requireInteraction: true,
    });
  },

  async matchAlreadySubmitted(player1, player2, score, leagueName, statusText) {
    if (!(await this._shouldNotify())) return;
    this._create(`league-already-${Date.now()}`, {
      title: "🎯 Mecz ligowy już zgłoszony",
      message: `${player1} vs ${player2} (${score || "?"})\n${leagueName || "Liga"}\n${statusText || "Przeciwnik wysłał już wynik meczu."}`,
      requireInteraction: true,
    });
  },

  async submissionError(player1, player2, errorMsg) {
    if (!(await this._shouldNotify())) return;
    this._create(`league-error-${Date.now()}`, {
      title: "⚠️ Błąd wysyłania wyniku",
      message: `${player1} vs ${player2}\nNie udało się automatycznie wysłać wyniku.\nKliknij aby wprowadzić wynik ręcznie.`,
      requireInteraction: true,
    });
  },

  async manualSubmissionRequired(player1, player2, leagueName, reason) {
    if (!(await this._shouldNotify())) return;
    this._create(`league-detected-${Date.now()}`, {
      title: "⚠️ Mecz ligowy — wymagane ręczne zgłoszenie",
      message: `${player1} vs ${player2}\n${leagueName || "Liga"}\n${reason}\nKliknij aby wprowadzić wynik ręcznie.`,
      requireInteraction: true,
    });
  },

  autodartsIdSaved() {
    this._create(`autodarts-id-${Date.now()}`, {
      title: "🎯 Autodarts ID zapisane!",
      message: "Twój Autodarts User ID został automatycznie powiązany z kontem eDART.",
      priority: 1,
    });
  },
};
