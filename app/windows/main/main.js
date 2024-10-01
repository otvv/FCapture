/*

FCapture Preview

- github@otvv
- 09/25/2024

*/

"use strict";

const handleStreamAction = async (action = "start") => {
  try {
    const videoPlayerElement = document.querySelector("#video-player");
    const noSignalContainerElement = document.querySelector(
      "#no-signal-container"
    );

    if (videoPlayerElement === null) {
      console.error(
        `[fcapture-preview] - main@handleStreamAction: video player element not found.
         [fcapture-preview] - main@handleStreamAction: please restart the window.`
      );
      return;
    }

    const renderer = await import("../../api/renderer.mjs");
    const rawStreamData = await renderer.setupStreamFromDevice();

    switch (action) {
      case "start":
        // in case the user starts the app without any device connected
        if (!rawStreamData) {
          // hide video player and show no signal screen
          videoPlayerElement.style.display = "none";
          noSignalContainerElement.style.display = "flex";

          console.warn(
            "[fcapture-preview] - main@handleStreamAction: raw stream input not found, is your device initialized?"
          );
          return;
        }

        // display video player and hide no signal screen
        // if device is and stream is working
        noSignalContainerElement.style.display = "none";
        videoPlayerElement.style.display = "block";

        // assign raw stream to the video player
        videoPlayerElement.srcObject = rawStreamData;

        // temporary stream configurations
        videoPlayerElement.volume = 1.0;
        videoPlayerElement.style.filter =
          "brightness(1.0) contrast(0.8) saturate(1.0)";
        break;
      case "stop":
        if (!rawStreamData) {
          console.warn(
            "[fcapture-preview] - main@handleStreamAction: raw stream input not found, is your device initialized?"
          );

          return;
        }
        
        // get all available stream video/audio tracks
        const streamTracks = rawStreamData.getTracks();

        // stop all tracks from playing
        streamTracks.forEach((track) => track.stop());

        // reset video player element and
        // display the "no signal" screen
        videoPlayerElement.srcObject = null;
        videoPlayerElement.style.display = "none";
        noSignalContainerElement.style.display = "flex";
        break;
      case "restart":
        await handleStreamAction("stop");
        await handleStreamAction("start");
        break;
      case "mute":
        videoPlayerElement.volume = 0.0;
        break;
      case "unmute":
        videoPlayerElement.volume = 1.0; // TODO: use the previous volume before muting
        break;
      default:
        await handleStreamAction("start"); // when no argument is passed the action 
                                           // will always be to start the stream
        break;
    }
  } catch (err) {
    console.error("[fcapture-preview] - main@handleStreamAction:", err);
  }
};

// NOTE: for now, all "windows" will have their own event handler initializer
const initializeEventHandler = async () => {
  try {
    // DEBUG PURPOSES ONLY
    // console.log("[fcapture-preview] - main@initializeEventHandler:", window.ipcRenderer.isLoaded());

    // event listeners
    // NOTE: these listeneres will likely stay on this file/function
    window.ipcRenderer.on("start-stream", async () => {
      await handleStreamAction("start");
    });

    window.ipcRenderer.on("stop-stream", async () => {
      await handleStreamAction("stop");
    });

    window.ipcRenderer.on("restart-stream", async () => {
      await handleStreamAction("restart");
    });

    window.ipcRenderer.on("mute-stream", async () => {
      await handleStreamAction("mute");
    });

    window.ipcRenderer.on("unmute-stream", async () => {
      await handleStreamAction("unmute");
    });

    // DOM native event listener
    navigator.mediaDevices.ondevicechange = async () => {
      await handleStreamAction("restart");
    }
    
    // start stream
    await handleStreamAction();

  } catch (err) {
    console.error("[fcapture-preview] - main@initializeEventHandler:", err);
  }
};

// initialize stream
initializeEventHandler()
  .then(() => {
    console.log(
      "[fcapture-preview] - main@initializeEventHandlerPromise: event handler initialized."
    );
  })
  .catch((err) => {
    console.error("[fcapture-preview] - main@initializeEventHandlerPromise:", err);
  });
