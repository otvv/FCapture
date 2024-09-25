/*

FCapture Preview

- github@otvv
- 09/25/2024

*/

"use strict"

const initializeStream = async () => {
  try {
    const renderer = (await import("../../api/renderer.mjs"));

    if (renderer === null) {
      console.warn("[fcapture-preview] - failed to import renderer module.");
    }

    const videoPlayer = document.querySelector("#video-player");

    if (videoPlayer === null) {
      console.error("[fcapture-preview] - player element not found.\n[fcapture-preview] - please refresh the window.");
      return;
    }

    const rawStream = await renderer.setupStreamFromDevice();

    if (rawStream === undefined) {
      console.warn("[fcapture-preview] - raw stream input is undefined.");
    }

    // assign raw stream to the video player
    videoPlayer.srcObject = rawStream;

    // configurations
    videoPlayer.volume = 1.0;
    videoPlayer.style.filter = "brightness(1.0) contrast(0.8)  saturate(1.0)";
  } catch (err) {
    console.error("[fcapture-preview] - something went wrong:", err);
  }
}

// FIXME: remove this function from here, once the app has a proper flow defined
// I can handle the stream initialization someplace else.
// unless the user defines to auto-start it using a config file 
// (will be implemented once the settings screen is finished)
// for now this will do since its just for quick testing.
initializeStream();
