/*

FCapture

- github@otvv
- 09/25/2024

*/

import { execSync } from "child_process";

try {
  if (process.platform === "win32") {
    console.log("[fcapture] - build@script: building for Windows...");

    execSync("powershell -File build/build.ps1", { stdio: "inherit" });
  } else if (process.platform === "darwin" || process.platform === "linux") {
    console.log("[fcapture] - build@script: building for macOS or Linux..");

    execSync("sudo sh build/build.sh", { stdio: "inherit" });
  } else {
    console.error("[fcapture] - build@script: unsupported platform:", process.platform);
    process.exit(1);
  }
} catch (err) {
  console.error("[fcapture] - build@script:", err);
  process.exit(1);
}
