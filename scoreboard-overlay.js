"use strict";

// * Draws the Shiai second monitor on the stream canvas, mirroring shiai/frontend/components/pages/live-tatami.
// * Sizes follow the Shiai CSS: 1vh is 1% of the overlay height, 1rem is the root font size on a 1080p monitor.

const OVERLAY_WIDTH_RATIO = 0.3;
const OVERLAY_MARGIN_RATIO = 0.015;
const OVERLAY_ASPECT_RATIO = 16 / 9;
const OVERLAY_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif';
const COLOR_PRIMARY_LIGHT = "#abf9fe";
const COLOR_PRIMARY_DARK = "#6ae4ff";
const COLOR_HOMEPAGE_PRIMARY = "#0b5e76";
const COLOR_OSK_FILL = "orangered";
const COLOR_TIMER_RUNNING = "yellow";
const COLOR_TIMER_STOPPED = "red";
const MAX_SHIDO_CARDS = 3;
const LIVE_KEEPER_BASE_URL = "https://live.judoincloud.com/api";
const LIVE_STATE_POLL_MS = 1000;

/** @typedef {{ name: string, surname: string, club: string }} LiveAthlete */
/**
 * @typedef {{
 *   white_ippon: number, white_wazaari: number, white_yuko: number, white_penalties: number,
 *   red_ippon: number, red_wazaari: number, red_yuko: number, red_penalties: number,
 * }} LiveScores
 */
/**
 * @typedef {{
 *   type: string,
 *   timestamp: number,
 *   scores: LiveScores,
 *   is_gs: boolean,
 *   match_time_at_event: number,
 *   osk_time_at_event?: number,
 *   osk_owner?: "WHITE" | "RED",
 * }} LiveEvent
 */
/**
 * @typedef {{
 *   display_state: "waiting" | "pre_fight" | "match" | "end",
 *   last_event: LiveEvent,
 *   white_athlete: LiveAthlete,
 *   red_athlete: LiveAthlete,
 *   category_name: string,
 *   max_osk_time: number,
 *   winner_color?: "WHITE" | "RED",
 *   winner_athlete?: LiveAthlete,
 * }} LiveState
 */
/** @typedef {{ x: number, y: number, w: number, h: number, vh: number, rem: number }} OverlayBox */

/** @type {LiveState | null} */
let liveState = null;
let liveStatePollTimer = 0;
/** incremented by every start and stop, so a poll of an old run stops itself */
let liveScoreboardGeneration = 0;
let liveScoreboardActive = false;

/** timers reconstructed from the last event, like useTimerReconstruction in Shiai */
const liveTimers = {
  lastEventKey: "",
  matchTime: 0,
  /** @type {{ startedAt: number, timeAtStart: number, isGs: boolean } | null} */
  matchStart: null,
  oskTime: 0,
  /** @type {{ startedAt: number, timeAtStart: number } | null} */
  oskStart: null,
};

/**
 * @param {string} svg
 * @returns {HTMLImageElement}
 */
function loadSvgImage(svg) {
  const image = new Image();
  image.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  return image;
}

function startLiveScoreboard() {
  const generation = ++liveScoreboardGeneration;
  liveScoreboardActive = true;
  pollLiveState(generation);
}

function stopLiveScoreboard() {
  liveScoreboardGeneration++;
  liveScoreboardActive = false;
  clearTimeout(liveStatePollTimer);
  liveState = null;
  resetLiveTimers();
}

/** @param {number} generation */
async function pollLiveState(generation) {
  /** @type {LiveState | null} */
  let state = null;
  try {
    const response = await fetch(
      `${LIVE_KEEPER_BASE_URL}/live/${encodeURIComponent(competitionSlug)}/${encodeURIComponent(tatamiNumber)}`
    );
    const body = await response.json();
    state = body.status === "success" ? body.data : null;
  } catch {
    state = null;
  }
  if (generation !== liveScoreboardGeneration) return;
  liveState = state;
  if (state) updateLiveTimers(state.last_event);
  liveStatePollTimer = setTimeout(() => pollLiveState(generation), LIVE_STATE_POLL_MS);
}

function resetLiveTimers() {
  liveTimers.lastEventKey = "";
  liveTimers.matchTime = 0;
  liveTimers.matchStart = null;
  liveTimers.oskTime = 0;
  liveTimers.oskStart = null;
}

/** @param {LiveEvent | undefined} event */
function updateLiveTimers(event) {
  if (!event) return;
  const key = `${event.type}:${event.timestamp}`;
  if (key === liveTimers.lastEventKey) return;
  // * a stream that starts mid-match shows the time of the first event instead of 00:00
  if (!liveTimers.lastEventKey) liveTimers.matchTime = event.match_time_at_event;
  liveTimers.lastEventKey = key;

  if (event.type === "TIMER_START") {
    liveTimers.matchStart = {
      startedAt: event.timestamp,
      timeAtStart: event.match_time_at_event,
      isGs: event.is_gs,
    };
  } else if (["TIMER_STOP", "MATCH_END", "MATCH_STARTED"].includes(event.type)) {
    liveTimers.matchStart = null;
    liveTimers.matchTime = event.match_time_at_event;
  } else if (event.type === "GOLDEN_SCORE") {
    liveTimers.matchTime = event.match_time_at_event;
  } else if (event.type === "SCORE_CHANGE" && !liveTimers.matchStart) {
    liveTimers.matchTime = event.match_time_at_event;
  }

  if (event.type === "OSK_START") {
    liveTimers.oskStart = {
      startedAt: event.timestamp,
      timeAtStart: event.osk_time_at_event ?? 0,
    };
  } else if (event.type === "OSK_STOP") {
    liveTimers.oskTime = event.osk_time_at_event ?? currentOskTime();
    liveTimers.oskStart = null;
  } else if (event.type === "MATCH_END") {
    liveTimers.oskStart = null;
    liveTimers.oskTime = 0;
  }
}

function currentMatchTime() {
  const start = liveTimers.matchStart;
  if (!start) return liveTimers.matchTime;
  const elapsed = Math.floor((Date.now() - start.startedAt) / 1000);
  return start.isGs ? start.timeAtStart + elapsed : Math.max(start.timeAtStart - elapsed, 0);
}

function currentOskTime() {
  const start = liveTimers.oskStart;
  if (!start) return liveTimers.oskTime;
  return start.timeAtStart + Math.floor((Date.now() - start.startedAt) / 1000);
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// * DRAWING

/**
 * Draw the second monitor in the bottom right corner of the frame.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} frameWidth
 * @param {number} frameHeight
 */
function drawScoreboardOverlay(ctx, frameWidth, frameHeight) {
  if (!liveScoreboardActive) return;

  const w = Math.round(frameWidth * OVERLAY_WIDTH_RATIO);
  const h = Math.round(w / OVERLAY_ASPECT_RATIO);
  const margin = Math.round(frameHeight * OVERLAY_MARGIN_RATIO);
  /** @type {OverlayBox} */
  const box = { x: frameWidth - w - margin, y: frameHeight - h - margin, w, h, vh: h / 100, rem: h / 67.5 };

  ctx.save();
  try {
    ctx.translate(box.x, box.y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.strokeRect(0, 0, w, h);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.textBaseline = "middle";

    const state = liveState;
    if (!state || state.display_state === "waiting") {
      drawWaitingScreen(ctx, box);
    } else if (state.display_state === "pre_fight") {
      drawPreFightScreen(ctx, box, state);
    } else if (state.display_state === "end") {
      if (state.winner_athlete && state.winner_color) drawEndScreen(ctx, box, state);
      else drawWaitingScreen(ctx, box);
    } else {
      drawMatchScreen(ctx, box, state);
    }
  } finally {
    ctx.restore();
  }
}

/**
 * @param {"bold" | "normal"} weight
 * @param {number} size in px
 * @param {boolean} [italic]
 */
function overlayFont(weight, size, italic = false) {
  return `${italic ? "italic " : ""}${weight} ${Math.round(size)}px ${OVERLAY_FONT_FAMILY}`;
}

/**
 * Center positions of items spread with `justify-content: space-evenly`
 * @param {number} top
 * @param {number} height
 * @param {number[]} itemHeights
 * @returns {number[]}
 */
function spaceEvenly(top, height, itemHeights) {
  const gap = (height - itemHeights.reduce((sum, h) => sum + h, 0)) / (itemHeights.length + 1);
  let y = top;
  return itemHeights.map((itemHeight) => {
    y += gap;
    const center = y + itemHeight / 2;
    y += itemHeight;
    return center;
  });
}

/**
 * Split the text into lines that fit the width. Words beyond the last line stay on it and get squeezed.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} maxLines
 * @returns {string[]}
 */
function wrapText(ctx, text, maxWidth, maxLines) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && lines.length < maxLines - 1 && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  lines.push(line);
  return lines;
}

/**
 * Draw the image scaled to fit the rectangle, centered, keeping its aspect ratio
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} image
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
function drawImageFit(ctx, image, x, y, w, h) {
  if (!image.complete || !image.naturalWidth) return;
  const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  ctx.drawImage(image, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
}

/**
 * The DisplayedTimer of Shiai: digits on a black rounded box, yellow while running and red when stopped
 * @param {CanvasRenderingContext2D} ctx
 * @param {OverlayBox} box
 * @param {string} text
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} fontSize
 * @param {number} horizontalPadding
 * @param {boolean} running
 */
function drawTimerBox(ctx, box, text, centerX, centerY, fontSize, horizontalPadding, running) {
  ctx.font = overlayFont("bold", fontSize);
  const textWidth = ctx.measureText(text).width;
  const boxWidth = textWidth + 2 * horizontalPadding;
  const boxHeight = fontSize * 1.15;
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.roundRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight, 1.5 * box.vh);
  ctx.fill();
  ctx.fillStyle = running ? COLOR_TIMER_RUNNING : COLOR_TIMER_STOPPED;
  ctx.textAlign = "center";
  ctx.fillText(text, centerX, centerY);
}

/** @param {LiveAthlete} athlete */
function athleteShortName(athlete) {
  let text = athlete.surname;
  if (athlete.name) text += ` ${athlete.name.charAt(0)}.`;
  return text;
}

/** @param {LiveAthlete} athlete */
function athleteFullName(athlete) {
  return [athlete.surname, athlete.name].filter(Boolean).join(" ");
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {OverlayBox} box
 */
function drawWaitingScreen(ctx, box) {
  const { w, h, vh } = box;
  ctx.fillStyle = COLOR_HOMEPAGE_PRIMARY;
  ctx.fillRect(0, 0, w, h);
  drawImageFit(ctx, logoVerticalImage, w * 0.025, h * 0.05, w * 0.45, h * 0.9);
  ctx.fillStyle = "white";
  ctx.font = overlayFont("bold", 55 * vh);
  ctx.textAlign = "center";
  ctx.fillText(String(tatamiNumber), w * 0.75, h / 2, w / 2);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {OverlayBox} box
 * @param {LiveState} state
 */
function drawPreFightScreen(ctx, box, state) {
  const { w, h, vh, rem } = box;
  const columnWidth = w / 3;
  const padding = 2.5 * rem;

  ctx.fillStyle = COLOR_HOMEPAGE_PRIMARY;
  ctx.fillRect(0, 0, columnWidth, h);
  ctx.fillStyle = "white";
  ctx.font = overlayFont("bold", 3 * rem);
  ctx.textAlign = "center";
  ctx.fillText(t("stream.next_match"), columnWidth / 2, h / 10, columnWidth - 2 * vh);
  drawImageFit(ctx, logoVerticalImage, columnWidth * 0.05, h / 5, columnWidth * 0.9, (h * 3) / 5);

  const contentX = columnWidth;
  const contentWidth = w - columnWidth;
  ctx.fillStyle = COLOR_HOMEPAGE_PRIMARY;
  ctx.fillRect(contentX, 0, contentWidth, h / 5);
  ctx.fillStyle = "white";
  ctx.font = overlayFont("bold", 6 * rem);
  ctx.textAlign = "left";
  ctx.fillText(state.category_name, contentX + padding, h / 10, contentWidth - 2 * padding);

  drawPreFightAthlete(ctx, box, state.white_athlete, "white", h / 5);
  drawPreFightAthlete(ctx, box, state.red_athlete, COLOR_PRIMARY_LIGHT, (h * 3) / 5);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {OverlayBox} box
 * @param {LiveAthlete} athlete
 * @param {string} background
 * @param {number} top
 */
function drawPreFightAthlete(ctx, box, athlete, background, top) {
  const { w, h, rem } = box;
  const sectionHeight = (h * 2) / 5;
  const contentX = w / 3;
  const contentWidth = w - contentX;
  const padding = 2.5 * rem;
  const nameSize = 8 * rem;
  const clubSize = 4.5 * rem;
  const [nameY, clubY] = spaceEvenly(top, sectionHeight, [nameSize, clubSize]);

  ctx.fillStyle = background;
  ctx.fillRect(contentX, top, contentWidth, sectionHeight);
  ctx.fillStyle = "black";
  ctx.textAlign = "left";
  ctx.font = overlayFont("bold", nameSize);
  ctx.fillText(athleteFullName(athlete), contentX + padding, nameY, contentWidth - 2 * padding);
  ctx.font = overlayFont("normal", clubSize, true);
  ctx.fillText(athlete.club, contentX + padding, clubY, contentWidth - 2 * padding);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {OverlayBox} box
 * @param {LiveState} state
 */
function drawEndScreen(ctx, box, state) {
  const { w, h, rem } = box;
  const headerHeight = h / 6;
  const winnerHeight = h / 2;
  const footerTop = headerHeight + winnerHeight;
  const footerHeight = h - footerTop;
  const padding = 2.5 * rem;

  ctx.fillStyle = COLOR_HOMEPAGE_PRIMARY;
  ctx.fillRect(0, 0, w, headerHeight);
  ctx.fillStyle = "white";
  ctx.font = overlayFont("bold", 8 * rem);
  ctx.textAlign = "center";
  ctx.fillText(t("stream.winner").toUpperCase(), w / 2, headerHeight / 2, w - 2 * padding);

  ctx.fillStyle = state.winner_color === "WHITE" ? "white" : COLOR_PRIMARY_LIGHT;
  ctx.fillRect(0, headerHeight, w, winnerHeight);
  const nameSize = 8 * rem;
  const clubSize = 6 * rem;
  const [nameY, clubY] = spaceEvenly(headerHeight, winnerHeight, [nameSize, clubSize]);
  ctx.fillStyle = "black";
  ctx.font = overlayFont("bold", nameSize);
  ctx.fillText(athleteFullName(state.winner_athlete), w / 2, nameY, w - 2 * padding);
  ctx.font = overlayFont("normal", clubSize, true);
  ctx.fillText(state.winner_athlete.club, w / 2, clubY, w - 2 * padding);

  ctx.fillStyle = COLOR_HOMEPAGE_PRIMARY;
  ctx.fillRect(0, footerTop, w, footerHeight);
  drawImageFit(ctx, logoHorizontalImage, w * 0.2, footerTop + footerHeight * 0.1, w * 0.6, footerHeight * 0.8);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {OverlayBox} box
 * @param {LiveState} state
 */
function drawMatchScreen(ctx, box, state) {
  const { w, h, vh, rem } = box;
  const event = state.last_event;
  const columnWidth = w / 6;
  // * grid rows 3fr 4fr 2fr 2fr
  const rowTops = [0, (h * 3) / 11, (h * 7) / 11, (h * 9) / 11, h];

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = COLOR_PRIMARY_DARK;
  ctx.fillRect(0, 0, w / 2, h);

  // * top row: GS symbol, match timer, category name
  const topCenterY = (rowTops[0] + rowTops[1]) / 2;
  if (event.is_gs) {
    ctx.font = overlayFont("bold", 15 * vh);
    ctx.textAlign = "center";
    ctx.fillStyle = "black";
    ctx.fillText("GS", columnWidth * 1.5 + 0.3 * vh, topCenterY + 0.6 * vh);
    ctx.fillStyle = COLOR_TIMER_RUNNING;
    ctx.fillText("GS", columnWidth * 1.5, topCenterY);
  }
  const matchTime = currentMatchTime();
  const clock = `${String(Math.floor(matchTime / 60)).padStart(2, "0")}:${String(matchTime % 60).padStart(2, "0")}`;
  drawTimerBox(ctx, box, clock, w / 2, topCenterY, 20 * vh, 1 * vh, liveTimers.matchStart !== null);

  ctx.fillStyle = "black";
  ctx.font = overlayFont("bold", 5 * rem);
  ctx.textAlign = "center";
  const nameWidth = 2 * columnWidth * 0.95;
  const nameLines = wrapText(ctx, state.category_name, nameWidth, 2);
  const lineHeight = 5 * rem;
  nameLines.forEach((line, i) => {
    const lineY = topCenterY + (i - (nameLines.length - 1) / 2) * lineHeight;
    ctx.fillText(line, columnWidth * 5, lineY, nameWidth);
  });

  drawScoreRow(ctx, box, event.scores, rowTops[1], rowTops[2] - rowTops[1]);
  if (event.osk_owner) {
    drawOskRow(ctx, box, event.osk_owner, state.max_osk_time, rowTops[2], rowTops[3] - rowTops[2]);
  }
  drawNamesRow(ctx, box, state, rowTops[3], rowTops[4] - rowTops[3]);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {OverlayBox} box
 * @param {LiveScores} scores
 * @param {number} top
 * @param {number} height
 */
function drawScoreRow(ctx, box, scores, top, height) {
  const { w, vh } = box;
  const cells = [
    { value: scores.red_penalties, label: "Shido", cards: true },
    { value: scores.red_ippon, label: "Ippon" },
    { value: scores.red_wazaari, label: "Waza Ari" },
    { value: scores.red_yuko, label: "Yuko" },
    { value: scores.white_ippon, label: "Ippon" },
    { value: scores.white_wazaari, label: "Waza Ari" },
    { value: scores.white_yuko, label: "Yuko" },
    { value: scores.white_penalties, label: "Shido", cards: true },
  ];
  const slotWidth = w / cells.length;
  const labelY = top + height - 2 * vh;
  ctx.fillStyle = "black";
  ctx.textAlign = "center";

  cells.forEach((cell, i) => {
    const centerX = slotWidth * (i + 0.5);
    const showCards = cell.cards && cell.value <= MAX_SHIDO_CARDS;
    if (showCards) {
      drawShidoCards(ctx, box, cell.value, centerX, top, height);
    } else {
      ctx.font = overlayFont("bold", 30 * vh);
      ctx.fillText(String(cell.value), centerX, top + 15 * vh, slotWidth);
    }
    ctx.font = overlayFont("bold", 4 * vh);
    ctx.fillText(showCards ? `${cell.value} Shido` : cell.label, centerX, labelY, slotWidth);
  });
}

/**
 * Yellow cards for the first two shido, a red one for the third, as tilted rounded squares
 * @param {CanvasRenderingContext2D} ctx
 * @param {OverlayBox} box
 * @param {number} count
 * @param {number} centerX
 * @param {number} top
 * @param {number} height
 */
function drawShidoCards(ctx, box, count, centerX, top, height) {
  const { vh } = box;
  const size = 9 * vh;
  const gap = height * 0.04;
  let y = top + height * 0.03;
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.translate(centerX, y + size / 2);
    ctx.rotate(-Math.PI / 12);
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.2);
    ctx.fillStyle = i < 2 ? "#ffed00" : "#e30613";
    ctx.fill();
    ctx.lineWidth = 0.3 * vh;
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.restore();
    y += size + gap;
  }
}

/**
 * Osaekomi bar and seconds on the side of the athlete holding
 * @param {CanvasRenderingContext2D} ctx
 * @param {OverlayBox} box
 * @param {"WHITE" | "RED"} owner
 * @param {number} maxTime
 * @param {number} top
 * @param {number} height
 */
function drawOskRow(ctx, box, owner, maxTime, top, height) {
  const { w, vh, rem } = box;
  const halfWidth = w / 2;
  const halfX = owner === "RED" ? 0 : halfWidth;
  const centerY = top + height / 2;
  const timerSize = 12 * vh;
  const barHeight = timerSize * 1.15 * 0.96;
  const barWidth = halfWidth * 0.68;
  const timerWidth = halfWidth * 0.28;
  const gap = (halfWidth - barWidth - timerWidth) / 4;
  const oskTime = currentOskTime();
  const radius = 2.5 * rem;
  const fillWidth = Math.min(oskTime / maxTime, 1) * barWidth;

  const barX = owner === "RED" ? halfX + gap : halfX + gap * 3 + timerWidth;
  const timerCenterX = owner === "RED" ? halfX + gap * 3 + barWidth + timerWidth / 2 : halfX + gap + timerWidth / 2;
  const barY = centerY - barHeight / 2;
  // * the bar is rounded on the side that faces the middle of the screen
  const radii = owner === "RED" ? [0, radius, radius, 0] : [radius, 0, 0, radius];

  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, radii);
  ctx.fillStyle = owner === "RED" ? "white" : COLOR_PRIMARY_DARK;
  ctx.fill();
  ctx.lineWidth = 0.5 * vh;
  ctx.strokeStyle = "black";
  ctx.stroke();

  if (fillWidth > 0) {
    const fillX = owner === "RED" ? barX : barX + barWidth - fillWidth;
    ctx.beginPath();
    ctx.roundRect(fillX, barY, fillWidth, barHeight, radii);
    ctx.fillStyle = COLOR_OSK_FILL;
    ctx.fill();
    ctx.stroke();
  }

  drawTimerBox(
    ctx,
    box,
    String(oskTime).padStart(2, "0"),
    timerCenterX,
    centerY,
    timerSize,
    halfWidth * 0.08,
    liveTimers.oskStart !== null
  );
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {OverlayBox} box
 * @param {LiveState} state
 * @param {number} top
 * @param {number} height
 */
function drawNamesRow(ctx, box, state, top, height) {
  const { w, rem } = box;
  const centerY = top + height / 2;
  const dividerWidth = 0.25 * rem;
  const padding = 0.5 * rem;

  ctx.fillStyle = "white";
  ctx.fillRect(0, top, w, height);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "black";
  ctx.strokeRect(0, top, w, height);
  ctx.fillStyle = "black";
  ctx.fillRect(w / 2 - dividerWidth / 2, top, dividerWidth, height);

  ctx.font = overlayFont("bold", 6 * rem);
  ctx.textAlign = "center";
  ctx.fillText(athleteShortName(state.red_athlete), w / 4, centerY, w / 2 - 2 * padding);
  ctx.fillText(athleteShortName(state.white_athlete), (w * 3) / 4, centerY, w / 2 - 2 * padding);
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// * LOGOS, copied from shiai/frontend/public

const LOGO_VERTICAL_WHITE_SVG = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	style="enable-background:new 0 0 841.89 595.28;" xml:space="preserve"
	viewBox="225.45 150.25 390.98 294.75">
<style type="text/css">
	.st0{fill:white;}
</style>
<g>
	<g>
		<path class="st0" d="M245.69,410.2v23.47c0,0.98-0.05,1.9-0.16,2.73c-0.11,0.84-0.28,1.56-0.51,2.15    c-0.39,0.95-0.92,1.82-1.59,2.62c-0.67,0.8-1.45,1.47-2.35,2.01c-0.9,0.56-1.89,0.98-2.98,1.29c-1.09,0.31-2.23,0.47-3.43,0.47    c-3.62,0-6.57-1.65-8.84-4.97l5.74-5.88c0.16,1.01,0.48,1.82,0.98,2.42c0.5,0.59,1.14,0.9,1.89,0.9c1.64,0,2.46-1.29,2.46-3.9    v-23.33h8.8V410.2z"/>
		<path class="st0" d="M261.61,410.2v18.4c0,0.98,0.03,2,0.11,3.03s0.3,1.96,0.67,2.81c0.37,0.84,0.97,1.51,1.78,2.04    c0.81,0.53,1.95,0.78,3.42,0.78s2.59-0.27,3.38-0.78c0.8-0.53,1.39-1.2,1.78-2.04c0.39-0.84,0.62-1.78,0.7-2.81    c0.08-1.03,0.11-2.04,0.11-3.03v-18.4h8.75v19.62c0,5.27-1.2,9.11-3.62,11.54s-6.11,3.63-11.1,3.63s-8.7-1.22-11.13-3.63    c-2.43-2.42-3.63-6.27-3.63-11.54V410.2H261.61z"/>
		<path class="st0" d="M289.4,410.2h13.02c2.31,0,4.46,0.47,6.49,1.39s3.79,2.17,5.3,3.7c1.51,1.53,2.7,3.34,3.57,5.38    c0.87,2.04,1.29,4.2,1.29,6.44c0,2.21-0.42,4.35-1.28,6.39c-0.86,2.04-2.03,3.85-3.54,5.41c-1.51,1.56-3.27,2.79-5.3,3.73    c-2.01,0.94-4.2,1.39-6.53,1.39H289.4V410.2z M298.2,436.58h2.01c1.53,0,2.89-0.23,4.09-0.72c1.2-0.48,2.21-1.14,3.03-1.98    c0.83-0.84,1.45-1.82,1.89-2.98c0.44-1.15,0.65-2.42,0.65-3.79c0-1.34-0.22-2.6-0.67-3.77c-0.45-1.17-1.09-2.17-1.9-3.01    c-0.83-0.84-1.84-1.5-3.03-1.98c-1.2-0.48-2.54-0.72-4.04-0.72h-2.01v18.95H298.2z"/>
		<path class="st0" d="M323.15,427.12c0-2.51,0.47-4.85,1.39-7.02c0.92-2.17,2.21-4.05,3.85-5.68s3.62-2.89,5.89-3.79    c2.29-0.9,4.8-1.37,7.56-1.37c2.73,0,5.24,0.45,7.53,1.37c2.31,0.92,4.29,2.18,5.94,3.79c1.67,1.62,2.95,3.51,3.88,5.68    c0.94,2.17,1.39,4.51,1.39,7.02c0,2.51-0.47,4.85-1.39,7.02c-0.92,2.17-2.21,4.05-3.88,5.68c-1.65,1.62-3.65,2.89-5.94,3.79    c-2.31,0.9-4.82,1.37-7.53,1.37c-2.74,0-5.27-0.45-7.56-1.37c-2.29-0.92-4.26-2.18-5.89-3.79c-1.65-1.62-2.93-3.51-3.85-5.68    C323.6,431.98,323.15,429.63,323.15,427.12z M332.35,427.12c0,1.34,0.25,2.59,0.76,3.73s1.2,2.12,2.06,2.96    c0.87,0.84,1.87,1.5,3.03,1.95c1.15,0.47,2.37,0.7,3.65,0.7s2.51-0.23,3.66-0.7c1.15-0.47,2.17-1.11,3.06-1.95    c0.89-0.84,1.58-1.82,2.09-2.96s0.76-2.37,0.76-3.73c0-1.36-0.25-2.59-0.76-3.73s-1.2-2.12-2.09-2.96    c-0.89-0.84-1.9-1.48-3.06-1.95c-1.15-0.47-2.37-0.7-3.66-0.7s-2.51,0.23-3.65,0.7c-1.15,0.47-2.17,1.11-3.03,1.95    c-0.86,0.84-1.56,1.82-2.06,2.96S332.35,425.78,332.35,427.12z"/>
		<path class="st0" d="M390.24,410.2v33.84h-8.8V410.2H390.24z"/>
		<path class="st0" d="M397.32,444.04V410.2h8.8l16.25,20.69V410.2h8.75v33.84h-8.75l-16.25-20.69v20.69H397.32z"/>
		<path class="st0" d="M477.84,421.52c-2.03-2.48-4.55-3.73-7.53-3.73c-1.31,0-2.53,0.23-3.65,0.72s-2.09,1.12-2.9,1.95    c-0.81,0.83-1.45,1.81-1.9,2.93c-0.47,1.14-0.7,2.37-0.7,3.68c0,1.34,0.23,2.59,0.7,3.73c0.47,1.14,1.11,2.12,1.93,2.96    c0.83,0.84,1.79,1.5,2.9,1.98c1.11,0.48,2.31,0.72,3.59,0.72c2.81,0,5.33-1.2,7.58-3.59v10.42l-0.9,0.31    c-1.34,0.48-2.6,0.83-3.77,1.06c-1.17,0.22-2.32,0.34-3.46,0.34c-2.34,0-4.57-0.44-6.71-1.33c-2.14-0.89-4.02-2.12-5.66-3.73    c-1.64-1.61-2.93-3.51-3.93-5.71c-0.98-2.2-1.48-4.6-1.48-7.2c0-2.6,0.48-4.99,1.47-7.16c0.97-2.17,2.28-4.04,3.9-5.61    c1.64-1.58,3.52-2.79,5.68-3.68c2.15-0.89,4.41-1.33,6.78-1.33c1.34,0,2.67,0.14,3.98,0.42c1.29,0.28,2.67,0.73,4.1,1.33V421.52z"/>
		<path class="st0" d="M492.2,410.2v26.39h10.54v7.45H483.4V410.2H492.2z"/>
		<path class="st0" d="M505.08,427.12c0-2.51,0.47-4.85,1.39-7.02c0.92-2.17,2.21-4.05,3.85-5.68s3.62-2.89,5.89-3.79    c2.29-0.9,4.8-1.37,7.56-1.37c2.73,0,5.24,0.45,7.53,1.37c2.31,0.92,4.29,2.18,5.94,3.79c1.67,1.62,2.95,3.51,3.88,5.68    s1.39,4.51,1.39,7.02c0,2.51-0.47,4.85-1.39,7.02s-2.21,4.05-3.88,5.68c-1.65,1.62-3.65,2.89-5.94,3.79    c-2.31,0.9-4.82,1.37-7.53,1.37c-2.74,0-5.27-0.45-7.56-1.37c-2.29-0.92-4.26-2.18-5.89-3.79c-1.65-1.62-2.93-3.51-3.85-5.68    C505.53,431.98,505.08,429.63,505.08,427.12z M514.28,427.12c0,1.34,0.25,2.59,0.76,3.73c0.51,1.14,1.2,2.12,2.06,2.96    c0.87,0.84,1.87,1.5,3.03,1.95c1.15,0.47,2.37,0.7,3.65,0.7c1.28,0,2.51-0.23,3.66-0.7c1.15-0.47,2.17-1.11,3.06-1.95    c0.89-0.84,1.58-1.82,2.09-2.96c0.51-1.14,0.76-2.37,0.76-3.73c0-1.36-0.25-2.59-0.76-3.73c-0.51-1.14-1.2-2.12-2.09-2.96    c-0.89-0.84-1.9-1.48-3.06-1.95c-1.15-0.47-2.37-0.7-3.66-0.7c-1.29,0-2.51,0.23-3.65,0.7c-1.15,0.47-2.17,1.11-3.03,1.95    c-0.86,0.84-1.56,1.82-2.06,2.96C514.55,424.53,514.28,425.78,514.28,427.12z"/>
		<path class="st0" d="M556.92,410.2v18.4c0,0.98,0.03,2,0.11,3.03s0.3,1.96,0.67,2.81c0.37,0.84,0.97,1.51,1.78,2.04    c0.81,0.53,1.95,0.78,3.42,0.78s2.59-0.27,3.38-0.78c0.8-0.53,1.39-1.2,1.78-2.04c0.39-0.84,0.62-1.78,0.7-2.81    s0.11-2.04,0.11-3.03v-18.4h8.75v19.62c0,5.27-1.2,9.11-3.62,11.54c-2.42,2.43-6.11,3.63-11.1,3.63s-8.7-1.22-11.13-3.63    c-2.43-2.42-3.63-6.27-3.63-11.54V410.2H556.92z"/>
		<path class="st0" d="M584.69,410.2h13.02c2.31,0,4.46,0.47,6.49,1.39s3.79,2.17,5.3,3.7c1.51,1.53,2.7,3.34,3.57,5.38    c0.87,2.04,1.29,4.2,1.29,6.44c0,2.21-0.42,4.35-1.28,6.39c-0.86,2.04-2.03,3.85-3.54,5.41c-1.51,1.56-3.27,2.79-5.3,3.73    c-2.01,0.94-4.2,1.39-6.53,1.39h-13.02L584.69,410.2L584.69,410.2z M593.49,436.58h2.01c1.53,0,2.89-0.23,4.09-0.72    c1.2-0.48,2.21-1.14,3.03-1.98c0.83-0.84,1.45-1.82,1.89-2.98s0.65-2.42,0.65-3.79c0-1.34-0.22-2.6-0.67-3.77    c-0.45-1.17-1.09-2.17-1.9-3.01c-0.83-0.84-1.84-1.5-3.03-1.98c-1.2-0.48-2.54-0.72-4.04-0.72h-2.01v18.95H593.49z"/>
	</g>
	<g>
		<g>
			<path class="st0" d="M613.25,281.55c0.9,2.92,1.61,5.93,2.12,8.98C614.84,287.48,614.14,284.49,613.25,281.55z"/>
		</g>
		<g>
			<path class="st0" d="M380.43,375.86h-63.11c9.68-12.04,19.31-24.13,28.98-36.2c1.42-1.78,2.09-3.76,1.92-6.04     c-0.28-3.98-0.56-7.97-0.84-11.95c-0.05-0.81-0.09-1.64-0.16-2.71c0.42,0.31,0.59,0.41,0.72,0.53     c6.71,6.58,13.41,13.16,20.09,19.76c0.37,0.37,0.67,0.89,0.84,1.4C372.74,352.39,376.61,364.11,380.43,375.86z"/>
		</g>
		<g>
			<path class="st0" d="M489.47,230.54c13.36-8.03,26.73-16.06,40.13-24.05c0.55-0.33,1.11-0.59,1.68-0.78     c-11.9-19.48-33.01-32.42-57.09-32.42c-15.22,0-29.26,5.18-40.53,13.9c-12.2-22.04-35.29-36.91-61.77-36.91     c-39.19,0-70.96,32.56-70.96,72.73c0,2.54,0.12,5.07,0.37,7.53c-1.61-0.11-3.23-0.17-4.87-0.17c-39.19,0-70.96,32.56-70.96,72.73     s31.77,72.75,70.96,72.75h3.52c-0.25-2.11,0.34-4.38,1.75-6.41c4.38-6.3,8.55-12.74,12.79-19.14c3.32-5.01,6.61-10.03,9.95-15.02     c0.62-0.92,0.76-1.72,0.45-2.81c-2.76-9.64-5.47-19.31-8.16-28.98c-1.54-5.54-0.84-10.82,2.09-15.75     c8-13.4,16.02-26.78,24.06-40.13c5.97-9.9,17.93-12.88,27.93-7.14c16.81,9.64,33.75,19.07,50.47,28.85     c5.13,2.99,9.76,6.8,14.58,10.31c8.03,5.85,16.03,11.76,24.05,17.65c0.36,0.27,0.73,0.5,1.19,0.8     c4.88-5.02,9.73-10.01,14.64-15.06c-0.14-0.09-0.55-0.36-0.97-0.59c-8.09-4.32-16.17-8.69-24.33-12.91     c-3.18-1.65-4.91-4.01-5.49-7.58c-2.54-15.8-5.22-31.56-7.84-47.33c-0.7-4.27,1.93-8.25,6.02-9.22c4.21-1,8.28,1.36,9.61,5.57     c3.84,12.16,7.67,24.34,11.46,36.52c0.33,1.04,0.87,1.67,1.89,2.15c7.66,3.62,15.28,7.31,22.92,10.99c0.62,0.3,1.26,0.59,2.14,1     c-0.08-0.59-0.08-0.97-0.17-1.33c-1.73-6.78-3.46-13.58-5.22-20.37C484.76,236.09,486.07,232.6,489.47,230.54z M384.47,229.51     c-11.12-0.06-20.09-9.09-20.09-20.21c0.02-11.12,9.05-20.12,20.16-20.12c11.18,0,20.21,9.08,20.18,20.27     C404.68,220.52,395.54,229.58,384.47,229.51z"/>
		</g>
		<g>
			<path class="st0" d="M616.37,300.6c-0.02-0.41-0.03-0.8-0.05-1.19c-0.02-0.36-0.03-0.73-0.06-1.09     c-0.06-1.04-0.16-2.11-0.27-3.13c-0.17-1.58-0.37-3.12-0.64-4.65c-0.27-1.53-0.58-3.04-0.92-4.54c-0.36-1.5-0.76-2.98-1.2-4.44     c0-0.02-0.02-0.05-0.02-0.08c-8.98-29.61-35.92-51.1-67.76-51.1c-1.64,0-3.27,0.06-4.9,0.19c-0.59-3.52-1.43-6.96-2.54-10.26     c-0.06,0.06-0.14,0.11-0.22,0.16c-2.6,1.72-4.99,3.77-7.42,5.74c-6.71,5.43-13.38,10.9-20.1,16.31     c-0.86,0.67-0.92,1.17-0.45,2.12c4.63,9.47,9.23,18.95,13.82,28.45c3.84,7.94,2.32,16.97-3.9,23.19     c-10.7,10.73-21.4,21.44-32.13,32.14c-8.31,8.27-21.26,7.78-29.37-0.69c-5.07-5.27-10.64-10.06-16-15.05     c-9.37-8.73-18.76-17.48-28.16-26.18c-0.81-0.75-1.72-1.43-2.68-1.95c-10.59-5.66-21.19-11.31-31.8-16.94     c-0.39-0.22-0.81-0.37-1.33-0.62c-2.96,4.94-5.89,9.82-8.83,14.72c-2.5,4.15-4.94,8.33-7.47,12.46     c-0.61,0.98-0.69,1.64,0.08,2.64c8.31,10.87,16.59,21.75,24.78,32.72c0.92,1.23,1.48,2.87,1.79,4.41     c2.7,13.1,5.29,26.22,7.91,39.31c0.19,0.9,0.23,1.78,0.16,2.62h148.76c39.19,0,70.96-32.58,70.96-72.75     C616.41,302.26,616.4,301.42,616.37,300.6z M432.53,366.62c-11.07-0.19-19.91-9.39-19.74-20.54c0.17-11.06,9.4-19.96,20.52-19.79     c10.99,0.16,19.98,9.37,19.82,20.34C452.98,357.94,443.84,366.8,432.53,366.62z"/>
		</g>
	</g>
</g>
</svg>`;

const LOGO_HORIZONTAL_WHITE_SVG = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	style="enable-background:new 0 0 841.89 595.28;" xml:space="preserve"
	viewBox="26.5 221.63 788.88 152.03">
<style type="text/css">
	.st0{fill:white;}
</style>
<g>
	<g>
		<path class="st0" d="M339.13,286.5v30.32c0,1.28-0.07,2.45-0.2,3.54c-0.14,1.08-0.36,2.01-0.67,2.78    c-0.5,1.24-1.19,2.37-2.06,3.39c-0.87,1.02-1.88,1.89-3.04,2.61c-1.16,0.72-2.44,1.28-3.86,1.68c-1.41,0.4-2.89,0.61-4.44,0.61    c-4.68,0-8.48-2.14-11.42-6.43l7.42-7.59c0.19,1.31,0.62,2.36,1.27,3.13c0.66,0.78,1.47,1.16,2.44,1.16    c2.12,0,3.19-1.68,3.19-5.05V286.5H339.13z"/>
		<path class="st0" d="M359.71,286.5v23.77c0,1.27,0.05,2.58,0.14,3.91c0.1,1.33,0.39,2.54,0.87,3.62c0.48,1.08,1.25,1.96,2.29,2.64    c1.04,0.68,2.51,1.02,4.41,1.02c1.89,0,3.35-0.34,4.38-1.02c1.02-0.67,1.79-1.55,2.29-2.64c0.5-1.08,0.8-2.29,0.9-3.62    c0.1-1.33,0.15-2.64,0.15-3.91V286.5h11.3v25.33c0,6.8-1.56,11.77-4.67,14.9c-3.11,3.13-7.89,4.69-14.35,4.69    c-6.45,0-11.25-1.57-14.38-4.69c-3.13-3.13-4.69-8.1-4.69-14.9V286.5H359.71z"/>
		<path class="st0" d="M395.59,286.5h16.81c2.98,0,5.77,0.6,8.38,1.8c2.61,1.2,4.89,2.79,6.84,4.78c1.95,1.99,3.49,4.31,4.61,6.96    c1.12,2.65,1.68,5.42,1.68,8.32c0,2.86-0.55,5.61-1.65,8.26s-2.63,4.98-4.58,6.99c-1.95,2.01-4.23,3.61-6.84,4.81    c-2.61,1.2-5.42,1.8-8.44,1.8h-16.81V286.5z M406.96,320.58h2.61c1.97,0,3.73-0.31,5.28-0.93c1.55-0.62,2.85-1.47,3.91-2.55    s1.87-2.37,2.44-3.86c0.56-1.49,0.84-3.12,0.84-4.9c0-1.74-0.29-3.36-0.87-4.87c-0.58-1.51-1.4-2.8-2.46-3.88    c-1.06-1.08-2.37-1.93-3.91-2.55c-1.55-0.62-3.29-0.93-5.22-0.93h-2.61V320.58z"/>
		<path class="st0" d="M439.19,308.35c0-3.25,0.6-6.27,1.8-9.07c1.2-2.8,2.86-5.25,4.99-7.33c2.13-2.09,4.67-3.72,7.62-4.9    c2.96-1.18,6.21-1.77,9.77-1.77c3.52,0,6.76,0.59,9.74,1.77c2.97,1.18,5.54,2.81,7.68,4.9c2.14,2.09,3.82,4.53,5.01,7.33    c1.2,2.8,1.8,5.83,1.8,9.07s-0.6,6.27-1.8,9.07c-1.2,2.8-2.87,5.25-5.01,7.33s-4.71,3.72-7.68,4.9c-2.98,1.18-6.22,1.77-9.74,1.77    c-3.56,0-6.81-0.59-9.77-1.77c-2.96-1.18-5.5-2.81-7.62-4.9c-2.12-2.09-3.79-4.53-4.99-7.33    C439.79,314.62,439.19,311.6,439.19,308.35z M451.07,308.35c0,1.74,0.33,3.34,0.99,4.81c0.66,1.47,1.55,2.74,2.67,3.82    c1.12,1.08,2.42,1.92,3.91,2.52c1.49,0.6,3.06,0.9,4.72,0.9c1.66,0,3.24-0.3,4.72-0.9c1.49-0.6,2.8-1.44,3.94-2.52    c1.14-1.08,2.04-2.36,2.7-3.82c0.66-1.47,0.99-3.07,0.99-4.81c0-1.74-0.33-3.34-0.99-4.81c-0.66-1.47-1.56-2.74-2.7-3.83    c-1.14-1.08-2.46-1.92-3.94-2.52c-1.49-0.6-3.06-0.9-4.72-0.9c-1.66,0-3.24,0.3-4.72,0.9c-1.49,0.6-2.79,1.44-3.91,2.52    c-1.12,1.08-2.01,2.36-2.67,3.83C451.4,305.01,451.07,306.61,451.07,308.35z"/>
		<path class="st0" d="M525.86,286.5v43.71H514.5V286.5H525.86z"/>
		<path class="st0" d="M535.02,330.21V286.5h11.36l20.99,26.72V286.5h11.31v43.71h-11.31l-20.99-26.72v26.72H535.02z"/>
		<path class="st0" d="M639.02,301.11c-2.63-3.21-5.87-4.81-9.74-4.81c-1.7,0-3.28,0.31-4.73,0.93c-1.45,0.62-2.7,1.46-3.74,2.52    c-1.04,1.06-1.87,2.33-2.46,3.8c-0.6,1.47-0.9,3.05-0.9,4.75c0,1.74,0.3,3.34,0.9,4.81c0.6,1.47,1.43,2.74,2.49,3.83    c1.06,1.08,2.31,1.93,3.74,2.55c1.43,0.62,2.98,0.93,4.64,0.93c3.63,0,6.9-1.55,9.8-4.64v13.45l-1.16,0.4    c-1.74,0.62-3.36,1.07-4.87,1.36c-1.51,0.29-3,0.44-4.46,0.44c-3.01,0-5.9-0.57-8.67-1.71c-2.76-1.14-5.2-2.74-7.3-4.81    c-2.11-2.07-3.8-4.52-5.07-7.36c-1.27-2.84-1.91-5.94-1.91-9.3s0.63-6.44,1.88-9.25c1.26-2.8,2.94-5.22,5.04-7.25    s4.55-3.61,7.33-4.75c2.78-1.14,5.7-1.71,8.75-1.71c1.74,0,3.45,0.18,5.13,0.55c1.68,0.37,3.45,0.94,5.3,1.71V301.11z"/>
		<path class="st0" d="M657.57,286.5v34.09h13.62v9.62h-24.99V286.5H657.57z"/>
		<path class="st0" d="M674.21,308.35c0-3.25,0.6-6.27,1.8-9.07c1.2-2.8,2.86-5.25,4.99-7.33c2.13-2.09,4.67-3.72,7.62-4.9    c2.96-1.18,6.21-1.77,9.77-1.77c3.52,0,6.76,0.59,9.74,1.77c2.97,1.18,5.54,2.81,7.68,4.9c2.14,2.09,3.82,4.53,5.01,7.33    c1.2,2.8,1.8,5.83,1.8,9.07s-0.6,6.27-1.8,9.07c-1.2,2.8-2.87,5.25-5.01,7.33s-4.71,3.72-7.68,4.9c-2.98,1.18-6.22,1.77-9.74,1.77    c-3.56,0-6.81-0.59-9.77-1.77c-2.96-1.18-5.5-2.81-7.62-4.9c-2.12-2.09-3.79-4.53-4.99-7.33    C674.81,314.62,674.21,311.6,674.21,308.35z M686.09,308.35c0,1.74,0.33,3.34,0.99,4.81c0.66,1.47,1.55,2.74,2.67,3.82    c1.12,1.08,2.42,1.92,3.91,2.52c1.49,0.6,3.06,0.9,4.72,0.9c1.66,0,3.24-0.3,4.72-0.9c1.49-0.6,2.8-1.44,3.94-2.52    c1.14-1.08,2.04-2.36,2.7-3.82c0.66-1.47,0.99-3.07,0.99-4.81c0-1.74-0.33-3.34-0.99-4.81c-0.66-1.47-1.56-2.74-2.7-3.83    c-1.14-1.08-2.46-1.92-3.94-2.52c-1.49-0.6-3.06-0.9-4.72-0.9c-1.66,0-3.24,0.3-4.72,0.9c-1.49,0.6-2.79,1.44-3.91,2.52    c-1.12,1.08-2.01,2.36-2.67,3.83C686.42,305.01,686.09,306.61,686.09,308.35z"/>
		<path class="st0" d="M741.17,286.5v23.77c0,1.27,0.05,2.58,0.14,3.91c0.1,1.33,0.39,2.54,0.87,3.62c0.48,1.08,1.25,1.96,2.29,2.64    c1.04,0.68,2.51,1.02,4.41,1.02c1.89,0,3.35-0.34,4.38-1.02c1.02-0.67,1.79-1.55,2.29-2.64c0.5-1.08,0.8-2.29,0.9-3.62    c0.1-1.33,0.15-2.64,0.15-3.91V286.5h11.3v25.33c0,6.8-1.56,11.77-4.67,14.9c-3.11,3.13-7.89,4.69-14.35,4.69    c-6.45,0-11.25-1.57-14.38-4.69c-3.13-3.13-4.69-8.1-4.69-14.9V286.5H741.17z"/>
		<path class="st0" d="M777.05,286.5h16.81c2.98,0,5.77,0.6,8.38,1.8c2.61,1.2,4.89,2.79,6.84,4.78c1.95,1.99,3.49,4.31,4.61,6.96    c1.12,2.65,1.68,5.42,1.68,8.32c0,2.86-0.56,5.61-1.66,8.26c-1.1,2.65-2.63,4.98-4.58,6.99c-1.95,2.01-4.23,3.61-6.84,4.81    c-2.61,1.2-5.42,1.8-8.44,1.8h-16.81V286.5z M788.41,320.58h2.61c1.97,0,3.73-0.31,5.28-0.93c1.55-0.62,2.85-1.47,3.91-2.55    s1.87-2.37,2.44-3.86c0.56-1.49,0.84-3.12,0.84-4.9c0-1.74-0.29-3.36-0.87-4.87c-0.58-1.51-1.4-2.8-2.46-3.88    c-1.06-1.08-2.37-1.93-3.91-2.55c-1.55-0.62-3.29-0.93-5.22-0.93h-2.61V320.58z"/>
	</g>
	<g>
		<g>
			<path class="st0" d="M287.75,310.09c0.61,1.96,1.08,3.99,1.43,6.05C288.82,314.09,288.35,312.07,287.75,310.09z"/>
		</g>
		<g>
			<path class="st0" d="M130.91,373.63H88.39c6.52-8.11,13.01-16.25,19.52-24.39c0.96-1.2,1.41-2.53,1.29-4.07     c-0.19-2.68-0.38-5.37-0.57-8.05c-0.03-0.55-0.06-1.1-0.11-1.83c0.28,0.21,0.4,0.27,0.48,0.36c4.52,4.43,9.04,8.87,13.53,13.31     c0.25,0.25,0.45,0.6,0.57,0.95C125.73,357.81,128.34,365.71,130.91,373.63z"/>
		</g>
		<g>
			<path class="st0" d="M204.37,275.73c9-5.41,18.01-10.82,27.03-16.2c0.37-0.22,0.75-0.4,1.13-0.53     c-8.02-13.12-22.24-21.84-38.46-21.84c-10.25,0-19.71,3.49-27.31,9.36c-8.22-14.85-23.78-24.87-41.62-24.87     c-26.4,0-47.8,21.94-47.8,49c0,1.71,0.08,3.41,0.25,5.07c-1.08-0.07-2.17-0.12-3.28-0.12c-26.4,0-47.8,21.94-47.8,49     c0,27.06,21.4,49.01,47.8,49.01h2.37c-0.17-1.42,0.23-2.95,1.18-4.32c2.95-4.24,5.76-8.58,8.62-12.89     c2.24-3.37,4.45-6.76,6.7-10.12c0.42-0.62,0.51-1.16,0.3-1.89c-1.86-6.49-3.69-13.01-5.49-19.52c-1.04-3.73-0.57-7.29,1.41-10.61     c5.39-9.03,10.79-18.04,16.21-27.03c4.02-6.67,12.08-8.68,18.82-4.81c11.33,6.49,22.74,12.85,34,19.44     c3.46,2.02,6.58,4.58,9.82,6.94c5.41,3.94,10.8,7.92,16.2,11.89c0.24,0.18,0.49,0.34,0.8,0.54c3.29-3.38,6.56-6.75,9.87-10.15     c-0.09-0.06-0.37-0.24-0.65-0.4c-5.45-2.91-10.9-5.85-16.39-8.7c-2.14-1.11-3.31-2.7-3.7-5.11c-1.71-10.64-3.52-21.27-5.28-31.89     c-0.47-2.88,1.3-5.56,4.06-6.21c2.84-0.67,5.58,0.91,6.47,3.75c2.58,8.2,5.17,16.4,7.72,24.61c0.22,0.7,0.59,1.12,1.27,1.45     c5.16,2.44,10.3,4.93,15.44,7.41c0.42,0.2,0.85,0.4,1.44,0.67c-0.05-0.4-0.05-0.65-0.12-0.89c-1.17-4.57-2.33-9.15-3.52-13.72     C201.2,279.47,202.08,277.11,204.37,275.73z M133.63,275.03c-7.49-0.04-13.53-6.13-13.53-13.62c0.01-7.49,6.09-13.55,13.58-13.55     c7.53,0,13.62,6.11,13.6,13.66C147.25,268.97,141.09,275.07,133.63,275.03z"/>
		</g>
		<g>
			<path class="st0" d="M289.86,322.92c-0.01-0.27-0.02-0.54-0.03-0.8c-0.01-0.24-0.02-0.49-0.04-0.74     c-0.04-0.7-0.11-1.42-0.18-2.11c-0.12-1.06-0.25-2.1-0.43-3.13c-0.18-1.03-0.39-2.05-0.62-3.06c-0.24-1.01-0.51-2.01-0.81-2.99     c0-0.01-0.01-0.03-0.01-0.05c-6.05-19.95-24.2-34.43-45.65-34.43c-1.1,0-2.21,0.04-3.3,0.13c-0.4-2.37-0.97-4.69-1.71-6.91     c-0.04,0.04-0.09,0.07-0.15,0.11c-1.75,1.16-3.36,2.54-5,3.87c-4.52,3.66-9.01,7.34-13.54,10.99c-0.58,0.45-0.62,0.79-0.3,1.43     c3.12,6.38,6.22,12.77,9.31,19.16c2.58,5.35,1.57,11.43-2.63,15.62c-7.21,7.23-14.41,14.45-21.64,21.65     c-5.6,5.57-14.32,5.24-19.78-0.46c-3.41-3.55-7.17-6.78-10.78-10.14c-6.31-5.88-12.64-11.78-18.97-17.64     c-0.55-0.5-1.16-0.97-1.81-1.31c-7.13-3.81-14.28-7.62-21.42-11.41c-0.26-0.15-0.55-0.25-0.89-0.42c-2,3.33-3.97,6.62-5.95,9.92     c-1.68,2.79-3.33,5.61-5.03,8.39c-0.41,0.66-0.46,1.1,0.05,1.78c5.6,7.32,11.18,14.66,16.69,22.04c0.62,0.83,1,1.93,1.21,2.97     c1.82,8.83,3.56,17.66,5.33,26.49c0.13,0.61,0.16,1.2,0.11,1.77h100.22c26.4,0,47.8-21.95,47.8-49.01     C289.9,324.05,289.88,323.48,289.86,322.92z M166.01,367.41c-7.46-0.13-13.42-6.32-13.3-13.84c0.12-7.45,6.34-13.45,13.83-13.33     c7.41,0.11,13.46,6.31,13.35,13.7C179.79,361.55,173.63,367.52,166.01,367.41z"/>
		</g>
	</g>
</g>
</svg>`;

const logoVerticalImage = loadSvgImage(LOGO_VERTICAL_WHITE_SVG);
const logoHorizontalImage = loadSvgImage(LOGO_HORIZONTAL_WHITE_SVG);
