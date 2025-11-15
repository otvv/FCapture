/*

FCapture

- github@otvv
- 09/25/2024

*/

import * as globals from "../../globals.mjs";
import { setupCapsuleOverlay } from "./overlay.mjs";
import { setupStreamFromDevice } from "./device.mjs";
import { configObjectTemplate } from "../../configTemplate.mjs";

const createVideoElement = () => {
  let cachedVideoElement = null;
  return (rawStreamData) => {
    // initialize temporary video player element
    if (!cachedVideoElement) {
      cachedVideoElement = document.createElement("video");

      // perform initial configurations and
      // assign raw stream object/data
      Object.assign(cachedVideoElement, {
        playsInline: true,
        muted: true,
        controls: false,
        disablePictureInPicture: true,
        srcObject: rawStreamData,
      });
    }

    // only update the stram data if necessary
    // (device changes, or the stream data itself changes)
    // if (cachedVideoElement.srcObject !== rawStreamData) {
    //   cachedVideoElement.srcObject = rawStreamData;
    // }

    return cachedVideoElement;
  };
};

const handleDebugOverlay = (instance, canvasContext) => {
  if (!instance) {
    try {
      instance = setupCapsuleOverlay(canvasContext);
    } catch (err) {
      console.error("[fcapture] - renderer@handleDebugOverlay:", err);
      return;
    }
  }

  // draw overlay
  if (instance) {
    instance(canvasContext);
  }
};

const createAudioNodeChain = (audioContext) => {
  const nodes = {
    gain: audioContext.createGain(),
    bassBoost: audioContext.createBiquadFilter(),
    panner: audioContext.createPanner(),
    delay: audioContext.createDelay(),
  };

  // setup bass boost
  nodes.bassBoost.type = "lowshelf";
  nodes.bassBoost.frequency.setValueAtTime(
    globals.BASS_BOOST_FREQUENCY,
    audioContext.currentTime,
  );

  // setup panner for surround sound
  nodes.panner.panningModel = "HRTF";
  nodes.panner.distanceModel = "linear";
  nodes.panner.positionX.setValueAtTime(0, audioContext.currentTime);
  nodes.panner.positionY.setValueAtTime(0, audioContext.currentTime);
  nodes.panner.positionZ.setValueAtTime(-1, audioContext.currentTime);

  return nodes;
};

const generateDrawFrameOnScreenFunction = (
  videoElement,
  offscreenCanvasElement,
  offscreenContext,
  canvasContext,
) => {
  let overlayInstance = null;
  let isProcessing = false;

  const drawFrameImageBitmap = () => {
    if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA && !isProcessing) {
      isProcessing = true;

      createImageBitmap(videoElement)
        .then((result) => {
          canvasContext.drawImage(result, 0, 0);
          result.close();

          if (configObjectTemplate.debugOverlay) {
            handleDebugOverlay(overlayInstance, canvasContext);
          }
          isProcessing = false;
        })
        .catch((err) => {
          console.error("[fcapture] - renderer@drawFrameImageBitmap:", err);
          isProcessing = false;
        });
    }
    requestAnimationFrame(drawFrameImageBitmap);
  };

  const drawFrameDoubleDraw = () => {
    if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
      try {
        offscreenContext.drawImage(videoElement, 0, 0);
        canvasContext.drawImage(offscreenCanvasElement, 0, 0);

        if (configObjectTemplate.debugOverlay) {
          handleDebugOverlay(overlayInstance, canvasContext);
        }
      } catch (err) {
        console.error("[fcapture] - renderer@drawFrameDoubleDraw:", err);
      }
    }
    requestAnimationFrame(drawFrameDoubleDraw);
  };

  const drawFrameDirectlyOnScreen = () => {
    if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
      try {
        canvasContext.drawImage(videoElement, 0, 0);

        if (configObjectTemplate.debugOverlay) {
          handleDebugOverlay(overlayInstance, canvasContext);
        }
      } catch (err) {
        console.error("[fcapture] - renderer@drawFrameDirectlyOnScreen:", err);
      }
    }
    requestAnimationFrame(drawFrameDirectlyOnScreen);
  };

  // rendering method switcher
  let drawFunction = null;
  switch (configObjectTemplate.renderingMethod) {
    case globals.RENDERING_METHOD.IMAGEBITMAP:
      drawFunction = drawFrameImageBitmap;
      break;
    case globals.RENDERING_METHOD.DOUBLEDRAW:
      drawFunction = drawFrameDoubleDraw;
      break;
    case globals.RENDERING_METHOD.DIRECTDRAW:
      drawFunction = drawFrameDirectlyOnScreen;
      break;
    default:
      drawFunction = drawFrameImageBitmap; // fallback to image bitmap for better image fidelity
      break;
  }

  return {
    start: () => requestAnimationFrame(drawFunction),
  };
};

export const renderRawFrameOnCanvas = async (
  canvasElement,
  canvasContext,
  audioContext,
) => {
  try {
    // get raw stream data from the device
    const rawStreamData = await setupStreamFromDevice();

    if (!rawStreamData) {
      return;
    }

    // create video element and perform initial configurations
    const generateVideoElement = createVideoElement();
    const videoElement = generateVideoElement(rawStreamData);

    // make sure the low latency hint is added
    // in the video player element
    if ("latencyHint" in videoElement) {
      videoElement.latencyHint = "realtime";
    }

    if (!videoElement) {
      console.error(
        "[fcapture] - renderer@renderRawFrameOnCanvas: failed to initialize temporary video element.",
      );
      return;
    }

    // start video playback
    await videoElement.play().catch((err) => {
      console.error("[fcapture] - renderer@videoElementPromise:", err);
      return;
    });

    // change canvas resolution and aspect ratio
    // to match the resolution of the video stream
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // get image brightness, contrast and saturation percentages
    const imageBrightnessValue = configObjectTemplate.imageBrightness / 100;
    const imageContrastValue = configObjectTemplate.imageContrast / 100;
    const imageSaturationValue = configObjectTemplate.imageSaturation / 100;

    // setup offscreen canvas
    const offscreenCanvasElement = new OffscreenCanvas(
      canvasElement.width,
      canvasElement.height,
    );
    const offscreenContext = offscreenCanvasElement.getContext("2d", {
      willReadFrequently: false,
      desynchronized: true,
      alpha: false,
      powerPreference: "high-performance",
    });

    // image filters setting
    if (
      configObjectTemplate.renderingMethod ===
        globals.RENDERING_METHOD.IMAGEBITMAP ||
      configObjectTemplate.renderingMethod === globals.RENDERING_METHOD.DIRECTDRAW
    ) {
      canvasContext.filter = `brightness(${imageBrightnessValue})
        contrast(${imageContrastValue})
        saturate(${imageSaturationValue})
        `;
    } else if (
      configObjectTemplate.renderingMethod === globals.RENDERING_METHOD.DOUBLEDRAW
    ) {
      offscreenContext.filter = `brightness(${imageBrightnessValue})
      contrast(${imageContrastValue})
      saturate(${imageSaturationValue})
      `;
    }

    // generate a function to draw frames using
    // the offscreen canvas
    const renderFrameOnScreen = generateDrawFrameOnScreenFunction(
      videoElement,
      offscreenCanvasElement,
      offscreenContext,
      canvasContext,
    );

    // start rendering frames
    renderFrameOnScreen.start();

    // create audio source from raw stream
    // and setup filter nodes chain
    const audioNodes = createAudioNodeChain(audioContext);
    const audioSource = audioContext.createMediaStreamSource(rawStreamData);

    // bass boost filter
    audioNodes.bassBoost.gain.setValueAtTime(
      configObjectTemplate.bassBoost ? globals.BASS_BOOST_AMOUNT : 0,
      audioContext.currentTime,
    );

    // hrtf surround filter
    audioNodes.delay.delayTime.setValueAtTime(
      configObjectTemplate.surroundAudio ? globals.SURROUND_DELAY_TIME : 0.0,
      audioContext.currentTime,
    );

    // connect audio source (device) to nodes and nodes
    // to the audio destination (final output)
    [audioSource, ...Object.values(audioNodes), audioContext.destination].reduce(
      (prev, curr) => prev.connect(curr),
    );

    return { rawStreamData, gainNode: audioNodes.gain, videoElement };
  } catch (err) {
    console.log("[fcapture] - renderer@renderRawFrameOnCanvas:", err);
    return;
  }
};
