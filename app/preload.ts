/*

FCapture

- github@otvv
- 09/25/2024

*/

import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

type IpcRendererCallback = (...args: any[]) => void;

interface IpcRendererExposed {
  on: (channel: string, callback: IpcRendererCallback) => void;
  send: (channel: string, data: any) => void;
}

// expose a few functions to the renderer process
contextBridge.exposeInMainWorld("ipcRenderer", {
  on: (channel: string, callback: IpcRendererCallback) => {
    ipcRenderer.on(channel, (_event: IpcRendererEvent, ...args: any[]) => {
      callback(...args);
    });
  },
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
} as IpcRendererExposed);
