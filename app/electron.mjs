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

// globals
let parentWindow = null;
let childWindow = null;
let canvasData = {};

// setup gpu/hardware acceleration
app.commandLine.appendSwitch("enable-gpu-rasterization");

const generateParentWindow = () => {
  // setup properties
  parentWindow = new BrowserWindow({
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

  if (parentWindow === null) {
    throw new Error(
      "[fcapture] - electron@generateParentWindow: failed to generate window."
    );
  }

  // load parent window HTML structure
  parentWindow.loadFile("app/windows/main/main.html");

  // DEBUG PURPOSES ONLY
  if (process.env.ELECTRON_ENV === "development") {
    parentWindow.openDevTools();
    parentWindow.setMenuBarVisibility(true);
  }
};

const generateChildWindow = () => {
  if (childWindow && !childWindow.isDestroyed()) {
    childWindow.focus();
    return childWindow;
  }

  // setup properties
  childWindow = new BrowserWindow({
    title: "Settings",
    parent: parentWindow,
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

  if (childWindow === null) {
    throw new Error(
      "[fcapture] - electron@generateChildWindow: failed to generate child window."
    );
  }

  childWindow.on("closed", () => {
    childWindow = null;  // reset ref
  });

  // load child window HTML structure
  childWindow.loadFile("app/windows/settings/settings.html");
  
  // DEBUG PURPOSES ONLY
  if (process.env.ELECTRON_ENV === "development") {
    childWindow.webContents.openDevTools();
    childWindow.setMenuBarVisibility(true);
  }
};

const generateTemplateMenu = () => {

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
          click: () => {
            ipcMain.emit("open-settings", canvasData);
          },
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

  // replace app menu bar with our own
  Menu.setApplicationMenu(menuBarTemplate);

  // set dock menu (macOS only)
  if (process.platform === "darwin") {
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
        click: () => {
          ipcMain.emit("open-settings", canvasData);
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
        canvasData = canvasInfo;
      }
    });

    ipcMain.on("open-settings", (_event) => {
      generateChildWindow();

      if (childWindow) {
        if (childWindow.webContents.isLoading()) {
          childWindow.webContents.once("did-finish-load", () => {
            // send canvas info payload back to the settings window
            childWindow.webContents.send("send-canvas-info", canvasData);
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
