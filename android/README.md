# JiC CARE System - Android APK

APK Android nativa in Kotlin che wrappa [care.judoincloud.com](https://care.judoincloud.com) in una WebView con performance ottimizzate per tablet budget (Rockchip, 4GB RAM).

## Perché questa app?

Chrome su tablet Android budget ha overhead eccessivo con la pipeline video (`getUserMedia` → `MediaRecorder`). Questa WebView nativa elimina l'overhead di Chrome gestendo i permessi camera direttamente a livello nativo.

## Requisiti

- Android Studio Hedgehog (2023.1.1) o superiore
- JDK 17 (già installato nel sistema)
- Android SDK API 35+ (già disponibile in `~/Library/Android/sdk`)

## Struttura progetto

```
android/
├── app/src/main/
│   ├── AndroidManifest.xml          # Permessi: CAMERA, RECORD_AUDIO
│   ├── java/com/judoincloud/care/
│   │   └── MainActivity.kt          # WebView fullscreen + permessi automatici
│   └── res/
│       ├── layout/activity_main.xml # Solo WebView
│       ├── values/strings.xml
│       ├── values/themes.xml
│       └── mipmap-*/ic_launcher.png # Icone Judo in Cloud
├── build.gradle.kts (project)
├── settings.gradle.kts
└── gradle.properties
```

## Setup e Build

### Opzione 1: Android Studio (Consigliata)

1. **Apri il progetto** in Android Studio:
   ```bash
   cd android
   open -a "Android Studio" .
   ```

2. **Attendi la sincronizzazione** — Android Studio scaricherà automaticamente:
   - Gradle Wrapper
   - Dipendenze necessarie
   - Android SDK se mancante

3. **Genera APK Release**:
   - Menu: `Build` → `Generate Signed App Bundle or APK`
   - Seleziona `APK` → `Release`
   - Crea o seleziona un keystore per la firma
   - APK verrà generato in: `app/build/outputs/apk/release/app-release.apk`

### Opzione 2: Command Line (con Gradle Wrapper)

Se preferisci la command line, devi prima generare il Gradle Wrapper:

```bash
cd android

# Se hai gradle installato globalmente (check con 'which gradle')
gradle wrapper

# Altrimenti, scarica manualmente lo script gradlew:
# Il file gradle-wrapper.jar deve essere in gradle/wrapper/
# Puoi copiarlo da un altro progetto Android (es. ~/compify/app/android)
```

Una volta che hai `gradlew`:

```bash
# Build debug APK
./gradlew assembleDebug

# Build release APK (richiede keystore)
./gradlew assembleRelease
```

## Firma l'APK

Per distribuire l'APK, devi firmarlo con un keystore:

```bash
# Genera keystore (una sola volta)
keytool -genkey -v \
    -keystore jic-care.keystore \
    -alias jiccare \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000

# Firma l'APK
jarsigner -verbose \
    -sigalg SHA256withRSA \
    -digestalg SHA-256 \
    -keystore jic-care.keystore \
    app/build/outputs/apk/release/app-release-unsigned.apk \
    jiccare

# Ottimizza con zipalign
zipalign -v 4 \
    app/build/outputs/apk/release/app-release-unsigned.apk \
    app-release.apk
```

## Installazione su tablet

```bash
# Collega il tablet via USB (abilita Debug USB nelle Opzioni Sviluppatore)
adb devices

# Installa l'APK
adb install app-release.apk

# Oppure per aggiornare:
adb install -r app-release.apk
```

## Caratteristiche

- **Fullscreen immersive** — Landscape, senza barre di stato/navigazione
- **Permessi automatici** — Camera e microfono concessi senza popup
- **Hardware acceleration** — Esplicita sulla WebView e Activity
- **IndexedDB persistente** — I dati rimangono salvati tra le sessioni
- **Supporto USB OTG** — Le telecamere USB esterne dovrebbero apparire in `getUserMedia` se supportate dal kernel

## Test critici

1. **Apertura base** — App si apre fullscreen, carica care.judoincloud.com
2. **Camera interna** — Preview fluido, registrazione funziona
3. **Camera USB OTG** — Collega telecamera USB, verifica che appaia nell'elenco
4. **Persistenza** — Registra clip, chiudi app, riapri — clip deve essere presente

## Debug

### Remote debugging WebView

```bash
# Attiva debug WebView sul tablet (Opzioni Sviluppatore → Debug WebView)
# Sul computer, apri Chrome e vai su:
chrome://inspect#devices
```

### Logcat

```bash
adb logcat -s WebView:D MainActivity:D
```

## Note

- **Zero modifiche alla web app** — L'APK è un wrapper puro
- **Distribuzione** — APK sideload, nessun Play Store richiesto
- **Target devices** — QDDQ TAB10, RELNDOO T10 (Rockchip, Android 15, 4GB RAM)

## Troubleshooting

### WebView non carica la pagina
- Verifica connessione internet
- Check `chrome://inspect` per errori JavaScript

### Camera non accessibile
- Verifica permessi in Impostazioni → App → JiC CARE → Permessi
- Controlla che `CAMERA` e `RECORD_AUDIO` siano nel manifest

### Performance scattosa
- Assicurati che `hardwareAccelerated="true"` sia nel manifest
- Verifica che `setLayerType(View.LAYER_TYPE_HARDWARE, null)` sia in MainActivity
