/*

FCapture

- github@otvv
- 09/25/2024

*/

"use strict";

// element querying
const descriptionTextElement = document.querySelector("#description-text");
const debugOverlayCheckboxElement = document.querySelector("#debug-overlay-checkbox");
const imageSmoothingCheckboxElement = document.querySelector("#image-smoothing-checkbox");
const imageBrightnessSliderElement = document.querySelector("#image-brightness-slider");
const imageContrastSliderElement = document.querySelector("#image-contrast-slider");
const imageSaturationSliderElement = document.querySelector("#image-saturation-slider");

const surroundAudioCheckboxElement = document.querySelector("#surround-checkbox");
const bassBoostCheckboxElement = document.querySelector("#bassboost-checkbox");

const getRefreshRateOnce = () => {
  return new Promise((resolve) => {
    const UPDATE_INTERVAL = 1000; // 1 second in ms
    
    let frameCount = 0;
    const calculateRefreshRate = () => {
      frameCount++;
    };

    // count frames for 1 second
    // so we can get our canvas refresh 
    // rate (fps) estimate
    const interval = setInterval(() => {
      // return the number of frames counted in the 1 second
      resolve(frameCount); 

      // stop counting after 1 second
      clearInterval(interval); 

    }, UPDATE_INTERVAL);

    const frame = () => {
      calculateRefreshRate();

      // continue counting frames
      requestAnimationFrame(frame); 
    }
    
    // start counting frames
    requestAnimationFrame(frame);
  });
};

const populateStreamOverview = async (canvasData) => {
  try {
    if (!canvasData) {
      return;
    }

    const devices = await import("../../api/device.mjs");

    if (descriptionTextElement === null) {
      console.log(
        "[fcapture] - settings@populateStreamOverview: failed to get the description element."
      );
    }

    // unnecessary call
    // FIXME: pass the rvalue of this function through an event
    // since this is already being retrieved in another place
    const rawStreamData = await devices.setupStreamFromDevice();

    if (!rawStreamData) {
      return;
    }

    // get more additional info
    const outputWidth = canvasData.width || "0";
    const outputHeight = canvasData.height || "0";

    // TODO: maybe cache this value? so the app don't need
    // to keep calculating the rfresh rate when 
    // opening the settings window 
    const outputFps = await getRefreshRateOnce().then((estimateRefreshRate) => {
      return estimateRefreshRate;
    }) || "0";

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
      <b>Output</b>: ${outputWidth}x${outputHeight} @ ${outputFps} FPS <i>(Canvas)</i><br>
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
        // TODO: query all checkboxes or any other type of form element
        // and update them all dynamically using loop
        debugOverlayCheckboxElement.checked = configPayload.debugOverlay;
        imageSmoothingCheckboxElement.checked = configPayload.imageSmoothing;
        imageBrightnessSliderElement.value = configPayload.imageBrightness;
        imageContrastSliderElement.value = configPayload.imageContrast;
        imageSaturationSliderElement.value = configPayload.imageSaturation;
        //
        bassBoostCheckboxElement.checked = configPayload.bassBoost;
        surroundAudioCheckboxElement.checked = configPayload.surroundAudio;
      }
    });
    
    // update config file according with the settings window
    // control element state
    debugOverlayCheckboxElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { debugOverlay: event.target.checked } );
    });

    imageSmoothingCheckboxElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { imageSmoothing: event.target.checked } );
    });
    
    surroundAudioCheckboxElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { surroundAudio: event.target.checked } );
    });

    bassBoostCheckboxElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { bassBoost: event.target.checked } );
    });

    imageBrightnessSliderElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { imageBrightness: event.target.value } );
    });

    imageContrastSliderElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { imageContrast: event.target.value } );
    });

    imageSaturationSliderElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { imageSaturation: event.target.value } );
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
