/*

FCapture

- github@otvv
- 09/25/2024

*/

"use strict";

// element querying
const descriptionTextElement = document.querySelector("#description-text");
const videoModeSelectElement = document.querySelector("#video-mode-select");
const renderingMethodSelectElement = document.querySelector(
  "#rendering-method-select",
);
const imageBrightnessSliderElement = document.querySelector(
  "#image-brightness-slider",
);
const imageContrastSliderElement = document.querySelector("#image-contrast-slider");
const imageSaturationSliderElement = document.querySelector(
  "#image-saturation-slider",
);
const autoHideCursorCheckboxElement = document.querySelector(
  "#auto-hide-cursor-checkbox",
);
const debugOverlayCheckboxElement = document.querySelector(
  "#debug-overlay-checkbox",
);
const audioModeSelectElement = document.querySelector("#audio-mode-select");
const surroundAudioCheckboxElement = document.querySelector("#surround-checkbox");
const bassBoostCheckboxElement = document.querySelector("#bassboost-checkbox");
const applyButton = document.querySelector("#apply-button");
const cancelButton = document.querySelector("#cancel-button");

const requestConfigData = () => {
  // request the current config when the settings window loads
  window.ipcRenderer.send("request-config-info");
};

const handleAudioChannelDescription = (channelCount = "Unknown") => {
  // based on channel count, set
  // the audio channel type (Mono, Stereo, Surround)
  switch (channelCount) {
    case 1:
      return "Mono";
    case 2:
      return "Stereo";
    case channelCount > 2:
      return "Surround";
    default:
      return "Unknown";
  }
};

const populateStreamOverview = async (canvasInfo, deviceInfo) => {
  try {
    if (descriptionTextElement === null) {
      console.error(
        "[fcapture] - settings@populateStreamOverview: failed to get the description element.",
      );
      return;
    }

    if (Object.keys(deviceInfo).length === 0) {
      descriptionTextElement.innerHTML = `
        <b>Input</b>: Invalid video or audio device constraints applied. <i>(Device)</i><br>
        <b>Output</b>: Canvas not initialized due to rawStreamData being unavailable. <i>(Canvas)</i> <br>
        <b>Audio</b>: Invalid video or audio device constraints applied. <i>(Device)</i>`;
      return;
    }

    // get device info to display
    const targetWidth = deviceInfo.width || 0;
    const targetHeight = deviceInfo.height || 0;
    const targetFps = deviceInfo.frameRate || 0;
    const targetAudioSampleRate = deviceInfo.sampleRate || 0;
    const targetAudioSampleSize = deviceInfo.sampleSize || 0;
    const targetAudioChannelType = handleAudioChannelDescription(
      deviceInfo.channelCount,
    );

    if (Object.keys(canvasInfo).length === 0) {
      descriptionTextElement.innerHTML = `
        <b>Input</b>: ${targetWidth}x${targetHeight} @ ${targetFps} FPS <i>(Device)</i><br>
        <b>Output</b>: Canvas not initialized due to canvasInfo being unavailable. <i>(Canvas)</i> <br>
        <b>Audio</b>: ${targetAudioChannelType} @ ${targetAudioSampleRate} kHz - ${targetAudioSampleSize} bits <i>(Device)</i>`;
      return;
    }

    // get canvas info to display
    const outputWidth = canvasInfo.width || 0;
    const outputHeight = canvasInfo.height || 0;
    const outputFps = canvasInfo.frameRate || 0;

    descriptionTextElement.innerHTML = `
      <b>Input</b>: ${targetWidth}x${targetHeight} @ ${targetFps} FPS <i>(Device)</i><br>
      <b>Output</b>: ${outputWidth}x${outputHeight} @ ${outputFps} FPS <i>(Canvas)</i><br>
      <b>Audio</b>: ${targetAudioChannelType} @ ${targetAudioSampleRate} kHz - ${targetAudioSampleSize} bits <i>(Device)</i>`;
  } catch (err) {
    console.error("[fcapture] - settings@populateStreamOverview:", err);
  }
};

const initializeEventHandler = async () => {
  try {
    // request window state from config file
    // when the settings window is ready
    window.addEventListener("DOMContentLoaded", () => {
      requestConfigData();
    });

    // event listeners
    window.ipcRenderer.on("send-canvas-info", (canvasInfo, deviceInfo) => {
      // populate settings menu description
      if (
        Object.keys(canvasInfo).length !== 0 &&
        Object.keys(deviceInfo).length !== 0
      ) {
        populateStreamOverview(canvasInfo, deviceInfo);
      } else {
        console.warn(
          "[fcapture] - settings@initializeEventHandler: canvas and device info are not ready yet.",
        );
      }
    });

    window.ipcRenderer.on("config-loaded", (configPayload) => {
      // update control elements using the data pulled from the config file
      if (configPayload) {
        // DEBUG PURPOSES ONLY
        // console.log(
        //   "[fcapture] - settings@initializeEventHandler: config payload received.",
        // );
        //
        // TODO: query all checkboxes or any other type of form element
        // and update them all dynamically using a loop
        //
        // TODO: disable all widgets if the device
        // or canvas is unavailable
        renderingMethodSelectElement.value = configPayload.renderingMethod;
        videoModeSelectElement.value = configPayload.videoMode;
        imageBrightnessSliderElement.value = configPayload.imageBrightness;
        imageContrastSliderElement.value = configPayload.imageContrast;
        imageSaturationSliderElement.value = configPayload.imageSaturation;
        autoHideCursorCheckboxElement.checked = configPayload.autoHideCursor;
        debugOverlayCheckboxElement.checked = configPayload.debugOverlay;
        //
        audioModeSelectElement.value = configPayload.audioMode;
        bassBoostCheckboxElement.checked = configPayload.bassBoost;
        surroundAudioCheckboxElement.checked = configPayload.surroundAudio;
      }
    });

    // handle apply button config update
    // TODO: only enable/allow clicking if a element value has been changed
    // and if the canvas/device is available
    applyButton.addEventListener("click", () => {
      const updatedConfigPayload = {
        renderingMethod: +renderingMethodSelectElement.value,
        videoMode: videoModeSelectElement.value,
        imageBrightness: +imageBrightnessSliderElement.value,
        imageContrast: +imageContrastSliderElement.value,
        imageSaturation: +imageSaturationSliderElement.value,
        autoHideCursor: !!autoHideCursorCheckboxElement.checked,
        debugOverlay: !!debugOverlayCheckboxElement.checked,
        audioMode: audioModeSelectElement.value,
        surroundAudio: !!surroundAudioCheckboxElement.checked,
        bassBoost: !!bassBoostCheckboxElement.checked,
      };

      // send event with the updated config data
      // and restart video stream
      window.ipcRenderer.send("update-config-info", updatedConfigPayload);
      window.ipcRenderer.send("force-restart-stream");
    });

    cancelButton.addEventListener("click", () => {
      window.close();
    });
  } catch (err) {
    console.error("[fcapture] - settings@initializeEventHandler:", err);
  }
};

initializeEventHandler()
  .then(() => {
    console.log(
      "[fcapture] - settings@initializeEventHandlerPromise: event handler initialized.",
    );
  })
  .catch((err) => {
    console.error("[fcapture] - settings@initializeEventHandlerPromise:", err);
  });
