"use strict";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const videoBitsPerSecond = Number(urlParams.get("videoBitsPerSecond"))
  ? Number(urlParams.get("videoBitsPerSecond") * 1000)
  : 2000 * 1000;
/** The blob lenght from a MediaRecorder in milliseconds. It decides also when a new blob is stored / retrieved */
const REFRESHRATE = Number(urlParams.get("REFRESHRATE"))
  ? Number(urlParams.get("REFRESHRATE")) * 1000
  : 1 * 1000;
/** how much to wait from recording to showing the first blob of the live. Total delay to the live is this times REFRESHRATE */
const DELAY_MULTIPLIER = Number(urlParams.get("DELAY_MULTIPLIER"))
  ? Number(urlParams.get("DELAY_MULTIPLIER"))
  : 3;
const useAudio = urlParams.get("useAudio") === "false" ? false : true;
const logDatabaseOp = urlParams.get("logDatabaseOp") === "true" ? true : false;
const showMoreVideoInfo =
  urlParams.get("showMoreVideoInfo") === "true" ? true : false;
const deviceId = urlParams.get("deviceId");

console.log("params: ", {
  videoBitsPerSecond,
  REFRESHRATE,
  DELAY_MULTIPLIER,
  useAudio,
  logDatabaseOp,
  showMoreVideoInfo,
});

/** @type {HTMLInputElement} */
const videoBitsInput = document.getElementById("videoBitsInput");
videoBitsInput.value = videoBitsPerSecond / 1000;
const showVideoBitsInputSize = (value) =>
  (document.getElementById(
    "videoBitsInputValue"
  ).textContent = `${value} kbps`);
videoBitsInput.addEventListener("input", (e) =>
  showVideoBitsInputSize(e.target.value)
);
showVideoBitsInputSize(videoBitsPerSecond / 1000);

/** @type {HTMLInputElement} */
const refreshRateInput = document.getElementById("refreshRateInput");
refreshRateInput.value = REFRESHRATE / 1000;
const showRefreshRateInputSize = (value) =>
  (document.getElementById("refreshRateInputValue").textContent = `${value}s`);
refreshRateInput.addEventListener("input", (e) =>
  showRefreshRateInputSize(e.target.value)
);
showRefreshRateInputSize(REFRESHRATE / 1000);

/** @type {HTMLInputElement} */
const delayMultiplierInput = document.getElementById("delayMultiplierInput");
delayMultiplierInput.value = DELAY_MULTIPLIER;
const showDelayMultiplierInputSize = (value) =>
  (document.getElementById(
    "delayMultiplierInputValue"
  ).textContent = `${value}`);
delayMultiplierInput.addEventListener("input", (e) =>
  showDelayMultiplierInputSize(e.target.value)
);
showDelayMultiplierInputSize(DELAY_MULTIPLIER);

/** @type {HTMLInputElement} */
const useAudioInput = document.getElementById("useAudioInput");
useAudioInput.checked = useAudio;

/** @type {HTMLInputElement} */
const logDatabaseOpInput = document.getElementById("logDatabaseOpInput");
logDatabaseOpInput.checked = logDatabaseOp;

/** @type {HTMLInputElement} */
const showMoreVideoInfoInput = document.getElementById(
  "showMoreVideoInfoInput"
);
showMoreVideoInfoInput.checked = showMoreVideoInfo;

/** @param {SubmitEvent} e */
function setNewQueryParams(e) {
  e.preventDefault();
  const newParams = new URLSearchParams(window.location.search);

  const videoBitsPerSecond = videoBitsInput.value;
  newParams.set("videoBitsPerSecond", videoBitsPerSecond);

  const refreshRate = refreshRateInput.value;
  newParams.set("REFRESHRATE", refreshRate);

  const delayMultiplier = delayMultiplierInput.value;
  newParams.set("DELAY_MULTIPLIER", delayMultiplier);

  const useAudio = useAudioInput.checked;
  newParams.set("useAudio", useAudio);

  const logDatabaseOp = logDatabaseOpInput.checked;
  newParams.set("logDatabaseOp", logDatabaseOp);

  const showMoreVideoInfo = showMoreVideoInfoInput.checked;
  newParams.set("showMoreVideoInfo", showMoreVideoInfo);

  window.location.search = newParams.toString();
}

/** @type {HTMLFormElement} */
const queryFormElement = document.getElementById("queryFormElement");
queryFormElement.addEventListener("submit", setNewQueryParams);
queryFormElement.addEventListener("keydown", (e) => e.stopPropagation());

const resetButtonElement = document.getElementById("resetButton");
resetButtonElement.addEventListener("click", () => {
  window.location.search = "";
});

const mimeType = useAudio
  ? 'video/webm; codecs="vp8, opus"'
  : 'video/webm; codecs="vp8"';

const millionFormatter = new Intl.NumberFormat(undefined, {
  notation: "scientific",
});

/** @type {HTMLButtonElement} */
const playPauseBtn = document.querySelector(".play-pause-btn");
/** @type {HTMLButtonElement} */
const theaterBtn = document.querySelector(".theater-btn");
/** @type {HTMLButtonElement} */
const fullScreeBtn = document.querySelector(".full-screen-btn");
const videoContainer = document.querySelector(".video-container");
/** @type {HTMLButtonElement} */
const muteBtn = document.querySelector(".mute-btn");
/** @type {HTMLInputElement} */
const volumeSlider = document.querySelector(".volume-slider");
const currentTimeElem = document.querySelector(".current-time");
const totalTimeElem = document.querySelector(".total-time");
/** @type {HTMLButtonElement} */
const liveBtnElem = document.querySelector(".live-btn");
const liveDotElem = document.querySelector(".live-dot");
/** @type {HTMLButtonElement} */
const speedBtn = document.querySelector(".speed-btn");
const timelineContainer = document.querySelector(".timeline-container");
/** @type {HTMLVideoElement} */
const video = document.querySelector("video");
const timestampIndicator = document.querySelector(".timestamp-indicator");
/** @type {HTMLSelectElement} */
const cameraSelect = document.querySelector(".camera-select");
/** @type {HTMLFormElement} */
const cameraSelectForm = document.querySelector(".camera-select-form");

/** recording starting timestamp */
let startTimestamp = 0;
/** recording last timestamp */
let lastTimestamp = 0;
/** selected curring timestamp */
let currentTimestamp = 0;

// * https://stackoverflow.com/questions/50333767/html5-video-streaming-video-with-blob-urls/50354182

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// * INDEXDB TO STORE ALL MY BLOBS

const dbName = "blobStoreDB";
const dbVersion = 1;
const streamCollectionName = "streamBlobs";
const downloadCollectionName = "downloadBlobs";
/** @type {IDBDatabase} */
let db;

openDbConnection();

/** Open the indexedDB connection */
function openDbConnection() {
  const request = indexedDB.open(dbName, dbVersion);
  request.addEventListener("upgradeneeded", (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains(streamCollectionName)) {
      const blobStore = db.createObjectStore(streamCollectionName, {
        keyPath: "id",
        autoIncrement: true,
      });
      blobStore.createIndex("timestamp", "timestamp", { unique: false });
    }

    if (!db.objectStoreNames.contains(downloadCollectionName)) {
      const downloadStore = db.createObjectStore(downloadCollectionName, {
        keyPath: "id",
        autoIncrement: true,
      });
      downloadStore.createIndex("timestamp", "timestamp", { unique: false });
    }
  });
  request.addEventListener("error", (e) => {
    console.error("Error opening database:", e.target.errorCode);
    console.error(e);
  });
  request.addEventListener("success", (e) => {
    db = e.target.result;

    getFirstBlob(streamCollectionName, (blob, timestamp, id) => {
      const firstId = id;
      const firstTimestamp = timestamp;
      getLastBlob(streamCollectionName, (blob, timestamp, id) => {
        const lastId = id;
        const lastTimestamp = timestamp;
        console.log("First blob:", {
          id: firstId,
          timestamp: formatTimestamp(firstTimestamp),
        });
        console.log("Last blob:", {
          id: lastId,
          timestamp: formatTimestamp(lastTimestamp),
        });
        console.log(
          `Expected total size: ${Math.floor(
            (lastId * blob.size) / 1024 / 1024
          )} Mb`
        );
        startTimestamp = firstTimestamp;
        i = lastId;
      });
    });

    console.log("Database opened successfully.");
  });
}

/**
 * Delete the database
 * @param {undefined | () => void} cb
 */
function deleteDatabase(cb) {
  const request = indexedDB.deleteDatabase(dbName);
  request.addEventListener("error", (e) =>
    console.error("Error deleting database:", e.target.errorCode)
  );
  request.addEventListener("success", () => {
    console.log("Database deleted successfully.");
    if (cb) cb();
  });
}

/**
 * Store a blob in the indexedDB with a timestamp and a unique id autoincremented
 * @param {Blob} blob
 * @param {string} collectionName
 * @param {undefined | () => void} cb
 */
function storeBlob(blob, collectionName, cb) {
  const transaction = db.transaction([collectionName], "readwrite");
  const blobStore = transaction.objectStore(collectionName);

  const timestamp = new Date().getTime(); // Store current timestamp
  const blobRecord = { blob, timestamp };

  const request = blobStore.add(blobRecord);
  request.addEventListener("error", (e) =>
    console.error("Error storing blob:", e.target.errorCode)
  );
  request.addEventListener("success", (e) => {
    /** @type {number} */
    const id = e.target.result;
    if (logDatabaseOp) {
      console.info(`Blob stored in ${collectionName}:`, {
        id,
        timestamp: formatTimestamp(timestamp),
        size: `${Math.floor(blob.size / 1000)} kb`,
      });
    }
    if (!startTimestamp) startTimestamp = timestamp;
    lastTimestamp = timestamp;
    if (cb) cb();
  });
}

/**
 * Retrieve the first or the last blob saved if it exist, or do nothing
 * @param {string} collectionName
 * @param {(blob: Blob, timestamp: number, id: number) => void} cb
 * @param {"first" | "last"} type
 */
function getFirstOrLastBlob(collectionName, cb, type) {
  const transaction = db.transaction([collectionName], "readonly");
  const blobStore = transaction.objectStore(collectionName);
  const index = blobStore.index("timestamp");

  const direction = type === "first" ? "next" : "prev";
  const cursorRequest = index.openCursor(null, direction);
  cursorRequest.addEventListener("error", (e) =>
    console.error("Error opening cursor:", e.target.errorCode)
  );
  cursorRequest.addEventListener("success", (e) => {
    /** @type {IDBCursorWithValue} */
    const cursor = e.target.result;
    if (!cursor) {
      console.log("Database is clear");
      return;
    }
    /** @type {{blob: Blob, timestamp: number, id: number}} */
    const blobRecord = cursor.value;
    if (!blobRecord) {
      console.log("Database is clear");
      return;
    }
    const { blob, timestamp, id } = blobRecord;
    cb(blob, timestamp, id);
  });
}

/**
 * Retrieve the first blob saved if it exist, or undefined
 * @param {string} collectionName
 * @param {(blob: Blob, timestamp: number, id: number) => void} cb
 */
const getFirstBlob = (collectionName, cb) =>
  getFirstOrLastBlob(collectionName, cb, "first");

/**
 * Retrieve the last blob saved if it exist, or undefined
 * @param {string} collectionName
 * @param {(blob: Blob, timestamp: number, id: number) => void} cb
 */
const getLastBlob = (collectionName, cb) =>
  getFirstOrLastBlob(collectionName, cb, "last");

/**
 * Retrieve a blob from the indexedDB by its id
 * @param {number} id
 * @param {string} collectionName
 * @param {(blob: Blob, timestamp: number) => void} cb
 * @param {() => void} errorCb
 */
function getBlobById(id, collectionName, cb, errorCb) {
  const transaction = db.transaction([collectionName], "readonly");
  const blobStore = transaction.objectStore(collectionName);

  const request = blobStore.get(id);
  request.addEventListener("error", (e) => {
    console.error("Error retrieving blob:", e.target.errorCode);
    errorCb();
  });
  request.addEventListener("success", (e) => {
    /** @type {{blob: Blob, timestamp: number, id: number}} */
    const blobRecord = e.target.result;
    if (blobRecord) {
      const { blob, timestamp, id } = blobRecord;
      if (logDatabaseOp) {
        console.info(`Blob retrieved from ${collectionName}:`, {
          id,
          timestamp: formatTimestamp(timestamp),
          size: `${Math.floor(blob.size / 1000)} kb`,
        });
      }
      cb(blob, timestamp);
    } else {
      if (logDatabaseOp) {
        console.error(`Blob ${id} not found.`);
      }
      errorCb();
    }
  });
}

/**
 * Retrieve a blob from the indexedDB by its timestamp
 * @param {number} targetTimestamp
 * @param {string} collectionName
 * @param {(blob: Blob, timestamp: number, id: number) => void} cb
 */
function getNearestBlobByTimestamp(targetTimestamp, collectionName, cb) {
  const transaction = db.transaction([collectionName], "readonly");
  const blobStore = transaction.objectStore(collectionName);
  const index = blobStore.index("timestamp");

  const cursorRequest = index.openCursor(null, "prev");
  cursorRequest.addEventListener("error", (e) => {
    console.error("Error searching by timestamp:", e.target.errorCode);
  });
  cursorRequest.addEventListener("success", (e) => {
    /**   @type {IDBCursorWithValue} */
    const cursor = e.target.result;
    if (cursor) {
      /** @type {{blob: Blob, timestamp: number, id: number}} */
      const blobRecord = cursor.value;

      if (blobRecord.timestamp <= targetTimestamp) {
        const { blob, timestamp, id } = blobRecord;
        cb(blob, timestamp, id);
        return;
      } else {
        cursor.continue();
      }
    } else {
      console.error("No blobs found with a timestamp <=", targetTimestamp);
    }
  });
}
/**
 * Retrieve all blobs from the indexedDB between two ids
 * @param {number} startId
 * @param {number} endId
 * @param {string} collectionName
 * @param {(blobs: Blob[]) => void} cb
 */
function getBlobsInRange(startId, endId, collectionName, cb) {
  const transaction = db.transaction([collectionName], "readonly");
  const blobStore = transaction.objectStore(collectionName);

  const request = blobStore.getAll(IDBKeyRange.bound(startId, endId));
  request.addEventListener("error", (e) =>
    console.error("Error retrieving blobs:", e.target.errorCode)
  );
  request.addEventListener("success", (e) => {
    /** @type {{blob: Blob, timestamp: number, id: number}[]} */
    const blobRecords = e.target.result;
    if (!blobRecords.length) {
      console.error(`No blobs found in range ${startId}-${endId}.`);
      return;
    }

    blobRecords.sort((a, b) => a.timestamp - b.timestamp);

    const continuosRecords = [];
    const middlePoint = Math.floor(blobRecords.length / 2);
    for (let i = middlePoint; i < blobRecords.length; i++) {
      if (
        blobRecords[i].timestamp - blobRecords[i - 1].timestamp <=
        REFRESHRATE * 1.2
      ) {
        continuosRecords.push(blobRecords[i]);
      } else {
        break;
      }
    }
    for (let i = middlePoint; i > 0; i--) {
      if (
        blobRecords[i].timestamp - blobRecords[i - 1].timestamp <=
        REFRESHRATE * 1.2
      ) {
        continuosRecords.push(blobRecords[i]);
      } else {
        break;
      }
    }
    continuosRecords.sort((a, b) => a.timestamp - b.timestamp);
    console.log("Blobs retrieved:", continuosRecords.length);

    const biggestDiff = Math.max(
      ...continuosRecords.map((c, i) =>
        i === 0 ? 0 : c.timestamp - continuosRecords[i - 1].timestamp
      )
    );
    console.log(
      `Biggest timestamp diff: ${biggestDiff} (ratio ${(
        biggestDiff / REFRESHRATE
      ).toFixed(2)})`
    );

    const initialTimeStamp = continuosRecords[0].timestamp;
    const finalTimeStamp = continuosRecords.at(-1).timestamp;
    const startTime = formatTimestamp(initialTimeStamp);
    const endTime = formatTimestamp(finalTimeStamp);
    const totalTime = formatTime((finalTimeStamp - initialTimeStamp) / 1000);
    console.log(`Total time: ${startTime} - ${endTime} (${totalTime})`);

    const blobs = continuosRecords.map((blobRecord) => blobRecord.blob);
    cb(blobs);
  });
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// * BLOB MANAGEMENT TO THE VIDEO TAG

/** source for the video tag @type {MediaSource} */
const mediaSource = new MediaSource();
/** buffer to hold various Blobs @type {SourceBuffer} */
let sourceBuffer;
/** index of the last blob added in the db. Autoindexing starts at 1 */
let i = 1;

const url = URL.createObjectURL(mediaSource);
video.src = url;

function waitBeforeNextAppendToSourceBuffer() {
  setTimeout(appendToSourceBuffer, REFRESHRATE);
}

// * when mediaSource is ready, create the sourceBuffer
mediaSource.addEventListener("sourceopen", () => {
  sourceBuffer = mediaSource.addSourceBuffer(mimeType);
  sourceBuffer.mode = "sequence";
  // * when the previous blob has been appended, append a new one
  sourceBuffer.addEventListener(
    "updateend",
    waitBeforeNextAppendToSourceBuffer
  );
  sourceBuffer.addEventListener("error", (e) => {
    console.error("Error with sourceBuffer:", e);
  });
});

/** The maximum duration of the video sourcebuffer, so not to go over the limit. keep it under 7 minutes */
const MAXTIME = 5 * 60;
/** Limit the total buffer size to MAXTIME, this way we don't run out of RAM */
function clearSourceBufferLength() {
  try {
    if (
      video.buffered.length &&
      video.buffered.end(0) - video.buffered.start(0) > MAXTIME
    ) {
      console.log("Reached maximum video length in seconds:", MAXTIME);

      if (!sourceBuffer.updating) {
        sourceBuffer.removeEventListener(
          "updateend",
          waitBeforeNextAppendToSourceBuffer
        );

        sourceBuffer.remove(
          video.buffered.start(0),
          video.buffered.start(0) + MAXTIME / 2
        );

        sourceBuffer.addEventListener(
          "updateend",
          () => {
            sourceBuffer.addEventListener(
              "updateend",
              waitBeforeNextAppendToSourceBuffer
            );
            // * recover any delay we got, avoid random freezing of the video
            video.currentTime = video.buffered.end(0);
          },
          { once: true }
        );
      }
    }
  } catch (e) {
    console.error("Error while clearing source buffer length:", e);
  }
}

function checkSourceBufferAviability() {
  if (!mediaSource) return false;
  if (mediaSource.readyState !== "open") return false;
  if (!sourceBuffer) return false;
  if (sourceBuffer.updating) return false;
  return true;
}

/** add to the sourceBuffer the new segment */
function appendToSourceBuffer() {
  if (!checkSourceBufferAviability()) return;
  if (!checkVideoIsGoingOn()) {
    waitBeforeNextAppendToSourceBuffer();
    return;
  }

  getBlobById(
    i,
    streamCollectionName,
    (blob, timestamp) => {
      clearSourceBufferLength();
      blob
        .arrayBuffer()
        .then((arrayBuffer) => {
          if (!checkSourceBufferAviability()) {
            waitBeforeNextAppendToSourceBuffer();
            return;
          }

          if (blob.type !== mimeType) {
            throw new Error(
              `Blob type is not "${mimeType}" but "${blob.type}"`
            );
          }
          sourceBuffer.appendBuffer(arrayBuffer);
          i++;
          currentTimestamp = timestamp;
          updateTotalTimeOnVideo();
        })
        .catch((e) =>
          console.error("Error appending blob to sourceBuffer:", e)
        );
    },
    waitBeforeNextAppendToSourceBuffer
  );
}

function moveToTimestamp(timestamp) {
  if (timestamp > lastTimestamp) return returnLive();
  if (timestamp < startTimestamp) timestamp = startTimestamp;

  getNearestBlobByTimestamp(
    timestamp,
    streamCollectionName,
    (blob, timestamp, id) => {
      // * next blob to load should be the one we found
      i = id;
      // * return in the end of the video
      video.currentTime = video.buffered.end(0);
    }
  );
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// * RETRIVAL OF THE WEBCAM STREAM

/** The duration of the video to download in milliseconds */
const DOWNLOAD_DURATION = MAXTIME * 1000;

/** @type {MediaRecorder} */
let streamMediaRecorder;
/** @type {MediaRecorder} */
let downloadMediaRecorder;

let videoTrackLabel;
getWebcamStream();

/** get the webcam stream, save it to the mediaStream and start the mediaRecorder */
function getWebcamStream() {
  /**
   * * if there is no deviceId specified, using "true" makes the browser choose the default camera. Works also if the inserted deviceId does not exist
   * @type {boolean | MediaTrackConstraints}
   */
  const video = deviceId
    ? {
        deviceId: deviceId,
        frameRate: {
          ideal: 60,
        },
      }
    : true;
  navigator.mediaDevices
    .getUserMedia({
      audio: useAudio,
      video: video,
    })
    .then((stream) => {
      // todo we can add multiple videotracks in the future
      const videoTrack = stream.getVideoTracks()[0];
      videoTrackLabel = videoTrack.label;
      listAllCameraDevices();

      /** holder of the webcam audio and video stream */
      const mediaStream = new MediaStream();
      mediaStream.addTrack(videoTrack);
      if (useAudio) {
        const audioTrack = stream.getAudioTracks()[0];
        mediaStream.addTrack(audioTrack);
      }

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        throw new Error(`Mime type "${mimeType}" is not supported.`);
      }

      streamMediaRecorder = createMediaRecorder(
        mediaStream,
        REFRESHRATE,
        streamCollectionName
      );
      downloadMediaRecorder = createMediaRecorder(
        mediaStream,
        DOWNLOAD_DURATION,
        downloadCollectionName
      );
      setTimeout(appendToSourceBuffer, REFRESHRATE * DELAY_MULTIPLIER);
    })
    .catch((err) => {
      console.error(err);
      alert(
        `Ci sono dei problemi con la registrazione.\n\nAssicurati che la webcam non sia usata da qualche altro programma, poi ricarica il CARE system.\n\nSe il problema dovesse persistere, il tuo computer potrebbe non supportare la registrazione video\n\n(formato video: ${mimeType}).`
      );
    });
}

/**
 * create a mediarecorder and save its blobs to the indexedDB
 * @param {MediaStream} mediaStream
 * @param {number} refreshRate
 * @param {string} collectionName
 * @return {MediaRecorder}
 */
function createMediaRecorder(mediaStream, refreshRate, collectionName) {
  console.log(
    `Creating mediaRecorder for ${collectionName} with ${refreshRate}`
  );
  /** saves the webcam stream to various Blobs */
  const mediaRecorder = new MediaRecorder(mediaStream, {
    audioBitsPerSecond: useAudio ? 128000 : undefined,
    videoBitsPerSecond: videoBitsPerSecond,
    mimeType: mimeType,
  });

  /** @type {Blob[]} */
  const blobs = [];

  mediaRecorder.addEventListener("dataavailable", (e) => {
    const blob = e.data;
    // console.log(`blob size: ${Math.floor(blob.size / 1000)} kb`);
    blobs.push(blob);
    // * stopping and starting the mediaRecorder takes 10 ms, no worries
    mediaRecorder.stop();
  });

  mediaRecorder.addEventListener("stop", () => {
    const blob = new Blob(blobs, { type: mimeType });
    // console.log(`final blob size: ${Math.floor(blob.size / 1000)} kb`);
    storeBlob(blob, collectionName);
    blobs.length = 0;
    mediaRecorder.start(refreshRate);
  });

  mediaRecorder.start(refreshRate);
  return mediaRecorder;
}

/** use it after the promise of getUserMedia or you cannot have the labels */
function listAllCameraDevices() {
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    const filtered_devices = devices.filter((d) => d.kind === "videoinput");

    filtered_devices.forEach((device) => {
      const newOption = document.createElement("option");
      newOption.value = device.deviceId;
      newOption.text = device.label;
      cameraSelect.appendChild(newOption);
    });
    cameraSelect.selectedIndex =
      filtered_devices.findIndex((d) => d.label === videoTrackLabel) + 1;
    cameraSelectForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const newParams = new URLSearchParams(window.location.search);
      const deviceId = cameraSelect.value;
      newParams.set("deviceId", deviceId);
      window.location.search = newParams.toString();
    });
  });
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// * KEYBOARD AND BUTTONS COMMANDS

/** keyboard commands */
const keyMap = {
  " ": () => togglePlay(),
  k: () => togglePlay(),
  f: () => toggleFullScreenMode(),
  t: () => toggleTheaterMode(),
  m: () => toggleMute(),
  arrowleft: () => skipInTimestamp(-5),
  j: () => skipInTimestamp(-3 * 60),
  ",": () => skipInVideoBuffered(-0.1),
  arrowright: () => skipInTimestamp(5),
  l: () => skipInTimestamp(3 * 60),
  ".": () => skipInVideoBuffered(0.1),
  p: () => changePlaybackSpeed(),
  backspace: () => returnLive(),
  r: () => resetZoomAndAxisLevel(),
};

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (keyMap[key]) {
    e.preventDefault();
    keyMap[key]();
  }
});

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// * VIEW MODES

theaterBtn.addEventListener("click", toggleTheaterMode);
fullScreeBtn.addEventListener("click", toggleFullScreenMode);

function toggleTheaterMode() {
  videoContainer.classList.toggle("theater");
}

function toggleFullScreenMode() {
  if (document.fullscreenElement == null) {
    videoContainer.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener("fullscreenchange", () => {
  videoContainer.classList.toggle("full-screen", document.fullscreenElement);
});

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// * PLAY / PAUSE

video.addEventListener("click", togglePlay);
playPauseBtn.addEventListener("click", togglePlay);

function togglePlay() {
  if (video.paused) {
    video.play().catch(console.error);
  } else {
    video.pause();
  }
}

video.addEventListener("play", () => {
  // this generates an error when starting the app, but it is fine afterward
  try {
    if (video.currentTime < video.buffered.start(0)) {
      returnLive();
    }
  } catch (e) {}

  videoContainer.classList.remove("paused");
});

video.addEventListener("pause", () => {
  videoContainer.classList.add("paused");
});

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// * VOLUME

muteBtn.addEventListener("click", toggleMute);
volumeSlider.addEventListener("input", (e) => {
  video.volume = e.target.value;
  video.muted = e.target.value === 0;
});

function toggleMute() {
  video.muted = !video.muted;
}

video.addEventListener("volumechange", () => {
  volumeSlider.value = video.volume;
  let volumeLevel;
  if (video.muted || video.volume === 0) {
    volumeSlider.value = 0;
    volumeLevel = "muted";
  } else if (video.volume >= 0.5) {
    volumeLevel = "high";
  } else {
    volumeLevel = "low";
  }

  videoContainer.dataset.volumeLevel = volumeLevel;
});

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// * DURATION

function getVideoDuration() {
  return (lastTimestamp - startTimestamp) / 1000;
}

function getCurrentTime() {
  return (currentTimestamp - startTimestamp) / 1000;
}

/** called when a new buffer is added */
function updateTotalTimeOnVideo() {
  const startString = formatTimestamp(startTimestamp);
  const lastString = formatTimestamp(lastTimestamp);

  let s = `${startString} - ${lastString}`;

  if (showMoreVideoInfo) {
    if (video.buffered.length) {
      s += ` (${formatTime(video.buffered.start(0))} - ${formatTime(
        video.buffered.end(0)
      )}) [${formatTime(video.buffered.end(0) - video.buffered.start(0))}]`;
    }
  }
  totalTimeElem.textContent = s;
}

function updateCurrentTime() {
  const currentString = formatTimestamp(currentTimestamp);
  let s = currentString;

  if (showMoreVideoInfo) {
    s += ` (${formatTime(video.currentTime)})`;
  }

  currentTimeElem.textContent = s;
}

video.addEventListener("timeupdate", () => {
  updateCurrentTime();
  const newCurrentTime = getCurrentTime();
  const newTotalTime = getVideoDuration();

  const percent = newCurrentTime / newTotalTime;
  timelineContainer.style.setProperty("--progress-position", percent);
  const percentTimestamp =
    (lastTimestamp - startTimestamp) * percent + startTimestamp;
  timestampIndicator.textContent = formatTimestamp(percentTimestamp);

  const liveDotColor = percent > 0.95 ? "red" : "#bbb";
  liveDotElem.style.setProperty("background-color", liveDotColor);

  const droppedFrames = video.getVideoPlaybackQuality().droppedVideoFrames;
  const totalFrames = video.getVideoPlaybackQuality().totalVideoFrames;
  const droppedFramesPercentage = (droppedFrames / totalFrames) * 100;

  if (droppedFramesPercentage > 10) {
    // More than 10% frames are being dropped, lower the bitrate
    const newVideoBitsPerSecond = videoBitsPerSecond / 1000 / 2;
    const warning = `Stai perdendo troppi frame (${droppedFramesPercentage}%). Abbassa i "videoBitsPerSecond" sotto a: ${newVideoBitsPerSecond}`;
    console.log(warning);
    const warningElem = document.querySelector(".dropped-frames-warning");
    warningElem.textContent = warning;
    warningElem.classList.remove("hidden");
  }
});

function checkVideoIsGoingOn() {
  try {
    // * we don't have the video yet
    if (!video.buffered.length) return true;

    return (
      video.buffered.end(0) - video.currentTime < (REFRESHRATE / 1000) * 10
    );
  } catch (e) {
    console.error("Error in checkVideoIsGoingOn:", e);
    // * whatever error happens, ignore this function (see when it's used)
    return true;
  }
}

const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
  minimumIntegerDigits: 2,
});
/**
 * Transforms a number of seconds in a string of the format hh:mm:ss
 * @param {number} time in seconds
 * @returns string as hh:mm:ss
 */
function formatTime(time) {
  const seconds = Math.floor(time % 60);
  const minutes = Math.floor(time / 60) % 60;
  const hours = Math.floor(time / 60 / 60);

  let returnString = "";
  if (hours !== 0) {
    returnString += `${hours}:`;
  }
  returnString += `${leadingZeroFormatter.format(
    minutes
  )}:${leadingZeroFormatter.format(seconds)}`;

  return returnString;
}
/**
 * Transforms a timestamp in a string of the format hh:mm:ss
 * @param {number} timestamp in milliseconds from 01/01/1970
 * @returns string as hh:mm:ss
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours();

  let returnString = "";
  if (hours !== 0) {
    returnString += `${hours}:`;
  }
  returnString += `${leadingZeroFormatter.format(
    minutes
  )}:${leadingZeroFormatter.format(seconds)}`;

  return returnString;
}

function skipInVideoBuffered(duration) {
  video.currentTime += duration;
}

function skipInTimestamp(duration) {
  moveToTimestamp(currentTimestamp + duration * 1000);
}

// return live
liveBtnElem.addEventListener("click", returnLive);

function returnLive() {
  moveToTimestamp(lastTimestamp - REFRESHRATE * DELAY_MULTIPLIER);
}

// playback speed
speedBtn.addEventListener("click", changePlaybackSpeed);

function changePlaybackSpeed() {
  if (video.playbackRate === 1) video.playbackRate = 0.33;
  else video.playbackRate = 1;

  speedBtn.textContent = `${video.playbackRate}x`;
}

// timeline
timelineContainer.addEventListener("mousemove", handleTimelineUpdate);
timelineContainer.addEventListener("mousedown", toggleScrubbling);
document.addEventListener("mouseup", (e) => {
  if (isScrubbing) toggleScrubbling(e);
});
document.addEventListener("mousemove", (e) => {
  if (isScrubbing) handleTimelineUpdate(e);
});

let isScrubbing = false;
let wasPaused = video.paused;
function toggleScrubbling(e) {
  const percent = getVideoTimelinePercent(e);
  isScrubbing = (e.buttons & 1) === 1;
  videoContainer.classList.toggle("scrubbing", isScrubbing);

  if (isScrubbing) {
    wasPaused = video.paused;
    video.pause();
  } else {
    const newCurrentTimestamp =
      percent * getVideoDuration() * 1000 + startTimestamp;
    moveToTimestamp(newCurrentTimestamp);
    if (!wasPaused) togglePlay();
  }

  handleTimelineUpdate(e);
}

function handleTimelineUpdate(e) {
  const percent = getVideoTimelinePercent(e);

  if (isScrubbing) {
    e.preventDefault();
    timelineContainer.style.setProperty("--progress-position", percent);
    const percentTimestamp =
      (lastTimestamp - startTimestamp) * percent + startTimestamp;
    timestampIndicator.textContent = formatTimestamp(percentTimestamp);
  }

  timelineContainer.style.setProperty("--preview-position", percent);
}

function getVideoTimelinePercent(e) {
  const rect = timelineContainer.getBoundingClientRect();
  const percent = Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;

  return percent;
}

// * delete db
const deleteFormElement = document.querySelector(".delete-all-data-form");
const deleteInputElement = document.getElementById("deleteAllDataInput");
const keyWord = "Elimina";
deleteInputElement.placeholder = keyWord;
deleteFormElement.addEventListener("keydown", (e) => e.stopPropagation());
deleteFormElement.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = deleteInputElement.value;
  deleteInputElement.value = "";
  if (value === keyWord) {
    console.log("delete db");
    db.close();
    db = null;
    deleteDatabase(() => (window.location.search = window.location.search));
  } else {
    alert(`Hai scritto male la parola ${keyWord}, riprova.`);
  }
});

// * save video
const downloadBtn = document.querySelector(".download-btn");
downloadBtn.addEventListener("click", saveVideo);

function saveVideo() {
  getNearestBlobByTimestamp(
    currentTimestamp + DOWNLOAD_DURATION,
    downloadCollectionName,
    (blob, timestamp, id) => {
      const initialTime = timestamp - DOWNLOAD_DURATION;
      const finalTime = timestamp;
      if (currentTimestamp > finalTime) {
        alert(
          "Il pezzo attuale sta ancora venendo registrato. Aspetta un paio di minuti."
        );
        return;
      }
      if (currentTimestamp < initialTime) {
        // ? it should not happen
        alert(
          "C'è stato un errore. Questo pezzo di video non è disponibile per il download."
        );
        return;
      }
      const filename = `video_${formatTimestamp(initialTime)}_${formatTimestamp(
        finalTime
      )}.webm`;

      downloadBlob(blob, filename);
    }
  );
}

/**
 * Given a blob, download it as a file
 * @param {Blob} blob
 */
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

// ! ZOOM COMMANDS
const zoomVar = "--zoom";
const yAxisVar = "--y-axis";
const xAxisVar = "--x-axis";

function getVarLevel(variable) {
  const value = getComputedStyle(video)
    .getPropertyValue(variable)
    .replace("%", "");
  return parseInt(value);
}
const getZoomLevel = () => getVarLevel(zoomVar);
const getYAxisLevel = () => getVarLevel(yAxisVar);
const getXAxisLevel = () => getVarLevel(xAxisVar);

function setVarLevel(variable, level) {
  video.style.setProperty(variable, `${level}%`);
}
const setZoomLevel = (level) => setVarLevel(zoomVar, level);
const setYAxisLevel = (level) => setVarLevel(yAxisVar, level);
const setXAxisLevel = (level) => setVarLevel(xAxisVar, level);

function increaseVarLevel(variable, increment) {
  setVarLevel(variable, getVarLevel(variable) + increment);
}
const increaseZoomLevel = (increment) => {
  if (increment < 0 && getZoomLevel() + increment <= 50) return;
  increaseVarLevel(zoomVar, increment);
};
const increaseYAxisLevel = (increment) => increaseVarLevel(yAxisVar, increment);
const increaseXAxisLevel = (increment) => increaseVarLevel(xAxisVar, increment);

function resetZoomAndAxisLevel() {
  setZoomLevel(100);
  setYAxisLevel(0);
  setXAxisLevel(0);
}

const zoomInBtn = document.querySelector(".zoom-in-btn");
const zoomOutBtn = document.querySelector(".zoom-out-btn");
const zoomResetBtn = document.querySelector(".zoom-reset-btn");

const yAxisUpBtn = document.querySelector(".translate-up-btn");
const yAxisDownBtn = document.querySelector(".translate-down-btn");
const xAxisLeftBtn = document.querySelector(".translate-left-btn");
const xAxisRightBtn = document.querySelector(".translate-right-btn");

zoomInBtn.addEventListener("click", () => increaseZoomLevel(25));
zoomOutBtn.addEventListener("click", () => increaseZoomLevel(-25));
zoomResetBtn.addEventListener("click", resetZoomAndAxisLevel);

yAxisUpBtn.addEventListener("click", () => increaseYAxisLevel(10));
yAxisDownBtn.addEventListener("click", () => increaseYAxisLevel(-10));
xAxisLeftBtn.addEventListener("click", () => increaseXAxisLevel(-5));
xAxisRightBtn.addEventListener("click", () => increaseXAxisLevel(5));

/** Decide if possible to use mouse for zoom and movement @type {HTMLInputElement} */
const mouseZoomCheckbox = document.querySelector(".mouse-zoom-checkbox");

let isRightMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

video.addEventListener("wheel", (e) => {
  if (mouseZoomCheckbox.checked) {
    e.preventDefault();

    // Get mouse position relative to video
    const rect = video.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate position percentages
    const percentX = (mouseX / rect.width) * 100;
    const percentY = (mouseY / rect.height) * 100;

    // Get current zoom and calculate new zoom
    const oldZoom = getZoomLevel();
    const zoomSign = e.deltaY > 0 ? -1 : 1;
    const zoomDelta = zoomSign * 25;
    const newZoom = oldZoom + zoomDelta;

    // Calculate position adjustments
    const scaleChange = (newZoom - oldZoom) / oldZoom;
    const xAxisDelta = -1 * (percentX - 50) * scaleChange;
    const yAxisDelta = -1 * (percentY - 50) * scaleChange;

    // Apply zoom and position changes
    increaseZoomLevel(zoomDelta);
    increaseXAxisLevel(xAxisDelta);
    increaseYAxisLevel(yAxisDelta);
  }
});

video.addEventListener("mousedown", (e) => {
  if (mouseZoomCheckbox.checked && e.button === 2) {
    e.preventDefault();
    isRightMouseDown = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    video.style.cursor = "grabbing";
  }
});

// Add sensitivity controls
const BASE_MOUSE_SENSITIVITY = 4; // Base sensitivity value
const MOVEMENT_THRESHOLD = 1;

video.addEventListener("mousemove", (e) => {
  if (mouseZoomCheckbox.checked && isRightMouseDown) {
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;

    if (
      Math.abs(deltaX) > MOVEMENT_THRESHOLD ||
      Math.abs(deltaY) > MOVEMENT_THRESHOLD
    ) {
      const currentZoom = getZoomLevel();
      const zoomFactor = currentZoom / 100;
      const adjustedSensitivity = BASE_MOUSE_SENSITIVITY * zoomFactor;

      const smoothDeltaX = deltaX / adjustedSensitivity;
      const smoothDeltaY = deltaY / adjustedSensitivity;

      if (Math.abs(smoothDeltaX) > Math.abs(smoothDeltaY)) {
        increaseXAxisLevel(smoothDeltaX);
      } else {
        increaseYAxisLevel(smoothDeltaY);
      }
    }

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

video.addEventListener("mouseup", (e) => {
  if (mouseZoomCheckbox.checked && e.button === 2) {
    isRightMouseDown = false;
    video.style.cursor = "auto";
  }
});

video.addEventListener("mouseleave", () => {
  if (mouseZoomCheckbox.checked) {
    isRightMouseDown = false;
    video.style.cursor = "auto";
  }
});

video.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});
