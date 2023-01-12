const playPauseBtn = document.querySelector(".play-pause-btn");
const theaterBtn = document.querySelector(".theater-btn");
const fullScreeBtn = document.querySelector(".full-screen-btn");
const videoContainer = document.querySelector(".video-container");
const muteBtn = document.querySelector(".mute-btn");
const volumeSlider = document.querySelector(".volume-slider");
const currentTimeElem = document.querySelector(".current-time");
const totalTimeElem = document.querySelector(".total-time");
const speedBtn = document.querySelector(".speed-btn");
const timelineContainer = document.querySelector(".timeline-container");
const video = document.querySelector("video");

// live
// * https://stackoverflow.com/questions/50333767/html5-video-streaming-video-with-blob-urls/50354182
const mediaStream = new MediaStream();
const mediaSource = new MediaSource();

const url = URL.createObjectURL(mediaSource);
video.src = url;

/** @type {SourceBuffer} */
let sourceBuffer;
/** @type {Blob[]} */
const arrayOfBlobs = [];

const MAXTIME = 1 * 60;
const REFRESHRATE = 1 * 1000;

function getVideoDuration() {
  return video.buffered.end(0) - video.buffered.start(0);
}

mediaSource.addEventListener("sourceopen", () => {
  const type = 'video/webm; codecs="vp8, opus"';
  console.log(type);
  console.log(mediaSource);
  sourceBuffer = mediaSource.addSourceBuffer(type);
  sourceBuffer.mode = "sequence";
  sourceBuffer.addEventListener("updateend", appendToSourceBuffer);
});

const mediaRecorder = new MediaRecorder(mediaStream);
mediaRecorder.addEventListener("dataavailable", (e) => {
  const blob = e.data;
  // console.log(blob);
  arrayOfBlobs.push(blob);
  appendToSourceBuffer();
});

function appendToSourceBuffer() {
  if (
    mediaSource.readyState === "open" &&
    sourceBuffer &&
    sourceBuffer.updating === false
  ) {
    const blob = arrayOfBlobs.shift();
    if (blob && blob.size) {
      blob
        .arrayBuffer()
        .then((arrayBuffer) => sourceBuffer.appendBuffer(arrayBuffer));
    }
  }

  // Limit the total buffer size to MAXTIME
  // This way we don't run out of RAM
  if (video.buffered.length && getVideoDuration() > MAXTIME) {
    sourceBuffer.remove(0, video.buffered.end(0) - MAXTIME);
  }
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

getWebcamStream();
function getWebcamStream() {
  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;

  navigator.getUserMedia(
    {
      audio: true,
      video: true,
    },
    /** @param {MediaStream} stream */
    (stream) => {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      mediaStream.addTrack(videoTrack);
      mediaStream.addTrack(audioTrack);

      mediaRecorder.start(REFRESHRATE);
    },
    (err) => console.log(err)
  );
}

// keyboard commands
document.addEventListener("keydown", (e) => {
  switch (e.key.toLowerCase()) {
    case " ":
    case "k":
      togglePlay();
      break;
    case "f":
      toggleFullScreenMode();
      break;
    case "t":
      toggleTheaterMode();
      break;
    case "m":
      toggleMute();
      break;
    case "arrowleft":
      skip(-5);
      break;
    case "j":
      skip(-10);
      break;
    case "arrowright":
      skip(5);
      break;
    case "l":
      skip(10);
      break;
    case "s":
      changePlaybackSpeed();
      break;
  }
});

// view modes
theaterBtn.addEventListener("click", toggleTheaterMode);
fullScreeBtn.addEventListener("click", toggleFullScreenMode);

function toggleTheaterMode() {
  // TODO here return so that is not possible to exit?
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
// TODO DELETE
/* video.addEventListener("loadeddata", () => {
  totalTimeElem.textContent = formatDuration(video.duration);
}); */

video.addEventListener("timeupdate", () => {
  superlog();
  currentTimeElem.textContent = formatDuration(video.currentTime);
  totalTimeElem.textContent = formatDuration(getVideoDuration());
  const percent = video.currentTime / video.duration;
  timelineContainer.style.setProperty("--progress-position", percent);
});

// !IMPORTANT FOR JIC
const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
  minimumIntegerDigits: 2,
});
function formatDuration(time) {
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

// playback speed
speedBtn.addEventListener("click", changePlaybackSpeed);

function changePlaybackSpeed() {
  /* let newPlaybackRate = video.playbackRate + .25;
  if (newPlaybackRate > 2) newPlaybackRate = 0.25;
  video.playbackRate = newPlaybackRate; */

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
    video.currentTime = percent * video.duration;
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
