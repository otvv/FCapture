/*

FCapture

- github@otvv
- 09/25/2024

*/

"use strict";

const populateStreamOverview = async (canvasData) => {
  try {
    if (!canvasData) {
      return;
    }

    const devices = await import("../../api/device.mjs");

    const descriptionTextElement = document.querySelector("#description-text");

    if (descriptionTextElement === null) {
      console.log(
        "[fcapture] - settings@populateStreamOverview: failed to get the description element."
      );
    }

    // unnecessary call
    // FIXME: pass the rvalue of this function through an event listener
    // since this is already being retrieved in another place
    const rawStreamData = await devices.setupStreamFromDevice();

    if (!rawStreamData) {
      return;
    }

    // get some more additional info
    const outputWidth = canvasData.width || "0";
    const outputHeight = canvasData.height || "0";
    const targetWidth =
      rawStreamData.getVideoTracks()[0].getSettings().width || "0";
    const targetHeight =
      rawStreamData.getVideoTracks()[0].getSettings().height || "0";
    const targetFps =
      rawStreamData.getVideoTracks()[0].getSettings().frameRate || "0";
    const targetAudioSampleRate =
      rawStreamData.getAudioTracks()[0].getSettings().sampleRate || "0";
    const targetAudioSampleSize =
      rawStreamData.getAudioTracks()[0].getSettings().sampleSize || "0";

    let targetAudioChannelCount =
      rawStreamData.getAudioTracks()[0].getSettings().channelCount || "1";
    if (targetAudioChannelCount === 1) {
      targetAudioChannelCount = "Mono";
    } else if (targetAudioChannelCount === 2) {
      targetAudioChannelCount = "Stereo";
    } else if (targetAudioChannelCount > 2) {
      targetAudioChannelCount = "Surround";
    } else {
      targetAudioChannelCount = "unknown";
    }

    descriptionTextElement.innerHTML = `
      <b>Input</b>: ${targetWidth}x${targetHeight} @ ${targetFps} FPS <i>(Device)</i><br>
      <b>Output</b>: ${outputWidth}x${outputHeight} @ ${targetFps} FPS <i>(Canvas)</i><br>
      <b>Audio</b>: ${targetAudioChannelCount} @ ${targetAudioSampleRate} kHz - ${targetAudioSampleSize} bits <i>(Device)</i>`;
  } catch (err) {
    console.error("[fcapture] - settings@populateStreamOverview:", err);
  }
};

const requestConfigData = () => {
  // request the current config when the settings window loads
  window.ipcRenderer.send("request-config-info");
}

const initializeEventHandler = async () => {
  try {
    const debugOverlayCheckboxElement = document.querySelector("#debug-overlay-checkbox");
    const surroundAudioCheckboxElement = document.querySelector("#surround-checkbox");
    const bassBoostCheckboxElement = document.querySelector("#bassboost-checkbox");

    // request window state from config file 
    // when the settings window is ready
    window.addEventListener('DOMContentLoaded', () => {
      requestConfigData();
    });

    // event listeners
    window.ipcRenderer.on("send-canvas-info", (canvasInfo) => {
      // populate settings menu description
      if (canvasInfo) {
        populateStreamOverview(canvasInfo);
      }
    });

    window.ipcRenderer.on("config-loaded", (configPayload) => {
      console.log("[fcapture] - settings@initializeEventHandler: config payload received.", configPayload);

      // update control elements using the data pulled from the config file
      if (configPayload) {
        debugOverlayCheckboxElement.checked = configPayload.debugOverlay;
        bassBoostCheckboxElement.checked = configPayload.bassBoost;
        surroundAudioCheckboxElement.checked = configPayload.surroundAudio;
      }
    });
    
    // update config file according with the settings window
    // control element state
    debugOverlayCheckboxElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { debugOverlay: event.target.checked } );
    });
    
    surroundAudioCheckboxElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { surroundAudio: event.target.checked } );
    });

    bassBoostCheckboxElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { bassBoost: event.target.checked } );
    });
  } catch (err) {
    console.error("[fcapture] - settings@initializeEventHandler:", err);
  }
};

// initialize event handler
initializeEventHandler()
  .then(() => {
    console.log(
      "[fcapture] - settings@initializeEventHandlerPromise: event handler initialized."
    );
  })
  .catch((err) => {
    console.error("[fcapture] - settings@initializeEventHandlerPromise:", err);
  });
