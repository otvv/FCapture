/*

FCapture

- github@otvv
- 09/25/2024

*/

export let configObjectTemplate = {
  renderingMethod: 0, // rendering method value (0 = direct-draw, 1 = webgl)
  videoMode: "720p30", // video quality (mode) key value
  imageBrightness: 100, // image brightness percentage (ranges from 0-200%)
  imageContrast: 100, // image contrast percentage (ranges from 0-200%)
  imageSaturation: 100, // image saturation percentage (ranges from 0-200%)
  autoHideCursor: true, // automatically hides the cursor if a stream is active/focused
  debugOverlay: false, // debug overlay switch

  //
  audioMode: "normalQuality", // audio quality (mode) key value
  surroundAudio: false, // surround audio effect switch
  bassBoost: false, // bass boost effect switch
};
