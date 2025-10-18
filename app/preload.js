/*

FCapture

- github@otvv
- 09/25/2024

*/

const { contextBridge, ipcRenderer } = require("electron");

// expose a few functions to the renderer process
contextBridge.exposeInMainWorld("ipcRenderer", {
  on: (channel, callback) =>
    ipcRenderer.on(channel, (_event, ..._args) => {
      callback(..._args);
    }),
  once: (channel, callback) =>
    ipcRenderer.once(channel, (_event, ..._args) => {
      callback(..._args);
    }),
  send: (channel, data) => ipcRenderer.send(channel, data),
});
