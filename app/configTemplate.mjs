/*

FCapture

- github@otvv
- 09/25/2024

*/

export let configObjectTemplate = {
  renderingMethod: 0, // 0 = ImageBitmap, 1 = drawImage (double-draw)
  videoMode: "",
  imageRenderingPriority: "auto",
  imageBrightness: 100, // percentage (ranges from 0% to 200%)
  imageContrast: 100, // percentage (ranges from 0% to 200%)
  imageSaturation: 100, // percentage (ranges from 100% to 200%)
  debugOverlay: false,
  //
  audioMode: "",
  surroundAudio: false,
  bassBoost: false
};
