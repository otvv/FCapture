/*

FCapture

- github@otvv
- 09/25/2024

*/

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { configObjectTemplate } from '../../configTemplate.mjs';

// set path for config file
const configPath = path.join(app.getPath('userData'), 'fcapture-config.json');
export const saveConfigState = () => {
  try {
    // parse object to file
    fs.writeFileSync(configPath, JSON.stringify(configObjectTemplate));
    console.log("[fcapture] - config@saveConfigState: config saved.");
  } catch (err) {
    console.error("[fcapture] - config@saveConfigState:", err);
  }
};

export const loadConfigState = () => {
  try {
    // check if config file exists
    if (fs.existsSync(configPath)) {
      // read file from path
      const configPayload = fs.readFileSync(configPath);

      // replace the original config object 
      // with data parsed from the config file
      Object.assign(configObjectTemplate, JSON.parse(configPayload));
      console.log("[fcapture] - config@loadConfigState: config loaded.");
    } else {
      console.warn("[fcapture] - config@loadConfigState: config file not found.");
      
      // create config file in case it doesnt exist
      console.log("[fcapture] - config@loadConfigState: creating a new config file...");
      saveConfigState();
    }
  } catch (err) {
    console.error("[fcapture] - config@loadConfigState:", err);
  }
};

export const resetConfigState = () => {
  try {
    fs.unlinkSync(configPath);
    console.log("[fcapture] - config@resetConfigState: config reset.");
  } catch (e) {
    console.error("[fcapture] - config@resetConfigState:", err);
  }
}
