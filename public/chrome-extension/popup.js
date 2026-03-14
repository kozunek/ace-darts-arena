// ─── Popup dashboard logic v2.1 ───
const bAPI = typeof browser !== "undefined" ? browser : chrome;

document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const copyBtn = document.getElementById("copyBtn");
  const openBtn = document.getElementById("openAutodarts");
  const settingsBtn = document.getElementById("openSettings");
  const historyContainer = document.getElementById("matchHistory");
  const autodartsIdEl = document.getElementById("autodartsId");
  const statsSection = document.getElementById("statsSection");
  const lastMatchSection = document.getElementById("lastMatchSection");
  const lastMatchEl = document.getElementById("lastMatch");
  const timelineSection = document.getElementById("timelineSection");

  // ─── Load theme from config ───
  try {
    const config = await PlayerConfig.get();
    const theme = config.theme || "dark";
    document.body.className = `theme-${theme}`;
  } catch (e) {
    document.body.className = "theme-dark";
  }

  // ─── Settings button ───
  settingsBtn.addEventListener("click", () => {
    bAPI.runtime.openOptionsPage
      ? bAPI.runtime.openOptionsPage()
      : bAPI.tabs.create({ url: bAPI.runtime.getURL("options.html") });
  });

  // ─── Token status ───
  bAPI.storage.local.get(
    ["autodarts_token", "token_timestamp", "autodarts_user_id"],
    (result) => {
      if (result.autodarts_token) {
        const age = Date.now() - (result.token_timestamp || 0);
        const fresh = age < 300000;

        statusEl.className = "status connected";
        statusEl.innerHTML = `<span>✅</span> Token ${fresh ? "aktywny" : "może być nieaktualny"}`;

        copyBtn.style.display = "flex";
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(result.autodarts_token).then(() => {
            copyBtn.textContent = "✅ Skopiowano!";
            setTimeout(() => (copyBtn.textContent = "📋 Kopiuj token"), 2000);
          });
        };
      } else {
        statusEl.className = "status disconnected";
        statusEl.innerHTML = '<span>❌</span> Brak tokena — zaloguj się do Autodarts';
      }

      if (result.autodarts_user_id) {
        autodartsIdEl.style.display = "block";
        autodartsIdEl.textContent = `Autodarts ID: ${result.autodarts_user_id.substring(0, 12)}...`;
      }
    }
  );

  // ─── Match history ───
  bAPI.storage.local.get(["match_history"], (result) => {
    const history = (result.match_history || []).slice(0, 5);
    if (history.length === 0) {
      historyContainer.innerHTML = '<div class="empty">Brak ostatnich meczów ligowych</div>';
      return;
    }

    // Stats summary
    statsSection.style.display = "block";
    document.getElementById("totalMatches").textContent = history.length;
    const wins = history.filter((m) => m.submitted && !m.alreadySubmitted).length;
    document.getElementById("winRate").textContent = history.length > 0 ? `${Math.round((wins / history.length) * 100)}%` : "-";

    // Last match highlight
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
          <span class="badge ${last.status === 'submitted' ? 'badge-success' : last.status === 'already_submitted' ? 'badge-info' : 'badge-error'}">
            ${last.status === 'submitted' ? '✓ Wysłany' : last.status === 'already_submitted' ? '↻ Już zgłoszony' : '✗ Błąd'}
          </span>
        </div>
      `;

      // Timeline
      timelineSection.style.display = "block";
      updateTimeline(last.status);
    }

    historyContainer.innerHTML = history
      .map((m) => {
        const date = new Date(m.timestamp);
        const timeStr = `${date.getDate()}.${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
        const statusBadge =
          m.status === "submitted" ? '<span class="badge badge-success">✓ Wysłany</span>'
          : m.status === "already_submitted" ? '<span class="badge badge-info">↻ Już zgłoszony</span>'
          : '<span class="badge badge-error">✗ Błąd</span>';

        return `
          <div class="match-card">
            <div class="players">${m.player1} vs ${m.player2} — <strong>${m.score || "?"}</strong></div>
            <div class="meta">
              <span>${m.league || "Liga"} · ${timeStr}</span>
              ${statusBadge}
            </div>
          </div>
        `;
      })
      .join("");
  });

  // ─── Buttons ───
  openBtn.onclick = () => bAPI.tabs.create({ url: "https://play.autodarts.io" });
});

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
      dot.className = "timeline-dot completed";
      dot.textContent = "✓";
      label.className = "timeline-label";
    } else if (status === "failed" && step.id === "tl-submitted") {
      dot.className = "timeline-dot failed";
      dot.textContent = "✗";
      label.className = "timeline-label";
    } else {
      dot.className = "timeline-dot pending";
      dot.textContent = "●";
      label.className = "timeline-label muted";
    }
  });
}
