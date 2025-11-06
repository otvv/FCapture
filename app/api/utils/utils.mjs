/*

FCapture

- github@otvv
- 09/25/2024

*/

import os from "os";
import path from "path";
import { screen } from "electron";
import { execSync } from "child_process";
export const focusWindow = (targetWindow) => {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return null;
  }

  // focus window and return target
  targetWindow.focus();
  return targetWindow;
};

export const getCorrectPicturesFolder = () => {
  const fallbackFolder = path.join(os.homedir(), "Pictures");
  const userName = os.userInfo().username;

  switch (process.platform) {
    case "win32":
      try {
        // use %USERPROFILE% environment variable to get
        // the localized Pictures directory on windows
        const picturesFolder = execSync("echo %USERPROFILE%\\Pictures", {
          shell: "cmd.exe",
        })
          .toString()
          .trim();

        return picturesFolder;
      } catch (err) {
        return fallbackFolder;
      }
    case "linux":
      try {
        // lets try to get the correct folder name
        // using xdg-user-dir on linux
        const picturesFolder = execSync("xdg-user-dir PICTURES").toString().trim();

        return picturesFolder;
      } catch {
        console.warn(`[fcapture] - utils@getCorrectPicturesFolder: error trying to find the user's localized Pictures folder.
          [fcapture] - utils@getCorrectPicturesFolder: fallbacking to default Pictures folder location. (/${userName}/Pictures)`);

        return fallbackFolder;
      }
    case "darwin":
      // on macOS is it typically always in
      // ~/Pictures regardless of localization
      return fallbackFolder;
    default:
      return fallbackFolder;
  }
};

export const getCurrentDisplayOfWindow = (electronWindow) => {
  if (!electronWindow) {
    return null;
  }

  const currentDisplay = screen.getPrimaryDisplay();

  if (!currentDisplay) {
    return null;
  }

  return currentDisplay;
};

export const handleHardwareAcceleration = (app) => {
  if (!app) {
    return;
  }

  const globalSwitches = [
    // "disable-gpu-vsync", // doesn't work properly with Double-Draw
    // "disable-frame-rate-limit", // this can cause massive frame-dips on Linux (GNOME)
    "video-capture-use-gpu-memory-buffer",
    "force_high_performance_gpu",
    "disable-renderer-backgrounding",
    "enable-accelerated-2d-canvas",
    "enable-exclusive-audio",
    "enable-gpu-rasterization",
    "enable-native-gpu-memory-buffers",
    "enable-gpu-memory-buffer-video-frames",
    "enable-gpu-memory-buffer-compositor-resources",
    "enable-zero-copy",

    // testing

    "disable-low-res-tiling",
    "enable-raw-draw",
    "enable-hardware-overlays",
    "enable-threaded-compositing",
    "ignore-gpu-blocklist",
    "enable-oop-rasterization",
    "enable-unsafe-webgpu",
  ];

  // disable hw acceleration if an unsupported OS is detected
  if (
    process.platform !== "darwin" &&
    process.platform !== "linux" &&
    process.platform !== "win32"
  ) {
    app.disableHardwareAcceleration();
  } else {
    // apply hardware acceleration related switches
    console.log(
      "[fcapture] - utils@handleHardwareAcceleration: setting up hardware acceleration related switches.",
    );

    globalSwitches.forEach((parameter) => {
      app.commandLine.appendSwitch(parameter);
    });
  }

  // platform specific switches
  switch (process.platform) {
    case "darwin":
      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: applying additional switches for macOS.",
      );
      break;
    case "linux":
      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: applying additional switches for Linux.",
      );
      break;
    case "win32":
      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: applying additional switches for Windows.",
      );
      break;
    default:
      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: unsuported platform, skipping additional switches.",
      );
      break;
  }
};
