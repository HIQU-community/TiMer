# TiMer — Every Second, Perfectly.

A premium, offline-ready time-management web application.

TiMer combines a **precision stopwatch**, a **voice-controlled countdown**, and
**multiple independent timers** in a polished, installable PWA — built with
plain HTML5, CSS3, and vanilla JavaScript. No frameworks, no build step.

- **Product**: TiMer
- **Tagline**: Every Second, Perfectly.
- **Publisher**: HIQU
- **Developer**: TAWSIFUR RAHMAN
- **Version**: 1.0.0

---

## Features

| Section | Highlights |
|---|---|
| Dashboard | Live clock, quick stopwatch, quick countdown chips, active timers, recent presets, recent activity |
| Stopwatch | Start / pause / resume / reset, lap recording, fastest / slowest / average lap, millisecond display driven by `performance.now()` |
| Voice Countdown | Custom H/M/S duration, quick chips, progress ring, completion alerts, and hands-free control via the Web Speech API where supported (manual controls always available) |
| Multiple Timers | Unlimited independent countdown cards — name, duration, start, pause, resume, reset, restart, duplicate, edit, delete (with confirmation) |
| Presets | Curated defaults (productivity, study, breaks, cooking, everyday) plus your own saved presets; one-tap launch |
| History | Completed timers and stopwatch sessions with timestamps; clearable |
| Settings | Dark / light / system theme, completion sound, voice announcements, one-minute warning, browser notifications, auto-start on launch, data management |
| PWA | Web app manifest + service worker — installable and fully functional offline |

Timing accuracy: all elapsed/remaining time is derived from
`performance.now()` timestamps, never accumulated from interval ticks, so
background-tab throttling cannot distort readings.

Voice features:

- **Recognition** (`SpeechRecognition`) — Chrome / Edge on desktop and
  Android, over HTTPS or `localhost`. The app detects support and shows a
  clear message (with manual fallback) where unavailable.
- **Announcements** (`SpeechSynthesis`) — spoken status updates; independently
  toggleable in Settings.

Data (settings, presets, timers, history) is stored locally in
`localStorage` on this device only. It does not sync between devices, and
clearing browser data removes it.

---

## Project structure

```
TiMer/
├── index.html
├── manifest.json
├── service-worker.js
├── README.md
├── assets/
│   ├── icons/
│   │   ├── favicon.svg
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── icon-maskable-512.png
│   └── sounds/
│       ├── complete.wav
│       ├── warning.wav
│       └── tick.wav
├── css/
│   ├── style.css
│   ├── responsive.css
│   └── animations.css
└── js/
    ├── app.js           # router, ticker, toasts, confirm dialog, SW registration
    ├── storage.js       # localStorage wrapper
    ├── utils.js         # formatting, ids, event bus
    ├── sounds.js        # sound effects
    ├── speech.js        # spoken announcements (SpeechSynthesis)
    ├── notify.js        # browser notifications with toast fallback
    ├── stopwatch.js     # precision stopwatch
    ├── countdown.js     # single countdown engine + progress ring
    ├── timers.js        # multiple independent timers
    ├── presets.js       # default + custom presets
    ├── history.js       # completed timer / stopwatch history
    ├── settings.js      # theme, alerts, notifications, data controls
    ├── dashboard.js     # dashboard composition
    └── voice.js         # voice recognition (SpeechRecognition)
```

---

## Run locally

TiMer is a static site. It needs to be served over HTTP (for the service
worker, manifest, microphone, and notifications) — opening `index.html`
directly via `file://` will not enable PWA features.

Any static server works:

```bash
# Python 3
cd TiMer
python3 -m http.server 8080

# or Node.js
npx serve .
```

Then open <http://localhost:8080>.

> Microphone access and service workers require `localhost` or HTTPS.

---

## Deploy to GitHub Pages

1. Create a repository and push this folder (or upload the ZIP contents).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select your branch (e.g. `main`) and the `/ (root)` folder, then save.
5. TiMer will be available at `https://<username>.github.io/<repository>/`.

No build step is required — the site is plain static files.

## Deploy to Cloudflare Pages

1. Log in to the Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets**.
2. Drag in the project folder (or connect the Git repository with no build command).
3. Deploy. Cloudflare serves the static files as-is.

---

## Install as an app

Once served over HTTPS, TiMer can be installed:

- **Desktop Chrome/Edge**: the install icon appears in the address bar.
- **Android**: menu → *Add to Home screen*.
- **iOS Safari**: Share → *Add to Home Screen*.

---

## Browser support

- Core timers, stopwatch, presets, history, settings: all modern browsers.
- Voice recognition (countdown by voice): Chrome / Edge (Chromium), over HTTPS or `localhost`.
- Notifications: Chrome / Edge / Firefox; permission is requested explicitly from Settings and never assumed.
- Reduced-motion preferences are respected throughout.

---

© HIQU · Developed by TAWSIFUR RAHMAN. TiMer — Every Second, Perfectly.
