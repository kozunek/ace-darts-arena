// ─── Popup dashboard logic v2.2 ───
const bAPI = typeof browser !== "undefined" ? browser : chrome;

function sendMsg(msg) {
  return new Promise((resolve) => {
    try {
      bAPI.runtime.sendMessage(msg, (res) => {
        if (bAPI.runtime?.lastError) resolve(null);
        else resolve(res || null);
      });
    } catch { resolve(null); }
  });
}

// ─── Logging system ───
const logs = [];
function addLog(text, type = "info") {
  logs.unshift({ text, type, time: new Date().toLocaleTimeString("pl") });
  if (logs.length > 50) logs.pop();
  renderLogs();
}

function renderLogs() {
  const container = document.getElementById("logsContainer");
  if (!container) return;
  if (logs.length === 0) { container.innerHTML = '<div class="empty">Brak logów</div>'; return; }
  container.innerHTML = logs.map((l) =>
    `<div class="log-entry ${l.type}">[${l.time}] ${l.text}</div>`
  ).join("");
}

// ─── Tab system ───
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${target}`).classList.add("active");

      if (target === "leagues") loadLeagues();
    });
  });
}

// ─── Token status ───
function renderTokenStatus(statusEl, tokenDebug, copyBtn, tokenInfo) {
  if (tokenInfo?.token) {
    const age = Date.now() - (tokenInfo.timestamp || 0);
    const ageMin = Math.round(age / 60000);
    const fresh = age < 300000;

    statusEl.className = "status connected";
    statusEl.innerHTML = `<span>✅</span> Token aktywny (${ageMin} min temu)${tokenInfo.source ? ` — ${tokenInfo.source}` : ""}`;

    if (tokenDebug) {
      tokenDebug.style.display = "block";
      tokenDebug.textContent = `Źródło: ${tokenInfo.source || "?"} | Długość: ${tokenInfo.token.length} | Wiek: ${ageMin}m`;
    }

    copyBtn.style.display = "flex";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(tokenInfo.token).then(() => {
        copyBtn.textContent = "✅ Skopiowano!";
        setTimeout(() => (copyBtn.textContent = "📋 Kopiuj token"), 2000);
      });
    };

    addLog(`Token aktywny (${tokenInfo.source}, ${ageMin}m)`, "success");
    return;
  }

  copyBtn.style.display = "none";
  statusEl.className = "status disconnected";
  statusEl.innerHTML = '<span>❌</span> Brak tokena — otwórz Autodarts i zaloguj się';
  if (tokenDebug) { tokenDebug.style.display = "block"; tokenDebug.textContent = "Brak tokena w storage"; }
  addLog("Brak tokena Autodarts", "error");
}

// ─── Load leagues ───
async function loadLeagues() {
  const container = document.getElementById("leaguesList");
  const matchesSection = document.getElementById("leagueMatchesSection");
  container.innerHTML = '<div class="loading">⏳ Ładowanie lig...</div>';
  matchesSection.style.display = "none";

  const res = await sendMsg({ type: "GET_LEAGUES" });

  if (!res?.leagues?.length) {
    container.innerHTML = '<div class="empty">Brak aktywnych lig</div>';
    if (res?.error) addLog("Błąd ładowania lig: " + res.error, "error");
    return;
  }

  addLog(`Załadowano ${res.leagues.length} lig`, "success");

  container.innerHTML = res.leagues.map((l) => `
    <div class="league-item" data-league-id="${l.id}">
      <div>
        <div class="league-name">${l.name}</div>
        <div class="league-meta">${l.season} · ${l.league_type || "liga"}</div>
      </div>
      <span style="color: var(--color-success); font-size: var(--font-size-xs);">●</span>
    </div>
  `).join("");

  // Click handlers
  container.querySelectorAll(".league-item").forEach((el) => {
    el.addEventListener("click", () => loadLeagueMatches(el.dataset.leagueId, el.querySelector(".league-name").textContent));
  });
}

async function loadLeagueMatches(leagueId, leagueName) {
  const container = document.getElementById("leagueMatches");
  const section = document.getElementById("leagueMatchesSection");
  const title = document.getElementById("leagueMatchesTitle");
  const listSection = document.getElementById("leaguesList");

  listSection.style.display = "none";
  section.style.display = "block";
  title.textContent = leagueName;
  container.innerHTML = '<div class="loading">⏳ Ładowanie meczów...</div>';

  const res = await sendMsg({ type: "GET_LEAGUE_MATCHES", leagueId });

  if (!res?.matches?.length) {
    container.innerHTML = '<div class="empty">Brak meczów w tej lidze</div>';
    return;
  }

  addLog(`Załadowano ${res.matches.length} meczów z ${leagueName}`, "info");

  container.innerHTML = res.matches.map((m) => {
    const statusBadge = m.status === "completed"
      ? '<span class="badge badge-success">✓ Zakończony</span>'
      : m.status === "pending"
        ? '<span class="badge badge-warning">⏳ Oczekuje</span>'
        : `<span class="badge badge-muted">${m.status}</span>`;

    return `
      <div class="match-card">
        <div class="players">
          <strong>${m.score1 ?? "?"}</strong> : <strong>${m.score2 ?? "?"}</strong>
          ${m.avg1 ? ` (avg: ${m.avg1})` : ""}
        </div>
        <div class="meta">
          <span>${m.date ? new Date(m.date).toLocaleDateString("pl") : "?"}</span>
          ${statusBadge}
        </div>
      </div>
    `;
  }).join("");
}

// ─── Match by link ───
async function submitMatchByLink() {
  const input = document.getElementById("matchLinkInput");
  const errorEl = document.getElementById("matchLinkError");
  const successEl = document.getElementById("matchLinkSuccess");

  errorEl.style.display = "none";
  successEl.style.display = "none";

  const link = input.value.trim();
  if (!link) { showError(errorEl, "Wklej link do meczu"); return; }

  const matchId = link.match(/matches\/([a-f0-9-]+)/i)?.[1];
  if (!matchId) { showError(errorEl, "Nieprawidłowy link — powinien zawierać ID meczu"); return; }

  addLog(`Pobieram mecz: ${matchId.substring(0, 12)}...`, "info");

  // Check token
  const tokenState = await sendMsg({ type: "GET_AUTODARTS_TOKEN", forceRefresh: true });
  if (!tokenState?.token) {
    showError(errorEl, "Brak tokena Autodarts. Otwórz Autodarts, zaloguj się i spróbuj ponownie.");
    addLog("Brak tokena — nie można pobrać meczu", "error");
    return;
  }

  try {
    const res = await fetch(`https://api.autodarts.io/as/v0/matches/${matchId}`, {
      headers: { Authorization: `Bearer ${tokenState.token}` },
    });

    if (res.status === 401 || res.status === 403) {
      // Token expired — try refresh
      addLog("Token wygasł, odświeżam...", "info");
      const newToken = await sendMsg({ type: "GET_AUTODARTS_TOKEN", forceRefresh: true });
      if (!newToken?.token) {
        showError(errorEl, "Token wygasł. Odśwież stronę Autodarts i spróbuj ponownie.");
        return;
      }

      const retryRes = await fetch(`https://api.autodarts.io/as/v0/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${newToken.token}` },
      });
      if (!retryRes.ok) { showError(errorEl, `Błąd API: ${retryRes.status}`); return; }

      const matchData = await retryRes.json();
      await processMatchFromLink(matchData, matchId, successEl, errorEl);
      return;
    }

    if (!res.ok) { showError(errorEl, `Błąd API: ${res.status}`); return; }

    const matchData = await res.json();
    await processMatchFromLink(matchData, matchId, successEl, errorEl);
  } catch (err) {
    showError(errorEl, `Błąd sieci: ${err.message}`);
    addLog(`Błąd pobierania meczu: ${err.message}`, "error");
  }
}

async function processMatchFromLink(matchData, matchId, successEl, errorEl) {
  if (!matchData?.players || matchData.players.length < 2) {
    showError(errorEl, "Mecz nie zawiera danych graczy");
    return;
  }

  const p1 = matchData.players[0];
  const p2 = matchData.players[1];
  const state = String(matchData.state || "").toLowerCase();
  const isFinished = ["finished", "complete", "completed", "done"].includes(state);

  if (!isFinished) {
    showError(errorEl, "Mecz nie jest jeszcze zakończony");
    addLog("Mecz w toku — nie można wysłać", "info");
    return;
  }

  addLog(`Mecz: ${p1.name || "?"} vs ${p2.name || "?"} — wysyłam...`, "info");

  const result = await sendMsg({
    type: "AUTO_SUBMIT_LEAGUE_MATCH",
    payload: {
      match_id: matchId,
      player1_name: p1.name || p1.username || "Player 1",
      player2_name: p2.name || p2.username || "Player 2",
      player1_autodarts_id: p1.userId || p1.id || null,
      player2_autodarts_id: p2.userId || p2.id || null,
      score1: matchData.scores?.[0]?.legs ?? matchData.scores?.[0] ?? 0,
      score2: matchData.scores?.[1]?.legs ?? matchData.scores?.[1] ?? 0,
      avg1: p1.stats?.average ?? null,
      avg2: p2.stats?.average ?? null,
    },
  });

  if (result?.is_league_match && result?.submitted) {
    successEl.style.display = "block";
    successEl.textContent = `✅ Mecz ligowy wysłany! ${result.league_name || ""}`;
    addLog(`Mecz wysłany: ${result.league_name}`, "success");
  } else if (result?.already_submitted) {
    successEl.style.display = "block";
    successEl.textContent = `ℹ️ Mecz już wcześniej zgłoszony`;
    addLog("Mecz już zgłoszony", "info");
  } else if (result?.is_league_match) {
    showError(errorEl, `Mecz ligowy, ale nie wysłany: ${result.reason || "nieznany błąd"}`);
    addLog(`Nie wysłano: ${result.reason}`, "error");
  } else {
    showError(errorEl, "To nie jest mecz ligowy eDART Polska");
    addLog("Mecz towarzyski — pominięto", "info");
  }
}

function showError(el, msg) {
  el.style.display = "block";
  el.textContent = msg;
}

// ─── Init ───
document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const tokenDebug = document.getElementById("tokenDebug");
  const copyBtn = document.getElementById("copyBtn");
  const refreshTokenBtn = document.getElementById("refreshTokenBtn");
  const openBtn = document.getElementById("openAutodarts");
  const settingsBtn = document.getElementById("openSettings");
  const historyContainer = document.getElementById("matchHistory");
  const autodartsIdEl = document.getElementById("autodartsId");
  const statsSection = document.getElementById("statsSection");
  const lastMatchSection = document.getElementById("lastMatchSection");
  const lastMatchEl = document.getElementById("lastMatch");
  const timelineSection = document.getElementById("timelineSection");

  // Theme
  try {
    const config = await PlayerConfig.get();
    document.body.className = `theme-${config.theme || "dark"}`;
  } catch { document.body.className = "theme-dark"; }

  // Tabs
  setupTabs();

  // Settings
  settingsBtn.addEventListener("click", () => {
    bAPI.runtime.openOptionsPage
      ? bAPI.runtime.openOptionsPage()
      : bAPI.tabs.create({ url: bAPI.runtime.getURL("options.html") });
  });

  // ─── Token status ───
  statusEl.className = "status";
  statusEl.innerHTML = "<span>⏳</span> Sprawdzanie tokenu...";

  const tokenState = await sendMsg({ type: "GET_AUTODARTS_TOKEN", forceRefresh: false });
  renderTokenStatus(statusEl, tokenDebug, copyBtn, tokenState);

  // Refresh token button
  refreshTokenBtn.addEventListener("click", async () => {
    refreshTokenBtn.textContent = "⏳ Odświeżanie...";
    refreshTokenBtn.disabled = true;
    addLog("Ręczne odświeżanie tokena...", "info");

    const newState = await sendMsg({ type: "GET_AUTODARTS_TOKEN", forceRefresh: true });
    renderTokenStatus(statusEl, tokenDebug, copyBtn, newState);

    refreshTokenBtn.textContent = "🔄 Odśwież token";
    refreshTokenBtn.disabled = false;
  });

  // Autodarts ID
  bAPI.storage.local.get(["autodarts_user_id"], (r) => {
    if (r.autodarts_user_id) {
      autodartsIdEl.style.display = "block";
      autodartsIdEl.textContent = `Autodarts ID: ${r.autodarts_user_id.substring(0, 12)}...`;
    }
  });

  // ─── Match history ───
  loadMatchHistory(historyContainer, statsSection, lastMatchSection, lastMatchEl, timelineSection);

  document.getElementById("refreshHistory").addEventListener("click", () => {
    loadMatchHistory(historyContainer, statsSection, lastMatchSection, lastMatchEl, timelineSection);
    addLog("Historia odświeżona", "info");
  });

  // Leagues
  document.getElementById("refreshLeagues").addEventListener("click", () => { loadLeagues(); addLog("Ligi odświeżone", "info"); });
  document.getElementById("backToLeagues").addEventListener("click", () => {
    document.getElementById("leagueMatchesSection").style.display = "none";
    document.getElementById("leaguesList").style.display = "block";
  });

  // Add match by link
  document.getElementById("submitMatchLink").addEventListener("click", submitMatchByLink);

  // Clear logs
  document.getElementById("clearLogs").addEventListener("click", () => {
    logs.length = 0;
    renderLogs();
  });

  // Open Autodarts
  openBtn.onclick = () => bAPI.tabs.create({ url: "https://play.autodarts.io" });

  addLog("Popup załadowany", "info");
});

function loadMatchHistory(container, statsSection, lastMatchSection, lastMatchEl, timelineSection) {
  bAPI.storage.local.get(["match_history"], (result) => {
    const history = (result.match_history || []).slice(0, 10);
    if (history.length === 0) {
      container.innerHTML = '<div class="empty">Brak meczów ligowych</div>';
      return;
    }

    statsSection.style.display = "block";
    document.getElementById("totalMatches").textContent = history.length;
    const wins = history.filter((m) => m.submitted && !m.alreadySubmitted).length;
    document.getElementById("winRate").textContent = `${Math.round((wins / history.length) * 100)}%`;

    const last = history[0];
    if (last) {
      lastMatchSection.style.display = "block";
      lastMatchEl.innerHTML = `
        <div class="players"><strong>${last.player1}</strong> vs <strong>${last.player2}</strong></div>
        <div style="font-size:20px; font-weight:700; text-align:center; margin:8px 0; color:var(--color-text)">
          ${last.score || "? : ?"}
        </div>
        <div class="meta">
          <span>${last.league || "Liga"}</span>
          <span class="badge ${last.status === "submitted" ? "badge-success" : last.status === "already_submitted" ? "badge-info" : "badge-error"}">
            ${last.status === "submitted" ? "✓ Wysłany" : last.status === "already_submitted" ? "↻ Już zgłoszony" : "✗ Błąd"}
          </span>
        </div>
      `;
      timelineSection.style.display = "block";
      updateTimeline(last.status);
    }

    container.innerHTML = history.map((m) => {
      const date = new Date(m.timestamp);
      const timeStr = `${date.getDate()}.${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
      const badge = m.status === "submitted" ? '<span class="badge badge-success">✓</span>'
        : m.status === "already_submitted" ? '<span class="badge badge-info">↻</span>'
          : '<span class="badge badge-error">✗</span>';
      return `
        <div class="match-card">
          <div class="players">${m.player1} vs ${m.player2} — <strong>${m.score || "?"}</strong></div>
          <div class="meta"><span>${m.league || ""} · ${timeStr}</span>${badge}</div>
        </div>
      `;
    }).join("");
  });
}

function updateTimeline(status) {
  const steps = [
    { id: "tl-finished", done: true },
    { id: "tl-submitted", done: status === "submitted" || status === "already_submitted" },
    { id: "tl-approved", done: status === "approved" },
  ];
  steps.forEach((step) => {
    const el = document.getElementById(step.id);
    if (!el) return;
    const dot = el.querySelector(".timeline-dot");
    const label = el.querySelector(".timeline-label");
    if (step.done) {
      dot.className = "timeline-dot completed"; dot.textContent = "✓"; label.className = "timeline-label";
    } else if (status === "failed" && step.id === "tl-submitted") {
      dot.className = "timeline-dot failed"; dot.textContent = "✗"; label.className = "timeline-label";
    } else {
      dot.className = "timeline-dot pending"; dot.textContent = "●"; label.className = "timeline-label muted";
    }
  });
}
