/* TiMer — utils.js
 * Shared helpers: ids, formatting, event bus, confirmation modal glue. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const U = {
    now: () => performance.now(),

    uid() {
      return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    },

    clampInt(value, min, max, fallback) {
      const n = parseInt(value, 10);
      if (Number.isNaN(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    },

    pad2(n) { return String(n).padStart(2, "0"); },

    /** ms -> "HH:MM:SS" (hours omitted when zero unless forceHours) */
    fmtHMS(ms, forceHours) {
      const total = Math.max(0, Math.round(ms / 1000));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (h > 0 || forceHours) return `${U.pad2(h)}:${U.pad2(m)}:${U.pad2(s)}`;
      return `${U.pad2(m)}:${U.pad2(s)}`;
    },

    /** ms -> "HH:MM:SS.cs" centiseconds for the stopwatch */
    fmtStopwatch(ms) {
      const total = Math.max(0, ms);
      const h = Math.floor(total / 3600000);
      const m = Math.floor((total % 3600000) / 60000);
      const s = Math.floor((total % 60000) / 1000);
      const cs = Math.floor((total % 1000) / 10);
      return {
        h: U.pad2(h),
        m: U.pad2(m),
        s: U.pad2(s),
        cs: U.pad2(cs),
      };
    },

    fmtDateTime(ts) {
      const d = new Date(ts);
      return d.toLocaleString(undefined, {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    },

    fmtRelative(ts) {
      const diff = Date.now() - ts;
      const min = Math.floor(diff / 60000);
      if (min < 1) return "just now";
      if (min < 60) return `${min}m ago`;
      const hrs = Math.floor(min / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    },

    hmsToMs(h, m, s) {
      return ((h * 3600) + (m * 60) + s) * 1000;
    },

    /* ---------- tiny event bus ---------- */
    _events: {},
    on(evt, fn) {
      (U._events[evt] = U._events[evt] || []).push(fn);
    },
    emit(evt, data) {
      (U._events[evt] || []).forEach((fn) => {
        try { fn(data); } catch (err) { console.error("TiMer event error:", evt, err); }
      });
    },
  };

  TiMer.U = U;
})();
