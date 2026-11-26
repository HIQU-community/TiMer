/* TiMer — app.js
 * Shell: hash router, global ticker, theme toggle, toasts,
 * confirm dialog, and service worker registration. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const VIEWS = ["dashboard", "stopwatch", "countdown", "timers", "presets", "history", "settings", "about"];

  let confirmResolve = null;
  let lastFocus = null;

  /* ---------- Router ---------- */

  function currentView() {
    const hash = window.location.hash.replace("#", "");
    return VIEWS.includes(hash) ? hash : "dashboard";
  }

  function show(view) {
    document.querySelectorAll(".view").forEach((v) => {
      v.classList.toggle("active", v.dataset.view === view);
    });
    document.querySelectorAll("[data-nav]").forEach((n) => {
      n.classList.toggle("active", n.dataset.nav === view);
    });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    updateGlobalStatus();
  }

  function navigate(view) {
    if (window.location.hash === "#" + view) show(view);
    else window.location.hash = view;
  }

  /* ---------- Global status indicator ---------- */

  function updateGlobalStatus() {
    const wrap = document.getElementById("globalStatus");
    const dot = document.getElementById("globalStatusDot");
    const txt = document.getElementById("globalStatusText");
    let n = TiMer.timers.runningCount();
    const cd = TiMer.cd.status();
    if (cd.status === "running") n += 1;
    if (TiMer.sw && document.getElementById("swState") &&
        document.getElementById("swState").textContent === "Running") n += 1;

    wrap.hidden = n === 0;
    dot.classList.toggle("pulsing", n > 0);
    txt.textContent = n === 1 ? "1 timer active" : `${n} timers active`;
  }

  /* ---------- Toast ---------- */

  function toast(message, type) {
    const stack = document.getElementById("toastStack");
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 3200);
  }

  /* ---------- Confirm dialog ---------- */

  function confirmDialog(title, body) {
    return new Promise((resolve) => {
      confirmResolve = resolve;
      lastFocus = document.activeElement;
      document.getElementById("modalTitle").textContent = title;
      document.getElementById("modalBody").textContent = body;
      const backdrop = document.getElementById("modalBackdrop");
      backdrop.hidden = false;
      document.getElementById("modalConfirm").focus();
    });
  }

  function closeConfirm(result) {
    document.getElementById("modalBackdrop").hidden = true;
    if (confirmResolve) confirmResolve(result);
    confirmResolve = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- Clocks & ticker ---------- */

  function renderClock() {
    const now = new Date();
    const t = document.getElementById("topbarTime");
    const d = document.getElementById("topbarDate");
    if (t) t.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (d) d.textContent = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }

  function startTicker() {
    // Display refresh — fast, timestamp-derived
    setInterval(() => {
      TiMer.cd.tick();
      TiMer.timers.tick();
      updateGlobalStatus();
    }, 250);

    // Clocks — once per second
    setInterval(() => {
      renderClock();
      TiMer.dash.renderActive();
    }, 1000);
    renderClock();
  }

  /* ---------- Theme toggle ---------- */

  function bindThemeToggle() {
    const btn = document.getElementById("themeToggle");
    btn.addEventListener("click", () => {
      const s = TiMer.store.get("settings", {});
      const cur = TiMer.settings.resolvedTheme(s);
      s.theme = cur === "dark" ? "light" : "dark";
      TiMer.store.set("settings", s);
      TiMer.settings.applyTheme();
      TiMer.sound.tick();
    });
  }

  /* ---------- Service worker ---------- */

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && !/^localhost/.test(location.hostname)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.warn("TiMer SW registration failed:", err);
      });
    });
  }

  /* ---------- Init ---------- */

  const App = {
    navigate,
    toast,
    confirm: confirmDialog,
  };
  TiMer.app = App;

  document.addEventListener("DOMContentLoaded", () => {
    TiMer.settings.init();
    TiMer.history.render();
    TiMer.sw.init();
    TiMer.cd.init();
    TiMer.timers.init();
    TiMer.presets.init();
    TiMer.dash.init();
    TiMer.voice.init();
    bindThemeToggle();
    startTicker();

    // version labels
    const ver = document.getElementById("versionLabel");
    const aboutVer = document.getElementById("aboutVersion");
    if (ver) ver.textContent = "v1.0.0";
    if (aboutVer) aboutVer.textContent = "1.0.0";
    document.getElementById("copyYear").textContent = String(new Date().getFullYear());

    // router
    window.addEventListener("hashchange", () => show(currentView()));
    document.querySelectorAll("[data-nav]").forEach((n) => {
      n.addEventListener("click", (e) => {
        const target = n.dataset.nav;
        if (window.location.hash === "#" + target) {
          e.preventDefault();
          show(target);
        }
      });
    });
    show(currentView());

    // confirm dialog wiring
    document.getElementById("modalConfirm").addEventListener("click", () => closeConfirm(true));
    document.getElementById("modalCancel").addEventListener("click", () => closeConfirm(false));
    document.getElementById("modalBackdrop").addEventListener("click", (e) => {
      if (e.target.id === "modalBackdrop") closeConfirm(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !document.getElementById("modalBackdrop").hidden) {
        closeConfirm(false);
      }
    });

    registerSW();
  });
})();
