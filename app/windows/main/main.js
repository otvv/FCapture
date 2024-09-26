/*

FCapture Preview

- github@otvv
- 09/25/2024

*/

"use strict"

const initializeStream = async () => {
  try {
    const renderer = (await import("../../api/renderer.mjs"));

    const videoPlayerElement = document.querySelector("#video-player");
    const noSignalContainerElement = document.querySelector("#no-signal-container");

    if (videoPlayerElement === null) {
      console.error("[fcapture-preview] - main@initializeStream: video player element not found.\n[fcapture-preview] - main@initializeStream: please restart the window.");
      return;
    }

    const rawStream = await renderer.setupStreamFromDevice();

    if (!rawStream) {
      // hide video player and show no signal screen
      noSignalContainerElement.style.display = "flex";
      videoPlayerElement.style.display = "none";

      console.warn("[fcapture-preview] - main@initializeStream: raw stream input not found, is your device initialized?");
      return;
    }

    // display video player and hide no signal screen
    // if device is and stream is working
    noSignalContainerElement.style.display = "none";
    videoPlayerElement.style.display = "block";

    // assign raw stream to the video player
    videoPlayerElement.srcObject = rawStream;

    // temporary stream configurations
    videoPlayerElement.volume = 1.0;
    videoPlayerElement.style.filter = "brightness(0.9) contrast(0.9)  saturate(0.9)";
  } catch (err) {
    console.error("[fcapture-preview] - main@initializeStream:", err);
  }
}


// FIXME: remove this function from here, once the app has a proper flow defined
// I can handle the stream initialization someplace else.
// unless the user defines to auto-start it using a config file 
// (will be implemented once the settings screen is finished)
// for now this will do since its just for quick testing.
initializeStream();

// temporary event handler
navigator.mediaDevices.ondevicechange = async () => {
  console.log("[fcapture-preview] - main@ondevicechange: device change detected, restarting stream..");
  await initializeStream();
};