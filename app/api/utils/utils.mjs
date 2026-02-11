/*

FCapture

- github@otvv
- 09/25/2024

*/

import os from "os";
import fs from "fs";
import path from "path";
import pkg from "electron";
const { screen } = pkg;
import { execSync, spawn } from "child_process";
import { __dirname, __filename } from "../../globals.mjs";

export const IS_WAYLAND = process.env.XDG_SESSION_TYPE === "wayland";
export const ROOT_FOLDER_PATH = path.resolve(__dirname, "..");

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

export const pathExists = (path) => {
  try {
    fs.accessSync(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const readText = (filePath) => {
  return fs.readFileSync(filePath, "utf8");
};

export const writeText = (filePath, stringToWrite) => {
  fs.writeFileSync(filePath, stringToWrite, "utf8");
};

export const readJson = (filePath) => {
  const raw = readText(filePath);
  return JSON.parse(raw);
};

export const commandExists = (cmd) => {
  // spawn will resolve .cmd/.exe via PATH
  return new Promise((resolve) => {
    const child = spawn(cmd, ["--version"], {
      cwd: ROOT_FOLDER_PATH,
      stdio: "ignore",
      shell: true,
    });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
};

export const rmrf = (path) => {
  fs.rmSync(path, { recursive: true, force: true });
};

export const runCmd = async (cmd, args, { silent = false } = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT_FOLDER_PATH,
      shell: true,
      stdio: silent ? "ignore" : "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} exited with code ${code}`));
      }
    });
  });
};

export const spinner = (label = "") => {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  let i = 0;

  const timer = setInterval(() => {
    const frame = frames[i++ % frames.length];
    process.stdout.write(`\r\x1b[32m[${frame}]\x1b[0m${label}`);
  }, 80);
  return () => {
    clearInterval(timer);
    process.stdout.write("\r");
  };
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
    "disable-software-rasterizer",
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

  // platform specific extra switches
  switch (process.platform) {
    case "darwin":
      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: applying additional switches for macOS.",
      );

      app.commandLine.appendSwitch("disable-frame-rate-limit");
      app.commandLine.appendSwitch("enable-unsafe-webgpu");
      app.commandLine.appendSwitch("enable-features", "Metal");

      break;
    case "linux":
      const linuxSwitches = [];

      // specific features based on display environment
      const waylandFeatures = [
        "AcceleratedVideoDecodeLinuxGL",
        "AcceleratedVideoDecodeLinuxZeroCopyGL",
        "AcceleratedVideoEncoder",
        "WaylandSessionManagement",
        "WaylandTextInputV3",
        "WaylandUiScale",
        "WaylandWindowDecorations",
      ];
      const x11Features = ["Vulkan"];

      // enable specific features if the user is using Wayland or X11
      if (IS_WAYLAND) {
        console.log(
          "[fcapture] - utils@handleHardwareAcceleration: wayland detected, enabling OpenGL with Angle",
        );

        // use angle with opengl if the user is on wayland
        linuxSwitches.push(
          ["enable-features", [...waylandFeatures, "OpenGLWithAngle"]],
          ["ozone-platform", "wayland"],
        );
      } else {
        console.log(
          "[fcapture] - utils@handleHardwareAcceleration: X11 detected, enabling OpenGL.",
        );

        // use opengl if the user is on x11
        linuxSwitches.push(["enable-features", x11Features], ["use-gl", "desktop"]);
      }

      // common video decoding switches
      linuxSwitches.push(
        [
          "enable-features",
          "VaapiVideoDecoder,VaapiVideoEncoder,VaapiVideoDecodeLinuxGL",
        ],
        ["disable-features", "UseChromeOSDirectVideoDecoder"],
      );

      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: applying additional switches for Linux.",
      );

      linuxSwitches.forEach(([flag, value]) => {
        value
          ? app.commandLine.appendSwitch(flag, value)
          : app.commandLine.appendSwitch(flag);
      });
      break;
    case "win32":
      const windowsSwitches = [
        ["enable-features", "D3D11VideoDecoder"],
        ["enable-features", "DirectCompositionVideoOverlays"],
        ["force_high_performance_gpu"],
        ["disable-frame-rate-limit"],
        ["use-angle", "gl"],
        ["use-gl", "angle"],
      ];

      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: applying additional switches for Windows.",
      );

      windowsSwitches.forEach(([flag, value]) => {
        value
          ? app.commandLine.appendSwitch(flag, value)
          : app.commandLine.appendSwitch(flag);
      });
      break;
    default:
      console.log(
        "[fcapture] - utils@handleHardwareAcceleration: unsupported platform, skipping additional switches.",
      );
      break;
  }
};
