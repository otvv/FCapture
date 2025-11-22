/*

FCapture

- github@otvv
- 09/25/2024

*/

import os from "os";
import path from "path";
import { screen } from "electron";
import { execSync } from "child_process";

const IS_WAYLAND = process.env.XDG_SESSION_TYPE === "wayland";

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
    "enable-webgl",
    "ignore-gpu-blacklist",
    "disable-gpu-vsync", // doesn't work properly with Double-Draw
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
    "enable-hardware-overlays",
    "enable-oop-rasterization",
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
      app.commandLine.appendSwitch("enable-features", "Metal");
      break;
    case "linux":
      const linuxSwitches = [
        [
          "enable-features",
          "VaapiVideoDecoder,VaapiVideoEncoder,VaapiVideoDecodeLinuxGL",
        ],
        ["disable-features", "UseChromeOSDirectVideoDecoder"],
      ];

      // enable specific features if the user is using Wayland or X11
      if (IS_WAYLAND) {
        console.log(
          "[fcapture] - utils@handleHardwareAcceleration: wayland detected, enabling OpenGL with Angle",
        );

        // use angle with opengl if the user is on wayland
        linuxSwitches.push(
          ["enable-features", "UseOzonePlatform"],
          ["ozone-platform", "wayland"],
          ["use-angle", "gl"],
          ["use-gl", "angle"],
        );
      } else {
        console.log(
          "[fcapture] - utils@handleHardwareAcceleration: X11 detected, enabling OpenGL.",
        );

        // use opengl if the user is on x11
        linuxSwitches.push(["enable-features", "Vulkan"], ["use-gl", "desktop"]);
      }

      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: applying additional switches for Linux.",
      );

      linuxSwitches.forEach(([flag, value]) => {
        if (value) {
          app.commandLine.appendSwitch(flag, value);
        } else {
          app.commandLine.appendSwitch(flag);
        }
      });
      break;
    case "win32":
      const windowsSwitches = [
        ["enable-features", "D3D11VideoDecoder"],
        ["enable-features", "DirectCompositionVideoOverlays"],
        ["force_high_performance_gpu"],
        ["use-angle", "gl"],
        ["use-gl", "angle"],
      ];

      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: applying additional switches for Windows.",
      );

      windowsSwitches.forEach(([flag, value]) => {
        if (value) {
          app.commandLine.appendSwitch(flag, value);
        } else {
          app.commandLine.appendSwitch(flag);
        }
      });
      break;
    default:
      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: unsupported platform, skipping additional switches.",
      );
      break;
  }
};
