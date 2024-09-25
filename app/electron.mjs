/*

FCapture Preview

- github@otvv
- 09/25/2024

*/

import { app, BrowserWindow, Menu, dialog } from "electron";
import tanjun from "tanjun-log";

// tanjun-log cheatsheet
//
// tanjun.print('test message', '+')
// tanjun.print('test message', '+', 'success');
// tanjun.print('test message', '+', 'fatal');
// tanjun.print('test message', '+', 'error');
// tanjun.print('test message', '+', 'warning');
// tanjun.print('test message', '+', 'info');

// disable hardware acceleration (can cause issues on some systems)
app.disableHardwareAcceleration();

// generators
const generateParentWindow = () => {
  // setup properties
  const parent = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 480,

    title: "FCapture Preview",
    darkTheme: true, // might break on some GTK3 themes if it doesnt have a proper dark variation
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // I might enable it later when the app grows to keep things
      // more safe and organized.
    },
  });

  // if parent (main) window fails to be initialized somehow
  // quit app and throw
  if (parent === null) {
    // set it to fake throw since we're going to quit the app anyways
    tanjun.crash(
      "parent window creation failed.",
      "fcapture-preview",
      "error",
      true,
      "!!!"
    );
    app.quit();
  }

  // load parent window HTML structure
  parent.loadFile("app/windows/main/main.html");

  // DEBUG PURPOSES ONLY
  if (process.env.ELECTRON_ENV === "development") {
    parent.openDevTools();
  }
};

//
// app initializer
//
app.whenReady().then(generateParentWindow).then(null); // TODO: replace "null" with the menubar/dockmenu templates later for macOS
