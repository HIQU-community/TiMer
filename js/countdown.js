/* TiMer — countdown.js
 * The single countdown engine, shared by the Voice Countdown view,
 * quick-launch chips, presets, and voice commands.
 * Time is derived from performance.now() timestamps. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const U = TiMer.U;
  const RING_C = 2 * Math.PI * 118; // matches the SVG r=118

  const QUICK_DURATIONS = [
    ["30 sec", 30 * 1000],
    ["1 min", 60 * 1000],
    ["3 min", 3 * 60 * 1000],
    ["5 min", 5 * 60 * 1000],
    ["10 min", 10 * 60 * 1000],
    ["15 min", 15 * 60 * 1000],
    ["25 min", 25 * 60 * 1000],
    ["30 min", 30 * 60 * 1000],
    ["45 min", 45 * 60 * 1000],
    ["60 min", 60 * 60 * 1000],
  ];

  const state = {
    durationMs: 5 * 60 * 1000,
    remainingMs: 5 * 60 * 1000,
    status: "idle", // idle | running | paused | completed
    endAt: 0,
    warned: false,
    label: "Countdown",
  };

  const el = {};

  function cacheEls() {
    el.display = document.getElementById("cdDisplay");
    el.label = document.getElementById("cdStateLabel");
    el.ring = document.getElementById("cdRing");
    el.h = document.getElementById("cdHours");
    el.m = document.getElementById("cdMinutes");
    el.s = document.getElementById("cdSeconds");
    el.chips = document.getElementById("cdQuickChips");
    el.start = document.getElementById("cdStartBtn");
    el.pause = document.getElementById("cdPauseBtn");
    el.reset = document.getElementById("cdResetBtn");
  }

  function progress() {
    if (state.durationMs <= 0) return 0;
    if (state.status === "completed") return 1;
    return U.clampInt(Math.round((1 - state.remainingMs / state.durationMs) * 100), 0, 100, 0);
  }

  function render() {
    const t = U.fmtHMS(state.remainingMs, true);
    el.display.textContent = t;
    el.display.classList.toggle("done", state.status === "completed");

    const p = progress();
    el.ring.style.strokeDasharray = String(RING_C);
    el.ring.style.strokeDashoffset = String(RING_C * (1 - p / 100));

    const labels = {
      idle: "Set a duration to begin",
      running: "Running",
      paused: "Paused",
      completed: "Time's up — reset to go again",
    };
    el.label.textContent = state.status === "running" && state.label !== "Countdown"
      ? `Running · ${state.label}`
      : labels[state.status];

    const running = state.status === "running";
    const editable = !running;
    el.h.disabled = !editable;
    el.m.disabled = !editable;
    el.s.disabled = !editable;

    el.start.hidden = running;
    el.start.textContent = state.status === "paused" ? "Resume"
      : state.status === "completed" ? "Restart" : "Start";
    el.pause.hidden = !running;
    el.reset.hidden = state.status === "idle";
  }

  function readInputs() {
    const h = U.clampInt(el.h.value, 0, 99, 0);
    const m = U.clampInt(el.m.value, 0, 59, 0);
    const s = U.clampInt(el.s.value, 0, 59, 0);
    return U.hmsToMs(h, m, s);
  }

  function writeInputs(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    el.h.value = Math.floor(total / 3600);
    el.m.value = Math.floor((total % 3600) / 60);
    el.s.value = total % 60;
  }

  function setStatus(text) {
    const sr = document.getElementById("srStatus");
    if (sr) sr.textContent = text;
  }

  function complete() {
    state.status = "completed";
    state.remainingMs = 0;
    TiMer.sound.complete();
    TiMer.notify.send("TiMer — Time's up", state.label !== "Countdown"
      ? `“${state.label}” has finished.`
      : "Your countdown is complete.");
    TiMer.speak.say("Your countdown is complete.");
    TiMer.app.toast(state.label !== "Countdown"
      ? `“${state.label}” finished`
      : "Countdown complete");
    setStatus("Countdown complete");
    TiMer.history.add({
      type: "timer",
      name: state.label !== "Countdown" ? state.label : "Countdown",
      durationMs: state.durationMs,
    });
    U.emit("timers:changed");
    render();
  }

  const Countdown = {
    /** Set a new duration (does not start). */
    setDuration(ms, label) {
      state.durationMs = Math.max(1000, ms);
      state.remainingMs = state.durationMs;
      state.status = "idle";
      state.warned = false;
      state.label = label || "Countdown";
      writeInputs(state.durationMs);
      render();
    },

    start() {
      if (state.status === "running") return; // guard duplicate starts
      if (state.status === "completed") {
        state.remainingMs = state.durationMs;
        state.warned = false;
      }
      if (state.status === "idle") {
        const inputMs = readInputs();
        if (inputMs > 0 && inputMs !== state.durationMs) {
          state.durationMs = inputMs;
          state.remainingMs = inputMs;
        }
      }
      if (state.durationMs <= 0 || state.remainingMs <= 0) {
        TiMer.app.toast("Set a duration greater than zero", "warn");
        return;
      }
      state.endAt = U.now() + state.remainingMs;
      state.status = "running";
      TiMer.sound.tick();
      TiMer.speak.say("Your timer has started.");
      setStatus("Countdown started");
      U.emit("timers:changed");
      render();
    },

    pause() {
      if (state.status !== "running") return;
      state.remainingMs = Math.max(0, state.endAt - U.now());
      state.status = "paused";
      TiMer.sound.tick();
      TiMer.speak.say("Timer paused.");
      setStatus("Countdown paused");
      U.emit("timers:changed");
      render();
    },

    resume() { Countdown.start(); },

    toggle() {
      if (state.status === "running") Countdown.pause();
      else Countdown.start();
    },

    reset() {
      state.status = "idle";
      state.remainingMs = state.durationMs;
      state.warned = false;
      TiMer.sound.tick();
      setStatus("Countdown reset");
      U.emit("timers:changed");
      render();
    },

    /** Remaining ms (live value while running). */
    remaining() {
      if (state.status === "running") return Math.max(0, state.endAt - U.now());
      return state.remainingMs;
    },

    status() {
      const r = Countdown.remaining();
      return {
        status: state.status,
        remainingMs: r,
        remainingText: U.fmtHMS(r, true),
        label: state.label,
      };
    },

    /** Called by the global ticker. */
    tick() {
      if (state.status !== "running") return;
      state.remainingMs = Math.max(0, state.endAt - U.now());

      const s = TiMer.store.get("settings", {});
      if (!state.warned && s.warning !== false &&
          state.durationMs > 90000 && state.remainingMs <= 60000 && state.remainingMs > 0) {
        state.warned = true;
        TiMer.sound.warning();
        TiMer.speak.say("One minute remaining.");
        TiMer.app.toast("One minute remaining", "warn");
      }

      if (state.remainingMs <= 0) complete();
      else render();
    },

    buildChips(container, durations) {
      container.innerHTML = "";
      durations.forEach(([label, ms]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = label;
        b.addEventListener("click", () => {
          Countdown.setDuration(ms);
          TiMer.sound.tick();
          TiMer.app.toast(`Countdown set to ${label}`);
        });
        container.appendChild(b);
      });
    },

    /** Launch from a preset / dashboard. */
    launch(name, ms, autoStart) {
      Countdown.setDuration(ms, name);
      TiMer.app.navigate("countdown");
      if (autoStart) Countdown.start();
    },

    init() {
      cacheEls();
      writeInputs(state.durationMs);
      el.ring.style.strokeDasharray = String(RING_C);
      el.ring.style.strokeDashoffset = String(RING_C);

      Countdown.buildChips(el.chips, QUICK_DURATIONS);

      el.start.addEventListener("click", () => Countdown.toggle());
      el.pause.addEventListener("click", () => Countdown.pause());
      el.reset.addEventListener("click", () => Countdown.reset());

      [el.h, el.m, el.s].forEach((input) => {
        input.addEventListener("change", () => {
          if (state.status === "running") return;
          const ms = readInputs();
          if (ms > 0) {
            state.durationMs = ms;
            state.remainingMs = ms;
            state.status = "idle";
            state.warned = false;
            render();
          }
        });
      });

      render();
    },
  };

  TiMer.cd = Countdown;
})();
