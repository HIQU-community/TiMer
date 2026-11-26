/* TiMer — timers.js
 * Multiple independent countdown timers.
 * Each card owns its state; timing derives from performance.now(). */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const U = TiMer.U;
  const KEY = "mtimers";

  let items = [];

  const el = {};
  let editingId = null;

  const ICONS = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8a8.5 8.5 0 1 1-1 6.5"/><path d="M3.5 3.5V8H8"/></svg>',
    dup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5l4 4L8 20H4v-4z"/><path d="M12.5 7.5l4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5h15"/><path d="M8 6.5V5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 5v1.5"/><path d="M6.5 6.5l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"/></svg>',
  };

  function save() { TiMer.store.set(KEY, items); }

  function load() {
    items = TiMer.store.get(KEY, []);
    // A timer cannot secretly elapse while the app was closed:
    // anything saved as running returns as paused with its last known remainder.
    items.forEach((it) => {
      if (it.state === "running") it.state = "paused";
      it.endAt = 0;
    });
  }

  function byId(id) { return items.find((t) => t.id === id); }

  function remaining(it) {
    if (it.state === "running") return Math.max(0, it.endAt - U.now());
    return it.remainingMs;
  }

  function complete(it) {
    it.state = "completed";
    it.remainingMs = 0;
    TiMer.sound.complete();
    TiMer.notify.send("TiMer — Time's up", `Timer “${it.name}” has finished.`);
    TiMer.speak.say(`Timer ${it.name} is complete.`);
    TiMer.app.toast(`“${it.name}” finished`);
    TiMer.history.add({ type: "timer", name: it.name, durationMs: it.durationMs });
    U.emit("timers:changed");
  }

  function setStatus(text) {
    const sr = document.getElementById("srStatus");
    if (sr) sr.textContent = text;
  }

  /* ---------- Rendering ---------- */

  function badgeFor(state) {
    return state === "running" ? "Running"
      : state === "paused" ? "Paused"
      : state === "completed" ? "Done" : "Ready";
  }

  function toggleFor(state) {
    return {
      label: state === "running" ? "Pause"
        : state === "paused" ? "Resume"
        : state === "completed" ? "Restart" : "Start",
      icon: state === "running" ? ICONS.pause : ICONS.play,
    };
  }

  function card(it) {
    const rem = remaining(it);
    const p = it.durationMs > 0 ? Math.round((1 - rem / it.durationMs) * 100) : 0;
    const badge = badgeFor(it.state);
    const toggle = toggleFor(it.state);

    const article = document.createElement("article");
    article.className = `timer-card status-${it.state}`;
    article.dataset.id = it.id;
    article.innerHTML = `
      <div class="timer-card-top">
        <h3 class="timer-card-name"></h3>
        <span class="card-status">${badge}</span>
      </div>
      <div class="card-mid">
        <div class="card-ring" style="--p: ${U.clampInt(p, 0, 100, 0)}"></div>
        <div class="card-time-block">
          <span class="card-time">${U.fmtHMS(rem, true)}</span>
          <span class="card-dur">of ${U.fmtHMS(it.durationMs, true)}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="card-btn main" data-action="toggle">${toggle.icon}<span>${toggle.label}</span></button>
        <button class="card-btn" data-action="reset" title="Reset" aria-label="Reset timer">${ICONS.reset}</button>
        <button class="card-btn" data-action="duplicate" title="Duplicate" aria-label="Duplicate timer">${ICONS.dup}</button>
        <button class="card-btn" data-action="edit" title="Edit" aria-label="Edit timer">${ICONS.edit}</button>
        <button class="card-btn danger" data-action="delete" title="Delete" aria-label="Delete timer">${ICONS.trash}</button>
      </div>`;
    article.querySelector(".timer-card-name").textContent = it.name;
    return article;
  }

  function render() {
    el.grid.innerHTML = "";
    el.empty.hidden = items.length > 0;
    items.forEach((it) => el.grid.appendChild(card(it)));
  }

  function renderCard(it) {
    const old = el.grid.querySelector(`[data-id="${it.id}"]`);
    const fresh = card(it);
    if (old) old.replaceWith(fresh);
    else el.grid.appendChild(fresh);
    el.empty.hidden = items.length > 0;
  }

  /** Patch an existing card in place — no DOM rebuild, no animation replay. */
  function updateCard(it) {
    const node = el.grid.querySelector(`[data-id="${it.id}"]`);
    if (!node) { render(); return; }
    const rem = remaining(it);
    const p = it.durationMs > 0 ? Math.round((1 - rem / it.durationMs) * 100) : 0;
    const toggle = toggleFor(it.state);

    node.className = `timer-card status-${it.state}`;
    node.querySelector(".card-status").textContent = badgeFor(it.state);
    node.querySelector(".card-ring").style.setProperty("--p", String(U.clampInt(p, 0, 100, 0)));
    node.querySelector(".card-time").textContent = U.fmtHMS(rem, true);
    node.querySelector(".card-dur").textContent = "of " + U.fmtHMS(it.durationMs, true);
    const toggleBtn = node.querySelector('[data-action="toggle"]');
    toggleBtn.innerHTML = `${toggle.icon}<span>${toggle.label}</span>`;
  }

  /* ---------- Actions ---------- */

  function startItem(it) {
    if (it.state === "running") return;
    if (it.state === "completed") { it.remainingMs = it.durationMs; it.warned = false; }
    if (it.remainingMs <= 0) it.remainingMs = it.durationMs;
    it.endAt = U.now() + it.remainingMs;
    it.state = "running";
    TiMer.sound.tick();
    setStatus(`Timer ${it.name} started`);
    U.emit("timers:changed");
  }

  function pauseItem(it) {
    if (it.state !== "running") return;
    it.remainingMs = Math.max(0, it.endAt - U.now());
    it.state = "paused";
    TiMer.sound.tick();
    setStatus(`Timer ${it.name} paused`);
    U.emit("timers:changed");
  }

  const MultiTimers = {
    list: () => items,

    /** Count of currently running timers (for the topbar indicator). */
    runningCount() {
      return items.filter((t) => t.state === "running").length;
    },

    activeItems() {
      return items.filter((t) => t.state === "running" || t.state === "paused");
    },

    tick() {
      items.forEach((it) => {
        if (it.state !== "running") return;
        it.remainingMs = Math.max(0, it.endAt - U.now());

        const s = TiMer.store.get("settings", {});
        if (!it.warned && s.warning !== false &&
            it.durationMs > 90000 && it.remainingMs <= 60000 && it.remainingMs > 0) {
          it.warned = true;
          TiMer.sound.warning();
          TiMer.speak.say(`One minute remaining on ${it.name}.`);
          TiMer.app.toast(`One minute remaining on “${it.name}”`, "warn");
        }

        if (it.remainingMs <= 0) complete(it);
        updateCard(it);
      });
    },

    add(data) {
      const it = Object.assign({
        id: U.uid(),
        name: "Timer",
        durationMs: 60000,
        remainingMs: 60000,
        state: "idle",
        endAt: 0,
        warned: false,
      }, data);
      it.remainingMs = it.durationMs;
      items.unshift(it);
      save();
      render();
      U.emit("timers:changed");
      return it;
    },

    openForm(existingId) {
      editingId = existingId || null;
      el.form.hidden = false;
      el.formTitle.textContent = editingId ? "Edit timer" : "New timer";
      el.saveBtn.textContent = editingId ? "Save changes" : "Add timer";
      if (editingId) {
        const it = byId(editingId);
        el.name.value = it.name;
        const total = Math.round(it.durationMs / 1000);
        el.h.value = Math.floor(total / 3600);
        el.m.value = Math.floor((total % 3600) / 60);
        el.s.value = total % 60;
      } else {
        el.form.reset();
        el.h.value = 0; el.m.value = 5; el.s.value = 0;
      }
      el.name.focus();
    },

    closeForm() {
      el.form.hidden = true;
      editingId = null;
    },

    handleGridClick(e) {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const id = btn.closest("[data-id]").dataset.id;
      const it = byId(id);
      if (!it) return;
      const action = btn.dataset.action;

      if (action === "toggle") {
        if (it.state === "running") pauseItem(it);
        else startItem(it);
        save(); updateCard(it);
      } else if (action === "reset") {
        it.state = "idle";
        it.remainingMs = it.durationMs;
        it.warned = false;
        it.endAt = 0;
        TiMer.sound.tick();
        save(); updateCard(it);
        U.emit("timers:changed");
      } else if (action === "duplicate") {
        MultiTimers.add({ name: it.name + " copy", durationMs: it.durationMs });
        TiMer.app.toast(`Duplicated “${it.name}”`);
      } else if (action === "edit") {
        MultiTimers.openForm(id);
      } else if (action === "delete") {
        TiMer.app.confirm("Delete timer?", `“${it.name}” will be permanently removed.`)
          .then((ok) => {
            if (!ok) return;
            items = items.filter((t) => t.id !== id);
            save(); render();
            U.emit("timers:changed");
            TiMer.app.toast(`Deleted “${it.name}”`);
          });
      }
    },

    handleFormSubmit(e) {
      e.preventDefault();
      const name = el.name.value.trim() || "Timer";
      const ms = U.hmsToMs(
        U.clampInt(el.h.value, 0, 99, 0),
        U.clampInt(el.m.value, 0, 59, 0),
        U.clampInt(el.s.value, 0, 59, 0)
      );
      if (ms <= 0) {
        TiMer.app.toast("Set a duration greater than zero", "warn");
        return;
      }
      if (editingId) {
        const it = byId(editingId);
        it.name = name;
        it.durationMs = ms;
        it.remainingMs = ms;
        it.state = "idle";
        it.warned = false;
        it.endAt = 0;
        TiMer.app.toast(`Updated “${name}”`);
      } else {
        MultiTimers.add({ name, durationMs: ms });
        TiMer.app.toast(`Timer “${name}” created`);
      }
      save();
      MultiTimers.closeForm();
      render();
      U.emit("timers:changed");
    },

    init() {
      el.grid = document.getElementById("timerGrid");
      el.empty = document.getElementById("mtEmpty");
      el.form = document.getElementById("mtForm");
      el.formTitle = document.getElementById("mtFormTitle");
      el.name = document.getElementById("mtName");
      el.h = document.getElementById("mtHours");
      el.m = document.getElementById("mtMinutes");
      el.s = document.getElementById("mtSeconds");
      el.saveBtn = document.getElementById("mtSaveBtn");

      load();
      render();

      document.getElementById("mtNewBtn").addEventListener("click", () => MultiTimers.openForm());
      document.getElementById("mtEmptyNew").addEventListener("click", () => MultiTimers.openForm());
      document.getElementById("mtCancelBtn").addEventListener("click", () => MultiTimers.closeForm());
      el.form.addEventListener("submit", MultiTimers.handleFormSubmit);
      el.grid.addEventListener("click", MultiTimers.handleGridClick);
    },
  };

  TiMer.timers = MultiTimers;
})();
