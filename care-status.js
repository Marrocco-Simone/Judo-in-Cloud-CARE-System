"use strict";

// * Care health snapshot for the PC Health Broadcaster. Runs only inside the Electron app, whose
// * main process writes the snapshot to care-status.json. It only reads the state of camera.js and
// * youtube-stream.js.

const CARE_STATUS_SEND_MS = 10_000;
const CARE_STATUS_WINDOW_MS = 60_000;
/** ms. A player further behind the newest stored chunk than this is reviewing, not live */
const LIVE_WINDOW_MS = 30_000;

if (window.electronAPI) startCareStatus();

function startCareStatus() {
  /** values of the last full minute */
  const minute = {
    storeErr: null,
    kbps: null,
    camEv: null,
    delay: null,
    drop: null,
    lag: null,
    dbMB: null,
    freeMB: null,
  };
  let windowStart = performance.now();
  let lastBytes = storeStats.bytes;
  let lastErrors = storeStats.errors;
  let lastQuality = video.getVideoPlaybackQuality();
  let camEvents = 0;
  let maxLag = 0;
  /** @type {number[]} */
  let delays = [];
  /** @type {MediaStreamTrack | null} */
  let watchedTrack = null;
  /** @type {boolean | null} */
  let hw = null;

  // * Chromium reports prefer-hardware as unsupported when the PC has no H.264 encoder chip
  window.VideoEncoder?.isConfigSupported({
    codec: "avc1.640028",
    width: 1920,
    height: 1080,
    bitrate: STREAM_VIDEO_BITRATE,
    framerate: STREAM_FRAME_RATE,
    hardwareAcceleration: "prefer-hardware",
  })
    .then((support) => (hw = support.supported === true))
    .catch(() => (hw = false));

  let expectedTick = performance.now() + 1000;
  setInterval(() => {
    const now = performance.now();
    maxLag = Math.max(maxLag, now - expectedTick);
    expectedTick = now + 1000;

    const track = webcamStream?.getVideoTracks()[0] ?? null;
    if (track && track !== watchedTrack) {
      watchedTrack = track;
      track.addEventListener("mute", () => camEvents++);
      track.addEventListener("ended", () => camEvents++);
    }

    if (!video.paused && lastTimestamp - currentTimestamp < LIVE_WINDOW_MS) {
      delays.push(Date.now() - getDisplayedTimestamp());
    }

    if (now - windowStart >= CARE_STATUS_WINDOW_MS) {
      closeMinute(now - windowStart);
      windowStart = now;
    }
  }, 1000);

  setInterval(sendCareStatus, CARE_STATUS_SEND_MS);

  /** @param {number} elapsedMs */
  function closeMinute(elapsedMs) {
    minute.kbps = Math.round(((storeStats.bytes - lastBytes) * 8) / elapsedMs);
    minute.storeErr = storeStats.errors - lastErrors;
    lastBytes = storeStats.bytes;
    lastErrors = storeStats.errors;

    const quality = video.getVideoPlaybackQuality();
    // * a new media source restarts the counters from zero
    const restarted = quality.totalVideoFrames < lastQuality.totalVideoFrames;
    const total = quality.totalVideoFrames - (restarted ? 0 : lastQuality.totalVideoFrames);
    const dropped = quality.droppedVideoFrames - (restarted ? 0 : lastQuality.droppedVideoFrames);
    minute.drop = total > 0 ? round1((dropped / total) * 100) : null;
    lastQuality = quality;

    minute.camEv = camEvents;
    camEvents = 0;
    minute.lag = Math.round(maxLag);
    maxLag = 0;
    minute.delay = delays.length
      ? round1(delays.reduce((a, b) => a + b, 0) / delays.length / 1000)
      : null;
    delays = [];

    navigator.storage
      .estimate()
      .then(({ usage = 0, quota = 0 }) => {
        minute.dbMB = Math.round(usage / 1e6);
        minute.freeMB = Math.round((quota - usage) / 1e6);
      })
      .catch(() => {});
  }

  function sendCareStatus() {
    const track = webcamStream?.getVideoTracks()[0] ?? null;
    const settings = track?.getSettings() ?? {};
    window.electronAPI.reportCareStatus({
      ...minute,
      lastChunkAt: storeStats.lastStoredAt || null,
      cam: !track ? null : track.readyState === "ended" ? "ended" : track.muted ? "muted" : "live",
      w: settings.width ?? null,
      h: settings.height ?? null,
      fps: settings.frameRate ? Math.round(settings.frameRate) : null,
      stream: streamState,
      hw,
    });
  }
}

/** @param {number} n */
function round1(n) {
  return Math.round(n * 10) / 10;
}
