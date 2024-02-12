const MAXTIME = 20 * 60;
const videoBitsPerSecond = 2500000 / 4;
// leave this at max 1 sec. Can probably lower, but maybe performance issues
const REFRESHRATE = 1 * 1000;

const playPauseBtn = document.querySelector(".play-pause-btn");
const theaterBtn = document.querySelector(".theater-btn");
const fullScreeBtn = document.querySelector(".full-screen-btn");
const videoContainer = document.querySelector(".video-container");
const muteBtn = document.querySelector(".mute-btn");
const volumeSlider = document.querySelector(".volume-slider");
const currentTimeElem = document.querySelector(".current-time");
const totalTimeElem = document.querySelector(".total-time");
const liveBtnElem = document.querySelector(".live-btn");
const liveDotElem = document.querySelector(".live-dot");
const speedBtn = document.querySelector(".speed-btn");
const timelineContainer = document.querySelector(".timeline-container");
const video = document.querySelector("video");

// live
// * https://stackoverflow.com/questions/50333767/html5-video-streaming-video-with-blob-urls/50354182
/** holder of the webcam audio and video stream */
const mediaStream = new MediaStream();
/** source for the video tag */
const mediaSource = new MediaSource();
const mimeType = 'video/webm; codecs="vp8"';
/** saves the webcam stream to various Blobs */
const mediaRecorder = new MediaRecorder(mediaStream, {
  // audioBitsPerSecond: 128000,
  videoBitsPerSecond: videoBitsPerSecond,
});

//log
const millionFormatter = new Intl.NumberFormat(undefined, {
  notation: "scientific",
});
console.log(
  `videoBitsPerSecond: ${millionFormatter.format(
    mediaRecorder.videoBitsPerSecond
  )}`
);

/** buffer to hold various Blobs @type {SourceBuffer} */
let sourceBuffer;
/** @type {Blob[]} */
const arrayOfBlobs = [];

const url = URL.createObjectURL(mediaSource);
video.src = url;

getWebcamStream();

// * when mediaSource is ready, create the sourceBuffer
mediaSource.addEventListener("sourceopen", () => {
  sourceBuffer = mediaSource.addSourceBuffer(mimeType);
  sourceBuffer.mode = "sequence";
  sourceBuffer.addEventListener("updateend", appendToSourceBuffer);
});

// * when data is aviable to the recorder, add it to the arrayOfBlob and then call appendToSourceBuffer to process it
mediaRecorder.addEventListener("dataavailable", (e) => {
  const blob = e.data;
  console.log(`blob size: ${Math.floor(blob.size / 1000)} kb`);
  arrayOfBlobs.push(blob);
  appendToSourceBuffer();
});

// * get the webcam stream, save it to the mediaStream and start the mediaRecorder
function getWebcamStream() {
  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;

  navigator.getUserMedia(
    {
      // audio: true,
      video: { width: 1920, height: 1080 },
      facingMode: { exact: "enviroment" },
    },
    /** @param {MediaStream} stream */
    (stream) => {
      const videoTrack = stream.getVideoTracks()[0];
      // const audioTrack = stream.getAudioTracks()[0];
      mediaStream.addTrack(videoTrack);
      // mediaStream.addTrack(audioTrack);

      mediaRecorder.start(REFRESHRATE);
    },
    (err) => {
      console.log(err);
      alert(
        "Assicurati che la webcam non sia usata da qualche altro programma, poi ricarica il CARE system"
      );
    }
  );
}

// * add to the sourceBuffer the new segment
function appendToSourceBuffer() {
  if (
    mediaSource.readyState === "open" &&
    sourceBuffer &&
    sourceBuffer.updating === false
  ) {
    const blob = arrayOfBlobs.shift();
    if (blob && blob.size) {
      blob.arrayBuffer().then((arrayBuffer) => {
        sourceBuffer.appendBuffer(arrayBuffer);
        updateTotalTIme();
      });
    }
  }

  // * Limit the total buffer size to MAXTIME, this way we don't run out of RAM
  if (video.buffered.length && getVideoDuration() > MAXTIME) {
    console.log("REACHED MAX TIME");
    sourceBuffer.remove(0, video.buffered.end(0) - MAXTIME);
  }
}

// keyboard commands
const keyMap = {
  " ": () => togglePlay(),
  k: () => togglePlay(),
  f: () => toggleFullScreenMode(),
  t: () => toggleTheaterMode(),
  m: () => toggleMute(),
  arrowleft: () => skip(-5),
  j: () => skip(-10),
  ",": () => skip(-0.1),
  arrowright: () => skip(5),
  l: () => skip(10),
  ".": () => skip(0.1),
  p: () => changePlaybackSpeed(),
  backspace: () => returnLive(),
};

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (keyMap[key]) {
    e.preventDefault();
    keyMap[key]();
  }
});

// view modes
theaterBtn.addEventListener("click", toggleTheaterMode);
fullScreeBtn.addEventListener("click", toggleFullScreenMode);

function toggleTheaterMode() {
  videoContainer.classList.toggle("theater");
}

// !IMPORTANT FOR JIC
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

// play/pause
video.addEventListener("click", togglePlay);
playPauseBtn.addEventListener("click", togglePlay);

function togglePlay() {
  video.paused ? video.play() : video.pause();
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

// volume
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

// duration
function getVideoDuration() {
  // this generates an error when starting the app, but it is fine afterward
  try {
    return video.buffered.end(0) - video.buffered.start(0);
  } catch (e) {
    return 0;
  }
}

function getCurrentTime() {
  return video.currentTime - video.buffered.start(0);
}

// called when a new buffer is added
function updateTotalTIme() {
  totalTimeElem.textContent = formatTime(getVideoDuration());
}

video.addEventListener("timeupdate", () => {
  superlog();
  const newCurrentTime = getCurrentTime();
  const newTotalTime = getVideoDuration();
  currentTimeElem.textContent = formatTime(newCurrentTime);

  const percent = newCurrentTime / newTotalTime;
  timelineContainer.style.setProperty("--progress-position", percent);

  const liveDotColor = percent > 0.95 ? "red" : "#bbb";
  liveDotElem.style.setProperty("background-color", liveDotColor);
});

// !IMPORTANT FOR JIC
const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
  minimumIntegerDigits: 2,
});
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

function skip(duration) {
  video.currentTime += duration;
}

// return live
liveBtnElem.addEventListener("click", returnLive);

function returnLive() {
  video.currentTime = video.buffered.end(0);
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
    const newCurrentTime =
      percent * getVideoDuration() + video.buffered.start(0);
    video.currentTime = newCurrentTime;
    if (!wasPaused) video.play();
  }

  handleTimelineUpdate(e);
}

function handleTimelineUpdate(e) {
  const percent = getVideoTimelinePercent(e);

  if (isScrubbing) {
    e.preventDefault();
    timelineContainer.style.setProperty("--progress-position", percent);
  }

  timelineContainer.style.setProperty("--preview-position", percent);
}

function getVideoTimelinePercent(e) {
  const rect = timelineContainer.getBoundingClientRect();
  const percent = Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;

  return percent;
}

// TODO delete
function superlog() {
  const obj = {
    currentTime: Math.floor(video.currentTime),
    bStart: Math.floor(video.buffered.start(0)),
    bEnd: Math.floor(video.buffered.end(0)),
    bDifference: Math.floor(getVideoDuration()),
  };
  console.log(obj);
}
