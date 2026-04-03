# Zoom/Pan Feature — Removed in v1.5.1

This document archives all zoom and pan code removed from the CARE System. Use this to restore the feature if needed.

## How it worked

- CSS variables (`--zoom`, `--y-axis`, `--x-axis`) on the `<video>` element controlled zoom level and pan position
- `transform: scale(var(--zoom)) translate(var(--x-axis), var(--y-axis))` applied the visual transform
- Mouse wheel zoomed in/out relative to cursor position
- Right-click drag panned the video with sensitivity scaled to zoom level
- Button controls provided +/-, directional arrows, and reset
- Keyboard shortcut `R` reset zoom and pan to defaults
- A checkbox toggled whether mouse zoom/pan was active

---

## HTML (`camera.html`)

### Zoom control bar (was inside `.video-player-container`)

```html
<!-- ! ZOOM CONTROL -->
<div class="zoom-control-bar">
  <label class="mouse-zoom-checkbox-label">
    <em>Abilita zoom con mouse</em>
    <input
      type="checkbox"
      id="mouse-zoom-checkbox"
      class="mouse-zoom-checkbox"
    />
  </label>
  <div class="action-buttons">
    <button class="white-btn zoom-reset-btn">reset</button>
    <button class="white-btn zoom-btn zoom-in-btn">+</button>
    <button class="white-btn zoom-btn zoom-out-btn">-</button>
    <button class="white-btn zoom-btn translate-up-btn">🡩</button>
    <button class="white-btn zoom-btn translate-down-btn">🡫</button>
    <button class="white-btn zoom-btn translate-right-btn">🡨</button>
    <button class="white-btn zoom-btn translate-left-btn">🡪</button>
  </div>
</div>
```

### Instruction table rows

```html
<tr>
  <td>Rotella Mouse</td>
  <td>Zoom in/out</td>
</tr>
<tr>
  <td>Tasto destro mouse</td>
  <td>Muovi video</td>
</tr>
<tr>
  <td>R</td>
  <td>Reset Zoom</td>
</tr>
```

---

## JavaScript (`camera.js`)

### Keyboard shortcut (was in `keyMap` object)

```js
r: () => resetZoomAndAxisLevel(),
```

### Full zoom commands block (was at end of file)

```js
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
```

---

## CSS (`styles.css`)

### Video element zoom transform

```css
video {
  --zoom: 100%;
  --y-axis: 0%;
  --x-axis: 0%;
  transform: scale(var(--zoom)) translate(var(--x-axis), var(--y-axis));
}
```

### Zoom control bar layout

```css
.zoom-control-bar {
  display: flex;
  justify-content: end;
  align-items: center;
  padding: 0 1rem;
  gap: 1rem;
}
```

### Mouse zoom checkbox

```css
.mouse-zoom-checkbox-label {
  font-size: 1.25rem;
  line-height: 1.75rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mouse-zoom-checkbox {
  width: 2rem;
  height: 2rem;
  accent-color: powderblue;
}
```

### Zoom buttons

```css
.zoom-btn {
  font-size: 2.5rem;
  min-width: 0;
  aspect-ratio: 1 / 1;
}
```
