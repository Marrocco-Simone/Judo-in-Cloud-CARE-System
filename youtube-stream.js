"use strict";

// * YouTube HLS streaming. Runs only inside the Electron app, whose main process uploads the files.

const STREAM_VIDEO_BITRATE = 4_000_000;
const STREAM_AUDIO_BITRATE = 128_000;
const STREAM_FRAME_RATE = 30;
/** seconds. YouTube accepts 1 to 4 */
const STREAM_SEGMENT_DURATION = 2;

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
let lastOverlayError = "";
/** @type {AudioContext | null} */
let silentAudioContext = null;
/** @type {"idle" | "connecting" | "live"} */
let streamState = "idle";
/** incremented by every start and every release, so a stale start run can detect it */
let streamGeneration = 0;

if (window.electronAPI) {
  streamingBar.classList.remove("hidden");
  streamKeyInput.value = localStorage.getItem("youtubeStreamKey") || "";
  streamToggleBtn.disabled = !streamKeyInput.value.trim();
  streamKeyInput.addEventListener("input", () => {
    localStorage.setItem("youtubeStreamKey", streamKeyInput.value);
    streamToggleBtn.disabled = !streamKeyInput.value.trim();
  });
  streamKeyInput.addEventListener("keydown", (e) => e.stopPropagation());
  streamToggleBtn.addEventListener("click", () => {
    if (streamState === "idle") startStreaming().catch(failStreaming);
    else stopStreaming();
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

  streamState = "connecting";
  const generation = ++streamGeneration;
  setStreamStatus("connecting");
  streamKeyInput.disabled = true;
  streamToggleBtn.textContent = t("stream.stop");

  try {
    await connectStream(streamKey, generation);
  } catch (err) {
    // * a run that was stopped while connecting fails on purpose
    if (generation === streamGeneration) throw err;
  }
}

/**
 * @param {string} streamKey
 * @param {number} generation stops this run when a stop or a newer start happened in the meantime
 */
async function connectStream(streamKey, generation) {
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

  const codecsSupported = (await canEncodeVideo("avc")) && (await canEncodeAudio("aac"));
  if (generation !== streamGeneration) return;
  if (!codecsSupported) {
    releaseStreamResources();
    setStreamStatus("error", t("stream.codec_unsupported"));
    return;
  }

  const videoTrack = webcamStream.getVideoTracks()[0];
  const { width = 1280, height = 720 } = videoTrack.getSettings();
  streamCanvas.width = width;
  streamCanvas.height = height;
  streamVideo.srcObject = webcamStream;
  await streamVideo.play();
  if (generation !== streamGeneration) return;

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
  if (generation !== streamGeneration) return;
  streamStartTime = performance.now();
  streamLastFrameNumber = -1;
  streamFrameBusy = false;
  streamFrameTimer = setInterval(
    () => addStreamFrame().catch(failStreaming),
    1000 / STREAM_FRAME_RATE
  );
  if (liveUrl) startLiveScoreboard();
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
      setStreamStatus("live");
    }
  } catch (err) {
    console.error(`Upload of ${filename} failed:`, err);
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
    try {
      drawScoreboardOverlay(streamContext, streamCanvas.width, streamCanvas.height);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message !== lastOverlayError) console.error("Scoreboard overlay skipped:", err);
      lastOverlayError = message;
    }
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
  streamGeneration++;
  streamOutput = null;
  streamCanvasSource = null;
  clearInterval(streamFrameTimer);
  stopLiveScoreboard();
  streamVideo.srcObject = null;
  silentAudioContext?.close();
  silentAudioContext = null;
  streamKeyInput.disabled = false;
  streamToggleBtn.textContent = t("stream.start");
}
