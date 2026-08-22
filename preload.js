const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("watermarkApi", {
  pathForFile: (file) => webUtils.getPathForFile(file),
  openMedia: (kind) => ipcRenderer.invoke("dialog:openMedia", kind),
  fromPath: (filePath) => ipcRenderer.invoke("media:fromPath", filePath),
  joinPath: (...parts) => ipcRenderer.invoke("path:join", parts),
  downloadsDir: () => ipcRenderer.invoke("path:downloadsDir"),
  uniqueDownloadPath: (fileName) => ipcRenderer.invoke("path:uniqueDownload", fileName),
  readFile: (filePath) => ipcRenderer.invoke("file:read", filePath),
  saveToDownloads: (fileName, bytes) => ipcRenderer.invoke("file:saveToDownloads", { fileName, bytes }),
  writeBuffer: (filePath, data) => ipcRenderer.invoke("file:writeBuffer", { filePath, data }),
  showItem: (filePath) => ipcRenderer.invoke("shell:showItem", filePath),
  probeVideo: (filePath) => ipcRenderer.invoke("video:probe", filePath),
  exportVideo: (options) => ipcRenderer.invoke("video:export", options),
  onVideoProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("video:progress", listener);
    return () => ipcRenderer.removeListener("video:progress", listener);
  },
});
