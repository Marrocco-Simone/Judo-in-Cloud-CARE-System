"use strict";

// * Live scoreboard settings, shared by the landing page and the camera page settings form.

/** Shiai environments the live scoreboard can follow */
const LIVE_SERVERS = {
  live: {
    apiUrl: "https://api.judoincloud.com/api",
    liveKeeperApiUrl: "https://live.judoincloud.com/api",
  },
  demo: {
    apiUrl: "https://demoapi.judoincloud.com/api",
    liveKeeperApiUrl: "https://livedemo.judoincloud.com/api",
  },
};

const liveSettingsParams = new URLSearchParams(window.location.search);
/** @type {keyof typeof LIVE_SERVERS} */
const liveServerName = liveSettingsParams.get("server") === "demo" ? "demo" : "live";
const competitionSlug = liveSettingsParams.get("slug");
const tatamiNumber = Number(liveSettingsParams.get("tatami")) || null;
/** live-keeper state of the tatami, null when the live scoreboard is off */
const liveStateUrl =
  competitionSlug && tatamiNumber
    ? `${LIVE_SERVERS[liveServerName].liveKeeperApiUrl}/live/${encodeURIComponent(competitionSlug)}/${tatamiNumber}`
    : null;

/** @type {HTMLSelectElement} */
const liveServerSelect = document.getElementById("liveServerSelect");
/** @type {HTMLSelectElement} */
const liveCompetitionSelect = document.getElementById("liveCompetitionSelect");
/** @type {HTMLInputElement} */
const liveTatamiInput = document.getElementById("liveTatamiInput");

/** incremented by every load, so the answer of an older server choice is dropped */
let liveCompetitionsRequest = 0;

liveServerSelect.value = liveServerName;
liveTatamiInput.value = tatamiNumber ?? "";
liveServerSelect.addEventListener("change", () => loadLiveCompetitions(liveServerSelect.value, ""));
liveCompetitionSelect.addEventListener("change", updateLiveTatamiInput);
loadLiveCompetitions(liveServerName, competitionSlug ?? "");

/**
 * Fill the competition select with the competitions of today and of the future
 * @param {string} serverName
 * @param {string} selectedSlug kept in the list even when the competition is over
 */
async function loadLiveCompetitions(serverName, selectedSlug) {
  const request = ++liveCompetitionsRequest;
  const selected = selectedSlug ? [{ slug: selectedSlug, name: selectedSlug, dates: [], n_tatami: 0 }] : [];
  setLiveCompetitionOptions("settings.live_competitions_loading", selected, selectedSlug);

  /** @type {{ slug: string, name: string, dates: string[], n_tatami: number }[]} */
  let competitions = [];
  let placeholderKey = "settings.live_competition_none";
  try {
    const response = await fetch(`${LIVE_SERVERS[serverName].apiUrl}/competitions`, {
      signal: AbortSignal.timeout(10000),
    });
    const body = await response.json();
    if (body.status !== "success") throw new Error(body.message);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    competitions = body.data
      .filter((c) => c.slug === selectedSlug || c.dates.at(-1) >= today)
      .sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
  } catch (err) {
    console.error("Could not load the competitions:", err);
    placeholderKey = "settings.live_competitions_error";
  }
  if (request !== liveCompetitionsRequest) return;

  if (!competitions.some((c) => c.slug === selectedSlug)) competitions.push(...selected);
  setLiveCompetitionOptions(placeholderKey, competitions, selectedSlug);
}

/**
 * @param {string} placeholderKey translation of the empty choice
 * @param {{ slug: string, name: string, dates: string[], n_tatami: number }[]} competitions
 * @param {string} selectedSlug
 */
function setLiveCompetitionOptions(placeholderKey, competitions, selectedSlug) {
  const placeholder = new Option(t(placeholderKey), "");
  placeholder.setAttribute("data-i18n", placeholderKey);
  const options = competitions.map((c) => {
    const date = c.dates[0] ? ` · ${c.dates[0].split("-").reverse().join("/")}` : "";
    const option = new Option(`${c.name}${date}`, c.slug);
    if (c.n_tatami) option.dataset.tatami = String(c.n_tatami);
    return option;
  });
  liveCompetitionSelect.replaceChildren(placeholder, ...options);
  liveCompetitionSelect.value = selectedSlug;
  updateLiveTatamiInput();
}

function updateLiveTatamiInput() {
  liveTatamiInput.required = Boolean(liveCompetitionSelect.value);
  liveTatamiInput.max = liveCompetitionSelect.selectedOptions[0]?.dataset.tatami ?? "";
}

/** @param {URLSearchParams} params the query of the camera page */
function setLiveQueryParams(params) {
  params.set("server", liveServerSelect.value);
  if (liveCompetitionSelect.value && liveTatamiInput.value) {
    params.set("slug", liveCompetitionSelect.value);
    params.set("tatami", liveTatamiInput.value);
  } else {
    params.delete("slug");
    params.delete("tatami");
  }
}
