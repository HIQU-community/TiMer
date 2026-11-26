/* TiMer — stopwatch.js
 * Precision stopwatch built on performance.now().
 * Elapsed time is always derived from timestamps, never from
 * accumulated interval ticks, so background-tab throttling
 * cannot distort the measurement. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const U = TiMer.U;

  const state = {
    status: "idle", // idle | running | paused
    baseElapsed: 0,
    startStamp: 0,
    laps: [], // absolute elapsed ms at each lap
  };

  const el = {};
  let rafId = null;

  function elapsed() {
    if (state.status === "running") return state.baseElapsed + (U.now() - state.startStamp);
    return state.baseElapsed;
  }

  function cacheEls() {
    el.display = document.getElementById("swDisplay");
    el.hrs = document.getElementById("swHrs");
    el.min = document.getElementById("swMin");
    el.sec = document.getElementById("swSec");
    el.ms = document.getElementById("swMs");
    el.stateLabel = document.getElementById("swState");
    el.start = document.getElementById("swStartBtn");
    el.lap = document.getElementById("swLapBtn");
    el.reset = document.getElementById("swResetBtn");
    el.stats = document.getElementById("swStats");
    el.fastest = document.getElementById("swFastest");
    el.slowest = document.getElementById("swSlowest");
    el.average = document.getElementById("swAverage");
    el.lapCount = document.getElementById("swLapCount");
    el.lapsWrap = document.getElementById("lapsWrap");
    el.lapList = document.getElementById("lapList");
    el.clearLaps = document.getElementById("swClearLaps");
    // Dashboard mirrors
    el.dashDisplay = document.getElementById("dashSwDisplay");
    el.dashStart = document.getElementById("dashSwStart");
    el.dashLap = document.getElementById("dashSwLap");
    el.dashReset = document.getElementById("dashSwReset");
  }

  function render() {
    const t = U.fmtStopwatch(elapsed());
    el.hrs.textContent = t.h;
    el.min.textContent = t.m;
    el.sec.textContent = t.s;
    el.ms.textContent = "." + t.cs;
    el.dashDisplay.textContent = `${t.h}:${t.m}:${t.s}.${t.cs}`;

    const running = state.status === "running";
    el.display.classList.toggle("running", running);

    const label = state.status === "running" ? "Running" : state.status === "paused" ? "Paused" : "Ready";
    el.stateLabel.textContent = label;
    el.stateLabel.classList.toggle("running", running);

    el.start.textContent = state.status === "paused" ? "Resume" : state.status === "running" ? "Pause" : "Start";
    el.dashStart.textContent = el.start.textContent;

    el.lap.disabled = !running;
    el.reset.disabled = state.status === "idle" && state.laps.length === 0 && state.baseElapsed === 0;
    el.dashLap.disabled = el.lap.disabled;
    el.dashReset.disabled = el.reset.disabled;

    renderStats();
    renderLaps();
  }

  function lapDurations() {
    const durs = [];
    for (let i = 0; i < state.laps.length; i++) {
      durs.push(state.laps[i] - (i === 0 ? 0 : state.laps[i - 1]));
    }
    return durs;
  }

  function renderStats() {
    const durs = lapDurations();
    const has = durs.length > 0;
    el.stats.hidden = !has && state.laps.length === 0;
    if (!has) {
      el.fastest.textContent = "—";
      el.slowest.textContent = "—";
      el.average.textContent = "—";
      el.lapCount.textContent = "0";
      return;
    }
    const best = Math.min(...durs);
    const worst = Math.max(...durs);
    const avg = durs.reduce((a, b) => a + b, 0) / durs.length;
    el.fastest.textContent = U.fmtStopwatch(best).h !== "00"
      ? `${U.fmtStopwatch(best).h}:${U.fmtStopwatch(best).m}:${U.fmtStopwatch(best).s}.${U.fmtStopwatch(best).cs}`
      : `${U.fmtStopwatch(best).m}:${U.fmtStopwatch(best).s}.${U.fmtStopwatch(best).cs}`;
    el.slowest.textContent = U.fmtStopwatch(worst).m + ":" + U.fmtStopwatch(worst).s + "." + U.fmtStopwatch(worst).cs;
    el.average.textContent = U.fmtStopwatch(avg).m + ":" + U.fmtStopwatch(avg).s + "." + U.fmtStopwatch(avg).cs;
    el.lapCount.textContent = String(durs.length);
  }

  function renderLaps() {
    const show = state.laps.length > 0;
    el.lapsWrap.hidden = !show;
    if (!show) { el.lapList.innerHTML = ""; return; }

    const durs = lapDurations();
    const best = Math.min(...durs);
    const worst = durs.length > 1 ? Math.max(...durs) : -1;

    el.lapList.innerHTML = "";
    for (let i = state.laps.length - 1; i >= 0; i--) {
      const li = document.createElement("li");
      if (durs[i] === best) li.classList.add("best");
      else if (durs[i] === worst) li.classList.add("worst");
      const d = U.fmtStopwatch(durs[i]);
      const tot = U.fmtStopwatch(state.laps[i]);
      li.innerHTML = `
        <span class="lap-index">Lap ${i + 1}</span>
        <span class="lap-time">${d.m}:${d.s}.${d.cs}</span>
        <span class="lap-total">${tot.h}:${tot.m}:${tot.s}.${tot.cs}</span>`;
      el.lapList.appendChild(li);
    }
  }

  function loop() {
    render();
    if (state.status === "running") rafId = requestAnimationFrame(loop);
    else rafId = null;
  }

  function ensureLoop() {
    if (state.status === "running" && rafId === null) rafId = requestAnimationFrame(loop);
  }

  function setStatus(text) {
    const sr = document.getElementById("srStatus");
    if (sr) sr.textContent = text;
  }

  const Stopwatch = {
    start() {
      if (state.status === "running") return; // guard: no duplicate starts
      if (state.status === "paused") {
        state.startStamp = U.now();
        state.status = "running";
      } else {
        state.baseElapsed = 0;
        state.startStamp = U.now();
        state.status = "running";
      }
      TiMer.sound.tick();
      setStatus("Stopwatch started");
      U.emit("timers:changed");
      render();
      ensureLoop();
    },

    pause() {
      if (state.status !== "running") return;
      state.baseElapsed += U.now() - state.startStamp;
      state.status = "paused";
      TiMer.sound.tick();
      setStatus("Stopwatch paused");
      U.emit("timers:changed");
      render();
    },

    toggle() {
      if (state.status === "running") Stopwatch.pause();
      else Stopwatch.start();
    },

    lap() {
      if (state.status !== "running") return;
      state.laps.push(elapsed());
      TiMer.sound.tick();
      setStatus(`Lap ${state.laps.length} recorded`);
      render();
    },

    reset() {
      const finalElapsed = elapsed();
      const wasMeaningful = finalElapsed >= 1000;
      const lapCount = state.laps.length;
      state.status = "idle";
      state.baseElapsed = 0;
      state.startStamp = 0;
      state.laps = [];
      if (wasMeaningful) {
        TiMer.history.add({
          type: "stopwatch",
          name: lapCount > 0 ? `Stopwatch session · ${lapCount} laps` : "Stopwatch session",
          durationMs: finalElapsed,
          laps: lapCount,
        });
        TiMer.app.toast("Stopwatch session saved to history");
      }
      setStatus("Stopwatch reset");
      U.emit("timers:changed");
      render();
    },

    clearLaps() {
      state.laps = [];
      setStatus("Laps cleared");
      render();
    },

    /** Smooth per-frame update driven from the app ticker. */
    frame() {
      if (state.status === "running") {
        // rAF drives smooth rendering; this is a no-op safety net
        ensureLoop();
      }
    },

    init() {
      cacheEls();
      el.start.addEventListener("click", () => Stopwatch.toggle());
      el.lap.addEventListener("click", () => Stopwatch.lap());
      el.reset.addEventListener("click", () => Stopwatch.reset());
      el.clearLaps.addEventListener("click", () => Stopwatch.clearLaps());

      el.dashStart.addEventListener("click", () => Stopwatch.toggle());
      el.dashLap.addEventListener("click", () => Stopwatch.lap());
      el.dashReset.addEventListener("click", () => Stopwatch.reset());

      render();
    },
  };

  TiMer.sw = Stopwatch;
})();
