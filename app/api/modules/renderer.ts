/*

FCapture

- github@otvv
- 09/25/2024

*/

import { setupCapsuleOverlay } from "./overlay.ts";
import { setupStreamFromDevice } from "./device.ts";
import { configObjectTemplate } from "../../configTemplate.ts";

const BASS_BOST_AMOUNT = 10;
const BASS_BOOST_FREQUENCY = 150;
const SURROUND_DELAY_TIME = 0.05;

const updateWindowState = () => {
  // request the current config data
  window.ipcRenderer.send("request-config-info");

  // handle window state update when config info is received 
  window.ipcRenderer.on("config-loaded", (configPayload) => {
    console.log("[fcapture] - renderer@updateWindowState: config payload received.");

    // update original config object template
    // using the data pulled from the config file
    if (configPayload) {
      for (const key in configPayload) {
        if (configObjectTemplate[key] !== configPayload[key]) {
          configObjectTemplate[key] = configPayload[key];
        }
      }
    }
  });
}

const createVideoElement = (() => {
  let cachedVideoElement = null;

  return (srcObject) => {
    // initialize temporary video player element
    if (!cachedVideoElement) {
      cachedVideoElement = document.createElement("video");

      // perform initial configurations
      Object.assign(cachedVideoElement, {
        playsInline: true,
        muted: true,
        controls: false,
        disablePictureInPicture: true,
      });
    }

    // assign raw stream object/data to the video element
    cachedVideoElement.srcObject = srcObject;

    return cachedVideoElement;
  };
})();

const createAudioNodeChain = (audioContext) => {
  const nodes = {
    gain: audioContext.createGain(),
    bassBoost: audioContext.createBiquadFilter(),
    panner: audioContext.createPanner(),
    delay: audioContext.createDelay()
  };

  // setup bass boost
  nodes.bassBoost.type = "lowshelf";
  nodes.bassBoost.frequency.setValueAtTime(BASS_BOOST_FREQUENCY, audioContext.currentTime);

  // setup panner for surround sound
  nodes.panner.panningModel = "HRTF";
  nodes.panner.distanceModel = "linear";
  nodes.panner.positionX.setValueAtTime(0, audioContext.currentTime);
  nodes.panner.positionY.setValueAtTime(0, audioContext.currentTime);
  nodes.panner.positionZ.setValueAtTime(-1, audioContext.currentTime);

  return nodes;
}

const generateDrawFrameOnScreenFunction = (
  temporaryVideoElement,
  offscreenCanvasElement,
  offscreenContext,
  canvasContext
) => {
  let overlayInstance = null;
  let animationId = 0;

  const createAndTransferImageBitmap = async () => {
    try {
      // create ImageBitmap from the temporary video element frame
      const imageBitmap = await createImageBitmap(temporaryVideoElement, {
        resizeWidth: offscreenCanvasElement.width,
        resizeHeight: offscreenCanvasElement.height,
        resizeQuality: "high",
      });

      // transfer the bitmap to the offscreen canvas
      offscreenContext.drawImage(imageBitmap, 0, 0);

      // draw from offscreen canvas to the main canvas
      canvasContext.drawImage(offscreenCanvasElement, 0, 0);

      // setup debug overlay
      if (configObjectTemplate.debugOverlay) {
        if (!overlayInstance) {
          try {
            overlayInstance = setupCapsuleOverlay(canvasContext);
          } catch (err) {
            console.error("[fcapture] - renderer@drawFrameOnScreen:", err);
          }
        }

        if (overlayInstance) {
          overlayInstance(canvasContext);
        }
      }

      imageBitmap.close();
    } catch (err) {
      console.error("[fcapture] - renderer@createAndTransferImageBitmap:", err);
    }
  };

  const drawFrameOnScreen = () => {
    // more precise frame rendering
    if (temporaryVideoElement.readyState >= temporaryVideoElement.HAVE_CURRENT_DATA) {
      Promise.resolve().then(createAndTransferImageBitmap);
    }
    
    // schedule next frame
    animationId = requestAnimationFrame(drawFrameOnScreen);
  };

  return {
    start: () => {
      animationId = requestAnimationFrame(drawFrameOnScreen)
    },
    stop: () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    }
  }
};

export const renderRawFrameOnCanvas = async (canvasElement, canvasContext, audioContext) => {
  try {
    // request data from config file
    // and update window state
    // TODO: move this function to another place
    // in case it needs  to be reused
    updateWindowState();

    // get raw stream data
    // based on the parameters passed by the app
    const rawStreamData = await setupStreamFromDevice();
    
    if (!rawStreamData) {
      return;
    }
    
    // create video element and perform initial configurations
    const temporaryVideoElement = createVideoElement(rawStreamData);
    
    if (!temporaryVideoElement) {
      console.error("[fcapture] - renderer@renderRawFrameOnCanvas: failed to initialize video element.");
      return;
    }
    
    // start video playback
    await temporaryVideoElement.play().catch((err) => {
      console.error("[fcapture] - renderer@temporaryVideoElementPromise:", err);
    });
    
    // change canvas resolution and aspect ratio
    // to match the resolution of the video stream
    canvasElement.width = temporaryVideoElement.videoWidth;
    canvasElement.height = temporaryVideoElement.videoHeight;

    // get image brightness, contrast and saturation percentages
    const imageBrightnessValue = configObjectTemplate.imageBrightness / 100;
    const imageContrastValue = configObjectTemplate.imageContrast / 100;
    const imageSaturationValue = configObjectTemplate.imageSaturation / 100;

    // image filters setting and rendering quality priority setting
    canvasElement.style.filter = `brightness(${imageBrightnessValue}) contrast(${imageContrastValue}) saturate(${imageSaturationValue})`;
    canvasElement.style.imageRendering = configObjectTemplate.imageRenderingPriority;

    const offscreenCanvasElement = new OffscreenCanvas(canvasElement.width, canvasElement.height);

    const offscreenContext = offscreenCanvasElement.getContext("2d", {
      alpha: false,
      willReadFrequently: true
    });

    // generate a function to draw frames using
    // the offscreen canvas
    const renderFrameOnScreen = generateDrawFrameOnScreenFunction(
      temporaryVideoElement,
      offscreenCanvasElement,
      offscreenContext,
      canvasContext
    );

    // start rendering frames
    renderFrameOnScreen.start();

    // create audio source from raw stream
    // and setup filter nodes chain
    const audioNodes = createAudioNodeChain(audioContext);
    const audioSource = audioContext.createMediaStreamSource(rawStreamData);

    // bass boost filter
    audioNodes.bassBoost.gain.setValueAtTime(
      configObjectTemplate.bassBoost ? BASS_BOST_AMOUNT : 0,
      audioContext.currentTime
    );

    // hrtf surround filter
    audioNodes.delay.delayTime.setValueAtTime(
      configObjectTemplate.surroundAudio ? SURROUND_DELAY_TIME : 0.0,
      audioContext.currentTime
    );

    // connect audio source (device) to nodes and nodes
    // to the audio destination (final output)
    [audioSource, ...Object.values(audioNodes), audioContext.destination].reduce((prev, curr) =>
      prev.connect(curr)
    );

    return { rawStreamData, gainNode: audioNodes.gain, temporaryVideoElement };
  } catch (err) {
    console.log("[fcapture] - renderRawFrameOnCanvas:", err);
    return;
  }
};
