# Android Tablet Support Removal - Complete Documentation

**Date**: April 19, 2026  
**Version**: 1.5.5  
**Status**: Android tablet support permanently removed from CARE System

---

## Quick Summary

Android tablet support was attempted over a 4-month period to enable USB camera usage on budget tablets (Rockchip, 4GB RAM). After multiple implementation approaches, persistent technical issues prevented reliable operation. All Android-related code has been removed from the codebase as of v1.5.5.

---

## Table of Contents

1. [Historical Context](#historical-context)
2. [Timeline of Development](#timeline-of-development)
3. [Technical Attempts](#technical-attempts)
4. [Why It Failed](#why-it-failed)
5. [What Was Removed](#what-was-removed)
6. [Reference Materials](#reference-materials)
7. [Lessons Learned](#lessons-learned)
8. [Future Considerations](#future-considerations)

---

## Historical Context

The CARE System (Camera Assistant Referee Enhanced) by Judo in Cloud is a client-side video recording and playback tool for judo referees. It captures webcam video, stores it in IndexedDB, and plays it back with DVR-like controls (rewind, slow-motion, frame-by-frame, zoom/pan).

### The Android Problem

Budget Android tablets (QDDQ TAB10, RELNDOO T10 with Rockchip SoC, 4GB RAM, Android 15) were identified as potential deployment targets due to their low cost and portability. However, these tablets had severe performance issues when running the CARE System in Chrome:

- Chrome overhead was excessive with the video pipeline
- Frame drops and lag made the system unusable for referee work
- USB cameras were not visible in `getUserMedia` / `enumerateDevices()`

This led to the attempt to create a native Android APK with optimized WebView and direct UVC camera access.

---

## Timeline of Development

### Phase 1: Initial Research and HTTP Approach (March 2025)

| Date | Commit | Description |
|------|--------|-------------|
| 2025-03-15 | `38bc73c` | v1.5.0: Tablet performance optimizations attempted |
| 2025-03-20 | `a8a3b7b` | Added Android USB camera test page (getUserMedia + WebUSB diagnostics) |
| 2025-03-22 | `bf93a20` | Added USB Camera HTTP stream test page |
| 2025-03-25 | `8022a67` | Added USB Camera HTTP stream fallback for Android tablets |

**Approach**: Use external "USB Camera" app with HTTP server at `localhost:8081`, then read MJPEG stream in the web app.

**Result**: Technically worked but only achieved ~1fps performance - unusable for production.

---

### Phase 2: Native Android APK Development (April 2025)

| Date | Commit | Description |
|------|--------|-------------|
| 2025-04-10 | `1f9f8be` | Add Android WebView wrapper for CARE System |
| 2025-04-11 | `bed56ce` | Fix GitHub Actions workflow for APK builds |
| 2025-04-12 | `9007d00` | v1.5.4: Fix audio fallback + UVC USB camera bridge + unified release |
| 2025-04-12 | `5e6df04` | Fix release workflow: upload APK to same release as Electron assets |
| 2025-04-12 | `061981d` | Rename APK to match Electron naming convention |
| 2025-04-13 | `f3da547` | Build debug APK instead of unsigned release |
| 2025-04-19 | `f7951c9` | Integrate UVCCamera library for native USB camera streaming |
| 2025-04-19 | `2e01a61` | Fix UVC camera error -99 by tracking camera open state |

**Approach**: Build native Android APK with:
- Fullscreen WebView wrapper
- UVCCamera library (`org.uvccamera:lib:0.0.13`)
- Native MJPEG server on `localhost:8081`
- Frame conversion (NV21/YUYV to JPEG)

**Result**: Error -99 "could not open camera" persisted despite fixes.

---

### Phase 3: Abandoned (April 19, 2026)

**Decision**: Permanently remove all Android tablet support code after determining that the hardware limitations could not be overcome.

---

## Technical Attempts

### Attempt 1: External HTTP Server (USB Camera App)

**Architecture**:
```
USB Camera → USB Camera App (HTTP Server) → Chrome/WebView → Canvas → captureStream → MediaRecorder
```

**Implementation**:
- `usbCameraUrl` parameter in `index.js` and `camera.js`
- MJPEG stream reading via `fetch()` API
- `readMjpegStream()` function for frame extraction
- Canvas-based rendering for `MediaRecorder` compatibility

**Bottlenecks**:
1. MJPEG decoding overhead in JavaScript
2. Canvas `captureStream()` performance issues on budget hardware
3. MediaRecorder re-encoding already-compressed MJPEG frames
4. HTTP server process consuming CPU/RAM

**Performance**: ~1fps (target: 30fps)

---

### Attempt 2: Native UVC Bridge with MJPEG Server

**Architecture**:
```
USB Camera → UVCCamera Library → FrameConverter (NV21→JPEG) → MjpegServer (localhost:8081) → WebView → Canvas → captureStream → MediaRecorder
```

**Implementation**:
- `UvcBridge.kt` - USB device detection and frame callbacks
- `MjpegServer.kt` - HTTP server for MJPEG streaming
- `FrameConverter.kt` - YUV to JPEG conversion utilities
- `MainActivity.kt` - WebView setup with permissions and mixed content

**Key Components**:

```kotlin
// UvcBridge.kt - Core UVC handling
class UvcBridge(
    private val context: Context,
    private val mjpegServer: MjpegServer,
    private val onAvailabilityChanged: (Boolean) -> Unit
) {
    private var usbMonitor: USBMonitor? = null
    private var uvcCamera: UVCCamera? = null
    private var cameraOpened = false
    
    // Frame callback from UVCCamera library
    private val frameCallback = IFrameCallback { frame ->
        val jpegData = FrameConverter.convertNv21ToJpeg(data, width, height, quality)
        mjpegServer.pushFrame(jpegData)
    }
}
```

```kotlin
// MjpegServer.kt - Local HTTP streaming
class MjpegServer(private val port: Int = 8081) {
    private val clients = CopyOnWriteArrayList<OutputStream>()
    
    fun pushFrame(jpegData: ByteArray) {
        val header = "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpegData.size}\r\n\r\n"
        clients.forEach { out ->
            out.write(header.toByteArray())
            out.write(jpegData)
            out.write("\r\n".toByteArray())
            out.flush()
        }
    }
}
```

---

### Attempt 3: Planned WebRTC Bridge (Never Implemented)

**Architecture** (planned):
```
USB Camera → AUSBC Library → Native WebRTC VideoTrack → RTCPeerConnection → JS MediaStream → MediaRecorder
```

**Rationale**: 
- Avoid MJPEG-over-HTTP bottleneck
- <1ms latency target
- Direct MediaStream injection

**Why Abandoned**: 
- Fundamental UVC issues persisted (error -99)
- Hardware limitations made any architecture impractical

See [`.opencode/plans/2026-04-19-uvc-production-path.md`](../.opencode/plans/2026-04-19-uvc-production-path.md) for detailed plan.

---

## Why It Failed

### The Error -99 Problem

**Symptom**: `could not open camera: err=-99` from UVCCamera library

**Root Cause** (identified from GitHub Issue #378):
```
release interface failed, error -1 errno 22
→ could not open camera:err=-99
```

**Our Bug**: 
- `startCamera()` was calling `stopCamera()` unconditionally
- On fresh USB connection, no camera was open yet
- Calling stop on unopened camera corrupted USB interface state

**Fix Applied** (commit `2e01a61`):
```kotlin
private var cameraOpened = false

private fun startCamera(ctrlBlock: USBMonitor.UsbControlBlock) {
    Thread {
        try {
            Thread.sleep(500)
            // Only stop previous camera if one was actually opened before
            if (cameraOpened) {
                stopCamera()
                Thread.sleep(200)
            }
            uvcCamera = UVCCamera()
            uvcCamera?.open(ctrlBlock)
            cameraOpened = true
            // ...
        }
    }
}
```

**Why Fix Was Insufficient**:

Even with proper state tracking, the underlying hardware constraints prevented reliable operation:

1. **USB Controller Limitations**: Rockchip USB host controllers have bandwidth/initialization issues with UVC devices alongside other USB traffic

2. **Resource Competition**: The WebView's internal camera pipeline (for system camera) competed with UVC access for USB bandwidth

3. **RAM Constraints**: 4GB RAM insufficient for:
   - WebView rendering
   - MJPEG encoding/decoding
   - MediaRecorder processing
   - USB camera frame buffers

4. **Android Fragmentation**: USB host controller implementations vary by manufacturer, making a universal solution impossible

---

## What Was Removed

### Files Deleted

```
/android/                                      # Entire Android Studio project
├── app/
│   ├── build.gradle.kts                       # Build config with UVCCamera dependency
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml               # USB permissions, cleartext traffic
│       ├── java/com/judoincloud/care/
│       │   ├── FrameConverter.kt             # YUV→JPEG conversion
│       │   ├── MainActivity.kt               # WebView wrapper
│       │   ├── MjpegServer.kt                # HTTP MJPEG server
│       │   └── UvcBridge.kt                  # UVC camera handling
│       └── res/
│           ├── layout/activity_main.xml      # WebView layout
│           ├── mipmap-*/ic_launcher.png     # App icons
│           ├── values/strings.xml
│           ├── values/themes.xml
│           └── xml/device_filter.xml         # USB device filter
├── build.gradle.kts
├── gradle.properties
├── gradle/wrapper/
├── README.md                                 # Android build instructions
├── settings.gradle.kts
└── (build artifacts, .gradle, .idea, APK files)

testandroid.html                               # Android USB diagnostics page
teststream.html                                # MJPEG stream testing page
.github/workflows/build-android.yml            # Android CI workflow
```

### Code Removed from Existing Files

#### `index.js`
- `usbCameraUrl` parameter extraction
- USB camera radio button handling in `setNewQueryParams()`
- `addUSBCameraOption()` function (~35 lines)

#### `camera.js`
- `usbCameraUrl` parameter extraction
- USB stream initialization logic
- `getUSBCameraStream()` function (~35 lines)
- `readMjpegStream()` function (~60 lines)
- `waitForFirstFrame()` function (~20 lines)
- `addUSBCameraOption()` function (~35 lines)
- USB-related translations references

#### `translations.js`
- `camera.usb_option` (IT/EN/DE)
- `camera.usb_hint` (IT/EN/DE)
- `camera.usb_url_label` (IT/EN/DE)
- `camera.usb_error` (IT/EN/DE)

#### `camera.html`
- Hidden `<canvas id="usbCameraCanvas">` element

#### `.github/workflows/release.yml`
- `build_android` job (~35 lines)
- `upload_apk_to_release` job (~20 lines)
- Android artifact dependencies in other jobs

---

## Reference Materials

### Plan Documents

All historical planning documents are preserved in `.opencode/plans/`:

| Document | Date | Purpose |
|----------|------|---------|
| [`2026-01-18-android-apk-webview-jic-care.md`](../.opencode/plans/2026-01-18-android-apk-webview-jic-care.md) | Jan 2026 | Initial Android APK architecture and WebView setup |
| [`2026-04-18-apk-audio-uvc-release-plan.md`](../.opencode/plans/2026-04-18-apk-audio-uvc-release-plan.md) | Apr 18, 2026 | Audio fix, UVC bridge planning, release workflow |
| [`uvc-camera-integration-brief.md`](../.opencode/plans/uvc-camera-integration-brief.md) | Apr 18, 2026 | Technical brief for external consultation |
| [`2026-04-19-uvc-production-path.md`](../.opencode/plans/2026-04-19-uvc-production-path.md) | Apr 19, 2026 | Production path including WebRTC bridge (never implemented) |
| [`2026-04-19-remove-android-tablet-support.md`](../.opencode/plans/2026-04-19-remove-android-tablet-support.md) | Apr 19, 2026 | Removal execution plan |

### Detailed Removal Notes

See [`.opencode/notes/android-tablet-removal.md`](../.opencode/notes/android-tablet-removal.md) for:
- Complete commit history with descriptions
- Technical implementation details
- Files and code sections removed
- Architecture diagrams

---

## Lessons Learned

### Technical Lessons

1. **Hardware Research First**: Always validate target hardware capabilities before committing to architecture
   - Budget tablet USB controllers (Rockchip) have known UVC limitations
   - 4GB RAM is insufficient for real-time video processing + WebView + recording

2. **Library Maturity**: UVCCamera library is mature but requires specific hardware conditions
   - Works well on many devices but fails on certain USB controllers
   - Error -99 is a known issue with limited workarounds

3. **WebView Limitations**: 
   - Mixed content (HTTP localhost in HTTPS page) adds complexity
   - Canvas `captureStream()` performance is poor on budget hardware
   - JavaScript-based MJPEG decoding is too CPU-intensive

4. **USB Complexity**: Android USB host mode varies significantly across manufacturers
   - Samsung, Pixel, Rockchip all behave differently
   - No universal solution possible for UVC cameras

### Process Lessons

1. **Incremental Validation**: Each phase should have measurable exit criteria
   - Phase 1 (HTTP): Should have validated 30fps before proceeding
   - Phase 2 (UVC): Hardware validation should have happened earlier

2. **Fallback Planning**: Always have a working fallback
   - Desktop Electron app remained fully functional throughout
   - Users were never blocked by Android issues

3. **Documentation**: Extensive planning documents enabled clean removal
   - All technical decisions were documented
   - Commits were well-described for historical reference

---

## Future Considerations

### Alternative Approaches (Not Pursued)

#### 1. WebRTC Bridge with JavaScript Shim
**Status**: Planned but never implemented

Would require:
- Native WebRTC module in Android app
- `RTCPeerConnection` between native and JS
- JS shim to inject synthetic USB device in `enumerateDevices()`
- Complex but potentially lower latency than MJPEG

**Why Not Implemented**: Fundamental UVC issues would likely persist regardless of transport mechanism

#### 2. Higher-End Android Tablets
**Status**: Not tested

Devices with:
- 8GB+ RAM
- Better USB controllers (Qualcomm, MediaTek)
- Native UVC support in Camera2 API

**Why Not Pursued**: 
- Would require new hardware procurement
- Loses the "budget tablet" value proposition
- No guarantee of success

#### 3. IP Cameras with RTSP
**Status**: Future potential feature

Architecture:
```
IP Camera → RTSP Stream → RTSP Player in Web App → MediaRecorder
```

**Advantages**:
- Avoids USB bandwidth issues entirely
- Network-based cameras are widely available
- Would work on any platform (desktop + mobile)

**Challenges**:
- Requires RTSP player integration (hls.js, jsmpeg, etc.)
- Latency concerns for referee work
- Additional network setup complexity

---

## Current State (v1.5.5)

### What Works

✅ **Desktop Applications** (Windows, macOS, Linux)
- Electron-based wrappers
- Full USB camera support via OS drivers
- Smooth 30fps performance

✅ **Web Browser** (Chrome, Firefox, Edge, Safari)
- Standard `getUserMedia` API
- Works on any device with browser support
- No installation required

✅ **Mobile Browsers** (iOS Safari, Android Chrome)
- Standard web app functionality
- Device camera support
- No native app required

### What Was Removed

❌ **Native Android APK**
- All Android-specific code removed
- No more APK builds in releases
- No UVC camera bridge

❌ **USB Camera via HTTP**
- `usbCameraUrl` parameter removed
- MJPEG stream processing removed
- No external app integration

---

## Conclusion

The Android tablet support was a significant engineering effort that ultimately could not overcome fundamental hardware limitations. The attempt produced:

1. **Better understanding** of budget tablet constraints
2. **Cleaner web app** (removed complex USB camera fallback code)
3. **Comprehensive documentation** for future reference
4. **Focus on working platforms** (desktop, standard mobile browsers)

The CARE System remains fully functional and performant on its supported platforms. Users requiring USB camera support on mobile devices should use the desktop Electron applications or standard mobile browsers with built-in cameras.

---

**Document Version**: 1.5.5  
**Last Updated**: April 19, 2026  
**Author**: CARE System Development Team  
**Location**: `docs/android-tablet-support-removal.md`
