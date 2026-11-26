/* TiMer — settings.js
 * Theme, alerts, notifications, and data management. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const U = TiMer.U;

  const DEFAULTS = {
    theme: "dark",        // dark | light | system
    sound: true,
    speech: true,
    warning: true,
    notifications: true,  // user preference; gated by browser permission
    autoStart: true,
  };

  const el = {};

  function settings() {
    return Object.assign({}, DEFAULTS, TiMer.store.get("settings", {}));
  }

  function save(s) {
    TiMer.store.set("settings", s);
  }

  function systemIsDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function resolvedTheme(s) {
    if (s.theme === "system") return systemIsDark() ? "dark" : "light";
    return s.theme;
  }

  function applyTheme() {
    const s = settings();
    const resolved = resolvedTheme(s);
    document.documentElement.setAttribute("data-theme", resolved);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "dark" ? "#090B10" : "#EEF1F7");
    // reflect in segmented control
    document.querySelectorAll("[data-theme-opt]").forEach((b) => {
      b.classList.toggle("active", b.dataset.themeOpt === s.theme);
    });
  }

  function setSwitch(id, value) {
    const btn = document.getElementById(id);
    if (btn) btn.setAttribute("aria-checked", value ? "true" : "false");
  }

  function renderNotifRow() {
    const s = settings();
    const perm = TiMer.notify.permission();
    const btn = document.getElementById("notifToggleBtn");
    const txt = document.getElementById("notifStatusText");
    if (perm === "unsupported") {
      txt.textContent = "This browser does not support notifications.";
      btn.disabled = true;
      btn.textContent = "Unavailable";
    } else if (perm === "granted") {
      txt.textContent = s.notifications
        ? "Browser notifications are enabled."
        : "Permission granted, but notifications are turned off.";
      btn.disabled = false;
      btn.textContent = s.notifications ? "Turn off" : "Turn on";
    } else if (perm === "denied") {
      txt.textContent = "Notifications are blocked in this browser's site settings.";
      btn.disabled = true;
      btn.textContent = "Blocked";
    } else {
      txt.textContent = "Browser notifications are off. Enable to get alerts outside the tab.";
      btn.disabled = false;
      btn.textContent = "Enable notifications";
    }
  }

  function renderSwitches() {
    const s = settings();
    setSwitch("setSound", s.sound);
    setSwitch("setSpeech", s.speech);
    setSwitch("setWarning", s.warning);
    setSwitch("setAutoStart", s.autoStart);
    renderNotifRow();
  }

  function bindSwitch(id, key) {
    const btn = document.getElementById(id);
    btn.addEventListener("click", () => {
      const s = settings();
      s[key] = !(s[key] !== false);
      save(s);
      btn.setAttribute("aria-checked", s[key] ? "true" : "false");
      TiMer.sound.tick();
      U.emit("settings:changed");
    });
  }

  const Settings = {
    get: settings,

    applyTheme,
    resolvedTheme,

    init() {
      applyTheme();
      renderSwitches();

      document.querySelectorAll("[data-theme-opt]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const s = settings();
          s.theme = btn.dataset.themeOpt;
          save(s);
          applyTheme();
          TiMer.sound.tick();
          U.emit("settings:changed");
        });
      });

      bindSwitch("setSound", "sound");
      bindSwitch("setSpeech", "speech");
      bindSwitch("setWarning", "warning");
      bindSwitch("setAutoStart", "autoStart");

      document.getElementById("notifToggleBtn").addEventListener("click", async () => {
        const s = settings();
        const perm = TiMer.notify.permission();
        if (perm === "granted") {
          s.notifications = !s.notifications;
          save(s);
          renderNotifRow();
        } else if (perm === "default") {
          const result = await TiMer.notify.requestPermission();
          if (result === "granted") {
            s.notifications = true;
            save(s);
            TiMer.app.toast("Notifications enabled");
          } else if (result === "denied") {
            TiMer.app.toast("Notification permission was blocked", "warn");
          }
          renderNotifRow();
        }
        U.emit("settings:changed");
      });

      document.getElementById("setClearHistory").addEventListener("click", () => {
        TiMer.app.confirm("Clear history?", "All completed timer and stopwatch records will be removed.")
          .then((ok) => {
            if (!ok) return;
            TiMer.history.clear();
            TiMer.app.toast("History cleared");
          });
      });

      document.getElementById("setResetAll").addEventListener("click", () => {
        TiMer.app.confirm("Reset all settings?", "Preferences return to defaults. Timers, presets, and history are kept.")
          .then((ok) => {
            if (!ok) return;
            save(Object.assign({}, DEFAULTS));
            applyTheme();
            renderSwitches();
            TiMer.app.toast("Settings reset to defaults");
          });
      });

      // Follow system changes when theme = system
      if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
          if (settings().theme === "system") applyTheme();
        });
      }
    },
  };

  TiMer.settings = Settings;
})();
