// ─── Player configuration system ───
const DEFAULT_PLAYER_CONFIG = {
  notifications: true,
  autoSubmitLeagueMatches: true,
  showLeagueNotifications: true,
  openEdartAfterSubmit: true,
  autodartsTokenCapture: true,
  leagueNotificationsOnly: true,
  language: "pl",
};

const PlayerConfig = {
  _config: null,

  async get() {
    if (this._config) return this._config;
    return new Promise((resolve) => {
      const api = typeof browser !== "undefined" ? browser : chrome;
      api.storage.local.get(["player_config"], (result) => {
        this._config = { ...DEFAULT_PLAYER_CONFIG, ...(result.player_config || {}) };
        resolve(this._config);
      });
    });
  },

  async save(config) {
    this._config = { ...DEFAULT_PLAYER_CONFIG, ...config };
    const api = typeof browser !== "undefined" ? browser : chrome;
    return new Promise((resolve) => {
      api.storage.local.set({ player_config: this._config }, resolve);
    });
  },

  async getSetting(key) {
    const config = await this.get();
    return config[key];
  },

  async setSetting(key, value) {
    const config = await this.get();
    config[key] = value;
    return this.save(config);
  },

  invalidateCache() {
    this._config = null;
  },
};
