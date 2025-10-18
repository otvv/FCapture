/*

FCapture

- github@otvv
- 09/25/2024

*/

export let configObjectTemplate = {
  renderingMethod: 0, // 0 = ImageBitmap, 1 = drawImage (double-draw)
  videoMode: "720p30", // video "mode" (quality) enum key
  imageRenderingPriority: "auto",
  imageBrightness: 100, // percentage (ranges from 0% to 200%)
  imageContrast: 100, // percentage (ranges from 0% to 200%)
  imageSaturation: 100, // percentage (ranges from 100% to 200%)
  debugOverlay: false,
  //
  audioMode: "normalQuality", // audio mode object key name
  surroundAudio: false,
  bassBoost: false,
};
