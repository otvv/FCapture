/*

FCapture

- github@otvv
- 09/25/2024

*/

export {};

declare global {
  interface Window {
    ipcRenderer: {
      on(channel: string, callback: (...args: any[]) => void): void;
      send(channel: string, data?: any): void;
    };
  }
}
