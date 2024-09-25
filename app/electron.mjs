/*

FCapture Preview

- github@otvv
- 09/25/2024

*/

import { app, BrowserWindow, Menu, dialog } from "electron";

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
    console.error("[fcapture-preview] - electron@generateParentWindow: failed to generate window.");
    return; // for some reason the app triggers the next instruction 
            // even when calling the quit function so for now the app will just halt
            // in case something goes wrong
  }

  // load parent window HTML structure
  parent.loadFile("app/windows/main/main.html");

  // DEBUG PURPOSES ONLY
  if (process.env.ELECTRON_ENV === "development") {
    parent.openDevTools();
  }
};

// app initializer
app.whenReady().then(generateParentWindow).then(null); // TODO: replace "null" with the menubar/dockmenu templates later for macOS
