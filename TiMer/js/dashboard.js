/* TiMer — dashboard.js
 * Dashboard composition: greeting, quick launchers, active timers,
 * recent presets, and recent activity. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const U = TiMer.U;
  const el = {};

  const DASH_CHIPS = [
    ["5 min", 5 * 60000],
    ["10 min", 10 * 60000],
    ["15 min", 15 * 60000],
    ["25 min", 25 * 60000],
    ["30 min", 30 * 60000],
  ];

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return "Good night";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  function renderHead() {
    const d = new Date();
    el.title.textContent = greeting();
    el.date.textContent = d.toLocaleDateString(undefined, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  }

  function renderActive() {
    const active = TiMer.timers.activeItems();
    const cd = TiMer.cd.status();

    const rows = [];
    if (cd.status === "running" || cd.status === "paused") {
      rows.push({
        name: cd.label,
        meta: cd.status === "running" ? "Voice countdown · running" : "Voice countdown · paused",
        time: cd.remainingText,
      });
    }
    active.forEach((t) => {
      rows.push({
        name: t.name,
        meta: t.state === "running" ? "Timer · running" : "Timer · paused",
        time: U.fmtHMS(t.remainingMs, true),
      });
    });

    el.activeList.innerHTML = "";
    el.activeEmpty.hidden = rows.length > 0;
    rows.slice(0, 6).forEach((r) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div style="min-width:0">
          <p class="mini-name"></p>
          <p class="mini-meta">${r.meta}</p>
        </div>
        <span class="mini-time">${r.time}</span>`;
      li.querySelector(".mini-name").textContent = r.name;
      el.activeList.appendChild(li);
    });
  }

  function renderPresets() {
    const recent = TiMer.presets.recent();
    el.presetsList.innerHTML = "";
    el.presetsEmpty.hidden = recent.length > 0;
    recent.slice(0, 5).forEach((p) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div style="min-width:0">
          <p class="mini-name"></p>
          <p class="mini-meta">${U.fmtHMS(p.ms)} · used ${U.fmtRelative(p.at)}</p>
        </div>
        <span class="mini-badge">Launch</span>`;
      li.querySelector(".mini-name").textContent = p.name;
      li.style.cursor = "pointer";
      li.setAttribute("role", "button");
      li.setAttribute("tabindex", "0");
      const fire = () => {
        const s = TiMer.store.get("settings", {});
        TiMer.cd.launch(p.name, p.ms, s.autoStart !== false);
      };
      li.addEventListener("click", fire);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); }
      });
      el.presetsList.appendChild(li);
    });
  }

  function renderActivity() {
    const items = TiMer.history.list().slice(0, 5);
    el.activityList.innerHTML = "";
    el.activityEmpty.hidden = items.length > 0;
    items.forEach((it) => {
      const li = document.createElement("li");
      const isSw = it.type === "stopwatch";
      li.innerHTML = `
        <div style="min-width:0">
          <p class="mini-name"></p>
          <p class="mini-meta">${isSw ? "Stopwatch" : "Timer"} · ${U.fmtHMS(it.durationMs, true)}</p>
        </div>
        <span class="mini-meta">${U.fmtRelative(it.completedAt)}</span>`;
      li.querySelector(".mini-name").textContent = it.name;
      el.activityList.appendChild(li);
    });
  }

  function buildChips() {
    el.chips.innerHTML = "";
    DASH_CHIPS.forEach(([label, ms]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = label;
      b.addEventListener("click", () => {
        TiMer.cd.launch("Quick countdown", ms, true);
        TiMer.app.toast(`${label} countdown started`);
      });
      el.chips.appendChild(b);
    });
  }

  const Dashboard = {
    render() { renderHead(); renderActive(); },
    renderActive,
    renderPresets,
    renderActivity,

    init() {
      el.title = document.getElementById("dashTitle");
      el.date = document.getElementById("dashDate");
      el.chips = document.getElementById("dashQuickChips");
      el.activeList = document.getElementById("dashActiveTimers");
      el.activeEmpty = document.getElementById("dashActiveEmpty");
      el.presetsList = document.getElementById("dashRecentPresets");
      el.presetsEmpty = document.getElementById("dashPresetsEmpty");
      el.activityList = document.getElementById("dashActivity");
      el.activityEmpty = document.getElementById("dashActivityEmpty");

      buildChips();
      renderHead();
      renderActive();
      renderPresets();
      renderActivity();

      U.on("timers:changed", renderActive);
      U.on("history:changed", () => { renderActivity(); TiMer.history.render(); });
      U.on("presets:changed", renderPresets);

      // refresh greeting/date at the top of each minute
      setInterval(renderHead, 30000);
    },
  };

  TiMer.dash = Dashboard;
})();
