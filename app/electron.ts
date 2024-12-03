/*

FCapture

- github@otvv
- 09/25/2024

*/

import { app, BrowserWindow, Menu, dialog, ipcMain, BaseWindow, IpcMainEvent } from "electron";
import { loadConfigState, saveConfigState } from "./api/modules/config.ts";
import { configObjectTemplate } from "./configTemplate.ts";
import { format } from "date-fns";
import * as process from "process";
import * as path from "path";
import * as fs from "fs";
import {
  getCorrectPicturesFolder,
  getCurrentDisplayForWindow,
  handleHardwareAcceleration,
} from "./api/utils/utils.js";

const __dirname: string = import.meta.dirname;
const __filename: string = import.meta.filename;

// interfaces (TODO: move to another file)
interface IAppStructure {
  parentWindow?: BrowserWindow | undefined;
  childWindow?: BrowserWindow | undefined;
  canvasData: {
    frameRate?: number;
    [key: string]: any; // TODO: declare the correct keys and types later
  };
  deviceData: {
    [key: string]: any; // TODO: declare the correct keys and types later
  };
}

const appState: IAppStructure = {
  parentWindow: undefined,
  childWindow: undefined,
  canvasData: {},
  deviceData: {}
};

interface ICanvasInfo {
  [key: string]: any;
}

interface IDeviceInfo {
  [key: string]: any;
}

const generateParentWindow = (): void => {
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
      preload: path.join(__dirname, "preload.js"),
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

const generateChildWindow = (): BaseWindow | null => {
  if (appState.childWindow && !appState.childWindow.isDestroyed()) {
    appState.childWindow.focus();
    return appState.childWindow;
  }

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
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (appState.childWindow === null) {
    throw new Error("[fcapture] - electron@generateChildWindow: failed to generate child window.");
  }

  appState.childWindow.on("closed", () => {
    appState.childWindow = undefined; // reset ref
  });

  // load child window HTML structure
  appState.childWindow.loadFile("app/windows/settings/settings.html");

  // DEBUG PURPOSES ONLY
  // appState.childWindow.webContents.openDevTools();
  // appState.childWindow.setMenuBarVisibility(true);
  return appState.childWindow;
};

const generateTemplateMenu = (): void => {
  const menuBarTemplate = Menu.buildFromTemplate([
    {
      label: "View",
      submenu: [
        {
          label: "Refresh Stream",
          click: (): void => appState.parentWindow?.webContents.send("restart-stream"),
        },
        {
          label: "Close Stream",
          click: (): void => appState.parentWindow?.webContents.send("stop-stream"),
        },
        { type: "separator" },
        {
          label: "Settings",
          click: (): void => {
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
          click: (): void => appState.parentWindow?.webContents.send("mute-stream"),
        },
        {
          label: "Unmute",
          click: (): void => appState.parentWindow?.webContents.send("unmute-stream"),
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
          role: "toggleDevTools",
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
        click: () => appState.parentWindow?.webContents.send("restart-stream"),
      },
      {
        label: "Close Stream",
        click: () => appState.parentWindow?.webContents.send("stop-stream"),
      },
      { type: "separator" },
      {
        label: "Mute Audio",
        click: () => appState.parentWindow?.webContents.send("mute-stream"),
      },
      {
        label: "Unmute Audio",
        click: () => appState.parentWindow?.webContents.send("unmute-stream"),
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

const initializeEventHandler = async (): Promise<void> => {
  try {
    // handle hardware acceleration
    // based on platform
    handleHardwareAcceleration(app);

    // initialize app
    app.whenReady().then(generateParentWindow).then(generateTemplateMenu);

    // load config internally after app starts
    loadConfigState();

    // event listeners
    ipcMain.on("receive-canvas-info", (_event: IpcMainEvent, canvasInfo: ICanvasInfo): void => {
      if (canvasInfo) {
        appState.canvasData = canvasInfo;

        if (appState.parentWindow) {
          const currentDisplay = getCurrentDisplayForWindow(appState.parentWindow);

          if (currentDisplay) {
            appState.canvasData.frameRate = currentDisplay.displayFrequency;
          }
        }
      }
    });

    ipcMain.on("receive-device-info", (_event: IpcMainEvent, deviceInfo: IDeviceInfo): void => {
      if (deviceInfo) {
        appState.deviceData = deviceInfo;
      }
    });

    ipcMain.on("save-screenshot", async (_event: IpcMainEvent, dataUrl): Promise<void> => {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // get the system's Pictures folder
      const picturesFolder = getCorrectPicturesFolder();

      // timestamp file format name
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");

      // screenshot save folder
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
          console.warn("[fcapture] - electron@initializeEventHandler:", err);
          return;
        }

        console.log(`[fcapture] - electron@initializeEventHandler: screenshot saved @ ${filePath}`);
      });
    });

    ipcMain.on("open-settings", (_event: IpcMainEvent) => {
      generateChildWindow();

      if (appState.childWindow) {
        if (appState.childWindow.webContents.isLoading()) {
          appState.childWindow.webContents.once("did-finish-load", () => {
            // send canvas and device info payload
            // back to the settings window
            appState.childWindow?.webContents.send(
              "send-canvas-info",
              appState.canvasData,
              appState.deviceData
            );
          });
        }
      }
    });

    ipcMain.on("update-config-info", (event: IpcMainEvent, newConfigPayload): void => {
      // save
      Object.assign(configObjectTemplate, newConfigPayload);

      // save updated config payload state
      saveConfigState();

      event.reply("config-saved", configObjectTemplate);
      console.log("[fcapture] - electron@initializeEventHandler: config saved.");
    });

    ipcMain.on("request-config-info", (event: IpcMainEvent): void => {
      // load
      event.reply("config-loaded", configObjectTemplate);

      console.log("[fcapture] - electron@initializeEventHandler: config loaded.", configObjectTemplate);
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
