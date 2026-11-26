/* TiMer — notify.js
 * Browser notification handling with graceful fallback to in-app toasts.
 * Permission is never assumed; it is requested explicitly from Settings. */
(function () {
  "use strict";
  window.TiMer = window.TiMer || {};

  const Notify = {
    supported: "Notification" in window,

    permission() {
      if (!Notify.supported) return "unsupported";
      return Notification.permission; // "default" | "granted" | "denied"
    },

    async requestPermission() {
      if (!Notify.supported) return "unsupported";
      if (Notification.permission === "granted") return "granted";
      try {
        return await Notification.requestPermission();
      } catch (err) {
        return Notification.permission;
      }
    },

    /** Send a completion notification; falls back to a toast when blocked. */
    send(title, body) {
      const s = TiMer.store.get("settings", {});
      if (!Notify.supported || s.notifications === false) {
        TiMer.app.toast(body || title);
        return;
      }
      if (Notification.permission === "granted") {
        try {
          const n = new Notification(title, { body, icon: "assets/icons/icon-192.png", badge: "assets/icons/icon-192.png", tag: "timer-" + Date.now() });
          n.onclick = () => { window.focus(); n.close(); };
          return;
        } catch (err) { /* fall through to toast */ }
      }
      TiMer.app.toast(body || title);
    },
  };

  TiMer.notify = Notify;
})();
