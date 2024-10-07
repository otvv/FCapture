/*

FCapture

- github@otvv
- 09/25/2024

*/

import { app, BrowserWindow, Menu, dialog } from "electron";
import process from "process";
import path from "path";

// dirname
const __dirname = import.meta.dirname;

// setup gpu/hardware acceleration
app.commandLine.appendSwitch('enable-gpu-rasterization');

// generators
let parentWindow;
const generateParentWindow = () => {
  // setup properties
  parentWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    icon: "./assets/icons/fcapture-icon-fallback.png",
    title: "FCapture",
    darkTheme: true, // might break on some GTK3 themes if it doesnt have a proper dark variation
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // if parent (main) window fails to be initialized somehow
  // quit app and throw
  if (parentWindow === null) {
    console.error(
      "[fcapture] - electron@generateParentWindow: failed to generate window."
    );
    return; // for some reason the app triggers the next instruction
    // even when calling the quit function so for now the app will just halt
    // in case something goes wrong
  }

  // load parent window HTML structure
  parentWindow.loadFile("app/windows/main/main.html");

  // DEBUG PURPOSES ONLY
  if (process.env.ELECTRON_ENV === "development") {
    parentWindow.openDevTools();
  }
};

const generateTemplateMenu = () => {
  // dont do anything in case the user is not using macOS.
  // TODO: investigate if some of these menus can work on Windows or Linux
  if (process.platform !== "darwin") {
    return;
  }

  const dockMenuTemplate = Menu.buildFromTemplate([
    {
      label: "Refresh Stream",
      click: () => parentWindow.webContents.send("restart-stream"),
    },
    {
      label: "Close Stream",
      click: () => parentWindow.webContents.send("stop-stream"),
    },
    { type: "separator" },
    {
      label: "Mute Audio",
      click: () => parentWindow.webContents.send("mute-stream"),
    },
    {
      label: "Unmute Audio",
      click: () => parentWindow.webContents.send("unmute-stream"),
    },
    { type: "separator" },
    {
      label: "Settings",
      click: () => null,
    },
  ]);

  const menuBarTemplate = Menu.buildFromTemplate([
    {
      label: "View",
      submenu: [
        {
          label: "Refresh Stream",
          click: () => parentWindow.webContents.send("restart-stream"),
        },
        {
          label: "Close Stream",
          click: () => parentWindow.webContents.send("stop-stream"),
        },
        { type: "separator" },
        {
          label: "Settings",
          click: () => null,
        },
      ],
    },
    {
      label: "Audio",
      submenu: [
        {
          label: "Mute",
          click: () => parentWindow.webContents.send("mute-stream"),
        },
        {
          label: "Unmute",
          click: () => parentWindow.webContents.send("unmute-stream"),
        },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "togglefullscreen" },
        { type: "separator" },
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { label: "Quit FCaputure", role: "quit" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Reload Window",
          role: "reload",
        },
        {
          label: "Enable DevTools",
          role: "toggledevtools",
        },
        { type: "separator" },
        {
          label: "About",
          click: () => {
            dialog.showMessageBox({
              title: `About FCapture`,
              type: "info",
              message: `FCapture
              
              A previewer/recorder (eventually) software for generic USB capture cards`,
              detail: `version: ${app.getVersion()}\n copyright © github.com/otvv`,
            });
          },
        },
      ],
    },
  ]);

  // replace macOS's menu bar with our own
  Menu.setApplicationMenu(menuBarTemplate);

  // set dock menu (macOS only)
  app.dock.setMenu(dockMenuTemplate);
};

// app initializer
app.whenReady().then(generateParentWindow).then(generateTemplateMenu);
