/*

FCapture Preview

- github@otvv
- 09/25/2024

*/

"use strict";

const initializeStream = async () => {
  try {
    const renderer = await import("../../api/renderer.mjs");

    const videoPlayerElement = document.querySelector("#video-player");
    const noSignalContainerElement = document.querySelector(
      "#no-signal-container"
    );

    if (videoPlayerElement === null) {
      console.error(
        "[fcapture-preview] - main@initializeStream: video player element not found.\n[fcapture-preview] - main@initializeStream: please restart the window."
      );
      return;
    }

    const rawStream = await renderer.setupStreamFromDevice();

    if (!rawStream) {
      // hide video player and show no signal screen
      videoPlayerElement.style.display = "none";
      noSignalContainerElement.style.display = "flex";

      console.warn(
        "[fcapture-preview] - main@initializeStream: raw stream input not found, is your device initialized?"
      );
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
    videoPlayerElement.style.filter =
      "brightness(0.9) contrast(0.9)  saturate(0.9)";
  } catch (err) {
    console.error("[fcapture-preview] - main@initializeStream:", err);
  }
};

// NOTE: for now, all "windows" will have their own event handler initializer
// the plan is to have a global event handler that can listen to events from all around the app
// but since node.js is very picky with imports and JavaScript doesnt really support "pointers"
// I cant really do it without using a global variable 
// (which is kind of a bad practice and should be avoided at all costs!)
const initializeMainEventHandler = async () => {
  try {
    const events = await import("../../api/eventHandler.mjs");

    // initialize this event handler instance
    const eventHandler = new events.fEventHandler();

    if (eventHandler === null) {
      console.warn(
        "[fcapture-preview] - main@initializeMainEventHandler: eventHandler is null."
      );

      return;
    }

    // event listeners
    // NOTE: these two listeneres will likely stay on this file/function
    eventHandler.on("start-stream", async () => await initializeStream());
    navigator.mediaDevices.ondevicechange = async () => await initializeStream();

    // event emitters
    // NOTE: this will likely be in other files as well, such as the settings menu
    // or any other window that might need to trigger a start stream event
    eventHandler.send("start-stream");
  } catch (err) {
    console.error("[fcapture-preview] - main@initializeMainEventHandler:", err);
  }
};

// initialize event handler
initializeMainEventHandler().then(() => {
  console.log("[fcapture-preview] - main@initializeMainEventHandlerPromise: eventHandler is initialized successfully!");
}).catch((err) => {
  console.error("[fcapture-preview] - main@initializeMainEventHandlerPromise:", err);
});
