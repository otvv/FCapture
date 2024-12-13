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
}

export const getCorrectPicturesFolder = () => {
  const fallbackFolder = path.join(os.homedir(), "Pictures");
  const userName = os.userInfo().username;
  
  switch (process.platform) {
    case "win32":
      try {
        // use %USERPROFILE% environment variable to get
        // the localized Pictures directory on windows
        const picturesFolder = execSync("echo %USERPROFILE%\\Pictures", { shell: "cmd.exe" })
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

  const bounds = electronWindow.getBounds();
  const currentDisplay = screen.getDisplayMatching(bounds);

  return currentDisplay;
};

export const handleHardwareAcceleration = (app) => {
  if (!app) {
    return;
  }

  const globalSwitches = [
    "ignore-gpu-blacklist",
    "enable-gpu-rasterization",
    "enable-accelerated-video-decode",
    "enable-accelerated-mjpeg-decode",
    "enable-accelerated-vpx-decode",
    "enable-accelerated-av1-decode",
    "enable-accelerated-hevc",
    "enable-native-gpu-memory-buffers",
  ];

  // apply global switches
  globalSwitches.forEach((the_switch) => {
    app.commandLine.appendSwitch(the_switch);
  });

  switch (process.platform) {
    case "darwin": // macOS
      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: setting up macOS hardware acceleration."
      );
      // no additional switches needed
      break;
    case "linux":
      app.commandLine.appendSwitch("use-gl", "desktop");
      app.commandLine.appendSwitch("enable-features", "VaapiVideoDecoder");
      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: setting up Linux hardware acceleration."
      );
      break;
    case "win32":
      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: setting up Windows hardware acceleration."
      );
      // no additional switches needed
      break;
    default:
      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: unsuported platform, disabling hardware acceleration."
      );
      app.disableHardwareAcceleration(); // disable if an unsupported OS is detected
      break;
  }
};

