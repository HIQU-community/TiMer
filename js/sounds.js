/* TiMer — sounds.js
 * Local sound effects. Callers decide which alert is appropriate;
 * the completion-sound setting is honored here centrally. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const cache = {};

  function playFile(name, volume) {
    try {
      if (!cache[name]) cache[name] = new Audio("assets/sounds/" + name);
      const a = cache[name].cloneNode();
      a.volume = volume;
      const p = a.play();
      if (p && p.catch) p.catch(() => { /* autoplay blocked until user gesture */ });
    } catch (err) { /* audio unavailable — stay silent */ }
  }

  const Sound = {
    tick() { playFile("tick.wav", 0.35); },

    complete() {
      const s = TiMer.store.get("settings", {});
      if (s.sound === false) return;
      playFile("complete.wav", 0.75);
    },

    warning() {
      const s = TiMer.store.get("settings", {});
      if (s.sound === false) return;
      playFile("warning.wav", 0.55);
    },
  };

  TiMer.sound = Sound;
})();
