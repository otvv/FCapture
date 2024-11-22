/*

FCapture

- github@otvv
- 09/25/2024

*/

// default config object template
// TODO: turn this into a json file?
export let configObjectTemplate = {
  videoMode: "",
  imageRenderingPriority: "auto",
  imageBrightness: 100, // percentage (from 0% to 200%)
  imageContrast: 100, // percentage (from 0% to 200%)
  imageSaturation: 100, // percentage (from 100% to 200%)
  debugOverlay: false,
  //
  audioMode: "",
  surroundAudio: false,
  bassBoost: false
};