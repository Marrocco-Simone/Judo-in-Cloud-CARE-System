# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CARE System** (Camera Assistant Referee Enhanced) by Judo in Cloud. A client-side video recording and playback tool for judo referees. It captures webcam video, stores it in IndexedDB, and plays it back with DVR-like controls (rewind, slow-motion, frame-by-frame, zoom/pan).

The entire application runs offline in the browser — no data is sent to or received from any server after initial page load. It is hosted at `care.judoincloud.com` and also distributed as an Electron desktop app.

Language: Italian (UI text and comments are in Italian).

## Architecture

This is a **vanilla HTML/CSS/JS** project — no build system, no bundler, no framework, no TypeScript.

### Core Files

- `index.html` — Single-page app with the video player UI, settings form, and instructional content
- `script.js` — All application logic (~1245 lines): webcam capture, IndexedDB storage, MediaSource video playback, keyboard/mouse controls, zoom/pan, download
- `styles.css` — Video player styling, controls, forms, timeline, zoom
- `jic_styles.css` — Shared Judo in Cloud brand styles (header, footer) ported from Tailwind

### Key Concepts in `script.js`

- **URL query params** drive configuration: `videoBitsPerSecond`, `REFRESHRATE`, `DELAY_MULTIPLIER`, `useAudio`, `logDatabaseOp`, `showMoreVideoInfo`, `deviceId`. Changing settings reloads the page with new query params.
- **IndexedDB** (`blobStoreDB`): Two object stores — `streamBlobs` (small chunks at REFRESHRATE for live playback) and `downloadBlobs` (large chunks at MAXTIME=5min for download). Blobs are keyed by auto-increment id with a timestamp index.
- **MediaSource API**: A `SourceBuffer` in `sequence` mode receives blobs from IndexedDB one-by-one on a timer. Buffer is capped at `MAXTIME` seconds to prevent RAM overflow.
- **Dual MediaRecorder**: Two `MediaRecorder` instances record the same stream — one at REFRESHRATE for live streaming, one at DOWNLOAD_DURATION for download-quality chunks.
- **Zoom/Pan**: CSS variables (`--zoom`, `--y-axis`, `--x-axis`) on the `<video>` element, manipulated via mouse wheel (position-dependent zoom) and right-click drag.

### Electron Wrapper (`executable/`)

Uses Electron Forge to package the web app as a desktop executable. The `copyFiles` script copies root HTML/JS/CSS into the `executable/` folder before building.

- `executable/main.js` — Electron main process, loads `index.html`
- `executable/forge.config.js` — Build config for Windows (Squirrel), macOS (zip), Linux (deb/rpm)
- `executable/package.json` — `npm run make` to build distributables

## Development

No build step needed for the web app — just open `index.html` in a browser (requires HTTPS or localhost for `getUserMedia`).

### Electron app

```bash
cd executable
npm install
npm run start    # Dev mode (copies files + launches Electron)
npm run make     # Build distributable for current platform
```

## Deployment

- Hosted via GitHub Pages with custom domain `care.judoincloud.com` (configured in `CNAME`)
- GitHub Actions workflow (`.github/workflows/build.yml.disabled`) builds Electron apps for Linux/macOS/Windows — currently disabled
- Releases published to GitHub at `Marrocco-Simone/Judo-in-Cloud-CARE-System`
