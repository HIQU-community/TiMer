/* TiMer — presets.js
 * Default preset library + user-saved custom presets. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const U = TiMer.U;
  const KEY_CUSTOM = "presets.custom";
  const KEY_RECENT = "presets.recent";

  const DEFAULTS = [
    { group: "Productivity", presets: [
      { id: "p-pomodoro", name: "Pomodoro Focus", ms: 25 * 60000 },
      { id: "p-short-break", name: "Short Break", ms: 5 * 60000 },
      { id: "p-deep-work", name: "Deep Work", ms: 50 * 60000 },
      { id: "p-meeting", name: "Meeting", ms: 30 * 60000 },
    ]},
    { group: "Study", presets: [
      { id: "p-study-sprint", name: "Study Sprint", ms: 45 * 60000 },
      { id: "p-review", name: "Review Session", ms: 15 * 60000 },
      { id: "p-long-focus", name: "Long Focus", ms: 90 * 60000 },
    ]},
    { group: "Breaks", presets: [
      { id: "p-breathe", name: "Breathing Exercise", ms: 60000 },
      { id: "p-coffee", name: "Coffee Break", ms: 10 * 60000 },
      { id: "p-walk", name: "Walk", ms: 15 * 60000 },
    ]},
    { group: "Cooking", presets: [
      { id: "p-soft-egg", name: "Soft-Boiled Egg", ms: 6 * 60000 },
      { id: "p-tea", name: "Tea Steeping", ms: 3 * 60000 },
      { id: "p-pasta", name: "Pasta", ms: 10 * 60000 },
      { id: "p-rice", name: "Rice", ms: 18 * 60000 },
    ]},
    { group: "Everyday", presets: [
      { id: "p-tidy", name: "Quick Tidy-Up", ms: 15 * 60000 },
      { id: "p-laundry", name: "Laundry", ms: 45 * 60000 },
      { id: "p-nap", name: "Power Nap", ms: 20 * 60000 },
    ]},
  ];

  const el = {};
  let editingId = null;

  function customList() { return TiMer.store.get(KEY_CUSTOM, []); }
  function recentList() { return TiMer.store.get(KEY_RECENT, []); }

  function rememberUse(preset) {
    let recent = recentList().filter((r) => r.id !== preset.id);
    recent.unshift({ id: preset.id, name: preset.name, ms: preset.ms, at: Date.now() });
    if (recent.length > 6) recent.length = 6;
    TiMer.store.set(KEY_RECENT, recent);
  }

  function launch(preset) {
    rememberUse(preset);
    const s = TiMer.store.get("settings", {});
    TiMer.cd.launch(preset.name, preset.ms, s.autoStart !== false);
    TiMer.app.toast(`“${preset.name}” — ${U.fmtHMS(preset.ms)} ${s.autoStart !== false ? "started" : "ready"}`);
    U.emit("presets:changed");
  }

  function card(preset, isCustom) {
    const article = document.createElement("article");
    article.className = "preset-card";
    article.innerHTML = `
      <div class="preset-card-top">
        <h3 class="preset-name"></h3>
        <span class="preset-dur">${U.fmtHMS(preset.ms)}</span>
      </div>
      <div class="preset-actions">
        <button class="card-btn main" data-action="launch">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>
          <span>Start</span>
        </button>
        ${isCustom ? `
        <button class="card-btn" data-action="edit" title="Edit" aria-label="Edit preset">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5l4 4L8 20H4v-4z"/><path d="M12.5 7.5l4 4"/></svg>
        </button>
        <button class="card-btn danger" data-action="delete" title="Delete" aria-label="Delete preset">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5h15"/><path d="M8 6.5V5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 5v1.5"/><path d="M6.5 6.5l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"/></svg>
        </button>` : ""}
      </div>`;
    article.querySelector(".preset-name").textContent = preset.name;
    article.dataset.id = preset.id;
    article.dataset.custom = isCustom ? "1" : "0";
    return article;
  }

  function render() {
    el.groups.innerHTML = "";

    const custom = customList();
    if (custom.length > 0) {
      el.groups.appendChild(groupEl("My Presets", custom, true));
    }
    DEFAULTS.forEach((g) => {
      el.groups.appendChild(groupEl(g.group, g.presets, false));
    });
  }

  function groupEl(title, presets, isCustom) {
    const section = document.createElement("section");
    section.className = "preset-group";
    const h = document.createElement("h2");
    h.textContent = title;
    const grid = document.createElement("div");
    grid.className = "preset-grid";
    presets.forEach((p) => grid.appendChild(card(p, isCustom)));
    section.appendChild(h);
    section.appendChild(grid);
    return section;
  }

  const Presets = {
    recent: recentList,

    render,

    handleClick(e) {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const wrap = btn.closest("[data-id]");
      if (!wrap) return;
      const id = wrap.dataset.id;
      const isCustom = wrap.dataset.custom === "1";
      const action = btn.dataset.action;

      if (action === "launch") {
        const preset = isCustom
          ? customList().find((p) => p.id === id)
          : DEFAULTS.flatMap((g) => g.presets).find((p) => p.id === id);
        if (preset) launch(preset);
        return;
      }

      if (action === "edit") {
        const p = customList().find((x) => x.id === id);
        if (!p) return;
        editingId = id;
        el.form.hidden = false;
        el.formTitle.textContent = "Edit preset";
        el.saveBtn.textContent = "Save changes";
        el.name.value = p.name;
        const total = Math.round(p.ms / 1000);
        el.h.value = Math.floor(total / 3600);
        el.m.value = Math.floor((total % 3600) / 60);
        el.s.value = total % 60;
        el.name.focus();
        return;
      }

      if (action === "delete") {
        const p = customList().find((x) => x.id === id);
        if (!p) return;
        TiMer.app.confirm("Delete preset?", `“${p.name}” will be permanently removed.`)
          .then((ok) => {
            if (!ok) return;
            TiMer.store.set(KEY_CUSTOM, customList().filter((x) => x.id !== id));
            render();
            U.emit("presets:changed");
            TiMer.app.toast(`Deleted preset “${p.name}”`);
          });
      }
    },

    handleSubmit(e) {
      e.preventDefault();
      const name = el.name.value.trim();
      const ms = U.hmsToMs(
        U.clampInt(el.h.value, 0, 99, 0),
        U.clampInt(el.m.value, 0, 59, 0),
        U.clampInt(el.s.value, 0, 59, 0)
      );
      if (!name) { TiMer.app.toast("Give the preset a name", "warn"); return; }
      if (ms <= 0) { TiMer.app.toast("Set a duration greater than zero", "warn"); return; }

      const list = customList();
      if (editingId) {
        const p = list.find((x) => x.id === editingId);
        if (p) { p.name = name; p.ms = ms; }
        TiMer.app.toast(`Preset “${name}” updated`);
      } else {
        list.unshift({ id: U.uid(), name, ms });
        TiMer.app.toast(`Preset “${name}” saved`);
      }
      TiMer.store.set(KEY_CUSTOM, list);
      editingId = null;
      el.form.hidden = true;
      render();
      U.emit("presets:changed");
    },

    init() {
      el.groups = document.getElementById("presetGroups");
      el.form = document.getElementById("prForm");
      el.formTitle = document.getElementById("prFormTitle");
      el.name = document.getElementById("prName");
      el.h = document.getElementById("prHours");
      el.m = document.getElementById("prMinutes");
      el.s = document.getElementById("prSeconds");
      el.saveBtn = document.getElementById("prSaveBtn");

      render();

      document.getElementById("prNewBtn").addEventListener("click", () => {
        editingId = null;
        el.form.hidden = false;
        el.formTitle.textContent = "New preset";
        el.saveBtn.textContent = "Save preset";
        el.form.reset();
        el.h.value = 0; el.m.value = 5; el.s.value = 0;
        el.name.focus();
      });
      document.getElementById("prCancelBtn").addEventListener("click", () => {
        el.form.hidden = true;
        editingId = null;
      });
      el.form.addEventListener("submit", Presets.handleSubmit);
      el.groups.addEventListener("click", Presets.handleClick);
    },
  };

  TiMer.presets = Presets;
})();
