"use strict";

/**
 * YouTube HLS Livestream module for the CARE System.
 * Loaded only in Electron (injected by main.js after page load).
 *
 * Listens for "care:blob-ready" CustomEvents from camera.js,
 * transcodes VP8 WebM → H.264 MPEG-TS via MediaBunny,
 * and uploads segments to YouTube's HLS endpoint via Electron IPC.
 */

if (!window.electronAPI?.isElectron) {
  throw new Error("youtube-stream.js loaded outside Electron");
}

// Read recording params from URL (same source as camera.js)
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const REFRESHRATE = Number(urlParams.get("REFRESHRATE"))
  ? Number(urlParams.get("REFRESHRATE")) * 1000
  : 1 * 1000;
const useAudio = urlParams.get("useAudio") === "false" ? false : true;

// ! UI CREATION
const downloadBar = document.querySelector(".download-bar");

const streamingBar = document.createElement("div");
streamingBar.className = "streaming-bar";

const streamKeyInput = document.createElement("input");
streamKeyInput.type = "password";
streamKeyInput.className = "white-input stream-key-input";
streamKeyInput.placeholder = "YouTube Stream Key";

const streamToggleBtn = document.createElement("button");
streamToggleBtn.className = "white-btn stream-toggle-btn";
streamToggleBtn.textContent = "Avvia Streaming";
streamToggleBtn.disabled = true;

const streamStatusElem = document.createElement("span");
streamStatusElem.className = "stream-status";

streamingBar.appendChild(streamKeyInput);
streamingBar.appendChild(streamToggleBtn);
streamingBar.appendChild(streamStatusElem);
downloadBar.after(streamingBar);

// ! STREAM KEY MANAGEMENT
const savedKey = localStorage.getItem("youtubeStreamKey");
if (savedKey) streamKeyInput.value = savedKey;

streamKeyInput.addEventListener("input", () => {
  localStorage.setItem("youtubeStreamKey", streamKeyInput.value);
  streamToggleBtn.disabled = !streamKeyInput.value.trim();
});

streamToggleBtn.disabled = !streamKeyInput.value.trim();

// ! STREAMING STATE
let isStreaming = false;
let streamSegmentNumber = 0;

const MAX_STREAM_QUEUE = 3;
let streamQueueBusy = false;
/** @type {Array<{blob: Blob, segNum: number}>} */
const streamQueue = [];

// ! UI CONTROLS
streamToggleBtn.addEventListener("click", () => {
  if (isStreaming) {
    stopStreaming();
  } else {
    startStreaming();
  }
});

window.electronAPI.onStreamStatus((status) => {
  updateStreamStatus(status);
});

function updateStreamStatus(status) {
  streamStatusElem.className = "stream-status";

  if (status === "connecting") {
    streamStatusElem.textContent = "Connessione...";
    streamStatusElem.classList.add("connecting");
  } else if (status === "live") {
    streamStatusElem.textContent = "LIVE";
    streamStatusElem.classList.add("live");
  } else if (status === "stopped") {
    streamStatusElem.textContent = "Fermato";
    streamStatusElem.classList.add("stopped");
  } else if (status.startsWith("error:")) {
    streamStatusElem.textContent = `Errore: ${status.slice(6)}`;
    streamStatusElem.classList.add("error");
    isStreaming = false;
    streamToggleBtn.textContent = "Avvia Streaming";
    streamKeyInput.disabled = false;
  }
}

async function startStreaming() {
  const key = streamKeyInput.value.trim();
  if (!key) return;

  isStreaming = true;
  streamSegmentNumber = 0;
  streamToggleBtn.textContent = "Ferma Streaming";
  streamKeyInput.disabled = true;

  await window.electronAPI.startStream(key);
}

async function stopStreaming() {
  isStreaming = false;
  streamQueue.length = 0;
  streamToggleBtn.textContent = "Avvia Streaming";
  streamKeyInput.disabled = false;

  await window.electronAPI.stopStream();
}

// ! MEDIABUNNY TRANSCODE (VP8 WebM → H.264 MPEG-TS)

/**
 * Transcode a VP8 WebM blob to H.264 MPEG-TS using MediaBunny
 * @param {Blob} webmBlob
 * @returns {Promise<ArrayBuffer>}
 */
async function webmToMpegTs(webmBlob) {
  const {
    Input, Output, Conversion, BlobSource, BufferTarget,
    ALL_FORMATS, MpegTsOutputFormat,
  } = Mediabunny;

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(webmBlob) });
  const target = new BufferTarget();
  const output = new Output({ format: new MpegTsOutputFormat(), target });

  const conversion = await Conversion.init({
    input,
    output,
    video: { codec: "avc", forceTranscode: true, hardwareAcceleration: "prefer-hardware" },
    audio: useAudio ? { codec: "aac", forceTranscode: true } : { discard: true },
  });

  if (!conversion.isValid) {
    console.error("MediaBunny conversion invalid:", conversion.discardedTracks);
    throw new Error("Impossibile transcodificare il segmento video");
  }

  await conversion.execute();
  return target.buffer;
}

// ! BLOB EVENT LISTENER + QUEUE

document.addEventListener("care:blob-ready", (e) => {
  if (!isStreaming) return;

  const { blob } = e.detail;
  const segNum = streamSegmentNumber++;

  if (streamQueue.length >= MAX_STREAM_QUEUE) {
    console.warn("Coda streaming piena, segmento saltato:", segNum);
    return;
  }

  streamQueue.push({ blob, segNum });
  processStreamQueue();
});

async function processStreamQueue() {
  if (streamQueueBusy || streamQueue.length === 0) return;
  streamQueueBusy = true;

  while (streamQueue.length > 0) {
    const { blob, segNum } = streamQueue.shift();
    try {
      const tsBuffer = await webmToMpegTs(blob);
      const durationSec = REFRESHRATE / 1000;
      await window.electronAPI.sendStreamData(tsBuffer, segNum, durationSec);
    } catch (err) {
      console.error("Errore invio segmento streaming:", err);
    }
  }

  streamQueueBusy = false;
}
