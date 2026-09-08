// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

// https://www.electronforge.io/config/makers/squirrel.windows#handling-startup-events
if (require("electron-squirrel-startup")) app.quit();

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // * a minimized window would slow the streaming frame timer to 1 Hz
      backgroundThrottling: false,
    },
    icon: "icons/logo_icon.png",
  });

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

const YOUTUBE_HLS_UPLOAD_URL = "https://a.upload.youtube.com/http_upload_hls";
const YOUTUBE_UPLOAD_TIMEOUT_MS = 15_000;
const YOUTUBE_UPLOAD_ATTEMPTS = 3;

// * the renderer cannot upload to YouTube itself because of CORS
ipcMain.handle("hls:upload", async (_event, streamKey, filename, arrayBuffer) => {
  const url = `${YOUTUBE_HLS_UPLOAD_URL}?cid=${encodeURIComponent(streamKey)}&copy=0&file=${encodeURIComponent(filename)}`;
  const body = Buffer.from(arrayBuffer);
  for (let attempt = 1; ; attempt++) {
    try {
      await putHlsFile(url, body, filename);
      return;
    } catch (err) {
      if (attempt === YOUTUBE_UPLOAD_ATTEMPTS) throw err;
      console.warn(`Retrying upload of ${filename} (attempt ${attempt} failed):`, err.message);
    }
  }
});

/**
 * @param {string} url
 * @param {Buffer} body
 * @param {string} filename
 */
async function putHlsFile(url, body, filename) {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body,
    signal: AbortSignal.timeout(YOUTUBE_UPLOAD_TIMEOUT_MS),
  });
  // * reading the body releases the socket back to the pool
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`YouTube upload of ${filename} failed (${response.status}): ${text}`);
  }
}
