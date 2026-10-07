const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * @param {string} streamKey
   * @param {string} filename
   * @param {ArrayBuffer} buffer
   * @returns {Promise<void>}
   */
  uploadHlsFile: (streamKey, filename, buffer) =>
    ipcRenderer.invoke("hls:upload", streamKey, filename, buffer),
  /** @param {Record<string, unknown>} status */
  reportCareStatus: (status) => ipcRenderer.send("care:status", status),
});
