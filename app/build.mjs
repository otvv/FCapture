/*

FCapture

- github@otvv
- 09/25/2024

*/

import { execSync } from "child_process";
const platform = process.platform;

try {
  if (platform === "win32") {
    console.log("[fcapture] - build@script: building for Windows...");

    execSync("powershell -File build/build.ps1", { stdio: "inherit" });
  } else if (platform === "darwin" || platform === "linux") {
    console.log("[fbuild] - build@script: building for macOS or Linux..");

    execSync("sudo sh build/build.sh", { stdio: "inherit" });
  } else {
    console.error("[fbuild] - build@script: unsupported platform:", platform);
    process.exit(1);
  }
} catch (err) {
  console.error("[fcapture] - build@script:", err);
  process.exit(1);
}
