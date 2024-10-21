/*

FCapture

- github@otvv
- 09/25/2024

*/

import { app, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import process from "process";
import path from "path";

// dirname
const __dirname = import.meta.dirname;

const appState = {
  parentWindow: null,
  childWindow: null,
  canvasData: {}
};

// setup gpu/hardware acceleration
app.commandLine.appendSwitch("enable-gpu-rasterization");

const generateParentWindow = () => {
  // setup properties
  appState.parentWindow = new BrowserWindow({
    title: "FCapture",
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets/icons/fcapture-512x512.png"),
    darkTheme: true, // might break on some GTK3 themes if it doesnt have a proper dark variation
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (appState.parentWindow === null) {
    throw new Error(
      "[fcapture] - electron@generateParentWindow: failed to generate window."
    );
  }

  // load parent window HTML structure
  appState.parentWindow.loadFile("app/windows/main/main.html");

  // DEBUG PURPOSES ONLY
  if (process.env.ELECTRON_ENV === "development") {
    appState.parentWindow.openDevTools();
    appState.parentWindow.setMenuBarVisibility(true);
  }
};

const generateChildWindow = () => {
  if (appState.childWindow && !appState.childWindow.isDestroyed()) {
    appState.childWindow.focus();
    return appState.childWindow;
  }

  // setup properties
  appState.childWindow = new BrowserWindow({
    title: "Settings",
    parent: appState.parentWindow,
    modal: true,
    show: true,
    width: 640,
    height: 480,
    darkTheme: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets/icons/fcapture-512x512.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (appState.childWindow === null) {
    throw new Error(
      "[fcapture] - electron@generateChildWindow: failed to generate child window."
    );
  }

  appState.childWindow.on("closed", () => {
    appState.childWindow = null;  // reset ref
  });

  // load child window HTML structure
  appState.childWindow.loadFile("app/windows/settings/settings.html");
  
  // DEBUG PURPOSES ONLY
  if (process.env.ELECTRON_ENV === "development") {
    appState.childWindow.webContents.openDevTools();
    appState.childWindow.setMenuBarVisibility(true);
  }
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
            ipcMain.emit("open-settings", appState.canvasData);
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
              
              A previewer/recorder (eventually) software for generic USB capture cards`,
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
          ipcMain.emit("open-settings", appState.canvasData);
        },
      },
    ]);

    app.dock.setMenu(dockMenuTemplate);
  }
};

const initializeEventHandler = async () => {
  try {
    // initialize app
    app.whenReady().then(generateParentWindow).then(generateTemplateMenu);

    // event listeners
    ipcMain.on("receive-canvas-info", (_event, canvasInfo) => {
      if (canvasInfo) {
        appState.canvasData = canvasInfo;
      }
    });

    ipcMain.on("open-settings", (_event) => {
      generateChildWindow();

      if (appState.childWindow) {
        if (appState.childWindow.webContents.isLoading()) {
          appState.childWindow.webContents.once("did-finish-load", () => {
            // send canvas info payload back to the settings window
            appState.childWindow.webContents.send("send-canvas-info", appState.canvasData);
          });
        }
      }
    });

  } catch (err) {
    console.error("[fcapture] - electron@initializeEventHandler:", err);
  }
};

// initialize event handler
initializeEventHandler()
  .then(() => {
    console.log(
      "[fcapture] - electron@initializeEventHandlerPromise: event handler initialized."
    );
  })
  .catch((err) => {
    console.error("[fcapture] - electron@initializeEventHandlerPromise:", err);
  });
