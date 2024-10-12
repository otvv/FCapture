/*

FCapture

- github@otvv
- 09/25/2024

*/

const { contextBridge, ipcRenderer } = require("electron");

// expose a few functions to the renderer process
contextBridge.exposeInMainWorld("ipcRenderer", {
  isLoaded: () => "preload script api loaded!",
  isInDebugMode: () => process.env.ELECTRON_ENV === "development",
  on: (channel, callback) => ipcRenderer.on(channel, (_event, ..._args) => { 
    callback(..._args);
  }),
  send: (channel, data) => ipcRenderer.send(channel, data)
});
