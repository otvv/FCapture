/*

FCapture

- github@otvv
- 09/25/2024

*/

"use strict";

// FIXME: get rid of these 
let audioController;
let streamData;

const handleStreamAction = async (action = "start") => {
  try {
    const renderer = await import("../../api/renderer.mjs");

    const canvasElement = document.querySelector("#canvas-element");
    const noSignalContainerElement = document.querySelector(
      "#no-signal-container"
    );

    if (canvasElement === null) {
      console.error(
        `[fcapture] - main@handleStreamAction: canvas element not found.
         [fcapture] - main@handleStreamAction: please restart the window.`
      );
      return;
    }

    // context for drawing on the canvas
    const canvasContext = canvasElement.getContext("2d");

    switch (action) {
      case "start":
        // render frames of the raw stream from the canvas
        // onto the video player element
        streamData = await renderer.renderRawFrameOnCanvas(canvasElement, canvasContext);

        // in case the user starts the app without any device connected
        if (!streamData.rawStreamData) {
          // clear context from residual frames
          canvasContext.clearRect(
            0,
            0,
            canvasElement.width,
            canvasElement.height
          );

          // hide canvas and show no signal screen
          canvasElement.style.display = "none";
          noSignalContainerElement.style.display = "flex";
          return;
        }

        // display canvas and hide no signal screen
        // if device is and stream is working
        noSignalContainerElement.style.display = "none";
        canvasElement.style.display = "block";

        // store gain node for mute/unmute control
        // later on
        audioController = streamData.gainNode;
        break;
      case "stop":
        if (!streamData.rawStreamData) {
          return;
        }

        // get all available stream video/audio tracks
        const streamTracks = streamData.rawStreamData.getTracks();

        // clear canvas
        canvasContext.clearRect(
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );

        // stop all tracks from playing
        // audio and video
        streamTracks.forEach((track) => track.stop());

        // display the "no signal" screen
        canvasElement.style.display = "none";
        noSignalContainerElement.style.display = "flex";
        break;
      case "restart":
        await handleStreamAction("stop");
        await handleStreamAction("start");
        break;
      case "mute":
        if (!streamData.rawStreamData) {
          return;
        }

        // set volume to 0
        if (audioController) {
          audioController.gain.value = 0.0;
        }
        // TODO: visual indicator on screen
        break;
      case "unmute":
        if (!streamData.rawStreamData) {
          return;
        }
        
        // set volume to 1
        if (audioController) {
          audioController.gain.value = 1.0;
        }
        break;
      default:
        await handleStreamAction("start");
        // when no argument is passed the default action
        // will always be to start the stream
        break;
    }
  } catch (err) {
    console.error("[fcapture] - main@handleStreamAction:", err);
  }
};

// NOTE: for now, all "windows" will have their own event handler initializer
const initializeEventHandler = async () => {
  try {
    // DEBUG PURPOSES ONLY
    // console.log("[fcapture] - main@initializeEventHandler:", window.ipcRenderer.isLoaded());

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

    // DOM native event listeners
    navigator.mediaDevices.ondevicechange = async () => {
      await handleStreamAction("restart");
    };

    // start stream
    await handleStreamAction();
  } catch (err) {
    console.error("[fcapture] - main@initializeEventHandler:", err);
  }
};

// initialize stream
initializeEventHandler()
  .then(() => {
    console.log(
      "[fcapture] - main@initializeEventHandlerPromise: event handler initialized."
    );
  })
  .catch((err) => {
    console.error(
      "[fcapture] - main@initializeEventHandlerPromise:",
      err
    );
  });
