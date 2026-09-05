/**
 * CARE System Translations
 * Simple i18n utility for vanilla HTML/JS app
 * Supports: Italian (it), English (en), German (de)
 */

const TRANSLATIONS = {
  it: {
    meta: {
      title: "Judo in Cloud - Care System",
      description: "Il CARE System di Judo in Cloud! Veloce, leggero e semplicemente incredibile!",
    },
    header: {
      discover: "Scopri Judo in Cloud",
    },
    landing: {
      title: "Il CARE System di Judo in Cloud!",
      subtitle: "Veloce, leggero e semplicemente incredibile!",
      description1: "Abbiamo ideato per voi un incredibile CARE System: Camera Assistant Referee Enhanced (supporto camera per arbitri migliorato)!",
      description2: "Il nostro programma è leggero, facile da usare, e idealmente non necessita di scaricare nulla. Si tratta di una pagina web contenente tutto il codice necessario per girare. Una volta aperta la pagina, nessun dato viene mandato o ricevuto da nessun server: funzionerà anche senza connessione!",
      description3: "Per semplificare il lavoro a tutti gli organizzatori ed arbitri, tuttavia, forniamo anche degli eseguibili da scaricare e aprire con un click!",
      description4: "Il progetto è gratuito, open source e disponibile a tutti quelli che ne vogliano usufruire! Vogliamo aiutare il mondo del judo a progredire, e questo è il nostro contributo!",
      description5: "Se vuoi organizzare la tua gara di judo in modo semplice, sicuro e moderno,",
      visit_site: "visita il nostro sito!",
    },
    settings: {
      title: "Impostazioni registrazione",
      confirm: "Conferma",
      reset: "Reset",
      cameras: "Cameras",
      cameras_loading: "Loading cameras...",
      bitrate: "Bitrate",
      use_audio: "Usa audio",
      frame_size: "Frame size",
      more_info: "More video info",
      delay_multiplier: "Moltiplicatore ritardo",
      live_slug: "Slug della gara (Judo in Cloud)",
      live_tatami: "Numero tatami",
      live_slug_placeholder: "nome-della-gara",
      log_db: "Log database operations",
    },
    delete: {
      title: "Cancella tutto il video registrato",
      confirm_text: 'Scrivi "Elimina" per pulire il database',
      button: "Elimina",
      wrong_keyword: "Hai scritto male la parola {keyword}, riprova.",
    },
    footer: {
      title: "Judo in Cloud",
      subtitle: "Un servizio fatto su misura per te!",
      contacts: "Contatti",
      collaboration: "In collaborazione con",
      thanks: "Si ringraziano",
      faq: "FAQ",
      social: "Social",
      privacy: "Informativa Privacy",
      coaches: "Per gli allenatori",
      getting_started: "Iniziare",
      benefits: "Vantaggi",
      language: "Lingua",
    },
    error: {
      recording: "Ci sono dei problemi con la registrazione.\n\nAssicurati che la webcam non sia usata da qualche altro programma, poi ricarica il CARE system.\n\nSe il problema dovesse persistere, il tuo computer potrebbe non supportare la registrazione video\n\n(formato video: {mimeType}).\n\nErrore: {message}",
      no_video: "Nessun video registrato.",
      no_blob: "Nessun blob trovato per il download.",
    },

    player: {
      live: "LIVE",
      speed: "1x",
      download: "Download",
      download_all: "Scarica tutto",
      download_start: "Inizio",
      download_end: "Fine",
      download_invalid_range: "Intervallo non valido: l'inizio deve essere prima della fine.",
      download_too_long: "Il download dal browser e' limitato a clip di massimo {maxMinutes} minuti. Per il video completo usa lo script ffmpeg offline.",
      download_failed: "Non e' stato possibile creare il file WebM. Se un file e' stato creato, e' vuoto. Prova con una clip piu' corta.",
      download_collecting: "Recupero del video...",
      download_progress: "Creazione file {current}/{total}...",
      download_finalizing: "Finalizzazione del file...",
      scoreboard: "Tabellone live",
      scoreboard_key: "Tabellone live (S)",
      dropped_frames: "Stai perdendo troppi frame ({percent}%). Abbassa i \"videoBitsPerSecond\" sotto a: {bitrate}",
    },
    shortcuts: {
      title_key: "Tasto",
      title_action: "Azione",
      space: "Barra spaziatrice / K",
      pause: "Pausa / Riparti",
      f: "F",
      fullscreen: "Schermo intero",
      t: "T",
      theater: "Modalita' teatro",
      m: "M",
      mute: "Muta video",
      arrows: "Frecce destra / sinistra",
      seek_5s: "Avanti / indietro 5 secondi",
      jl: "J / L",
      seek_3m: "Avanti / indietro 3 minuti",
      dots: "Punto / Virgola",
      frame: "Avanti / indietro 1 frame",
      p: "P",
      slow: "Rallenta video / Torna normale",
      backspace: "Backspace (freccia lunga a sinistra)",
      return_live: "Torna live",
      s: "S",
      scoreboard: "Mostra / nascondi tabellone live",
    },
  },
  en: {
    meta: {
      title: "Judo in Cloud - Care System",
      description: "The CARE System by Judo in Cloud! Fast, lightweight, and simply incredible!",
    },
    header: {
      discover: "Discover Judo in Cloud",
    },
    landing: {
      title: "The CARE System by Judo in Cloud!",
      subtitle: "Fast, lightweight, and simply incredible!",
      description1: "We have created an incredible CARE System for you: Camera Assistant Referee Enhanced (enhanced camera support for referees)!",
      description2: "Our program is lightweight, easy to use, and ideally requires no downloads. It's a web page containing all the necessary code to run. Once the page is open, no data is sent or received from any server: it will work even without an internet connection!",
      description3: "To simplify the work for all organizers and referees, however, we also provide downloadable executables that can be opened with one click!",
      description4: "The project is free, open source, and available to anyone who wants to use it! We want to help the world of judo progress, and this is our contribution!",
      description5: "If you want to organize your judo competition in a simple, secure, and modern way,",
      visit_site: "visit our website!",
    },
    settings: {
      title: "Recording Settings",
      confirm: "Confirm",
      reset: "Reset",
      cameras: "Cameras",
      cameras_loading: "Loading cameras...",
      bitrate: "Bitrate",
      use_audio: "Use audio",
      frame_size: "Frame size",
      more_info: "More video info",
      delay_multiplier: "Delay multiplier",
      live_slug: "Competition slug (Judo in Cloud)",
      live_tatami: "Tatami number",
      live_slug_placeholder: "competition-name",
      log_db: "Log database operations",
    },
    delete: {
      title: "Delete all recorded video",
      confirm_text: 'Type "Delete" to clear the database',
      button: "Delete",
      wrong_keyword: "You typed the word {keyword} incorrectly, please try again.",
    },
    footer: {
      title: "Judo in Cloud",
      subtitle: "A service tailored for you!",
      contacts: "Contacts",
      collaboration: "In collaboration with",
      thanks: "Special thanks to",
      faq: "FAQ",
      social: "Social",
      privacy: "Privacy Policy",
      coaches: "For coaches",
      getting_started: "Getting Started",
      benefits: "Benefits",
      language: "Language",
    },
    error: {
      recording: "There are problems with the recording.\n\nMake sure the webcam is not being used by another program, then reload the CARE system.\n\nIf the problem persists, your computer may not support video recording\n\n(video format: {mimeType}).\n\nError: {message}",
      no_video: "No video recorded.",
      no_blob: "No blob found for download.",
    },

    player: {
      live: "LIVE",
      speed: "1x",
      download: "Download",
      download_all: "Download all",
      download_start: "Start",
      download_end: "End",
      download_invalid_range: "Invalid range: start must be before end.",
      download_too_long: "Browser download is limited to clips up to {maxMinutes} minutes. Use the offline ffmpeg script for the full video.",
      download_failed: "Could not create the WebM file. If a file was created, it is empty. Try a shorter clip.",
      download_collecting: "Collecting the video...",
      download_progress: "Creating file {current}/{total}...",
      download_finalizing: "Finalizing the file...",
      scoreboard: "Live scoreboard",
      scoreboard_key: "Live scoreboard (S)",
      dropped_frames: "Too many dropped frames ({percent}%). Lower \"videoBitsPerSecond\" below: {bitrate}",
    },
    shortcuts: {
      title_key: "Key",
      title_action: "Action",
      space: "Spacebar / K",
      pause: "Pause / Play",
      f: "F",
      fullscreen: "Fullscreen",
      t: "T",
      theater: "Theater mode",
      m: "M",
      mute: "Mute video",
      arrows: "Left / Right arrows",
      seek_5s: "Forward / Backward 5 seconds",
      jl: "J / L",
      seek_3m: "Forward / Backward 3 minutes",
      dots: "Period / Comma",
      frame: "Forward / Backward 1 frame",
      p: "P",
      slow: "Slow motion / Normal speed",
      backspace: "Backspace (long left arrow)",
      return_live: "Return to live",
      s: "S",
      scoreboard: "Show / hide live scoreboard",
    },
  },
  de: {
    meta: {
      title: "Judo in Cloud - Care System",
      description: "Das CARE System von Judo in Cloud! Schnell, leicht und einfach unglaublich!",
    },
    header: {
      discover: "Entdecke Judo in Cloud",
    },
    landing: {
      title: "Das CARE System von Judo in Cloud!",
      subtitle: "Schnell, leicht und einfach unglaublich!",
      description1: "Wir haben ein unglaubliches CARE System für Sie entwickelt: Camera Assistant Referee Enhanced (verbesserte Kameraunterstützung für Schiedsrichter)!",
      description2: "Unser Programm ist leicht, einfach zu bedienen und erfordert idealerweise keine Downloads. Es ist eine Webseite, die den gesamten notwendigen Code zum Ausführen enthält. Sobald die Seite geöffnet ist, werden keine Daten an einen Server gesendet oder empfangen: Es funktioniert auch ohne Internetverbindung!",
      description3: "Um die Arbeit für alle Organisatoren und Schiedsrichter zu vereinfachen, stellen wir jedoch auch ausführbare Dateien zum Herunterladen und Öffnen mit einem Klick bereit!",
      description4: "Das Projekt ist kostenlos, Open Source und für alle verfügbar, die es nutzen möchten! Wir möchten der Judo-Welt helfen, voranzukommen, und dies ist unser Beitrag!",
      description5: "Wenn Sie Ihren Judo-Wettkampf auf einfache, sichere und moderne Weise organisieren möchten,",
      visit_site: "besuchen Sie unsere Website!",
    },
    settings: {
      title: "Aufnahmeeinstellungen",
      confirm: "Bestätigen",
      reset: "Zurücksetzen",
      cameras: "Kameras",
      cameras_loading: "Kameras werden geladen...",
      bitrate: "Bitrate",
      use_audio: "Audio verwenden",
      frame_size: "Frame-Größe",
      more_info: "Mehr Video-Info",
      delay_multiplier: "Verzögerungsmultiplikator",
      live_slug: "Wettkampf-Slug (Judo in Cloud)",
      live_tatami: "Tatami-Nummer",
      live_slug_placeholder: "wettkampf-name",
      log_db: "Datenbankoperationen protokollieren",
    },
    delete: {
      title: "Alle aufgenommenen Videos löschen",
      confirm_text: 'Geben Sie "Löschen" ein, um die Datenbank zu leeren',
      button: "Löschen",
      wrong_keyword: "Sie haben das Wort {keyword} falsch eingegeben, bitte versuchen Sie es erneut.",
    },
    footer: {
      title: "Judo in Cloud",
      subtitle: "Ein Service, der auf Sie zugeschnitten ist!",
      contacts: "Kontakt",
      collaboration: "In Zusammenarbeit mit",
      thanks: "Besonderer Dank an",
      faq: "FAQ",
      social: "Social Media",
      privacy: "Datenschutzerklärung",
      coaches: "Für Trainer",
      getting_started: "Erste Schritte",
      benefits: "Vorteile",
      language: "Sprache",
    },
    error: {
      recording: "Es gibt Probleme mit der Aufnahme.\n\nStellen Sie sicher, dass die Webcam nicht von einem anderen Programm verwendet wird, laden Sie dann das CARE-System neu.\n\nWenn das Problem weiterhin besteht, unterstützt Ihr Computer möglicherweise keine Videoaufnahme\n\n(Videoformat: {mimeType}).\n\nFehler: {message}",
      no_video: "Kein Video aufgenommen.",
      no_blob: "Kein Blob zum Herunterladen gefunden.",
    },

    player: {
      live: "LIVE",
      speed: "1x",
      download: "Herunterladen",
      download_all: "Alles herunterladen",
      download_start: "Anfang",
      download_end: "Ende",
      download_invalid_range: "Ungültiger Bereich: Der Anfang muss vor dem Ende liegen.",
      download_too_long: "Der Browser-Download ist auf Clips bis {maxMinutes} Minuten begrenzt. Verwenden Sie das Offline-ffmpeg-Skript fuer das vollstaendige Video.",
      download_failed: "Die WebM-Datei konnte nicht erstellt werden. Falls eine Datei erstellt wurde, ist sie leer. Versuchen Sie einen kuerzeren Clip.",
      download_collecting: "Video wird gesammelt...",
      download_progress: "Datei wird erstellt {current}/{total}...",
      download_finalizing: "Datei wird abgeschlossen...",
      scoreboard: "Live-Anzeigetafel",
      scoreboard_key: "Live-Anzeigetafel (S)",
      dropped_frames: "Zu viele verlorene Frames ({percent}%). Senken Sie \"videoBitsPerSecond\" unter: {bitrate}",
    },
    shortcuts: {
      title_key: "Taste",
      title_action: "Aktion",
      space: "Leertaste / K",
      pause: "Pause / Wiedergabe",
      f: "F",
      fullscreen: "Vollbild",
      t: "T",
      theater: "Theater-Modus",
      m: "M",
      mute: "Video stummschalten",
      arrows: "Pfeile links / rechts",
      seek_5s: "Vorwärts / Rückwärts 5 Sekunden",
      jl: "J / L",
      seek_3m: "Vorwärts / Rückwärts 3 Minuten",
      dots: "Punkt / Komma",
      frame: "Vorwärts / Rückwärts 1 Frame",
      p: "P",
      slow: "Zeitlupe / Normale Geschwindigkeit",
      backspace: "Rücktaste (langer linker Pfeil)",
      return_live: "Zurück zum Live-Stream",
      s: "S",
      scoreboard: "Live-Anzeigetafel ein-/ausblenden",
    },
  },
};

let currentLanguage = "it";

/**
 * Get translated string by key path (e.g., "settings.title")
 * Supports template variables: {varName}
 * @param {string} key - Dot-separated key path
 * @param {Object} vars - Variables to replace in template
 * @returns {string} Translated text
 */
function t(key, vars = {}) {
  const keys = key.split(".");
  let result = TRANSLATIONS[currentLanguage];
  for (const k of keys) {
    result = result?.[k];
  }

  // Fallback to Italian, then return key itself
  if (!result) {
    result = TRANSLATIONS["it"];
    for (const k of keys) {
      result = result?.[k];
    }
  }

  if (!result) {
    return key;
  }

  // Replace template variables
  let text = result;
  Object.keys(vars).forEach((varName) => {
    text = text.replace(new RegExp(`{${varName}}`, "g"), vars[varName]);
  });

  return text;
}

/**
 * Set current language and update all translated elements
 * @param {string} lang - Language code ('it', 'en', 'de')
 */
function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) {
    console.warn(`Language ${lang} not found, falling back to Italian`);
    lang = "it";
  }

  currentLanguage = lang;
  localStorage.setItem("careLanguage", lang);
  document.documentElement.lang = lang;

  // Update all elements with data-i18n
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const isHtml = el.hasAttribute("data-i18n-html");
    const text = t(key);

    if (isHtml) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  });

  // Update placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.placeholder = t(key);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });

  // Update meta tags
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.content = t("meta.description");
  }

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    ogDescription.content = t("meta.description");
  }

  // Update page title
  document.title = t("meta.title");

  // Update language selector
  const langSelect = document.getElementById("language-select");
  if (langSelect) {
    langSelect.value = lang;
  }
}

/**
 * Initialize translations on page load
 * Reads language from localStorage or defaults to 'it'
 */
function initTranslations() {
  const savedLang = localStorage.getItem("careLanguage") || "it";
  currentLanguage = savedLang;

  const langSelect = document.getElementById("language-select");
  if (langSelect) {
    langSelect.value = savedLang;
  }

  // Apply translations if not Italian (Italian is default in HTML)
  if (savedLang !== "it") {
    setLanguage(savedLang);
  }
}

// Auto-initialize on DOMContentLoaded, or immediately if DOM is already ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTranslations);
} else {
  // DOM already loaded, run immediately
  initTranslations();
}
