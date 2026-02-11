/*

FCapture

- github@otvv
- 09/25/2024

*/

import path from "path";
import * as utils from "./api/utils/utils.mjs";

// constants
const DIST_FOLDER_PATH = path.join(utils.ROOT_FOLDER_PATH, "dist");
const PACKAGE_JSON_FILE = path.join(utils.ROOT_FOLDER_PATH, "package.json");
const VERSION_CONTROL_FILE = path.join(utils.ROOT_FOLDER_PATH, ".last_build_version");
const APP_PATH_MAC = path.join(utils.ROOT_FOLDER_PATH, "dist", "mac", "FCapture.app");

(async () => {
  // ensure package.json exists and its dependencies are present
  if (!utils.pathExists(PACKAGE_JSON_FILE)) {
    console.error("[fbuild] - package.json not found. please check the project files.");
  }

  if (!utils.pathExists(path.join(utils.ROOT_FOLDER_PATH, "node_modules"))) {
    console.error("[fbuild] - node_modules not found. run 'npm install' first.");
  }

  // check npx availability
  const hasNpx = await utils.commandExists("npx");
  if (!hasNpx) {
    console.error("[fbuild] - npx could not be found. please, reinstall node.js (npm).");
  }

  // read package.json file to extract the app version
  const pkg = utils.readJson(PACKAGE_JSON_FILE);
  const CURRENT_VERSION = String(pkg.version ?? "").trim();
  if (!CURRENT_VERSION) {
    console.error("[fbuild] - package.json has no valid version field.");
  }

  let LAST_VERSION = "N/A"; // if no version is defined in file

  // handle app versioning control
  if (utils.pathExists(VERSION_CONTROL_FILE)) {
    const version = utils.readText(VERSION_CONTROL_FILE).trim();
    LAST_VERSION = version ? version : "N/A";
  }

  // perform build cleanup in case the app version changed
  if (CURRENT_VERSION !== LAST_VERSION || LAST_VERSION === "N/A") {
    console.log(
      `[fbuild] - app version changed from ${LAST_VERSION} to ${CURRENT_VERSION}.`,
    );

    if (utils.pathExists(DIST_FOLDER_PATH)) {
      console.log("[fbuild] - deleting dist folder...");
      utils.rmrf(DIST_FOLDER_PATH);
    }

    utils.writeText(VERSION_CONTROL_FILE, `${CURRENT_VERSION}\n`);
  } else {
    console.log(
      "[fbuild] - app version has not been changed, skipping dist folder deletion.",
    );
  }

  console.log("[fbuild] - running electron-builder..");
  const stop = utils.spinner("");

  // build app
  try {
    await utils.runCmd("npx", ["electron-builder"], { silent: true });
    stop();
    console.log("[fbuild] - app built successfully.");
  } catch (err) {
    stop();
    console.error("[fbuild] - electron-builder failed.", err.message);
  }

  // macOS ad-hoc signing
  if (process.platform === "darwin") {
    if (utils.pathExists(APP_PATH_MAC)) {
      console.log(`[fbuild] - app found @ ${APP_PATH_MAC}`);
      console.log("[fbuild] - ad-hoc signing the app...");
      try {
        await runCmd(
          "codesign",
          ["--deep", "--force", "--verify", "--verbose", "--sign", "-", APP_PATH_MAC],
          {
            silent: false,
          },
        );
        console.log("[fbuild] - app signed successfully.");
      } catch (err) {
        console.warn("[fbuild] - signing failed, please try again.", err.message);
      }
    } else {
      console.error(
        "[fbuild] - app not found. please check if the build process succeeded.",
      );
    }
  } else {
    console.log("[fbuild] - not on macOS (Darwin), skipping app signing.");
  }
})();
