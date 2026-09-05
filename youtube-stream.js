"use strict";

// * YouTube HLS streaming. Runs only inside the Electron app, whose main process uploads the files.
// * One hardware H.264 encoder runs for the whole stream; the local VP8 recording is untouched.

const STREAM_VIDEO_BITRATE = 4_000_000;
const STREAM_AUDIO_BITRATE = 128_000;
const STREAM_FRAME_RATE = 30;
/** seconds. YouTube accepts 1 to 4 */
const STREAM_SEGMENT_DURATION = 2;
const LIVE_KEEPER_BASE_URL = "https://live.judoincloud.com/api";
const LIVE_STATE_POLL_MS = 500;

const streamingBar = document.querySelector(".streaming-bar");
/** @type {HTMLInputElement} */
const streamKeyInput = document.querySelector(".stream-key-input");
/** @type {HTMLButtonElement} */
const streamToggleBtn = document.querySelector(".stream-toggle-btn");
const streamStatusElem = document.querySelector(".stream-status");
/** @type {HTMLVideoElement} */
const streamVideo = document.querySelector(".stream-source-video");
/** @type {HTMLCanvasElement} */
const streamCanvas = document.querySelector(".stream-canvas");
const streamContext = streamCanvas.getContext("2d", { alpha: false, desynchronized: true });

/** @type {import("mediabunny").Output | null} */
let streamOutput = null;
/** @type {import("mediabunny").CanvasSource | null} */
let streamCanvasSource = null;
let streamFrameTimer = 0;
let streamStartTime = 0;
let streamLastFrameNumber = -1;
let streamFrameBusy = false;
/** @type {AudioContext | null} */
let silentAudioContext = null;
/** @type {"idle" | "connecting" | "live"} */
let streamState = "idle";

if (window.electronAPI) {
  streamingBar.classList.remove("hidden");
  streamKeyInput.value = localStorage.getItem("youtubeStreamKey") || "";
  streamToggleBtn.textContent = t("stream.start");
  streamToggleBtn.disabled = !streamKeyInput.value.trim();
  streamKeyInput.addEventListener("input", () => {
    localStorage.setItem("youtubeStreamKey", streamKeyInput.value);
    streamToggleBtn.disabled = !streamKeyInput.value.trim();
  });
  streamKeyInput.addEventListener("keydown", (e) => e.stopPropagation());
  streamToggleBtn.addEventListener("click", () => {
    if (streamState === "idle") startStreaming().catch(failStreaming);
    else if (streamState === "live") stopStreaming();
  });
}

/** @param {"connecting" | "live" | "stopped" | "error"} status */
function setStreamStatus(status, detail) {
  streamStatusElem.className = `stream-status ${status}`;
  streamStatusElem.textContent = detail
    ? `${t(`stream.${status}`)}: ${detail}`
    : t(`stream.${status}`);
}

async function startStreaming() {
  const streamKey = streamKeyInput.value.trim();
  if (!streamKey) return;
  if (!webcamStream) {
    alert(t("stream.no_camera"));
    return;
  }

  const {
    Output,
    HlsOutputFormat,
    MpegTsOutputFormat,
    PathedTarget,
    NullTarget,
    BufferTarget,
    ConcurrentRunner,
    CanvasSource,
    MediaStreamAudioTrackSource,
    canEncodeVideo,
    canEncodeAudio,
  } = Mediabunny;

  if (!(await canEncodeVideo("avc")) || !(await canEncodeAudio("aac"))) {
    alert(t("stream.codec_unsupported"));
    return;
  }

  streamState = "connecting";
  setStreamStatus("connecting");
  streamKeyInput.disabled = true;
  streamToggleBtn.disabled = true;
  streamToggleBtn.textContent = t("stream.stop");

  const videoTrack = webcamStream.getVideoTracks()[0];
  const { width = 1280, height = 720 } = videoTrack.getSettings();
  streamCanvas.width = width;
  streamCanvas.height = height;
  streamVideo.srcObject = webcamStream;
  await streamVideo.play();
  if (streamState !== "connecting") return;

  // * segment names must stay unique across restarts of the same YouTube stream
  const sessionId = Date.now().toString(36);
  // * one upload at a time keeps the playlists in order, which YouTube requires
  const uploads = new ConcurrentRunner(1);

  streamOutput = new Output({
    format: new HlsOutputFormat({
      segmentFormat: new MpegTsOutputFormat(),
      targetDuration: STREAM_SEGMENT_DURATION,
      live: true,
      maxLiveSegmentCount: 6,
      getPlaylistPath: () => "playlist.m3u8",
      getSegmentPath: (info) => `${sessionId}_${info.n}.ts`,
    }),
    target: new PathedTarget("", ({ path, isRoot }) =>
      isRoot
        ? new NullTarget()
        : new BufferTarget({
            onFinalize: (buffer) =>
              uploads.run(() => uploadHlsFile(streamKey, path, buffer)),
          })
    ),
  });

  streamCanvasSource = new CanvasSource(streamCanvas, {
    codec: "avc",
    bitrate: STREAM_VIDEO_BITRATE,
    keyFrameInterval: STREAM_SEGMENT_DURATION,
    latencyMode: "realtime",
    hardwareAcceleration: "prefer-hardware",
  });
  streamOutput.addVideoTrack(streamCanvasSource, { frameRate: STREAM_FRAME_RATE });

  // * YouTube requires an audio track, so a silent one replaces a missing microphone
  const audioSource = new MediaStreamAudioTrackSource(getStreamAudioTrack(), {
    codec: "aac",
    bitrate: STREAM_AUDIO_BITRATE,
  });
  audioSource.errorPromise.catch(failStreaming);
  streamOutput.addAudioTrack(audioSource);

  await streamOutput.start();
  if (streamState !== "connecting") return;
  streamStartTime = performance.now();
  streamLastFrameNumber = -1;
  streamFrameBusy = false;
  streamFrameTimer = setInterval(
    () => addStreamFrame().catch(failStreaming),
    1000 / STREAM_FRAME_RATE
  );
  if (liveUrl) pollLiveState();
}

/**
 * @param {string} streamKey
 * @param {string} filename
 * @param {ArrayBuffer} buffer
 */
async function uploadHlsFile(streamKey, filename, buffer) {
  try {
    await window.electronAPI.uploadHlsFile(streamKey, filename, buffer);
    if (streamState === "connecting") {
      streamState = "live";
      streamToggleBtn.disabled = false;
      setStreamStatus("live");
    }
  } catch (err) {
    if (streamState !== "idle") failStreaming(err);
  }
}

async function addStreamFrame() {
  if (streamFrameBusy || !streamCanvasSource) return;
  const elapsedSeconds = (performance.now() - streamStartTime) / 1000;
  const frameNumber = Math.round(elapsedSeconds * STREAM_FRAME_RATE);
  if (frameNumber === streamLastFrameNumber) return;
  streamLastFrameNumber = frameNumber;

  streamFrameBusy = true;
  try {
    streamContext.drawImage(streamVideo, 0, 0, streamCanvas.width, streamCanvas.height);
    drawScoreboard(streamContext, streamCanvas.width, streamCanvas.height);
    await streamCanvasSource.add(frameNumber / STREAM_FRAME_RATE, 1 / STREAM_FRAME_RATE);
  } finally {
    streamFrameBusy = false;
  }
}

/** @returns {MediaStreamTrack} */
function getStreamAudioTrack() {
  const micTrack = webcamStream.getAudioTracks()[0];
  if (micTrack) return micTrack;

  silentAudioContext = new AudioContext();
  const destination = silentAudioContext.createMediaStreamDestination();
  const silence = silentAudioContext.createConstantSource();
  silence.offset.value = 0;
  silence.connect(destination);
  silence.start();
  return destination.stream.getAudioTracks()[0];
}

async function stopStreaming() {
  const output = streamOutput;
  releaseStreamResources();
  try {
    await output?.finalize();
  } catch (err) {
    console.error("Error finalizing the stream:", err);
  }
  setStreamStatus("stopped");
}

/** @param {unknown} err */
async function failStreaming(err) {
  console.error("Streaming error:", err);
  if (streamState === "idle") return;
  const output = streamOutput;
  releaseStreamResources();
  setStreamStatus("error", err instanceof Error ? err.message : String(err));
  await output?.cancel().catch(() => {});
}

function releaseStreamResources() {
  streamState = "idle";
  streamOutput = null;
  streamCanvasSource = null;
  clearInterval(streamFrameTimer);
  clearTimeout(liveStatePollTimer);
  liveState = null;
  streamVideo.srcObject = null;
  silentAudioContext?.close();
  silentAudioContext = null;
  streamKeyInput.disabled = false;
  streamToggleBtn.disabled = false;
  streamToggleBtn.textContent = t("stream.start");
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// * SCOREBOARD OVERLAY, read from the same live-keeper state as the Shiai tatami page

/** @typedef {{ name: string, surname: string, club: string }} LiveAthlete */
/**
 * @typedef {{
 *   type: string,
 *   timestamp: number,
 *   is_gs: boolean,
 *   match_time_at_event: number,
 *   osk_time_at_event?: number,
 *   scores: { white_ippon: number, white_wazaari: number, white_penalties: number, red_ippon: number, red_wazaari: number, red_penalties: number },
 * }} LiveEvent
 */
/**
 * @typedef {{
 *   display_state: "waiting" | "pre_fight" | "match" | "end",
 *   last_event?: LiveEvent,
 *   white_athlete?: LiveAthlete,
 *   red_athlete?: LiveAthlete,
 *   category_name?: string,
 *   winner_color?: "WHITE" | "RED",
 * }} LiveState
 */

/** @type {LiveState | null} */
let liveState = null;
let liveStatePollTimer = 0;
/** running timers reconstructed from the last event, like the Shiai tatami page does */
const liveTimers = {
  lastEventKey: "",
  /** @type {{ startedAt: number, timeAtStart: number, isGs: boolean } | null} */
  match: null,
  /** @type {{ startedAt: number, timeAtStart: number } | null} */
  osaekomi: null,
};

async function pollLiveState() {
  try {
    const response = await fetch(
      `${LIVE_KEEPER_BASE_URL}/live/${encodeURIComponent(competitionSlug)}/${encodeURIComponent(tatamiNumber)}`
    );
    const body = await response.json();
    liveState = body.status === "success" ? body.data : null;
  } catch {
    liveState = null;
  }
  updateLiveTimers(liveState);
  liveStatePollTimer = setTimeout(pollLiveState, LIVE_STATE_POLL_MS);
}

/** @param {LiveState | null} state */
function updateLiveTimers(state) {
  const event = state?.last_event;
  if (!event) {
    liveTimers.match = null;
    liveTimers.osaekomi = null;
    liveTimers.lastEventKey = "";
    return;
  }
  const key = `${event.type}:${event.timestamp}`;
  if (key === liveTimers.lastEventKey) return;
  liveTimers.lastEventKey = key;

  if (event.type === "TIMER_START") {
    liveTimers.match = {
      startedAt: event.timestamp,
      timeAtStart: event.match_time_at_event,
      isGs: event.is_gs,
    };
  } else if (["TIMER_STOP", "MATCH_END", "MATCH_STARTED", "PRE_FIGHT"].includes(event.type)) {
    liveTimers.match = null;
  }

  if (event.type === "OSK_START") {
    liveTimers.osaekomi = {
      startedAt: event.timestamp,
      timeAtStart: event.osk_time_at_event ?? 0,
    };
  } else if (["OSK_STOP", "MATCH_END", "PRE_FIGHT"].includes(event.type)) {
    liveTimers.osaekomi = null;
  }
}

/** @param {LiveEvent} event */
function currentMatchTime(event) {
  const timer = liveTimers.match;
  if (!timer) return event.match_time_at_event;
  const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
  return timer.isGs ? timer.timeAtStart + elapsed : Math.max(timer.timeAtStart - elapsed, 0);
}

function currentOsaekomiTime() {
  const timer = liveTimers.osaekomi;
  if (!timer) return null;
  return timer.timeAtStart + Math.floor((Date.now() - timer.startedAt) / 1000);
}

/**
 * @param {LiveAthlete} athlete
 * @param {"white" | "red"} color
 * @param {LiveEvent["scores"]} scores
 */
function athleteLabel(athlete, color, scores) {
  const name = `${athlete.surname.toUpperCase()} ${athlete.name.charAt(0)}.`;
  const score = scores[`${color}_ippon`]
    ? "IPPON"
    : `W${scores[`${color}_wazaari`]}  S${scores[`${color}_penalties`]}`;
  return `${name}   ${score}`;
}

/** @param {LiveState} state */
function centerLabel(state) {
  if (state.display_state === "end") {
    return state.winner_color === "WHITE" ? "◀ " + t("stream.winner") : t("stream.winner") + " ▶";
  }
  const event = state.last_event;
  if (!event) return state.category_name || "";
  const time = currentMatchTime(event);
  const clock = `${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`;
  const osaekomi = currentOsaekomiTime();
  if (osaekomi !== null) return `${clock}   OSK ${osaekomi}`;
  return event.is_gs ? `GS ${clock}` : clock;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
function drawScoreboard(ctx, width, height) {
  const state = liveState;
  if (!state || state.display_state === "waiting" || !state.white_athlete || !state.red_athlete) {
    return;
  }
  const scores = state.last_event?.scores ?? {
    white_ippon: 0,
    white_wazaari: 0,
    white_penalties: 0,
    red_ippon: 0,
    red_wazaari: 0,
    red_penalties: 0,
  };
  const barHeight = Math.round(height * 0.09);
  const y = height - barHeight;
  const middle = y + barHeight / 2;
  const third = width / 3;
  const padding = Math.round(barHeight * 0.4);

  ctx.font = `bold ${Math.round(barHeight * 0.45)}px sans-serif`;
  ctx.textBaseline = "middle";

  ctx.fillStyle = "white";
  ctx.fillRect(0, y, third, barHeight);
  ctx.fillStyle = "black";
  ctx.textAlign = "left";
  ctx.fillText(athleteLabel(state.white_athlete, "white", scores), padding, middle, third - 2 * padding);

  ctx.fillStyle = "black";
  ctx.fillRect(third, y, third, barHeight);
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(centerLabel(state), width / 2, middle, third - 2 * padding);

  ctx.fillStyle = "#c62828";
  ctx.fillRect(2 * third, y, third, barHeight);
  ctx.fillStyle = "white";
  ctx.textAlign = "right";
  ctx.fillText(athleteLabel(state.red_athlete, "red", scores), width - padding, middle, third - 2 * padding);
}
