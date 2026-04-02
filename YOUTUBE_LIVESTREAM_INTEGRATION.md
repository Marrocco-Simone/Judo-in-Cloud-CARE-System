# YouTube Livestream Integration - CARE System

## Overview

Integrate YouTube livestreaming into the CARE System while simplifying the recording architecture. The current dual-MediaRecorder approach (1s stream + 5min download) is replaced by a **single MediaRecorder**. Video processing (download merging, YouTube streaming) is handled externally.

Two approaches were evaluated:

| | **Approach A: FFmpeg (Electron-only)** | **Approach B: MediaBunny (Web-based)** |
|---|---|---|
| YouTube streaming | FFmpeg → RTMPS | MediaBunny → MPEG-TS → YouTube HLS |
| Download merging | FFmpeg concat | MediaBunny remux → MP4 |
| Playback | Direct MediaSource (VP8) or MediaBunny remux (H.264) | Same |
| Requires Electron | Yes (child process) | Only for YouTube (CORS) |
| External dependency | FFmpeg binary (~80MB) | npm package (~5KB gzipped) |
| Maturity for streaming | Proven, industry standard | Experimental for live HLS upload |

---

## New Architecture: Single MediaRecorder

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌──────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │  Webcam   │───▶│  MediaRecorder    │───▶│   IndexedDB      │   │
│  │  Stream   │    │  (H264 or VP8)   │    │   blobs store    │   │
│  └──────────┘    │  2-4s chunks     │    └────────┬─────────┘   │
│                   └──────────────────┘             │              │
│                                                     │              │
│                          ┌──────────────────────────┤              │
│                          │              │           │              │
│                          ▼              ▼           ▼              │
│                   ┌────────────┐ ┌───────────┐ ┌────────────┐    │
│                   │  Playback   │ │ Download  │ │  YouTube   │    │
│                   │  MediaSource│ │ Merge →   │ │  Stream    │    │
│                   │  SourceBuf  │ │ MP4 file  │ │            │    │
│                   └────────────┘ └───────────┘ └────────────┘    │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Before**: 2 MediaRecorders (stream @ 1s VP8, download @ 5min VP8), 2 IndexedDB stores.
**After**: 1 MediaRecorder (2-4s chunks), 1 IndexedDB store. Download and streaming handled by post-processing.

### Why single recorder?

- Less CPU/memory usage (one encoder instead of two)
- Simpler codebase
- The download recorder's 5-minute chunks were wasteful — merging small chunks on demand is better
- The single recorder's chunks serve all three purposes: playback, download, and streaming

---

## MediaBunny Evaluation

[MediaBunny](https://mediabunny.dev/) is a pure TypeScript media toolkit using the browser's WebCodecs API. Zero dependencies, hardware-accelerated, ~5KB gzipped.

### What it CAN do

| Capability | Details |
|---|---|
| Read WebM | Full support, including VP8/VP9/H.264 tracks |
| Write MP4 | Including fragmented MP4 (fMP4) for MediaSource |
| Write MPEG-TS | Supported output format |
| H.264 codec | Read/write via WebCodecs |
| Streaming I/O | Pipelined design with backpressure, append-only mode |
| Transmux (remux) | WebM → MP4 without re-encoding (fast, low CPU) |
| Transcode | VP8 → H.264 via WebCodecs (hardware accelerated) |
| Browser-only | No server needed for processing |

### What it CANNOT do

| Limitation | Impact |
|---|---|
| No RTMP/RTMPS output | Cannot send to YouTube via RTMP directly |
| No FLV format | Not needed if using HLS approach |
| No built-in concat | Must orchestrate manually (read N inputs → write 1 output) |
| WebCodecs required | Modern browsers only (Chrome 94+, Edge 94+, Safari 16.4+) |

### Verdict

MediaBunny can **replace FFmpeg for downloads** (remux WebM chunks → single MP4). For YouTube streaming, it can produce MPEG-TS segments for YouTube's HLS ingestion endpoint, but uploading requires HTTP requests that are blocked by CORS in regular browsers — so YouTube streaming remains **Electron-only** regardless of approach.

Sources:
- [MediaBunny Documentation](https://mediabunny.dev/guide/introduction)
- [MediaBunny GitHub](https://github.com/Vanilagy/mediabunny)
- [MediaBunny Blog Post](https://blog.nidhin.dev/mediabunny-mediatoolkit-for-modern-web)

---

## YouTube Ingestion Protocols

YouTube supports four protocols. Only HLS is HTTP-based and potentially usable without RTMP.

| Protocol | Transport | Codec | Browser-feasible? |
|---|---|---|---|
| RTMP | TCP socket | H.264 | No (no raw sockets) |
| RTMPS | TLS + TCP | H.264 | No |
| **HLS** | **HTTPS PUT/POST** | **H.264, HEVC** | **Yes (from Electron/Node.js)** |
| DASH | HTTPS | H.264, VP9 | Theoretically, but undocumented |

### YouTube HLS Ingestion Details

YouTube accepts HLS segments via standard HTTPS requests:

**Endpoint**: `https://a.upload.youtube.com/http_upload_hls?cid={STREAM_KEY}&copy=0&file={FILENAME}`

**Segment requirements**:
- Format: MPEG-TS (.ts)
- Video: H.264 (closed GOP)
- Audio: AAC
- Duration: 1-4 seconds (max 5s)
- Must include M3U8 playlist uploaded after each segment

**Upload flow**:
1. HTTP PUT segment: `...&file=segment0001.ts`
2. HTTP PUT playlist: `...&file=playlist.m3u8`
3. Repeat for each new segment, incrementing sequence numbers

**Why Electron-only**: YouTube's upload endpoint does not serve CORS headers, so `fetch()` from a browser page would be blocked. In Electron, Node.js `https` module bypasses CORS entirely.

Sources:
- [YouTube HLS Ingestion Guide](https://developers.google.com/youtube/v3/live/guides/hls-ingestion)
- [YouTube Ingestion Protocol Comparison](https://developers.google.com/youtube/v3/live/guides/ingestion-protocol-comparison)
- [Mux: The state of going live from a browser](https://www.mux.com/blog/the-state-of-going-live-from-a-browser)

---

## H.264 vs VP8: Codec Decision

### The tradeoff

| | H.264 MediaRecorder | VP8 MediaRecorder |
|---|---|---|
| MediaRecorder support | Chrome ✅, Edge ✅, Firefox ❌, Safari ❌ | Chrome ✅, Edge ✅, Firefox ✅ |
| MediaSource playback | Needs remux to fMP4 (WebM+H.264 not supported by MSE) | Direct append to SourceBuffer ✅ |
| YouTube compatibility | Native (remux only, no transcode) | Needs transcode → H.264 |
| Download as MP4 | Remux only (fast) | Transcode needed (CPU heavy) |
| CPU encoding cost | Similar (both hardware-accelerated by MediaRecorder) | Similar |

### Recommended: H.264 with VP8 fallback

```javascript
const h264Supported = MediaRecorder.isTypeSupported('video/webm; codecs="h264, opus"');
const mimeType = h264Supported
  ? 'video/webm; codecs="h264, opus"'
  : 'video/webm; codecs="vp8, opus"';
```

**If H.264 is available**: All downstream processing is remux-only (fast, low CPU). The only extra step is remuxing each WebM chunk to fMP4 for MediaSource playback, which is essentially just header rewriting — negligible overhead.

**If VP8 fallback**: Playback works directly via MediaSource (no remux needed). Downloads produce WebM files. YouTube streaming requires transcoding VP8 → H.264 (CPU intensive, but WebCodecs uses hardware acceleration).

---

## Approach A: FFmpeg (Electron-only, Proven)

### Architecture

```
MediaRecorder (H264/VP8, 2-4s) → IndexedDB
                                      │
                    ┌─────────────────┤
                    │                 │
              [Playback]        [On demand]
              MediaSource            │
                              ┌──────┴──────┐
                              │             │
                         [Download]    [YouTube]
                         FFmpeg         FFmpeg
                         concat →       stdin →
                         MP4 file       RTMPS
```

### FFmpeg for Downloads

Concatenate stored blobs into a single MP4:

```bash
# H.264 input (remux only)
ffmpeg -i concat:chunk1.webm|chunk2.webm|... -c:v copy -c:a aac -f mp4 output.mp4

# VP8 input (transcode)
ffmpeg -i concat:... -c:v libx264 -preset fast -c:a aac -f mp4 output.mp4
```

In practice: blobs are piped from IndexedDB via IPC to FFmpeg's stdin.

### FFmpeg for YouTube Streaming

```bash
# H.264 input (remux to FLV, minimal CPU)
ffmpeg -re -i pipe:0 -c:v copy -c:a aac -b:a 128k -f flv \
  "rtmps://a.rtmps.youtube.com:443/live2/{STREAM_KEY}"

# VP8 input (transcode, higher CPU)
ffmpeg -re -i pipe:0 -c:v libx264 -preset ultrafast -tune zerolatency \
  -b:v 2000k -g 60 -c:a aac -b:a 128k -f flv \
  "rtmps://a.rtmps.youtube.com:443/live2/{STREAM_KEY}"
```

### FFmpeg Binary

Use `ffmpeg-static` npm package (provides prebuilt binaries for all platforms):

```javascript
const ffmpegPath = require('ffmpeg-static');
// In packaged Electron app, needs asar unpacking
```

### Pros/Cons

✅ Proven, battle-tested RTMP streaming
✅ Handles any codec input (remux or transcode)
✅ Single tool for both download and streaming
❌ Adds ~80MB to Electron bundle (FFmpeg binary)
❌ Electron-only (no web support)
❌ Must manage child process lifecycle
❌ User cannot install/update FFmpeg independently

---

## Approach B: MediaBunny (Web-compatible, Modern)

### Architecture

```
MediaRecorder (H264/VP8, 2-4s) → IndexedDB
                                      │
                    ┌─────────────────┤
                    │                 │
              [Playback]        [On demand]
              H264: MediaBunny       │
                remux → fMP4   ┌─────┴──────┐
              VP8: direct MSE  │            │
                          [Download]   [YouTube]
                          MediaBunny   MediaBunny
                          concat →     remux →
                          MP4 file     MPEG-TS
                                       → HTTP PUT
                                       (Electron)
```

### MediaBunny for Downloads (Web + Electron)

```javascript
import { Input, Output, Conversion, BlobSource, BufferTarget, WEBM, MP4 } from 'mediabunny';

async function mergeChunksToMp4(blobs) {
  const target = new BufferTarget();
  const output = new Output({
    format: MP4,
    target,
    video: { codec: 'copy' },  // remux, no transcode
    audio: { codec: 'aac' }
  });

  for (const blob of blobs) {
    const input = new Input({
      formats: [WEBM],
      source: new BlobSource(blob)
    });
    // Feed each chunk's packets into the output
    await new Conversion(input, output).run();
  }

  await output.finalize();
  return new Blob([target.buffer], { type: 'video/mp4' });
}
```

This works entirely in the browser — no Electron needed for downloads.

### MediaBunny for YouTube HLS (Electron-only)

Each 2-4 second chunk is remuxed to MPEG-TS and uploaded to YouTube's HLS endpoint:

```javascript
// Renderer: remux WebM chunk → MPEG-TS
import { Input, Output, Conversion, BlobSource, BufferTarget, WEBM, MPEGTS } from 'mediabunny';

async function chunkToMpegTs(webmBlob) {
  const target = new BufferTarget();
  const output = new Output({
    format: MPEGTS,
    target,
    video: { codec: 'copy' },
    audio: { codec: 'aac' }
  });

  const input = new Input({
    formats: [WEBM],
    source: new BlobSource(webmBlob)
  });

  await new Conversion(input, output).run();
  await output.finalize();
  return target.buffer;  // ArrayBuffer of .ts segment
}

// Send to Electron main process for HTTP upload
ipcRenderer.invoke('upload-hls-segment', {
  buffer: tsBuffer,
  filename: `segment${sequenceNumber}.ts`,
  playlist: generateM3u8(sequenceNumber)
});
```

```javascript
// Main process: HTTP PUT to YouTube (no CORS restrictions)
const https = require('https');

async function uploadSegment(streamKey, filename, buffer) {
  const url = `https://a.upload.youtube.com/http_upload_hls?cid=${streamKey}&copy=0&file=${filename}`;
  // HTTP PUT with the MPEG-TS buffer
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'PUT', headers: {
      'User-Agent': 'JudoInCloud / CARE / 1.0',
      'Content-Length': buffer.byteLength
    }}, (res) => {
      if (res.statusCode === 200 || res.statusCode === 202) resolve();
      else reject(new Error(`YouTube HLS upload failed: ${res.statusCode}`));
    });
    req.write(Buffer.from(buffer));
    req.end();
  });
}
```

### M3U8 Playlist Format

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:{currentSequence - 4}

#EXTINF:3.975,
segment{N-4}.ts
#EXTINF:3.975,
segment{N-3}.ts
#EXTINF:3.975,
segment{N-2}.ts
#EXTINF:3.975,
segment{N-1}.ts
#EXTINF:3.975,
segment{N}.ts
```

Max 5 outstanding segments in the playlist. Upload updated playlist after each segment.

### Pros/Cons

✅ No FFmpeg binary (~80MB saved from bundle)
✅ Downloads work on web (no Electron needed)
✅ Tiny dependency (~5KB gzipped)
✅ Hardware-accelerated via WebCodecs
✅ Modern, maintained library (v1.32.0, sponsored by Remotion)
❌ YouTube HLS streaming is less proven than RTMP
❌ HLS has higher latency than RTMP (~10-20s vs ~5-10s)
❌ YouTube streaming still requires Electron (CORS)
❌ No FLV/RTMP fallback if HLS fails
❌ MediaBunny's concat workflow needs manual orchestration

---

## Recommended Hybrid Approach

Use **MediaBunny for downloads** (works on web) and **FFmpeg for YouTube streaming** (proven RTMP). This gives the best of both worlds:

```
MediaRecorder (H264/VP8, 2-4s) → IndexedDB (single store)
                                      │
              ┌───────────────────────┤
              │              │        │
        [Playback]     [Download]  [YouTube]
        MediaSource    MediaBunny   FFmpeg
        (VP8: direct)  WebM → MP4   RTMPS
        (H264: remux   (browser)    (Electron)
         via MB → fMP4)
```

| Feature | Tool | Platform |
|---|---|---|
| Playback | MediaSource (direct or via MediaBunny fMP4 remux) | Web + Electron |
| Download | MediaBunny (WebM → MP4) | Web + Electron |
| YouTube Stream | FFmpeg (→ RTMPS) | Electron only |

### Why not all-MediaBunny?

- YouTube RTMP streaming via FFmpeg is battle-tested, with well-known error modes and recovery patterns
- HLS ingestion adds 10-20s extra latency vs RTMP's 5-10s — matters for live judo matches
- FFmpeg's RTMP handles reconnection, buffering, and codec negotiation automatically

### Why not all-FFmpeg?

- Downloads work on web too (important — not all users run Electron)
- MediaBunny is 5KB vs FFmpeg's 80MB
- MediaBunny uses hardware acceleration via WebCodecs
- No child process management needed for downloads

---

## YouTube User Setup

The user provides their stream key manually. No OAuth or API integration needed.

### Steps:

1. Go to [YouTube Studio](https://studio.youtube.com) → Go Live
2. Choose "Stream" → Copy the **Stream key**
3. Paste the stream key into CARE's settings panel

### YouTube Recommended Settings (auto-configured by CARE)

| Setting | Value |
|---|---|
| Video Codec | H.264 |
| Audio Codec | AAC |
| Bitrate | 2000-4000 kbps |
| Audio Bitrate | 128 kbps |
| Keyframe Interval | 2 seconds |
| Protocol | RTMPS |

---

## Implementation Phases

### Phase 1: Performance + Downloads (Priority)

Single MediaRecorder refactor and MediaBunny-powered MP4 downloads. This phase improves performance on all devices (especially tablets) and replaces the limited 5-minute download with full-range MP4 export.

**1.1 Simplify to single MediaRecorder**

- Remove `downloadMediaRecorder` and the `downloadBlobs` IndexedDB store
- Keep only one recorder (`streamMediaRecorder` → rename to just `mediaRecorder`)
- Same stop/restart pattern, same REFRESHRATE-based chunking, same `streamBlobs` store
- Playback pipeline unchanged — still VP8 WebM chunks fed to MediaSource SourceBuffer
- Result: ~50% less CPU/memory from encoding, fewer IndexedDB writes

**1.2 Add MediaBunny for MP4 downloads**

- Load MediaBunny via CDN `<script>` tag (vanilla JS project, no bundler)
- Replace `saveVideo()`: instead of downloading a single 5-min WebM blob, use MediaBunny to merge N chunks from `streamBlobs` into one MP4 file
- Download flow: user clicks download → `getBlobsInRange(startId, endId)` → MediaBunny reads each WebM blob → remuxes to single MP4 → triggers browser download
- Downloads the entire recorded session or a custom time range (not limited to 5-min windows)
- Output: `.mp4` file (H.264 if input was H.264, or transcoded from VP8)
- Works on web and Electron, no server needed

**1.3 File changes (Phase 1)**

| File | Changes |
|---|---|
| `index.html` | Add MediaBunny CDN script tag, update download UI (progress indicator) |
| `script.js` | Remove dual recorder, single recorder, new `saveVideo()` with MediaBunny |
| `styles.css` | Download progress indicator styling |

**1.4 Testing (Phase 1)**

1. Verify playback quality unchanged with single recorder
2. Verify IndexedDB store works correctly with single collection
3. Download 1 minute of video → verify MP4 plays in VLC, QuickTime, browser
4. Download 30+ minutes → verify MediaBunny handles many chunks without OOM
5. Test on tablet (Android Chrome) — confirm reduced CPU usage
6. Test on low-end PC — confirm smoother playback

---

### Phase 2: YouTube Livestreaming (Electron)

FFmpeg-based RTMP streaming to YouTube. Electron-only feature.

**2.1 Bundle FFmpeg**

- Add `ffmpeg-static` to `executable/package.json`
- Handle asar unpacking for packaged builds

**2.2 Electron IPC for FFmpeg**

- `executable/main.js`: IPC handlers for `start-stream`, `stop-stream`, `send-stream-data`, `stream-status`
- `executable/preload.js`: expose streaming IPC to renderer
- FFmpeg spawned as child process, WebM chunks piped to stdin, output to YouTube RTMPS

**2.3 UI additions**

- Stream Key input (password field, persisted in localStorage)
- Start/Stop Streaming toggle button (hidden on web, visible on Electron)
- Streaming status indicator (connecting / live / error / offline)

**2.4 File changes (Phase 2)**

| File | Changes |
|---|---|
| `script.js` | Streaming IPC calls, UI logic for stream controls |
| `index.html` | Stream key input, start/stop button, status indicator |
| `styles.css` | Streaming UI styling |
| `executable/main.js` | FFmpeg IPC handlers, process lifecycle management |
| `executable/preload.js` | Create: expose streaming IPC to renderer |
| `executable/package.json` | Add `ffmpeg-static` dependency |

**2.5 Testing (Phase 2)**

1. FFmpeg connects to YouTube RTMPS with valid stream key
2. Video appears in YouTube Studio preview within 10-20s
3. Graceful stop sends end-of-stream signal
4. Network loss mid-stream shows error and allows retry
5. Streaming + local playback run simultaneously without degradation

---

### Phase 3: Touch Support (Tablets)

Touch gesture support for tablet users at judo competitions.

**3.1 Pinch-to-zoom**

- Replace/augment mouse wheel zoom with touch `gesturechange` or dual-touch tracking
- Same position-dependent zoom logic, adapted for touch coordinates

**3.2 Touch pan**

- Replace right-click drag with single-finger or two-finger drag for panning
- Same sensitivity and smoothing logic, adapted for `touchmove` events

**3.3 Touch-friendly controls**

- Larger tap targets for buttons (min 44px per Apple HIG)
- Touch-friendly timeline scrubbing (`touchstart`/`touchmove`/`touchend`)
- Swipe gestures for rewind/forward (optional)

**3.4 File changes (Phase 3)**

| File | Changes |
|---|---|
| `script.js` | Touch event handlers for zoom, pan, timeline, controls |
| `styles.css` | Larger touch targets, mobile-friendly control sizing |
| `index.html` | Possible layout adjustments for tablet viewport |

**3.5 Testing (Phase 3)**

1. Pinch-to-zoom works on iPad and Android tablets
2. Touch pan moves video view smoothly
3. Timeline scrubbing via touch is accurate
4. All existing mouse interactions still work (no regression)

---

## Error Handling

| Scenario | Phase | Handling |
|---|---|---|
| H.264 not supported | 1 | Fall back to VP8, download as WebM instead of MP4 |
| MediaBunny merge fails | 1 | Show error, offer raw WebM blob download as fallback |
| Too many chunks for merge | 1 | Process in batches, show progress indicator |
| FFmpeg not found (Electron) | 2 | Disable streaming button, show "FFmpeg non trovato" |
| Invalid stream key | 2 | FFmpeg fails to connect → "Chiave stream non valida" |
| Network loss during stream | 2 | FFmpeg exits → "Connessione persa", offer retry |
| User stops recording | 2 | Also stop streaming if active |

---

## Security

- Stream key stored in localStorage (acceptable for local app), never logged
- FFmpeg command includes stream key — suppress from console output
- Use RTMPS (TLS) by default, never plain RTMP
- MediaBunny processes video locally — no data leaves the browser except for YouTube upload

---

## Future Enhancements (Out of Scope)

- **OAuth + YouTube API**: Auto-create broadcasts, set titles/thumbnails
- **Full web streaming**: Relay server for non-Electron YouTube streaming
- **Multi-platform**: Support Twitch, Facebook Live (different RTMP URLs)
- **All-MediaBunny YouTube**: Replace FFmpeg with MediaBunny HLS if YouTube HLS proves reliable
- **Overlay**: Add referee score overlay on stream
- **Adaptive bitrate**: Adjust bitrate based on network conditions
- **WHIP protocol**: If YouTube ever adopts [WHIP](https://datatracker.ietf.org/doc/rfc9725/) (RFC 9725), could enable browser-native streaming via WebRTC
