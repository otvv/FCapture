/*

FCapture

- github@otvv
- 09/25/2024

*/

"use strict";

// element querying
const descriptionTextElement = document.querySelector("#description-text");
const videoModeSelectElement = document.querySelector("#video-mode-select");
const imageRenderingPrioritySelectElement = document.querySelector("#image-rendering-priority-select");
const imageBrightnessSliderElement = document.querySelector("#image-brightness-slider");
const imageContrastSliderElement = document.querySelector("#image-contrast-slider");
const imageSaturationSliderElement = document.querySelector("#image-saturation-slider");
const debugOverlayCheckboxElement = document.querySelector("#debug-overlay-checkbox");
const audioModeSelectElement = document.querySelector("#audio-mode-select");
const surroundAudioCheckboxElement = document.querySelector("#surround-checkbox");
const bassBoostCheckboxElement = document.querySelector("#bassboost-checkbox");

const getRefreshRateOnce = () => {
  return new Promise((resolve) => {
    const UPDATE_INTERVAL = 1000; // 1 second in ms
    
    let frameCounter = 0;
    const countFrames = () => {
      frameCounter++;
    };

    // count frames for a specific time
    // so we can get the estimated canvas 
    // refresh rate (fps)
    const interval = setInterval(() => {
      // return the number of frames counted in a
      // specific timeframe (1 second)
      resolve(frameCounter); 
      
      // stop counting after 1 second
      clearInterval(interval); 
      
    }, UPDATE_INTERVAL);
    
    const calculateRefreshRate = () => {
      countFrames();

      // continue counting frames
      requestAnimationFrame(calculateRefreshRate); 
    }
    
    // start counting frames
    requestAnimationFrame(calculateRefreshRate);
  });
};

const populateStreamOverview = async (canvasData, deviceData) => {
  try {
    if (!canvasData) {
      return;
    }

    if (descriptionTextElement === null) {
      console.log(
        "[fcapture] - settings@populateStreamOverview: failed to get the description element."
      );
    }

    if (!deviceData) {
      descriptionTextElement.innerHTML = `
      <b>Input</b>: Invalid video or audio device constraints applied. <i>(Device)</i><br>
      <b>Output</b>: Canvas not initialized due to rawStreamData being unavailable. <i>(Canvas)</i> <br>
      <b>Audio</b>: Invalid video or audio device constraints applied. <i>(Device)</i>`;
      return;
    }

    // get device info to display
    const targetWidth = deviceData.width || "0";
    const targetHeight = deviceData.height || "0";
    const targetFps = deviceData.frameRate.toFixed(0) || "0";
    const targetAudioSampleRate = deviceData.sampleRate || "0";
    const targetAudioSampleSize = deviceData.sampleSize || "0";
    let targetAudioChannelCount = deviceData.channelCount || "1";

    if (targetAudioChannelCount === 1) {
      targetAudioChannelCount = "Mono";
    } else if (targetAudioChannelCount === 2) {
      targetAudioChannelCount = "Stereo";
    } else if (targetAudioChannelCount > 2) {
      targetAudioChannelCount = "Surround";
    } else {
      targetAudioChannelCount = "Unknown";
    }

    if (!canvasData) {
      descriptionTextElement.innerHTML = `
        <b>Input</b>: ${targetWidth}x${targetHeight} @ ${targetFps} FPS <i>(Device)</i><br>
        <b>Output</b>: Canvas not initialized due to canvasData being unavailable. <i>(Canvas)</i> <br>
        <b>Audio</b>: ${targetAudioChannelCount} @ ${targetAudioSampleRate} kHz - ${targetAudioSampleSize} bits <i>(Device)</i>`;
      return;
    }

    // get canvas info to display
    const outputWidth = canvasData.width || "0";
    const outputHeight = canvasData.height || "0";
    // TODO: maybe cache this value? so the app don't need
    // to keep calculating the refresh rate when 
    // opening the settings window each time
    const outputFps =
      (await getRefreshRateOnce().then((estimateRefreshRate) => estimateRefreshRate)).toFixed(0) || "0";

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
    window.ipcRenderer.on("send-canvas-info", (canvasInfo, deviceInfo) => {
      // populate settings menu description
      if (canvasInfo && deviceInfo) {
        populateStreamOverview(canvasInfo, deviceInfo);
      }
    });

    window.ipcRenderer.on("config-loaded", (configPayload) => {
      console.log("[fcapture] - settings@initializeEventHandler: config payload received.", configPayload);

      // update control elements using the data pulled from the config file
      if (configPayload) {
        // TODO: query all checkboxes or any other type of form element
        // and update them all dynamically using a loop
        videoModeSelectElement.value = configPayload.videoMode;
        imageRenderingPrioritySelectElement.value = configPayload.imageRenderingPriority;
        imageBrightnessSliderElement.value = configPayload.imageBrightness;
        imageContrastSliderElement.value = configPayload.imageContrast;
        imageSaturationSliderElement.value = configPayload.imageSaturation;
        debugOverlayCheckboxElement.checked = configPayload.debugOverlay;
        //
        audioModeSelectElement.value = configPayload.audioMode;
        bassBoostCheckboxElement.checked = configPayload.bassBoost;
        surroundAudioCheckboxElement.checked = configPayload.surroundAudio;
      }
    });
    
    // update config file according with the settings window
    // control element state
    videoModeSelectElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { videoMode: event.target.value } );
    });
    
    imageRenderingPrioritySelectElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { imageRenderingPriority: event.target.value } );
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
    
    debugOverlayCheckboxElement.addEventListener("change", (event) => {
      ipcRenderer.send("update-config-info", { debugOverlay: event.target.checked });
    });

    //

    audioModeSelectElement.addEventListener('change', (event) => {
      ipcRenderer.send('update-config-info', { audioMode: event.target.value } );
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
