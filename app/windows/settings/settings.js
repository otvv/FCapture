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

const populateStreamOverview = async (canvasData, deviceData) => {
  try {
    if (descriptionTextElement === null) {
      console.log(
        "[fcapture] - settings@populateStreamOverview: failed to get the description element.",
      );
    }

    if (!canvasData) {
      descriptionTextElement.innerHTML = `
        <b>Input</b>: ${targetWidth}x${targetHeight} @ ${targetFps} FPS <i>(Device)</i><br>
        <b>Output</b>: Canvas not initialized due to canvasData being unavailable. <i>(Canvas)</i> <br>
        <b>Audio</b>: ${targetAudioChannelCount} @ ${targetAudioSampleRate} kHz - ${targetAudioSampleSize} bits <i>(Device)</i>`;
      return;
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
    const targetFps = +deviceData.frameRate.toFixed(0) || "0";
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

    // get canvas info to display
    const outputWidth = canvasData.width || "0";
    const outputHeight = canvasData.height || "0";
    const outputFps = +canvasData.frameRate || "0";

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
      if (canvasInfo && deviceInfo) {
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
    applyButton.addEventListener("click", () => {
      const updatedConfig = {
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
      window.ipcRenderer.send("update-config-info", updatedConfig);
      window.ipcRenderer.send("force-restart-stream");
    });

    // handle cancel button
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
