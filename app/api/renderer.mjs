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

export const renderRawFrameOnCanvas = async (canvasElement, canvasContext, audioContext) => {
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

    if (canvasContext.isContextLost() || !canvasContext) {
      temporaryVideoElement.srcObject = null;
      temporaryVideoElement = null;
      return;
    }

    // start video playback muted
    // (to avoid duplicated audio tracks)
    await temporaryVideoElement.play().catch((err) => {
      console.error("[fcapture] - renderer@temporaryVideoElementPromise:", err);
    });

    // apply temporary image filters
    canvasElement.style.filter =
      "brightness(1.00) contrast(0.80) saturate(0.90)";

    // setup overlay (will only display if you are in debug mode)
    // or if you manually enable it (passing true as an argument)
    const drawOverlay = setupOverlay();

    const drawFrameOnScreen = async () => {
      if (
        temporaryVideoElement.readyState ===
        temporaryVideoElement.HAVE_ENOUGH_DATA
      ) {
        // clean old frames
        canvasContext.clearRect(
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );

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

        // enable image smoothing for resized frames
        canvasContext.imageSmoothingEnabled = true;
        canvasContext.imageSmoothingQuality = "high";
      }

      // render frames recursively
      requestAnimationFrame(drawFrameOnScreen);
    };

    // setup canvas element using the data pulled
    // from the rawStream object (the user will have the option to change this later)
    canvasElement.width = temporaryVideoElement.videoWidth;
    canvasElement.height = temporaryVideoElement.videoHeight;

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
    bassBoostNode.gain.setValueAtTime(14, audioContext.currentTime); // boost level

    // set up surround
    pannerNode.panningModel = "HRTF"; // Head-Related Transfer Function for realistic 3D sound
    pannerNode.distanceModel = "linear"; // how volume will decrease over distance/switching sides
    //
    pannerNode.positionX.setValueAtTime(0, audioContext.currentTime); // X (left-right)
    pannerNode.positionY.setValueAtTime(0, audioContext.currentTime); // Y (up-down)
    pannerNode.positionZ.setValueAtTime(-1, audioContext.currentTime); // Z (front-back)
    //
    delayNode.delayTime.value = 0.05;

    // connect audio source to nodes and nodes 
    // to the audio destination (device)
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
