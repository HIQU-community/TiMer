/* TiMer — voice.js
 * Voice-controlled countdown via the Web Speech API (SpeechRecognition).
 * Spoken feedback uses SpeechSynthesis (speech.js) — recognition and
 * announcements are deliberately separate concerns. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = typeof SR !== "undefined";

  const NUM_WORDS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
    nineteen: 19, twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  };

  const el = {};
  let rec = null;
  let listening = false;

  function parseNumber(word) {
    if (/^\d+$/.test(word)) return parseInt(word, 10);
    return NUM_WORDS[word] !== undefined ? NUM_WORDS[word] : null;
  }

  /** Extract a duration (ms) from free text, or null when absent. */
  function parseDuration(text) {
    const t = " " + text.toLowerCase().replace(/-/g, " ").replace(/[^a-z0-9 ]/g, " ") + " ";
    let totalSec = 0;
    let found = false;

    if (/\bhalf an hour\b/.test(t)) { totalSec += 1800; found = true; }

    const re = /(a|an|\w+|\d+)\s+(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/g;
    let m;
    while ((m = re.exec(t)) !== null) {
      let n;
      if (m[1] === "a" || m[1] === "an") n = 1;
      else n = parseNumber(m[1]);
      if (n === null) continue;
      const unit = m[2];
      if (unit.startsWith("h")) totalSec += n * 3600;
      else if (unit.startsWith("min")) totalSec += n * 60;
      else totalSec += n;
      found = true;
    }
    return found && totalSec > 0 ? totalSec * 1000 : null;
  }

  function speakRemaining() {
    const st = TiMer.cd.status();
    if (st.status === "idle") {
      TiMer.speak.say("No countdown is set.");
      TiMer.app.toast("No countdown is set", "warn");
      return;
    }
    if (st.status === "completed") {
      TiMer.speak.say("Your countdown is complete.");
      return;
    }
    const total = Math.ceil(st.remainingMs / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    const parts = [];
    if (m > 0) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
    if (s > 0) parts.push(`${s} second${s === 1 ? "" : "s"}`);
    const text = parts.length ? parts.join(" and ") : "less than a second";
    TiMer.speak.say(`${text} remaining.`);
    TiMer.app.toast(`${st.label}: ${TiMer.U.fmtHMS(st.remainingMs, true)} left`);
  }

  function logCommand(text, response) {
    const li = document.createElement("li");
    const now = new Date();
    li.innerHTML = `
      <span class="v-cmd"></span>
      <span class="v-time">${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${response}</span>`;
    li.querySelector(".v-cmd").textContent = "“" + text + "”";
    el.log.prepend(li);
    el.logEmpty.hidden = true;
    while (el.log.children.length > 12) el.log.lastChild.remove();
  }

  function handleCommand(raw) {
    const text = raw.trim();
    if (!text) return;
    const t = text.toLowerCase();

    const isTimerRef = /timer|countdown/.test(t);

    // Status questions
    if (/how much|time left|remaining|status|\bleft\b/.test(t)) {
      logCommand(text, "status");
      speakRemaining();
      return;
    }

    // Pause
    if (/\bpause\b/.test(t)) {
      logCommand(text, "paused");
      TiMer.cd.pause();
      return;
    }

    // Resume
    if (/\b(resume|continue|unpause)\b/.test(t)) {
      logCommand(text, "resumed");
      TiMer.cd.resume();
      return;
    }

    // Cancel / stop
    if (/\b(cancel|abort)\b/.test(t) || (/\bstop\b/.test(t) && isTimerRef)) {
      logCommand(text, "cancelled");
      TiMer.cd.reset();
      TiMer.speak.say("Timer cancelled.");
      TiMer.app.toast("Timer cancelled");
      return;
    }

    // Reset
    if (/\breset\b/.test(t)) {
      logCommand(text, "reset");
      TiMer.cd.reset();
      TiMer.speak.say("Timer reset.");
      return;
    }

    // Set / start with duration
    if (/\b(set|start)\b/.test(t) || isTimerRef) {
      const ms = parseDuration(t);
      if (ms) {
        logCommand(text, `set ${TiMer.U.fmtHMS(ms)}`);
        TiMer.cd.setDuration(ms, "Voice countdown");
        TiMer.cd.start();
        return;
      }
    }

    logCommand(text, "not recognized");
    TiMer.app.toast(`Couldn't recognize a command in “${text}”`, "warn");
  }

  function startListening() {
    if (!supported || listening) return;
    try {
      rec = new SR();
    } catch (err) {
      setUnsupported("Speech recognition failed to start in this browser.");
      return;
    }
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = true;

    rec.onstart = () => {
      listening = true;
      el.mic.setAttribute("aria-pressed", "true");
      el.hint.textContent = "Listening… speak a command";
    };

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          handleCommand(e.results[i][0].transcript);
        }
      }
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        stopListening();
        el.hint.textContent = "Microphone access was blocked. Allow the microphone in your browser to use voice control.";
        TiMer.app.toast("Microphone permission blocked", "error");
      } else if (e.error === "no-speech") {
        el.hint.textContent = "Didn't catch that — try again.";
      } else if (e.error === "network") {
        // SpeechRecognition in Chrome uses a network service.
        el.hint.textContent = "Voice recognition needs a network connection in this browser.";
      }
    };

    rec.onend = () => {
      if (listening) {
        // keep the session alive while the user stays in listening mode
        try { rec.start(); } catch (err) { stopListening(); }
      }
    };

    try { rec.start(); } catch (err) { /* already started */ }
  }

  function stopListening() {
    listening = false;
    if (rec) {
      try { rec.stop(); } catch (err) { /* noop */ }
    }
    if (el.mic) {
      el.mic.setAttribute("aria-pressed", "false");
      el.hint.textContent = "Tap the microphone and say a command";
    }
  }

  function setUnsupported(msg) {
    el.badge.textContent = "Not supported";
    el.badge.classList.add("unsupported");
    el.badge.classList.remove("supported");
    el.mic.disabled = true;
    el.hint.textContent = msg;
  }

  const Voice = {
    supported,
    parseDuration, // exposed for testing

    init() {
      el.mic = document.getElementById("micBtn");
      el.hint = document.getElementById("micHint");
      el.badge = document.getElementById("voiceSupportBadge");
      el.log = document.getElementById("voiceLog");
      el.logEmpty = document.getElementById("voiceLogEmpty");

      if (!supported) {
        setUnsupported("Voice recognition isn't supported in this browser — the manual controls below work everywhere.");
        return;
      }

      el.badge.textContent = "Voice ready";
      el.badge.classList.add("supported");

      el.mic.addEventListener("click", () => {
        if (listening) stopListening();
        else startListening();
      });

      // Release the microphone when the page hides
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && listening) stopListening();
      });
    },
  };

  TiMer.voice = Voice;
})();
