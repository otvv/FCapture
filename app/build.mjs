/*

FCapture

- github@otvv
- 09/25/2024

*/

import { execSync } from "child_process";

try {
  console.log("[fcapture] - build@script: running build script..");

  if (process.platform === "win32") {
    execSync("powershell -File build/build.ps1", { stdio: "inherit" });
  } else if (process.platform === "darwin" || process.platform === "linux") {
    execSync("sudo sh build/build.sh", { stdio: "inherit" });
  } else {
    console.error(
      "[fcapture] - build@script: unsupported platform:",
      process.platform,
    );
    process.exit(1);
  }
} catch (err) {
  console.error("[fcapture] - build@script:", err);
  process.exit(1);
}
