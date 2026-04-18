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

  const cameraSelect = document.querySelector(
    `input[name=camera-select]:checked`
  );
  const selectedValue = cameraSelect ? cameraSelect.value : "";
  if (selectedValue === "__USB_HTTP__") {
    const usbUrl = document.getElementById("usbCameraUrl");
    newParams.set("usbCameraUrl", usbUrl ? usbUrl.value : "http://localhost:8081");
    newParams.delete("deviceId");
  } else {
    newParams.set("deviceId", selectedValue);
    newParams.delete("usbCameraUrl");
  }

  // window.location.search = newParams.toString();
  window.location.href = `camera.html?${newParams.toString()}`;
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

/** @type {HTMLSelectElement} */
const cameraSelectDiv = document.querySelector(".camera-select-div");

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
    })
    .catch((err) => {
      console.error(err);
      alert(
        t("error.recording", { mimeType: mimeType, message: err.message })
      );
    });
}

/** use it after the promise of getUserMedia or you cannot have the labels */
function listAllCameraDevices() {
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    const filtered_devices = devices.filter((d) => d.kind === "videoinput");

    cameraSelectDiv.querySelector("p.camera-select-placeholder")?.remove();

    filtered_devices.forEach((device) => {
      const label = document.createElement("label");
      label.className = "camera-select-radio-label";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "camera-select";
      radio.value = device.deviceId;
      radio.className = "camera-radio-input";
      if (device.label === videoTrackLabel) {
        radio.checked = true;
      }

      const labelText = document.createTextNode(device.label);

      label.appendChild(radio);
      label.appendChild(labelText);
      cameraSelectDiv.appendChild(label);
    });

    addUSBCameraOption();
  });
}

function addUSBCameraOption() {
  if (cameraSelectDiv.querySelector("#usbCameraOption")) return;

  const container = document.createElement("div");
  container.id = "usbCameraOption";
  container.className = "usb-camera-option";

  const hr = document.createElement("hr");
  container.appendChild(hr);

  const label = document.createElement("label");
  label.className = "camera-select-radio-label";

  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "camera-select";
  radio.value = "__USB_HTTP__";
  radio.className = "camera-radio-input";

  label.appendChild(radio);
  label.appendChild(document.createTextNode(t("camera.usb_option")));
  container.appendChild(label);

  const hint = document.createElement("p");
  hint.className = "usb-camera-hint";
  hint.innerHTML =
    t("camera.usb_hint") + "<br/>" +
    t("camera.usb_url_label") + ' <input type="text" id="usbCameraUrl" value="http://localhost:8081"' +
    ' class="white-input usb-camera-url-input" />';
  container.appendChild(hint);

  cameraSelectDiv.appendChild(container);
}

// ! Language selector
function initLanguageSelector() {
  const langSelect = document.getElementById("language-select");
  if (langSelect) {
    langSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLanguageSelector);
} else {
  initLanguageSelector();
}
