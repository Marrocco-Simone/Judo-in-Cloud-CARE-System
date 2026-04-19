# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CARE System** (Camera Assistant Referee Enhanced) by Judo in Cloud. A client-side video recording and playback tool for judo referees. It captures webcam video, stores it in IndexedDB, and plays it back with DVR-like controls (rewind, slow-motion, frame-by-frame, zoom/pan).

The entire application runs offline in the browser — no data is sent to or received from any server after initial page load. It is hosted at `care.judoincloud.com` and also distributed as an Electron desktop app.

Language: Italian, English, German (UI now supports multiple languages via translations.js).

## Architecture

This is a **vanilla HTML/CSS/JS** project — no build system, no bundler, no framework, no TypeScript.

### Two-Page Structure

- `index.html` + `index.js` — Landing page with settings form, camera device selection, and instructional content. Settings are passed as URL query params when navigating to the camera page.
- `camera.html` + `camera.js` (~1400 lines) — The main camera application: webcam capture, IndexedDB storage, MediaSource video playback, keyboard/mouse controls, zoom/pan, download.
- `styles.css` — Video player styling, controls, forms, timeline, zoom
- `jic_styles.css` — Shared Judo in Cloud brand styles (header, footer) ported from Tailwind
- `mediabunny.min.js` — Third-party library for converting WebM blobs to MP4 for download

### Key Concepts in `camera.js`

- **URL query params** drive configuration: `videoBitsPerSecond`, `REFRESHRATE`, `DELAY_MULTIPLIER`, `useAudio`, `logDatabaseOp`, `showMoreVideoInfo`, `deviceId`. The landing page (`index.js`) builds the query string and navigates to `camera.html`.
- **IndexedDB** (`blobStoreDB`): One object store — `streamBlobs` (small chunks at REFRESHRATE for live playback). Blobs are keyed by auto-increment id with a timestamp index.
- **MediaSource API**: A `SourceBuffer` in `sequence` mode receives blobs from IndexedDB one-by-one on a timer. Buffer is capped at `MAXTIME` seconds to prevent RAM overflow.
- **Single MediaRecorder**: Records the webcam stream at REFRESHRATE intervals, storing WebM blobs to IndexedDB.
- **MP4 Download**: Uses MediaBunny (`mediabunny.min.js`) to convert a range of WebM blobs from IndexedDB into a single MP4 file for download.
- **Zoom/Pan**: CSS variables (`--zoom`, `--y-axis`, `--x-axis`) on the `<video>` element, manipulated via mouse wheel (position-dependent zoom) and right-click drag.
- **Blob prefetch/cache**: Blobs are prefetched from IndexedDB ahead of playback position to reduce latency during rewind and seek operations.

### Electron Wrapper (`executable/`)

Uses Electron Forge to package the web app as a desktop executable. The `copyFiles` script copies root HTML/JS/CSS into the `executable/` folder before building.

- `executable/main.js` — Electron main process, loads `camera.html`
- `executable/forge.config.js` — Build config for Windows (Squirrel), macOS (zip), Linux (deb/rpm)
- `executable/package.json` — `npm run make` to build distributables

## Development

No build step needed for the web app — just open `index.html` (or `camera.html` directly with query params) in a browser. Requires HTTPS or localhost for `getUserMedia`.

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
