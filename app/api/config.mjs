/*

FCapture

- github@otvv
- 09/25/2024

*/

import { app } from 'electron';
import fs from 'fs';
import path from 'path';

// set path to config file
const configPath = path.join(app.getPath('userData'), 'fcapture-config.json');

// default config object template
export let configObjectTemplate = {
    debugOverlay: false,
    surroundAudio: false,
    bassBoost: false
};

export const saveConfigState = () => {
  try {
    // parse object to file
    fs.writeFileSync(configPath, JSON.stringify(configObjectTemplate));
  } catch (err) {
    console.error("[fcapture] - config@saveConfigState:", err);
  }
};

export const loadConfigState = () => {
  try {
    // check if config exists
    if (fs.existsSync(configPath)) {
      // read file from path
      const configPayload = fs.readFileSync(configPath);

      // replace the original config object 
      // with data parsed from the config file
      configObjectTemplate = JSON.parse(configPayload);
    } else {
      console.error("[fcapture] - config@loadConfigState: the config file was not found.");

      // TODO: implement logic to create an empty config in case a file doesnt not exists
    }
  } catch (err) {
    console.error("[fcapture] - config@loadConfigState:", err);
  }
};
