/*

FCapture

- github@otvv
- 09/25/2024

*/

"use strict";

// FIXME: get rid of these 
let audioController;
let currentVolume;
let previousVolume;
let streamData;

const handleStreamAction = async (action = "start") => {
  try {
    const renderer = await import("../../api/renderer.mjs");

    const canvasElement = document.querySelector("#canvas-element");
    const noSignalContainerElement = document.querySelector(
      "#no-signal-container"
    );
    const mutedIconElement = document.querySelector("#muted-icon");

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
        // dont do anything if the stream data is already pulled
        // in other words (if the stream is already running)
        if (streamData) {
          return;
        }

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

        // store gain node for volume control
        audioController = streamData.gainNode;
        currentVolume = audioController.gain.value;
        break;
      case "stop":
        if (!streamData) {
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
        // and clear stream data
        streamTracks.forEach((track) => track.stop());
        streamData = null;

        // display the "no signal" screen
        mutedIconElement.style.display = "none";
        canvasElement.style.display = "none";
        noSignalContainerElement.style.display = "flex";
        break;
      case "restart":
        await handleStreamAction("stop");
        await handleStreamAction("start");
        break;
      case "mute":
        if (!streamData) {
          return;
        }

        // save current volume before muting
        previousVolume = audioController.gain.value;

        // set volume to 0
        if (audioController && currentVolume > 0.0) {
          audioController.gain.value = 0.0;
          currentVolume = audioController.gain.value; // update volume data
        }
        
        // show icon indicator on screen
        mutedIconElement.style.display = "block";
        break;
      case "unmute":
        if (!streamData) {
          return;
        }
        
        // set volume back to what it was before muting
        if (audioController)  {
          audioController.gain.value = previousVolume;
          currentVolume = audioController.gain.value; // update volume data
        }

        // hide icon indicator on screen
        mutedIconElement.style.display = "none";
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

const handleWindowAction = async (action = "preview") => {
  try {
    switch (action) {
      case "preview":
        await handleStreamAction("start");
        break;
      case "recordings":
        // TODO: handle tab switch logic here
        console.warn("[fcapture] - main@handleWindowAction: not implemented!");
        break;
      case "settings":
        // TODO: handle settings window logic here
        console.warn("[fcapture] - main@handleWindowAction: not implemented!");
        break;
    }
  } catch (err) {
    console.error("[fcapture] - main@handleWindowAction:", err);
  }
};

// NOTE: for now, all "windows" will have their own event handler initializer
const initializeEventHandler = async () => {
  try {
    // DEBUG PURPOSES ONLY
    // console.log("[fcapture] - main@initializeEventHandler:", window.ipcRenderer.isLoaded());

    // controllers
    const navbarContainerElement = document.querySelector("#navbar-container");
    const tabsContainerElement = document.querySelector("#tabs-container");
    const previewTabElement = tabsContainerElement.querySelector("#preview-tab");
    const recordingsTabElement = tabsContainerElement.querySelector("#recordings-tab");
    const settingsButtonElement = document.querySelector("#settings-button");
    const muteButtonElement = document.querySelector("#mute-button");
    const refreshButtonElement = document.querySelector("#refresh-button");
    const mutedIconElement = document.querySelector("#muted-icon");

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

    // native DOM event listeners
    navigator.mediaDevices.ondevicechange = async () => {
      await handleStreamAction("restart");
    };
    
    mutedIconElement.addEventListener("click", async () => {
      await handleStreamAction("unmute");
    });

    if (navbarContainerElement) {
      previewTabElement.addEventListener("click", async () => {
        await handleWindowAction("preview");
      });
      
      recordingsTabElement.addEventListener("click", async () => {
        await handleWindowAction("recordings");
      });

      muteButtonElement.addEventListener("click", async () => {
        await handleStreamAction("mute");
        // TODO: turn this into a switch to mute and unmute the audio
        // and change the icon based on stream status
      });

      refreshButtonElement.addEventListener("click", async () => {
        await handleStreamAction("restart");
      });
      
      settingsButtonElement.addEventListener("click", async () => {
        await handleWindowAction("settings");
      });
    }

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
