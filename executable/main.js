const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const https = require("node:https");

// https://www.electronforge.io/config/makers/squirrel.windows#handling-startup-events
if (require("electron-squirrel-startup")) app.quit();

// ! YOUTUBE HLS STREAMING STATE
let streamKey = null;
let streamWindow = null;
const PLAYLIST_WINDOW_SIZE = 5;
let uploadedSegments = [];

/**
 * Upload a buffer to YouTube's HLS ingestion endpoint
 * @param {string} filename
 * @param {Buffer} buffer
 * @returns {Promise<void>}
 */
function uploadToYouTube(filename, buffer) {
  const url = `https://a.upload.youtube.com/http_upload_hls?cid=${streamKey}&copy=0&file=${filename}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": buffer.byteLength,
          "User-Agent": "JudoInCloud/CARE/1.6.0",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode === 200 || res.statusCode === 202) {
            resolve();
          } else {
            reject(
              new Error(
                `YouTube HLS upload failed (${res.statusCode}): ${body}`
              )
            );
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.write(buffer);
    req.end();
  });
}

/**
 * Generate an M3U8 playlist for the uploaded segments
 * @param {boolean} endList - Whether to add EXT-X-ENDLIST (stream ending)
 * @returns {string}
 */
function generatePlaylist(endList) {
  const windowSegments = uploadedSegments.slice(-PLAYLIST_WINDOW_SIZE);
  const firstSequence =
    uploadedSegments.length > PLAYLIST_WINDOW_SIZE
      ? uploadedSegments.length - PLAYLIST_WINDOW_SIZE
      : 0;

  const maxDuration = Math.ceil(
    Math.max(...windowSegments.map((s) => s.duration), 1)
  );

  let playlist = "#EXTM3U\n";
  playlist += "#EXT-X-VERSION:3\n";
  playlist += `#EXT-X-TARGETDURATION:${maxDuration}\n`;
  playlist += `#EXT-X-MEDIA-SEQUENCE:${firstSequence}\n`;
  playlist += "\n";

  for (const seg of windowSegments) {
    playlist += `#EXTINF:${seg.duration.toFixed(3)},\n`;
    playlist += `${seg.filename}\n`;
  }

  if (endList) {
    playlist += "#EXT-X-ENDLIST\n";
  }

  return playlist;
}

function emitStreamStatus(status) {
  if (streamWindow && !streamWindow.isDestroyed()) {
    streamWindow.webContents.send("stream:status", status);
  }
}

// ! IPC HANDLERS
ipcMain.handle("stream:start", (event, key) => {
  streamKey = key;
  streamWindow = BrowserWindow.fromWebContents(event.sender);
  uploadedSegments = [];
  emitStreamStatus("connecting");
  console.log("YouTube HLS stream started");
});

ipcMain.handle("stream:stop", async () => {
  if (!streamKey) return;

  try {
    const playlist = generatePlaylist(true);
    await uploadToYouTube("playlist.m3u8", Buffer.from(playlist, "utf-8"));
    console.log("YouTube HLS stream stopped (ENDLIST uploaded)");
  } catch (err) {
    console.error("Error uploading final playlist:", err.message);
  }

  streamKey = null;
  emitStreamStatus("stopped");
});

ipcMain.handle(
  "stream:data",
  async (_event, arrayBuffer, segmentNumber, durationSec) => {
    if (!streamKey) return;

    const segmentFilename = `segment${String(segmentNumber).padStart(5, "0")}.ts`;
    const buffer = Buffer.from(arrayBuffer);

    try {
      await uploadToYouTube(segmentFilename, buffer);

      uploadedSegments.push({
        filename: segmentFilename,
        duration: durationSec,
      });

      const playlist = generatePlaylist(false);
      await uploadToYouTube("playlist.m3u8", Buffer.from(playlist, "utf-8"));

      if (uploadedSegments.length === 1) {
        emitStreamStatus("live");
      }
    } catch (err) {
      console.error("YouTube HLS upload error:", err.message);
      emitStreamStatus(`error:${err.message}`);
    }
  }
);

// ! ELECTRON APP SETUP
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    icon: "icons/logo_icon.png",
  });

  mainWindow.loadFile("index.html");

  mainWindow.webContents.on("did-finish-load", () => {
    const url = mainWindow.webContents.getURL();
    if (url.includes("camera.html")) {
      mainWindow.webContents.executeJavaScript(`
        const s = document.createElement("script");
        s.src = "youtube-stream.js";
        document.body.appendChild(s);
      `);
    }
  });

  // mainWindow.webContents.openDevTools()
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async (event) => {
  if (streamKey && uploadedSegments.length > 0) {
    event.preventDefault();
    try {
      const playlist = generatePlaylist(true);
      await uploadToYouTube("playlist.m3u8", Buffer.from(playlist, "utf-8"));
      console.log("Final ENDLIST playlist uploaded on quit");
    } catch (err) {
      console.error("Error uploading final playlist on quit:", err.message);
    }
    streamKey = null;
    app.quit();
  }
});
