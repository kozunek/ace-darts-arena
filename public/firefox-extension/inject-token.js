// Content script that runs on eDART pages (Firefox version)
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

(function () {
  const postToken = () => {
    browserAPI.storage.local.get(["autodarts_token", "token_timestamp"]).then((result) => {
      window.postMessage(
        {
          type: "EDART_TOKEN_RESPONSE",
          token: result.autodarts_token || null,
          timestamp: result.token_timestamp || null,
          fresh: result.token_timestamp ? Date.now() - result.token_timestamp < 600000 : false,
        },
        "*"
      );
    });
  };

  const postLastMatch = () => {
    browserAPI.storage.local.get(["autodarts_last_match", "autodarts_last_match_timestamp"]).then((result) => {
      window.postMessage(
        {
          type: "EDART_LAST_MATCH_RESPONSE",
          payload: result.autodarts_last_match || null,
          timestamp: result.autodarts_last_match_timestamp || null,
        },
        "*"
      );
    });
  };

  const postLeagueMatch = () => {
    browserAPI.storage.local.get(["autodarts_league_match", "autodarts_league_match_timestamp"]).then((result) => {
      window.postMessage(
        {
          type: "EDART_LEAGUE_MATCH_RESPONSE",
          payload: result.autodarts_league_match || null,
          timestamp: result.autodarts_league_match_timestamp || null,
        },
        "*"
      );
    });
  };

  window.addEventListener("message", (event) => {
    if (event.data?.type === "EDART_REQUEST_TOKEN") postToken();
    if (event.data?.type === "EDART_REQUEST_LAST_MATCH") postLastMatch();
    if (event.data?.type === "EDART_REQUEST_LEAGUE_MATCH") postLeagueMatch();
  });

  browserAPI.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.autodarts_last_match) {
      window.postMessage(
        {
          type: "EDART_LAST_MATCH_PUSH",
          payload: changes.autodarts_last_match.newValue || null,
          timestamp: Date.now(),
        },
        "*"
      );
    }
    if (changes.autodarts_league_match) {
      window.postMessage(
        {
          type: "EDART_LEAGUE_MATCH_PUSH",
          payload: changes.autodarts_league_match.newValue || null,
          timestamp: Date.now(),
        },
        "*"
      );
    }
    if (changes.autodarts_token || changes.token_timestamp) {
      postToken();
    }
  });

  window.postMessage({ type: "EDART_EXTENSION_INSTALLED", version: "1.5.0" }, "*");
  postToken();
  postLastMatch();
  postLeagueMatch();

  window.addEventListener("message", (event) => {
    if (event.data?.type === "EDART_STORE_USER_ID" && event.data?.userId) {
      browserAPI.storage.local.set({ edart_user_id: event.data.userId });
    }
  });
})();