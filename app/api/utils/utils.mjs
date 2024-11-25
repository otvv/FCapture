/*

FCapture

- github@otvv
- 09/25/2024

*/

import os from "os";
import path from "path";
import { screen } from "electron";
import { execSync } from "child_process";

export const getCorrectPicturesFolder = () => {
  const fallbackFolder = path.join(os.homedir(), "Pictures");

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

export const getCurrentDisplayForWindow = (electronWindow) => {
  if (!electronWindow) {
    return null;
  }

  const bounds = electronWindow.getBounds();
  const currentDisplay = screen.getDisplayMatching(bounds);

  return currentDisplay;
};
