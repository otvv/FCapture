/*

FCapture

- github@otvv
- 09/25/2024

*/

import * as globals from "../../globals.mjs";
import { setupStreamFromDevice } from "./device.mjs";
import WebGLVideoRenderer from "../backend/webglRenderer.mjs";
import { configObjectTemplate } from "../../configTemplate.mjs";

const createVideoElement = (() => {
  let cached = null;

  return (rawStream) => {
    // cache video player element to be used
    // later in case it needs to be reused
    if (!cached) {
      cached = document.createElement("video");

      Object.assign(cached, {
        playsInline: true,
        muted: true,
        controls: false,
        disablePictureInPicture: true,
        srcObject: rawStream,
      });
    } else {
      // re-assign stream data in case it
      // differs from the one currently
      // being used in the video element
      if (cached.srcObject !== rawStream) {
        cached.srcObject = rawStream;
      }
    }

    return cached;
  };
})();

const createAudioNodeChain = (audioContext) => {
  // setup audio nodes
  const nodes = {
    gain: audioContext.createGain(),
    bassBoost: audioContext.createBiquadFilter(),
    panner: audioContext.createPanner(),
    delay: audioContext.createDelay(),
  };

  // setup bass booster filter
  nodes.bassBoost.type = "lowshelf";
  nodes.bassBoost.frequency.setValueAtTime(
    globals.BASS_BOOST_FREQUENCY,
    audioContext.currentTime,
  );

  // setup HRTF panning filter
  // (fake surround filter)
  nodes.panner.panningModel = "HRTF";
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
  let isProcessing = false;
  let webglRenderer = null;

  const initDirectDrawRenderer = () => {
    if (!isProcessing) {
      return;
    }

    // draw current video frame onto 2D canvas
    canvasContext.drawImage(videoElement, 0, 0);

    // TODO: handle debug overlay

    // schedule next frame
    if (typeof videoElement.requestVideoFrameCallback === "function") {
      videoElement.requestVideoFrameCallback(initDirectDrawRenderer);
    } else {
      requestAnimationFrame(initDirectDrawRenderer);
    }
  };

  const initWebGlRenderer = () => {
    if (!WebGLVideoRenderer.isSupported()) {
      return false;
    }

    // initialize webgl renderer if it's not initialized already
    if (!webglRenderer) {
      webglRenderer = new WebGLVideoRenderer(canvasElement, videoElement);
    }

    // TODO: handle debug overlay

    const brightness = configObjectTemplate.imageBrightness / 100 - 1.0;
    const contrast = configObjectTemplate.imageContrast / 100;
    const saturation = configObjectTemplate.imageSaturation / 100;

    // set default filter values and start renderer
    webglRenderer.setParams({ brightness, contrast, saturation });
    webglRenderer.start();

    return true;
  };

  return {
    start: () => {
      if (isProcessing) {
        return;
      }

      isProcessing = true;

      // handle different rendering methods
      if (configObjectTemplate.renderingMethod === globals.RENDERING_METHOD.WEBGL) {
        const initialized = initWebGlRenderer();

        if (initialized) {
          console.log(
            "[fcapture] - renderer@generateDrawFrameOnScreenFunction: webgl renderer initialized.",
          );
          return;
        }
      } else if (
        configObjectTemplate.renderingMethod === globals.RENDERING_METHOD.DIRECTDRAW
      ) {
        console.log(
          "[fcapture] - renderer@generateDrawFrameOnScreenFunction: direct-draw renderer initialized.",
        );

        if (typeof videoElement.requestVideoFrameCallback === "function") {
          videoElement.requestVideoFrameCallback(initDirectDrawRenderer);
        } else {
          requestAnimationFrame(initDirectDrawRenderer);
        }
      }
    },

    update: () => {
      const imageBrightnessValue = configObjectTemplate.imageBrightness / 100;
      const imageContrastValue = configObjectTemplate.imageContrast / 100;
      const imageSaturationValue = configObjectTemplate.imageSaturation / 100;

      if (configObjectTemplate.renderingMethod === globals.RENDERING_METHOD.WEBGL) {
        if (!webglRenderer) {
          return;
        }

        // reset css canvas filters before applying
        // webgl texture filters
        if (canvasContext) {
          canvasContext.filter = "none";
        }

        webglRenderer.setParams({
          brightness: imageBrightnessValue - 1.0,
          contrast: imageContrastValue,
          saturation: imageSaturationValue,
        });
      } else if (
        configObjectTemplate.renderingMethod === globals.RENDERING_METHOD.DIRECTDRAW
      ) {
        if (!canvasContext) {
          return;
        }

        // reset webgl renderer before applying
        // css canvas filters
        if (webglRenderer) {
          webglRenderer.destroy();
          webglRenderer = null;
        }

        if (canvasContext) {
          canvasContext.filter = `brightness(${imageBrightnessValue}) contrast(${imageContrastValue}) saturate(${imageSaturationValue})`;
        }
      }
    },

    // TODO: expose this method so it can be used
    // to close video/audio stream data in the
    // main window events
    stop: () => {
      // stop renderers
      if (webglRenderer) {
        webglRenderer.stop();
        webglRenderer.destroy();
        webglRenderer = null;
      } else {
        // assume we're using direct-draw in case
        // webglRenderer is not available
        if (canvasContext) {
          canvasContext = null;
          canvasElement = null;
          videoElement = null;
        }
      }

      isProcessing = false;
    },
  };
};

export const renderRawFrameOnCanvas = async (
  canvasElement,
  canvasContext,
  audioContext,
) => {
  const rawStreamData = await setupStreamFromDevice();

  if (!rawStreamData) {
    console.error(
      "[fcapture] - renderer@renderRawFrameOnCanvas: failed to obtain raw stream from device.",
    );
    return {};
  }

  // initialize temporary video element
  const createVideoElementInstance = createVideoElement;
  const videoElement = createVideoElementInstance(rawStreamData);

  if (!videoElement) {
    console.error(
      "[fcapture] - renderer@renderRawFrameOnCanvas: failed to create video element.",
    );
    return { rawStreamData };
  }

  // setup optimal settings for the video element
  if ("latencyHint" in videoElement) {
    videoElement.latencyHint = "realtime";
  }

  await videoElement.play().catch((err) => {
    console.error(
      "[fcapture] - renderer@renderRawFrameOnCanvas: failed to play video.",
      err,
    );
    return { rawStreamData };
  });

  // set canvas size to match incoming video
  canvasElement.width = videoElement.videoWidth || canvasElement.width;
  canvasElement.height = videoElement.videoHeight || canvasElement.height;

  const renderFrameOnScreen = generateDrawFrameOnScreenFunction(
    videoElement,
    canvasElement,
    canvasContext,
  );

  // start renderer (webgl and direct-draw)
  renderFrameOnScreen.start();
  renderFrameOnScreen.update();

  // audio setup
  let audioNodes = null;
  let gainNode = null;

  if (audioContext) {
    audioNodes = createAudioNodeChain(audioContext);
    gainNode = audioNodes.gain;
    const audioSource = audioContext.createMediaStreamSource(rawStreamData);

    if (
      typeof audioContext.resume === "function" &&
      audioContext.state === "suspended"
    ) {
      audioContext.resume().catch(() => {});
    }

    // apply initial audio settings and filters
    audioNodes.bassBoost.gain.setValueAtTime(
      configObjectTemplate.bassBoost ? globals.BASS_BOOST_AMOUNT : 0,
      audioContext.currentTime,
    );
    audioNodes.delay.delayTime.setValueAtTime(
      configObjectTemplate.surroundAudio ? globals.SURROUND_DELAY_TIME : 0.0,
      audioContext.currentTime,
    );

    // audio node connect chain
    try {
      audioSource.connect(audioNodes.gain);
      audioNodes.gain.connect(audioNodes.bassBoost);
      audioNodes.bassBoost.connect(audioNodes.panner);
      audioNodes.panner.connect(audioNodes.delay);
      audioNodes.delay.connect(audioContext.destination);
    } catch (err) {
      console.warn(
        "[fcapture] - renderer@renderRawFrameOnCanvas: failed to connect audio nodes:",
        err,
      );
    }
  }

  return { rawStreamData, gainNode, videoElement, stop: renderFrameOnScreen.stop };
};

export default renderRawFrameOnCanvas;
