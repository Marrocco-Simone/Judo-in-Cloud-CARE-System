const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  startStream: (streamKey) => ipcRenderer.invoke("stream:start", streamKey),
  stopStream: () => ipcRenderer.invoke("stream:stop"),
  sendStreamData: (arrayBuffer, segmentNumber, durationSec) =>
    ipcRenderer.invoke("stream:data", arrayBuffer, segmentNumber, durationSec),
  onStreamStatus: (callback) => {
    ipcRenderer.on("stream:status", (_event, status) => callback(status));
  },
});
