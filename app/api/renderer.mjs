/*

FCapture

- github@otvv
- 09/25/2024

*/

import { setupOverlay } from "./overlay.mjs";
import { setupStreamFromDevice } from "./device.mjs";
import { configObjectTemplate } from "../configTemplate.mjs";

const updateWindowState = () => {
  // request the current config data
  window.ipcRenderer.send("request-config-info");

  // handle window state update when config info is received 
  window.ipcRenderer.on("config-loaded", (configPayload) => {
    console.log(
      "[fcapture] - renderer@renderRawFrameOnCanvas: config payload received.",
      configPayload
    );

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

const createVideoElement = (srcObject) => {
  const videoElement = document.createElement("video");

  // assign raw stream object/data to the video element
  // and perform initial configurations
  videoElement.srcObject = srcObject;
  videoElement.playsInline = true;
  videoElement.muted = true;
  videoElement.controls = false;
  videoElement.disablePictureInPicture = true;

  return videoElement;
}

export const renderRawFrameOnCanvas = async (canvasElement, canvasContext, audioContext) => {
  try {
    const rawStreamData = await setupStreamFromDevice();

    if (!rawStreamData) {
      return;
    }

    // create video element and perform initial configurations
    const temporaryVideoElement = createVideoElement(rawStreamData);

    if (temporaryVideoElement === null) {
      console.error(
        "[fcapture] - renderer@renderRawFrameOnCanvas: failed to create temporary video element."
      );
      return;
    }

    // request data from config file
    // and update window state
    updateWindowState();

    // start video playback
    await temporaryVideoElement.play().catch((err) => {
      console.error("[fcapture] - renderer@temporaryVideoElementPromise:", err);
    });

    // get image brightness, contrast and saturation percentages
    const imageBrightnessValue = configObjectTemplate.imageBrightness / 100;
    const imageContrastValue = configObjectTemplate.imageContrast / 100;
    const imageSaturationValue = configObjectTemplate.imageSaturation / 100;

    // change canvas resolution and aspect ratio
    // to match the resolution of the video stream
    canvasElement.width = temporaryVideoElement.videoWidth;
    canvasElement.height = temporaryVideoElement.videoHeight;

    // image filters
    canvasElement.style.filter = `brightness(${imageBrightnessValue}) contrast(${imageContrastValue}) saturate(${imageSaturationValue})`;

    // image rendering quality priority
    canvasElement.style.imageRendering = configObjectTemplate.imageRenderingPriority;

    const drawFrameOnScreen = async () => {
      if (temporaryVideoElement.readyState === temporaryVideoElement.HAVE_ENOUGH_DATA) {
        
        // draw new frame
        canvasContext.drawImage(
          temporaryVideoElement,
          0,
          0,
          temporaryVideoElement.videoWidth,
          temporaryVideoElement.videoHeight,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
      }

      // enable debug overlay
      if (configObjectTemplate.debugOverlay) {
        const drawOverlay = setupOverlay();

        if (drawOverlay) {
          drawOverlay(canvasContext, canvasElement, rawStreamData);
        }
      }

      // render frames recursively
      requestAnimationFrame(drawFrameOnScreen);
    };

    // continue rendering frames
    requestAnimationFrame(drawFrameOnScreen);

    // get audio source from raw stream
    const audioSource = audioContext.createMediaStreamSource(rawStreamData);

    // gain node to control volume (mute/unmute)
    const gainNode = audioContext.createGain();

    // bass boost node
    const bassBoostNode = audioContext.createBiquadFilter();

    // panner and delay nodes for surround sound
    const pannerNode = audioContext.createPanner();
    const delayNode = audioContext.createDelay();

    // set up bass boost
    bassBoostNode.type = "lowshelf";
    bassBoostNode.frequency.setValueAtTime(150, audioContext.currentTime); // frequency ceiling (will target frequencies bellow 150hz)

    if (configObjectTemplate.bassBoost) {
      bassBoostNode.gain.setValueAtTime(10, audioContext.currentTime);
    } else {
      bassBoostNode.gain.setValueAtTime(0, audioContext.currentTime);
    }

    // set up surround
    pannerNode.panningModel = "HRTF"; // Head-Related Transfer Function for realistic 3D sound
    pannerNode.distanceModel = "linear"; // how volume will decrease over distance/switching sides
    //
    pannerNode.positionX.setValueAtTime(0, audioContext.currentTime); // X (left/right)
    pannerNode.positionY.setValueAtTime(0, audioContext.currentTime); // Y (up/down)
    pannerNode.positionZ.setValueAtTime(-1, audioContext.currentTime); // Z (front/back)
    //

    if (configObjectTemplate.surroundAudio) {
      delayNode.delayTime.value = 0.05;
    } else {
      delayNode.delayTime.value = 0.0;
    }

    // connect audio source (device) to nodes and nodes
    // to the audio destination (final output)
    audioSource.connect(gainNode);
    gainNode.connect(bassBoostNode);
    bassBoostNode.connect(pannerNode);
    pannerNode.connect(delayNode);
    delayNode.connect(audioContext.destination);

    return { rawStreamData, gainNode, temporaryVideoElement };
  } catch (err) {
    console.log("[fcapture] - renderRawFrameOnCanvas:", err);
  }
};
