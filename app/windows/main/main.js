/*

FCapture

- github@otvv
- 09/25/2024

*/

"use strict";

const streamState = {
  canvas: null,
  canvasContext: null,
  audioContext: null,
  audioController: null,
  currentVolume: 0,
  previousVolume: 0,
  isAudioTrackMuted: false,
};

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

    switch (action) {
      case "start":
        // dont do anything if the stream data is already pulled
        // in other words (if the stream is already running)
        if (streamState.canvas) {
          return;
        }
                
        // initialize canvas and audio context
        streamState.canvasContext = canvasElement.getContext("2d", {
          willReadFrequently: true,
        });
        streamState.audioContext = new window.AudioContext();

        // render frames of the raw stream from the canvas
        // onto the video player element
        streamState.canvas = await renderer.renderRawFrameOnCanvas(
          canvasElement,
          streamState.canvasContext,
          streamState.audioContext
        );

        // in case the user starts the app without any device connected
        if (!streamState.canvas) {
          // clear context from residual frames
          streamState.canvasContext.clearRect(
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

        // generate a simple object with the necessary canvas
        // info to populate the settings window description
        // when needed
        if (streamState.canvas.temporaryVideoElement) {
          const canvasInfo = {
            width: streamState.canvas.temporaryVideoElement.videoWidth,
            height: streamState.canvas.temporaryVideoElement.videoHeight,
          };

          window.ipcRenderer.send("receive-canvas-info", canvasInfo);
        }

        // display canvas and hide no signal screen
        // if device is and stream is working
        noSignalContainerElement.style.display = "none";
        canvasElement.style.display = "block";

        // store gain node for volume control
        streamState.audioController = streamState.canvas.gainNode;

        if (streamState.audioController) {
          streamState.currentVolume = streamState.audioController.gain.value; // update volume data
          streamState.isAudioTrackMuted = false;
        } 
        break;
      case "stop":
        if (
          !streamState.canvas ||
          !streamState.canvas.rawStreamData ||
          !streamState.canvas.temporaryVideoElement
        ) {
          return;
        }

        // clear canvas
        streamState.canvasContext.clearRect(
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );

        // get allcanvasElement available stream video/audio tracks
        const streamTracks = await streamState.canvas.rawStreamData.getTracks();

        if (!streamTracks) {
          return;
        }

        // stop all tracks from playing
        await streamTracks.forEach((track) => track.stop());
        streamState.isAudioTrackMuted = false;

        // clear stream data
        {
          streamState.canvas.temporaryVideoElement.srcObject = null;
          streamState.canvas = { temporaryVideoElement: null, gainNode: null, rawStreamData: null };
          streamState.canvas = null;
          streamState.canvasContext = null;
          streamState.audioContext = null;
        }

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
        if (!streamState.canvas || 
          !streamState.audioController || 
          streamState.isAudioTrackMuted === true) {
          return;
        }

        // save current volume before muting
        streamState.previousVolume = streamState.audioController.gain.value;

        if (streamState.currentVolume > 0.0) {
          // set volume to 0
          streamState.audioController.gain.value = 0.0;
          streamState.currentVolume = streamState.audioController.gain.value; // update volume data
        }

        // show mute icon indicator on screen
        streamState.isAudioTrackMuted = true;
        mutedIconElement.style.display = "block";
        break;
      case "unmute":
        if (!streamState.canvas || 
          !streamState.audioController || 
          streamState.isAudioTrackMuted === false) {
          return;
        }

        // set volume back to what it was before the stream was muted
        streamState.audioController.gain.value = streamState.previousVolume;
        streamState.currentVolume = streamState.audioController.gain.value; // update volume data

        // hide mute icon indicator
        streamState.isAudioTrackMuted = false;
        mutedIconElement.style.display = "none";
      default:
        // when no argument is passed the default action
        // will always be to start the stream
        await handleStreamAction("start");
        break;
    }
  } catch (err) {
    console.error("[fcapture] - main@handleStreamAction:", err);
  }
};

const handleWindowAction = async (action = "preview") => {
  try {
    const canvasElement = document.querySelector("#canvas-element");

    if (!canvasElement) {
      return;
    }

    switch (action) {
      case "preview":
        await handleStreamAction("start");
        break;
      case "recordings":
        // TODO: handle tab switch logic here
        console.warn("[fcapture] - main@handleWindowAction: not implemented!");
        break;
      case "settings":
        window.ipcRenderer.send("open-settings");
        break;
    }
  } catch (err) {
    console.error("[fcapture] - main@handleWindowAction:", err);
  }
};

const initializeEventHandler = async () => {
  try {
    // controllers
    const navbarContainerElement = document.querySelector("#navbar-container");
    const mutedIconElement = document.querySelector("#muted-icon");
    const tabsContainerElement = document.querySelector("#tabs-container");

    // event listeners
    window.ipcRenderer.on("start-stream", () => handleStreamAction("start"));
    window.ipcRenderer.on("stop-stream", () => handleStreamAction("stop"));
    window.ipcRenderer.on("restart-stream", () => handleStreamAction("restart"));
    window.ipcRenderer.on("mute-stream", () => handleStreamAction("mute"));
    window.ipcRenderer.on("unmute-stream", () => handleStreamAction("unmute"));

    // native DOM event listeners
    navigator.mediaDevices.ondevicechange = (_event) => handleStreamAction("restart");
    mutedIconElement.addEventListener("click", () => handleStreamAction("unmute"));

    if (navbarContainerElement) {
      const previewTabElement = tabsContainerElement.querySelector("#preview-tab");
      const recordingsTabElement = tabsContainerElement.querySelector("#recordings-tab");
      const settingsButtonElement = document.querySelector("#settings-button");
      const muteButtonElement = document.querySelector("#mute-button");
      const refreshButtonElement = document.querySelector("#refresh-button");

      previewTabElement.addEventListener("click", () =>
        handleWindowAction("preview")
      );
      recordingsTabElement.addEventListener("click", () =>
        handleWindowAction("recordings")
      );
      muteButtonElement.addEventListener("click", () => {
        if (streamState.isAudioTrackMuted) {
          handleStreamAction("unmute")
        } else {
          handleStreamAction("mute")
        }
      });
      refreshButtonElement.addEventListener("click", () =>
        handleStreamAction("restart")
      );
      settingsButtonElement.addEventListener("click", () =>
        handleWindowAction("settings")
      );
    }

    // start stream
    await handleStreamAction();
  } catch (err) {
    console.error("[fcapture] - main@initializeEventHandler:", err);
  }
};

// initialize event handler
initializeEventHandler()
  .then(() => {
    console.log(
      "[fcapture] - main@initializeEventHandlerPromise: event handler initialized."
    );
  })
  .catch((err) => {
    console.error("[fcapture] - main@initializeEventHandlerPromise:", err);
  });
