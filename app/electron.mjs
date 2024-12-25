/*

FCapture

- github@otvv
- 09/25/2024

*/

import fs from "fs";
import path from "path";
import process from "process";
import { format } from "date-fns";
import * as globals from "./globals.mjs";
import * as utils from "./api/utils/utils.mjs";
import { configObjectTemplate } from "./configTemplate.mjs";
import { app, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import { loadConfigState, saveConfigState } from "./api/modules/config.mjs";

const appState = {
  parentWindow: null,
  childWindow: null,
  canvasData: {},
  deviceData: {}
};

const generateParentWindow = () => {
  // setup properties
  appState.parentWindow = new BrowserWindow({
    title: "FCapture",
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    autoHideMenuBar: true,
    darkTheme: true, // might break on some GTK themes if it doesnt have a proper dark variation
    webPreferences: {
      preload: path.join(globals.__dirname, "preload.js"),
    },
  });

  if (appState.parentWindow === null) {
    throw new Error("[fcapture] - electron@generateParentWindow: failed to generate window.");
  }

  // load parent window HTML structure
  appState.parentWindow.loadFile("app/windows/main/main.html");

  // DEBUG PURPOSES ONLY
  // appState.parentWindow.openDevTools();
  // appState.parentWindow.setMenuBarVisibility(true);
};

const generateChildWindow = () => {
  // always focus window when opening
  utils.focusWindow(appState.childWindow);

  // setup properties
  appState.childWindow = new BrowserWindow({
    title: "Settings",
    parent: appState.parentWindow,
    width: 640,
    height: 480,
    show: true,
    darkTheme: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    modal: process.platform === "win32" || process.platform === "linux",
    webPreferences: {
      preload: path.join(globals.__dirname, "preload.js"),
    },
  });

  if (appState.childWindow === null) {
    throw new Error("[fcapture] - electron@generateChildWindow: failed to generate child window.");
  }

  appState.childWindow.on("closed", () => {
    appState.childWindow = null; // reset ref
  });

  // load child window HTML structure
  appState.childWindow.loadFile("app/windows/settings/settings.html");

  // DEBUG PURPOSES ONLY
  // appState.childWindow.webContents.openDevTools();
  // appState.childWindow.setMenuBarVisibility(true);
};

const generateTemplateMenu = () => {
  const menuBarTemplate = Menu.buildFromTemplate([
    {
      label: "View",
      submenu: [
        {
          label: "Refresh Stream",
          click: () => appState.parentWindow.webContents.send("restart-stream"),
        },
        {
          label: "Close Stream",
          click: () => appState.parentWindow.webContents.send("stop-stream"),
        },
        { type: "separator" },
        {
          label: "Settings",
          click: () => {
            ipcMain.emit("open-settings", appState.canvasData, appState.deviceData);
          },
        },
      ],
    },
    {
      label: "Audio",
      submenu: [
        {
          label: "Mute",
          click: () => appState.parentWindow.webContents.send("mute-stream"),
        },
        {
          label: "Unmute",
          click: () => appState.parentWindow.webContents.send("unmute-stream"),
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
              
              A previewer and recorder (eventually) software for generic USB capture cards`,
              detail: `version: ${app.getVersion()}\n copyright © github.com/otvv`,
            });
          },
        },
      ],
    },
  ]);

  // replace app menu bar with our own
  Menu.setApplicationMenu(menuBarTemplate);

  // set dock menu (macOS only)
  if (process.platform === "darwin") {
    const dockMenuTemplate = Menu.buildFromTemplate([
      {
        label: "Refresh Stream",
        click: () => appState.parentWindow.webContents.send("restart-stream"),
      },
      {
        label: "Close Stream",
        click: () => appState.parentWindow.webContents.send("stop-stream"),
      },
      { type: "separator" },
      {
        label: "Mute Audio",
        click: () => appState.parentWindow.webContents.send("mute-stream"),
      },
      {
        label: "Unmute Audio",
        click: () => appState.parentWindow.webContents.send("unmute-stream"),
      },
      { type: "separator" },
      {
        label: "Settings",
        click: () => {
          ipcMain.emit("open-settings", appState.canvasData, appState.deviceData);
        },
      },
    ]);

    app.dock.setMenu(dockMenuTemplate);
  }
};

const initializeEventHandler = async () => {
  try {
    // handle hardware acceleration
    // based on platform
    utils.handleHardwareAcceleration(app);

    // initialize app
    app.whenReady().then(generateParentWindow).then(generateTemplateMenu);

    // load config internally after app starts
    loadConfigState();

    // event listeners
    ipcMain.on("receive-canvas-info", (_event, canvasInfo) => {
      if (canvasInfo) {
        appState.canvasData = canvasInfo;
        appState.canvasData.frameRate = utils.getCurrentDisplayOfWindow(
          appState.parentWindow
        ).displayFrequency;
      }
    });

    ipcMain.on("receive-device-info", (_event, deviceInfo) => {
      if (deviceInfo) {
        appState.deviceData = deviceInfo;
      }
    });

    ipcMain.on("save-screenshot", (_event, dataUrl) => {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const picturesFolder = utils.getCorrectPicturesFolder();
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const saveFolder = path.join(picturesFolder, "FCapture");

      // create a folder for FCapture screenshots if it doesn't exist
      if (!fs.existsSync(saveFolder)) {
        fs.mkdirSync(saveFolder, { recursive: true });
      }

      // generate filepath with timestamp
      const filePath = path.join(saveFolder, `screenshot_${timestamp}.png`);

      // write file to specified path
      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          console.warn("[fcapture] - electron@initializeEventHandler: failed to save screenshot.", err);
          return;
        }

        console.log(`[fcapture] - electron@initializeEventHandler: screenshot saved @ ${filePath}`);
      });
    });

    ipcMain.on("open-settings", (_event) => {
      generateChildWindow();

      if (appState.childWindow) {
        if (appState.childWindow.webContents.isLoading()) {
          appState.childWindow.webContents.once("did-finish-load", () => {
            // send canvas and device info payload
            // back to the settings window
            appState.childWindow.webContents.send(
              "send-canvas-info",
              appState.canvasData,
              appState.deviceData
            );
          });
        }
      }
    });

    ipcMain.on("update-config-info", (event, newConfigPayload) => {
      // replace config template with the updated config payload
      Object.assign(configObjectTemplate, newConfigPayload);

      // save updated config payload to file
      // and send reply to renderer
      saveConfigState();
      event.reply("config-saved", configObjectTemplate);
    });

    ipcMain.on("request-config-info", (event) => {
      // load config payload from file
      // and send reply to renderer
      event.reply("config-loaded", configObjectTemplate);
    });
  } catch (err) {
    console.error("[fcapture] - electron@initializeEventHandler:", err);
  }
};

// initialize event handler
initializeEventHandler()
  .then(() => {
    console.log("[fcapture] - electron@initializeEventHandlerPromise: event handler initialized. ");
  })
  .catch((err) => {
    console.error("[fcapture] - electron@initializeEventHandlerPromise:", err);
  });
