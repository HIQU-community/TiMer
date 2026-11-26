/* TiMer — history.js
 * Local history of completed timers and finished stopwatch sessions. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const KEY = "history";
  const MAX = 50;

  const History = {
    list() {
      return TiMer.store.get(KEY, []);
    },

    add(entry) {
      const items = History.list();
      items.unshift(Object.assign({ id: TiMer.U.uid(), completedAt: Date.now() }, entry));
      if (items.length > MAX) items.length = MAX;
      TiMer.store.set(KEY, items);
      TiMer.U.emit("history:changed");
    },

    clear() {
      TiMer.store.set(KEY, []);
      TiMer.U.emit("history:changed");
    },

    render() {
      const items = History.list();
      const listEl = document.getElementById("historyList");
      const emptyEl = document.getElementById("hiEmpty");
      const clearBtn = document.getElementById("hiClearBtn");
      if (!listEl) return;

      listEl.innerHTML = "";
      emptyEl.hidden = items.length > 0;
      clearBtn.disabled = items.length === 0;

      items.forEach((it) => {
        const li = document.createElement("li");
        const isSw = it.type === "stopwatch";
        const dur = TiMer.U.fmtHMS(it.durationMs, true);
        const meta = isSw
          ? `Stopwatch session · ${it.laps || 0} lap${(it.laps || 0) === 1 ? "" : "s"} · ${dur}`
          : `Timer · ${dur}`;
        li.innerHTML = `
          <div class="history-main">
            <span class="history-icon${isSw ? " sw" : ""}" aria-hidden="true">
              ${isSw
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9.5V13l2.6 2.6"/><path d="M9.5 2.5h5"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="4" rx="1.2"/><path d="M12 8v5l3 2"/><circle cx="12" cy="14" r="8"/></svg>'}
            </span>
            <div>
              <p class="history-name"></p>
              <p class="history-meta">${meta}</p>
            </div>
          </div>
          <span class="history-when">${TiMer.U.fmtDateTime(it.completedAt)}</span>`;
        li.querySelector(".history-name").textContent = it.name;
        listEl.appendChild(li);
      });
    },
  };

  TiMer.history = History;
})();
