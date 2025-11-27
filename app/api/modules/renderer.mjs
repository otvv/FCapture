/*

FCapture

- github@otvv
- 09/25/2024

*/

import * as globals from "../../globals.mjs";
import { setupCapsuleOverlay } from "./overlay.mjs";
import { setupStreamFromDevice } from "./device.mjs";
import { configObjectTemplate } from "../../configTemplate.mjs";
import WebGLVideoRenderer from "../backend/webglRenderer.mjs";

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

    // only update the stream data if necessary
    // (device changes, or the stream data itself changes)
    // if (cachedVideoElement.srcObject !== rawStreamData) {
    //   cachedVideoElement.srcObject = rawStreamData;
    // }

    return cachedVideoElement;
  };
};

const handleDebugOverlayInstance = (instance, canvasContext) => {
  if (!instance) {
    instance = setupCapsuleOverlay(canvasContext);
  }

  instance();
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
  canvasElement,
  canvasContext,
) => {
  // let overlayInstance = null;
  let isProcessing = false;
  let webglRenderer = null;

  // software 2d drawing (direct-draw)
  const initDirectDrawRenderer = () => {
    if (!isProcessing) {
      return;
    }

    try {
      canvasContext.drawImage(videoElement, 0, 0);
    } catch (err) {
      console.error("[fcapture] - renderer@initDirectDrawRenderer:", err);
      isProcessing = false;
    }

    // if (configObjectTemplate.debugOverlay) {
    //   handleDebugOverlayInstance(overlayInstance, canvasContext);
    // }

    videoElement.requestVideoFrameCallback(initDirectDrawRenderer);
  };

  // hardware 2d drawing (webgl)
  const initWebGlRenderer = () => {
    try {
      // check if webgl is supported by the browser
      if (!WebGLVideoRenderer.isSupported()) {
        webglRenderer = null;
        return false;
      }

      // initialize webgl renderer
      if (!webglRenderer) {
        webglRenderer = new WebGLVideoRenderer(canvasElement, videoElement);
      }

      // map config percentages to shader uniform ranges
      // and apply filters at renderer initialization
      const brightness = configObjectTemplate.imageBrightness / 100 - 1.0;
      const contrast = configObjectTemplate.imageContrast / 100;
      const saturation = configObjectTemplate.imageSaturation / 100;

      webglRenderer.setParams({
        brightness,
        contrast,
        saturation,
      });

      webglRenderer.start();
      return true;
    } catch (err) {
      console.error("[fcapture] - renderer@initWebGlRenderer:", err);

      // stop webgl renderer in case something
      //  goes wrong along the way
      if (webglRenderer) {
        webglRenderer.destroy();
        webglRenderer = null;
      }
      return false;
    }
  };

  return {
    start: () => {
      if (isProcessing) {
        return;
      }

      // this will stop the app from attempting to create
      // a new renderer in case another renderer is already initialized
      isProcessing = true;

      // pick the right renderer to initialize based on
      // what the user selected as a rendering method
      if (configObjectTemplate.renderingMethod === globals.RENDERING_METHOD.WEBGL) {
        const initialized = initWebGlRenderer();

        if (initialized) {
          console.log(
            "[fcapture] - renderer@generateDrawFrameOnScreenFunction.start: webgl renderer initialized.",
          );
          return;
        }
      } else if (
        configObjectTemplate.renderingMethod === globals.RENDERING_METHOD.DIRECTDRAW
      ) {
        console.log(
          "[fcapture] - renderer@generateDrawFrameOnScreenFunction.start: directdraw renderer initialized.",
        );

        videoElement.requestVideoFrameCallback(initDirectDrawRenderer);
      }
    },
    update: () => {
      // map config percentages at runtime
      const imageBrightnessValue = configObjectTemplate.imageBrightness / 100;
      const imageContrastValue = configObjectTemplate.imageContrast / 100;
      const imageSaturationValue = configObjectTemplate.imageSaturation / 100;

      // clean context filters if webgl is in use
      // just in case the user applied them before
      // while using direct draw
      if (configObjectTemplate.renderingMethod === globals.RENDERING_METHOD.WEBGL) {
        if (!webglRenderer) {
          return;
        }

        if (canvasContext) {
          canvasContext.filter = "none";
        }

        // convert image filter settings values
        // to shader uniforms and apply them at runtime
        const brightness = imageBrightnessValue - 1.0; // 100% -> 0.0 (neutral)
        const contrast = imageContrastValue;
        const saturation = imageSaturationValue;

        webglRenderer.setParams({
          brightness,
          contrast,
          saturation,
        });
      } else if (
        configObjectTemplate.renderingMethod === globals.RENDERING_METHOD.DIRECTDRAW
      ) {
        if (webglRenderer) {
          webglRenderer = null;
        }

        // handle filters for the direct-draw rendering method
        if (canvasContext) {
          canvasContext.filter = `brightness(${imageBrightnessValue}) contrast(${imageContrastValue}) saturate(${imageSaturationValue})`;
        }
      }
    },
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
      console.error(
        "[fcapture] - renderer@renderRawFrameOnCanvas: failed to get raw stream data from device.",
      );
      return;
    }

    // create video element and perform initial configurations
    const generateVideoElementInstance = createVideoElement();
    const videoElement = generateVideoElementInstance(rawStreamData);

    if (!videoElement) {
      console.error(
        "[fcapture] - renderer@renderRawFrameOnCanvas: failed to initialize temporary video element.",
      );
      return { rawStreamData };
    }

    // make sure the low latency hint is added
    // in the video player element
    if ("latencyHint" in videoElement) {
      videoElement.latencyHint = "realtime";
    }

    // start video playback
    await videoElement.play().catch((err) => {
      console.error("[fcapture] - renderer@videoElementPromise:", err);
      return { rawStreamData };
    });

    // change canvas resolution and aspect ratio
    // to match the resolution of the video stream
    // canvasElement.width = videoElement.videoWidth;
    // canvasElement.height = videoElement.videoHeight;

    // generate a function to draw frames (choose backend inside generator)
    const renderFrameOnScreen = generateDrawFrameOnScreenFunction(
      videoElement,
      canvasElement,
      canvasContext,
    );

    // start rendering frames and
    // handle renderer runtime updates
    renderFrameOnScreen.start();
    renderFrameOnScreen.update();

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
    console.error("[fcapture] - renderer@renderRawFrameOnCanvas:", err);
    return {};
  }
};
