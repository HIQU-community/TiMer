/* TiMer — storage.js
 * Namespaced localStorage wrapper with safe JSON handling. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const PREFIX = "timer.v1.";

  const Store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (err) {
        console.warn("TiMer storage read failed:", key, err);
        return fallback;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch (err) {
        console.warn("TiMer storage write failed:", key, err);
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(PREFIX + key);
      } catch (err) { /* noop */ }
    },
  };

  TiMer.store = Store;
})();
