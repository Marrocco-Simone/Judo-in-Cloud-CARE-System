/**
 * CARE System Translations
 * Simple i18n utility for vanilla HTML/JS app
 * Supports: Italian (it), English (en), German (de), Spanish (es), French (fr), Portuguese (pt)
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
      live_server: "Server del tabellone live",
      live_server_live: "Live",
      live_server_demo: "Demo",
      live_competition: "Gara (Judo in Cloud)",
      live_competition_none: "Nessuna: tabellone spento",
      live_competitions_loading: "Caricamento gare...",
      live_competitions_error: "Impossibile caricare le gare",
      live_tatami: "Numero tatami",
      log_db: "Log database operations",
    },
    delete: {
      title: "Cancella tutto il video registrato",
      confirm_text: 'Scrivi "Elimina" per pulire il database',
      keyword: "Elimina",
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
    stream: {
      key_placeholder: "Chiave dello stream YouTube",
      start: "Avvia streaming",
      stop: "Ferma streaming",
      connecting: "Connessione...",
      live: "LIVE",
      stopped: "Fermato",
      error: "Errore",
      winner: "Vince",
      next_match: "Prossimo Incontro",
      no_camera: "La telecamera non e' ancora pronta.",
      codec_unsupported: "Questo computer non puo' codificare H.264 e AAC, richiesti da YouTube.",
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
      download_folder: "Cartella",
      download_folder_title: "Scegli una cartella: i download vengono salvati li' senza chiedere dove",
      camera_info: "{label} · {width}x{height} · {fps} fps · {kbps} kbit/s",
      download_start: "Inizio",
      download_end: "Fine",
      download_invalid_range: "Intervallo non valido: scrivi gli orari come HH:MM, con l'inizio prima della fine.",
      download_too_long: "Il download dal browser e' limitato a clip di massimo {maxMinutes} minuti. Per il video completo usa lo script ffmpeg offline.",
      download_failed: "Non e' stato possibile creare il file WebM. Se un file e' stato creato, e' incompleto: cancellalo. Prova con una clip piu' corta.",
      download_collecting: "Recupero del video...",
      download_progress: "Creazione file {current}/{total}...",
      download_finalizing: "Finalizzazione del file...",
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
      c: "C",
      clip: "Scarica l'ultimo minuto",
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
      live_server: "Live scoreboard server",
      live_server_live: "Live",
      live_server_demo: "Demo",
      live_competition: "Competition (Judo in Cloud)",
      live_competition_none: "None: scoreboard off",
      live_competitions_loading: "Loading competitions...",
      live_competitions_error: "Could not load the competitions",
      live_tatami: "Tatami number",
      log_db: "Log database operations",
    },
    delete: {
      title: "Delete all recorded video",
      confirm_text: 'Type "Delete" to clear the database',
      keyword: "Delete",
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
    stream: {
      key_placeholder: "YouTube stream key",
      start: "Start streaming",
      stop: "Stop streaming",
      connecting: "Connecting...",
      live: "LIVE",
      stopped: "Stopped",
      error: "Error",
      winner: "Winner",
      next_match: "Next match",
      no_camera: "The camera is not ready yet.",
      codec_unsupported: "This computer cannot encode H.264 and AAC, which YouTube requires.",
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
      download_folder: "Folder",
      download_folder_title: "Choose a folder: downloads are saved there without asking where",
      camera_info: "{label} · {width}x{height} · {fps} fps · {kbps} kbit/s",
      download_start: "Start",
      download_end: "End",
      download_invalid_range: "Invalid range: write the times as HH:MM, with the start before the end.",
      download_too_long: "Browser download is limited to clips up to {maxMinutes} minutes. Use the offline ffmpeg script for the full video.",
      download_failed: "Could not create the WebM file. If a file was created, it is incomplete: delete it. Try a shorter clip.",
      download_collecting: "Collecting the video...",
      download_progress: "Creating file {current}/{total}...",
      download_finalizing: "Finalizing the file...",
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
      c: "C",
      clip: "Download the last minute",
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
      live_server: "Server der Live-Anzeigetafel",
      live_server_live: "Live",
      live_server_demo: "Demo",
      live_competition: "Wettkampf (Judo in Cloud)",
      live_competition_none: "Keiner: Anzeigetafel aus",
      live_competitions_loading: "Wettkämpfe werden geladen...",
      live_competitions_error: "Wettkämpfe konnten nicht geladen werden",
      live_tatami: "Tatami-Nummer",
      log_db: "Datenbankoperationen protokollieren",
    },
    delete: {
      title: "Alle aufgenommenen Videos löschen",
      confirm_text: 'Geben Sie "Löschen" ein, um die Datenbank zu leeren',
      keyword: "Löschen",
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
    stream: {
      key_placeholder: "YouTube-Streamschlüssel",
      start: "Streaming starten",
      stop: "Streaming stoppen",
      connecting: "Verbinden...",
      live: "LIVE",
      stopped: "Gestoppt",
      error: "Fehler",
      winner: "Sieger",
      next_match: "Nächster Kampf",
      no_camera: "Die Kamera ist noch nicht bereit.",
      codec_unsupported: "Dieser Computer kann H.264 und AAC nicht kodieren, die YouTube benötigt.",
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
      download_folder: "Ordner",
      download_folder_title: "Ordner wählen: Downloads werden dort ohne Nachfrage gespeichert",
      camera_info: "{label} · {width}x{height} · {fps} fps · {kbps} kbit/s",
      download_start: "Anfang",
      download_end: "Ende",
      download_invalid_range: "Ungültiger Bereich: Zeiten als HH:MM eingeben, Anfang vor Ende.",
      download_too_long: "Der Browser-Download ist auf Clips bis {maxMinutes} Minuten begrenzt. Verwenden Sie das Offline-ffmpeg-Skript fuer das vollstaendige Video.",
      download_failed: "Die WebM-Datei konnte nicht erstellt werden. Falls eine Datei erstellt wurde, ist sie unvollstaendig: loeschen Sie sie. Versuchen Sie einen kuerzeren Clip.",
      download_collecting: "Video wird gesammelt...",
      download_progress: "Datei wird erstellt {current}/{total}...",
      download_finalizing: "Datei wird abgeschlossen...",
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
      c: "C",
      clip: "Letzte Minute herunterladen",
    },
  },
  es: {
    meta: {
      title: "Judo in Cloud - Care System",
      description: "¡El CARE System de Judo in Cloud! ¡Rápido, ligero y sencillamente increíble!",
    },
    header: {
      discover: "Descubre Judo in Cloud",
    },
    landing: {
      title: "¡El CARE System de Judo in Cloud!",
      subtitle: "¡Rápido, ligero y sencillamente increíble!",
      description1: "¡Hemos creado para ti un increíble CARE System: Camera Assistant Referee Enhanced (asistencia de vídeo mejorada para árbitros)!",
      description2: "Nuestro programa es ligero, fácil de usar e, idealmente, no requiere ninguna descarga. Es una página web que contiene todo el código necesario para funcionar. Una vez abierta la página, no se envía ni se recibe ningún dato de ningún servidor: ¡funciona incluso sin conexión a internet!",
      description3: "Sin embargo, para simplificar el trabajo de todos los organizadores y árbitros, también ofrecemos ejecutables descargables que se abren con un clic.",
      description4: "El proyecto es gratuito, de código abierto y está disponible para cualquiera que quiera usarlo. Queremos ayudar a que el mundo del judo progrese, ¡y esta es nuestra contribución!",
      description5: "Si quieres organizar tu competición de judo de forma sencilla, segura y moderna,",
      visit_site: "¡visita nuestro sitio web!",
    },
    settings: {
      title: "Ajustes de grabación",
      confirm: "Confirmar",
      reset: "Restablecer",
      cameras: "Cámaras",
      cameras_loading: "Cargando cámaras...",
      bitrate: "Bitrate",
      use_audio: "Usar audio",
      frame_size: "Tamaño del fotograma",
      more_info: "Más información del vídeo",
      delay_multiplier: "Multiplicador de retardo",
      live_server: "Servidor del marcador en directo",
      live_server_live: "Live",
      live_server_demo: "Demo",
      live_competition: "Competición (Judo in Cloud)",
      live_competition_none: "Ninguna: marcador desactivado",
      live_competitions_loading: "Cargando competiciones...",
      live_competitions_error: "No se han podido cargar las competiciones",
      live_tatami: "Número de tatami",
      log_db: "Registrar las operaciones de la base de datos",
    },
    delete: {
      title: "Eliminar todo el vídeo grabado",
      confirm_text: 'Escribe "Eliminar" para vaciar la base de datos',
      keyword: "Eliminar",
      button: "Eliminar",
      wrong_keyword: "Has escrito mal la palabra {keyword}, inténtalo de nuevo.",
    },
    footer: {
      title: "Judo in Cloud",
      subtitle: "¡Un servicio a tu medida!",
      contacts: "Contactos",
      collaboration: "En colaboración con",
      thanks: "Agradecimientos especiales a",
      faq: "FAQ",
      social: "Redes sociales",
      privacy: "Política de Privacidad",
      coaches: "Para entrenadores",
      getting_started: "Primeros pasos",
      benefits: "Ventajas",
      language: "Idioma",
    },
    stream: {
      key_placeholder: "Clave de transmisión de YouTube",
      start: "Iniciar transmisión",
      stop: "Detener transmisión",
      connecting: "Conectando...",
      live: "LIVE",
      stopped: "Detenida",
      error: "Error",
      winner: "Ganador",
      next_match: "Próximo encuentro",
      no_camera: "La cámara todavía no está lista.",
      codec_unsupported: "Este ordenador no puede codificar H.264 y AAC, que YouTube requiere.",
    },
    error: {
      recording: "Hay problemas con la grabación.\n\nAsegúrate de que ningún otro programa esté usando la webcam y vuelve a cargar el sistema CARE.\n\nSi el problema persiste, es posible que tu ordenador no admita la grabación de vídeo\n\n(formato de vídeo: {mimeType}).\n\nError: {message}",
      no_video: "No hay ningún vídeo grabado.",
      no_blob: "No se ha encontrado ningún blob para descargar.",
    },

    player: {
      live: "LIVE",
      speed: "1x",
      download: "Descargar",
      download_all: "Descargar todo",
      download_folder: "Carpeta",
      download_folder_title: "Elige una carpeta: las descargas se guardan allí sin preguntar dónde",
      camera_info: "{label} · {width}x{height} · {fps} fps · {kbps} kbit/s",
      download_start: "Inicio",
      download_end: "Fin",
      download_invalid_range: "Intervalo no válido: escribe las horas como HH:MM, con el inicio antes del fin.",
      download_too_long: "La descarga desde el navegador está limitada a clips de hasta {maxMinutes} minutos. Usa el script offline de ffmpeg para el vídeo completo.",
      download_failed: "No se ha podido crear el archivo WebM. Si se ha creado un archivo, está incompleto: elimínalo. Prueba con un clip más corto.",
      download_collecting: "Recopilando el vídeo...",
      download_progress: "Creando el archivo {current}/{total}...",
      download_finalizing: "Finalizando el archivo...",
      scoreboard_key: "Marcador en directo (S)",
      dropped_frames: "Demasiados fotogramas perdidos ({percent}%). Baja \"videoBitsPerSecond\" por debajo de: {bitrate}",
    },
    shortcuts: {
      title_key: "Tecla",
      title_action: "Acción",
      space: "Barra espaciadora / K",
      pause: "Pausa / Reproducir",
      f: "F",
      fullscreen: "Pantalla completa",
      t: "T",
      theater: "Modo cine",
      m: "M",
      mute: "Silenciar vídeo",
      arrows: "Flechas izquierda / derecha",
      seek_5s: "Avanzar / Retroceder 5 segundos",
      jl: "J / L",
      seek_3m: "Avanzar / Retroceder 3 minutos",
      dots: "Punto / Coma",
      frame: "Avanzar / Retroceder 1 fotograma",
      p: "P",
      slow: "Cámara lenta / Velocidad normal",
      backspace: "Retroceso (flecha larga a la izquierda)",
      return_live: "Volver al directo",
      s: "S",
      scoreboard: "Mostrar / ocultar el marcador en directo",
      c: "C",
      clip: "Descargar el último minuto",
    },
  },
  fr: {
    meta: {
      title: "Judo in Cloud - Care System",
      description: "Le CARE System de Judo in Cloud ! Rapide, léger et tout simplement incroyable !",
    },
    header: {
      discover: "Découvrez Judo in Cloud",
    },
    landing: {
      title: "Le CARE System de Judo in Cloud !",
      subtitle: "Rapide, léger et tout simplement incroyable !",
      description1: "Nous avons créé pour vous un incroyable CARE System : Camera Assistant Referee Enhanced (assistance vidéo améliorée pour les arbitres) !",
      description2: "Notre programme est léger, facile à utiliser et ne demande idéalement aucun téléchargement. C'est une page web qui contient tout le code nécessaire à son fonctionnement. Une fois la page ouverte, aucune donnée n'est envoyée à un serveur ni reçue d'un serveur : il fonctionne même sans connexion internet !",
      description3: "Pour simplifier le travail de tous les organisateurs et arbitres, nous proposons toutefois aussi des exécutables téléchargeables qui s'ouvrent en un clic !",
      description4: "Le projet est gratuit, open source et accessible à tous ceux qui veulent l'utiliser ! Nous voulons aider le monde du judo à progresser, et voici notre contribution !",
      description5: "Si vous voulez organiser votre compétition de judo de manière simple, sûre et moderne,",
      visit_site: "visitez notre site web !",
    },
    settings: {
      title: "Paramètres d'enregistrement",
      confirm: "Confirmer",
      reset: "Réinitialiser",
      cameras: "Caméras",
      cameras_loading: "Chargement des caméras...",
      bitrate: "Débit",
      use_audio: "Utiliser l'audio",
      frame_size: "Taille de l'image",
      more_info: "Plus d'infos vidéo",
      delay_multiplier: "Multiplicateur de délai",
      live_server: "Serveur du score en direct",
      live_server_live: "Live",
      live_server_demo: "Démo",
      live_competition: "Compétition (Judo in Cloud)",
      live_competition_none: "Aucune : score désactivé",
      live_competitions_loading: "Chargement des compétitions...",
      live_competitions_error: "Impossible de charger les compétitions",
      live_tatami: "Numéro de tatami",
      log_db: "Journaliser les opérations de la base de données",
    },
    delete: {
      title: "Supprimer toute la vidéo enregistrée",
      confirm_text: 'Tapez "Supprimer" pour vider la base de données',
      keyword: "Supprimer",
      button: "Supprimer",
      wrong_keyword: "Vous avez mal écrit le mot {keyword}, veuillez réessayer.",
    },
    footer: {
      title: "Judo in Cloud",
      subtitle: "Un service conçu pour vous !",
      contacts: "Contacts",
      collaboration: "En collaboration avec",
      thanks: "Remerciements particuliers à",
      faq: "FAQ",
      social: "Réseaux sociaux",
      privacy: "Politique de confidentialité",
      coaches: "Pour les entraîneurs",
      getting_started: "Premiers pas",
      benefits: "Avantages",
      language: "Langue",
    },
    stream: {
      key_placeholder: "Clé de diffusion YouTube",
      start: "Démarrer la diffusion",
      stop: "Arrêter la diffusion",
      connecting: "Connexion...",
      live: "LIVE",
      stopped: "Arrêtée",
      error: "Erreur",
      winner: "Vainqueur",
      next_match: "Prochain combat",
      no_camera: "La caméra n'est pas encore prête.",
      codec_unsupported: "Cet ordinateur ne peut pas encoder en H.264 et AAC, formats requis par YouTube.",
    },
    error: {
      recording: "Il y a des problèmes avec l'enregistrement.\n\nVérifiez que la webcam n'est pas utilisée par un autre programme, puis rechargez le système CARE.\n\nSi le problème persiste, votre ordinateur ne prend peut-être pas en charge l'enregistrement vidéo\n\n(format vidéo : {mimeType}).\n\nErreur : {message}",
      no_video: "Aucune vidéo enregistrée.",
      no_blob: "Aucun blob trouvé pour le téléchargement.",
    },

    player: {
      live: "LIVE",
      speed: "1x",
      download: "Télécharger",
      download_all: "Tout télécharger",
      download_folder: "Dossier",
      download_folder_title: "Choisissez un dossier : les téléchargements y sont enregistrés sans demander où",
      camera_info: "{label} · {width}x{height} · {fps} fps · {kbps} kbit/s",
      download_start: "Début",
      download_end: "Fin",
      download_invalid_range: "Intervalle non valide : écrivez les heures au format HH:MM, avec le début avant la fin.",
      download_too_long: "Le téléchargement depuis le navigateur est limité aux clips de {maxMinutes} minutes maximum. Utilisez le script ffmpeg hors ligne pour la vidéo complète.",
      download_failed: "Impossible de créer le fichier WebM. Si un fichier a été créé, il est incomplet : supprimez-le. Essayez un clip plus court.",
      download_collecting: "Collecte de la vidéo...",
      download_progress: "Création du fichier {current}/{total}...",
      download_finalizing: "Finalisation du fichier...",
      scoreboard_key: "Score en direct (S)",
      dropped_frames: "Trop d'images perdues ({percent} %). Baissez \"videoBitsPerSecond\" en dessous de : {bitrate}",
    },
    shortcuts: {
      title_key: "Touche",
      title_action: "Action",
      space: "Barre d'espace / K",
      pause: "Pause / Lecture",
      f: "F",
      fullscreen: "Plein écran",
      t: "T",
      theater: "Mode cinéma",
      m: "M",
      mute: "Couper le son de la vidéo",
      arrows: "Flèches gauche / droite",
      seek_5s: "Avancer / Reculer de 5 secondes",
      jl: "J / L",
      seek_3m: "Avancer / Reculer de 3 minutes",
      dots: "Point / Virgule",
      frame: "Avancer / Reculer d'une image",
      p: "P",
      slow: "Ralenti / Vitesse normale",
      backspace: "Retour arrière (longue flèche vers la gauche)",
      return_live: "Revenir au direct",
      s: "S",
      scoreboard: "Afficher / masquer le score en direct",
      c: "C",
      clip: "Télécharger la dernière minute",
    },
  },
  pt: {
    meta: {
      title: "Judo in Cloud - Care System",
      description: "O CARE System da Judo in Cloud! Rápido, leve e simplesmente incrível!",
    },
    header: {
      discover: "Descubra a Judo in Cloud",
    },
    landing: {
      title: "O CARE System da Judo in Cloud!",
      subtitle: "Rápido, leve e simplesmente incrível!",
      description1: "Criámos para si um incrível CARE System: Camera Assistant Referee Enhanced (apoio de vídeo melhorado para árbitros)!",
      description2: "O nosso programa é leve, fácil de usar e, idealmente, não exige qualquer transferência. É uma página web que contém todo o código necessário para funcionar. Depois de aberta a página, nenhum dado é enviado para um servidor nem recebido de um servidor: funciona mesmo sem ligação à internet!",
      description3: "No entanto, para simplificar o trabalho de todos os organizadores e árbitros, disponibilizamos também executáveis para descarregar, que se abrem com um clique!",
      description4: "O projeto é gratuito, open source e está disponível para quem o quiser usar! Queremos ajudar o mundo do judo a progredir, e este é o nosso contributo!",
      description5: "Se quiser organizar a sua competição de judo de forma simples, segura e moderna,",
      visit_site: "visite o nosso site!",
    },
    settings: {
      title: "Definições de gravação",
      confirm: "Confirmar",
      reset: "Repor",
      cameras: "Câmaras",
      cameras_loading: "A carregar câmaras...",
      bitrate: "Bitrate",
      use_audio: "Usar áudio",
      frame_size: "Tamanho do fotograma",
      more_info: "Mais informações do vídeo",
      delay_multiplier: "Multiplicador de atraso",
      live_server: "Servidor do marcador ao vivo",
      live_server_live: "Live",
      live_server_demo: "Demo",
      live_competition: "Competição (Judo in Cloud)",
      live_competition_none: "Nenhuma: marcador desligado",
      live_competitions_loading: "A carregar competições...",
      live_competitions_error: "Não foi possível carregar as competições",
      live_tatami: "Número do tatami",
      log_db: "Registar as operações da base de dados",
    },
    delete: {
      title: "Eliminar todo o vídeo gravado",
      confirm_text: 'Escreva "Eliminar" para limpar a base de dados',
      keyword: "Eliminar",
      button: "Eliminar",
      wrong_keyword: "Escreveu mal a palavra {keyword}, tente novamente.",
    },
    footer: {
      title: "Judo in Cloud",
      subtitle: "Um serviço feito à sua medida!",
      contacts: "Contactos",
      collaboration: "Em colaboração com",
      thanks: "Agradecimentos especiais a",
      faq: "FAQ",
      social: "Redes Sociais",
      privacy: "Política de Privacidade",
      coaches: "Para os treinadores",
      getting_started: "Primeiros passos",
      benefits: "Vantagens",
      language: "Idioma",
    },
    stream: {
      key_placeholder: "Chave de transmissão do YouTube",
      start: "Iniciar transmissão",
      stop: "Parar transmissão",
      connecting: "A ligar...",
      live: "LIVE",
      stopped: "Parada",
      error: "Erro",
      winner: "Vencedor",
      next_match: "Próximo combate",
      no_camera: "A câmara ainda não está pronta.",
      codec_unsupported: "Este computador não consegue codificar H.264 e AAC, que o YouTube exige.",
    },
    error: {
      recording: "Há problemas com a gravação.\n\nVerifique se a webcam não está a ser usada por outro programa e depois recarregue o sistema CARE.\n\nSe o problema persistir, o seu computador pode não suportar a gravação de vídeo\n\n(formato de vídeo: {mimeType}).\n\nErro: {message}",
      no_video: "Nenhum vídeo gravado.",
      no_blob: "Nenhum blob encontrado para descarregar.",
    },

    player: {
      live: "LIVE",
      speed: "1x",
      download: "Descarregar",
      download_all: "Descarregar tudo",
      download_folder: "Pasta",
      download_folder_title: "Escolha uma pasta: as transferências são guardadas lá sem perguntar onde",
      camera_info: "{label} · {width}x{height} · {fps} fps · {kbps} kbit/s",
      download_start: "Início",
      download_end: "Fim",
      download_invalid_range: "Intervalo inválido: escreva as horas no formato HH:MM, com o início antes do fim.",
      download_too_long: "A transferência pelo browser está limitada a clips de até {maxMinutes} minutos. Use o script ffmpeg offline para o vídeo completo.",
      download_failed: "Não foi possível criar o ficheiro WebM. Se foi criado um ficheiro, está incompleto: elimine-o. Experimente um clip mais curto.",
      download_collecting: "A recolher o vídeo...",
      download_progress: "A criar o ficheiro {current}/{total}...",
      download_finalizing: "A finalizar o ficheiro...",
      scoreboard_key: "Marcador ao vivo (S)",
      dropped_frames: "Demasiados fotogramas perdidos ({percent}%). Baixe \"videoBitsPerSecond\" para menos de: {bitrate}",
    },
    shortcuts: {
      title_key: "Tecla",
      title_action: "Ação",
      space: "Barra de espaços / K",
      pause: "Pausa / Reproduzir",
      f: "F",
      fullscreen: "Ecrã inteiro",
      t: "T",
      theater: "Modo cinema",
      m: "M",
      mute: "Silenciar vídeo",
      arrows: "Setas esquerda / direita",
      seek_5s: "Avançar / Recuar 5 segundos",
      jl: "J / L",
      seek_3m: "Avançar / Recuar 3 minutos",
      dots: "Ponto / Vírgula",
      frame: "Avançar / Recuar 1 fotograma",
      p: "P",
      slow: "Câmara lenta / Velocidade normal",
      backspace: "Retrocesso (seta longa para a esquerda)",
      return_live: "Voltar ao direto",
      s: "S",
      scoreboard: "Mostrar / ocultar o marcador ao vivo",
      c: "C",
      clip: "Descarregar o último minuto",
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
 * @param {string} lang - Language code ('it', 'en', 'de', 'es', 'fr', 'pt')
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
