/* TiMer — speech.js
 * SpeechSynthesis wrapper (spoken announcements).
 * This is separate from voice *recognition* (voice.js). */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const supported = "speechSynthesis" in window;

  const Speak = {
    supported,

    say(text, opts) {
      const s = TiMer.store.get("settings", {});
      if (!supported || s.speech === false) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = (opts && opts.rate) || 1;
        u.pitch = 1;
        u.volume = 1;
        window.speechSynthesis.speak(u);
      } catch (err) { /* synthesis unavailable */ }
    },

    stop() {
      if (supported) {
        try { window.speechSynthesis.cancel(); } catch (err) { /* noop */ }
      }
    },
  };

  TiMer.speak = Speak;
})();
