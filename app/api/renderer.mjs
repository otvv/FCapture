/*

FCapture

- github@otvv
- 09/25/2024

*/

import { setupOverlay } from "./overlay.mjs";
import { setupStreamFromDevice } from "./device.mjs";

const createVideoElement = (srcObject) => {
  const videoElement = document.createElement("video");

  // assign raw stream object/data to the video element
  // and perform initial configurations
  videoElement.srcObject = srcObject;
  videoElement.muted = true;
  videoElement.disablePictureInPicture = true;

  return videoElement;
}

export const renderRawFrameOnCanvas = async (canvasElement, canvasContext) => {
  try {
    const rawStreamData = await setupStreamFromDevice();

    if (!rawStreamData) {
      return;
    }

    const temporaryVideoElement = createVideoElement(rawStreamData);

    if (temporaryVideoElement === null) {
      console.error(
        "[fcapture] - renderer@renderRawFrameOnCanvas: failed to create temporary video element."
      );
      return {};
    }

    // start video playback muted
    // (to avoid duplicated sound)
    await temporaryVideoElement
      .play()
      .catch((err) => {
        console.error(
          "[fcapture] - renderer@temporaryVideoElementPromise:",
          err
        );
      });

    // setup overlay (will only display if you are in debug mode)
    // or if you manually enable it (passing true as an argument)
    const drawOverlay = setupOverlay();

    const drawFrameOnScreen = async () => {
      if (
        temporaryVideoElement.readyState ===
        temporaryVideoElement.HAVE_ENOUGH_DATA
      ) {
        // setup canvas element using the data pulled
        // from the rawStream object (the user will have the option to change this later)
        canvasElement.width = temporaryVideoElement.videoWidth;
        canvasElement.height = temporaryVideoElement.videoHeight;

        if (canvasContext.isContextLost() || !canvasContext) {
          temporaryVideoElement = null;
          return;
        }

        // clean old frames
        canvasContext.clearRect(
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );

        // image smoothing when resizing
        canvasContext.imageSmoothingEnabled = true;
        canvasContext.imageSmoothingQuality = "high";

        // apply temporary image filters
        canvasElement.style.filter =
          "brightness(1.05) contrast(0.95) saturate(0.95)";

        // draw new frame
        canvasContext.drawImage(
          temporaryVideoElement,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );

        // DEBUG PURPOSES ONLY
        if (drawOverlay) {
          drawOverlay(canvasContext, canvasElement, rawStreamData);
        }
      }

      // render frames recursively
      requestAnimationFrame(drawFrameOnScreen);
    };

    // continue rendering frames
    requestAnimationFrame(drawFrameOnScreen);

    // handle window audio context and gaing node
    const audioContext = new window.AudioContext();
    const audioSource = audioContext.createMediaStreamSource(rawStreamData);

    // gain node to control volume (mute/unmute)
    const gainNode = audioContext.createGain();

    // connect audio source to gain node to audio output
    audioSource.connect(gainNode);
    gainNode.connect(audioContext.destination);

    return { rawStreamData, gainNode, temporaryVideoElement };
  } catch (err) {
    console.log("[fcapture] - renderRawFrameOnCanvas:", err);
  }
};
