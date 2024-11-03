/*

FCapture

- github@otvv
- 09/25/2024

*/

"use strict";

// element querying
const canvasElement = document.querySelector("#canvas-element");
const noSignalContainerElement = document.querySelector(
  "#no-signal-container"
);
const mutedIconElement = document.querySelector("#muted-icon");
const navbarContainerElement = document.querySelector("#navbar-container");
const tabsContainerElement = document.querySelector("#tabs-container");
const previewTabElement = tabsContainerElement.querySelector("#preview-tab");
const recordingsTabElement = tabsContainerElement.querySelector("#recordings-tab");
const settingsButtonElement = document.querySelector("#settings-button");
const muteButtonElement = document.querySelector("#mute-button");
const refreshButtonElement = document.querySelector("#refresh-button");

const streamState = {
  canvas: null,
  canvasContext: null,
  audioContext: null,
  audioController: null,
  currentVolume: 0,
  previousVolume: 0,
  isAudioTrackMuted: false,
};

const toggleStreamMute = (state) => {
  if (!streamState.audioController) {
    return;
  } 

  if (state && !streamState.isAudioTrackMuted) {
    // save current volume and set gain to 0 for muting
    streamState.previousVolume = streamState.audioController.gain.value;
    streamState.audioController.gain.value = 0.0;
    streamState.isAudioTrackMuted = true;
    mutedIconElement.style.display = "block";
  } else {
    // restore previous volume after unmuting
    streamState.audioController.gain.value = streamState.previousVolume;
    streamState.isAudioTrackMuted = false;
    mutedIconElement.style.display = "none";
  }
};

const handleStreamAction = async (action = "start") => {
  try {
    const renderer = await import("../../api/renderer.mjs");

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

        // stop all tracks from playing (audio and video)
        await streamTracks.forEach((track) => track.stop());
        streamState.isAudioTrackMuted = false;

        // close audio controller
        if (streamState.audioController) {
          streamState.audioController.disconnect();
        }

        if (streamState.audioContext) {
          streamState.audioContext.close();
        }

        // display the "no signal" screen
        mutedIconElement.style.display = "none";
        canvasElement.style.display = "none";
        noSignalContainerElement.style.display = "flex";

        // clear stream data
        {
          streamState.canvas.temporaryVideoElement.srcObject = null;
          streamState.canvas = { temporaryVideoElement: null, gainNode: null, rawStreamData: null };
          streamState.canvas = null;
          streamState.canvasContext = null;
          streamState.audioContext = null;
        }
        break;
      case "restart":
        await handleStreamAction("stop");
        await handleStreamAction("start");
        break;
      case "mute":
        toggleStreamMute(true);
        break;
      case "unmute":
        toggleStreamMute(false);
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
    // start stream
    await handleStreamAction();

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
