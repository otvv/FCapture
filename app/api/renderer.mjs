/*

FCapture

- github@otvv
- 09/25/2024

*/

const ASPECT_RATIO_TABLE = Object.freeze({
  STANDARD: 4 / 3,
  WIDESCREEN: 16 / 9,
  ULTRAWIDE: 21 / 9,
});

// this will be filled with more devices in the future
const AVAILABLE_DEVICE_LABELS = Object.freeze({
  // generic
  USB_VIDEO: "USB Video",
  USB_AUDIO: "USB Digital Audio",
  // semi-generic

  // branded

  // these here will be ignored
  OBS_VIRTUAL: "OBS Virtual Camera",
});

const getAvailableDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    if (!devices) {
      return;
    }

    // dummy
    let usbVideoFound = false;

    // store device payload info
    const deviceInfoPayload = {
      video: { id: "", label: "" },
      audio: { id: "", label: "" },
    };

    devices.forEach((device) => {
      // console.log(`[fcapture] - renderer@getAvailableDevices: ${device.kind}\nlabel: ${device.label}\ndeviceId: ${device.deviceId}`);

      // ignore OBS related virtual devices
      if (device.label.includes(AVAILABLE_DEVICE_LABELS.OBS_VIRTUAL)) {
        return;
      }

      // filter each device for a specific type
      // TODO: improve this method later to handle more types of devices and/in other systems
      // where they might be handled differently (Windows)
      if (
        device.kind === "videoinput" &&
        device.label.includes(AVAILABLE_DEVICE_LABELS.USB_VIDEO)
      ) {
        deviceInfoPayload.video.id = device.deviceId;
        deviceInfoPayload.video.label = device.label;
        usbVideoFound = true;
      }

      if (
        device.kind === "audioinput" &&
        device.label.includes(AVAILABLE_DEVICE_LABELS.USB_AUDIO)
      ) {
        deviceInfoPayload.audio.id = device.deviceId;
        deviceInfoPayload.audio.label = device.label;
      }
    });

    // prevent the renderer from fallbacking to the default device
    // in case the desired device has not been found/initialized yet
    if (!usbVideoFound) {
      return null;
    }

    // return valid payload
    return deviceInfoPayload;
  } catch (err) {
    console.error("[fcapture] - renderer@getAvailableDevices:", err);
  }
};

const setupOverlay = (debugMode) => {
  if (!debugMode) {
    return () => {};
  }

  let lastFrameTime = performance.now();
  let frameCount = 0;
  let canvasFps = 0;
  let internalFps = 0;
  let refreshRate = 0;
  let refreshRateStartTime = performance.now();

  return (canvasContext, rawStreamData) => {
    const currentTime = performance.now();
    frameCount++;

    // update fps and refresh rate every second
    if (currentTime - lastFrameTime >= 1000) {
      canvasFps = frameCount || "NaN";
      internalFps = rawStreamData.getVideoTracks()[0].getSettings().frameRate || "NaN";

      const elapsedTime = currentTime - refreshRateStartTime;
      refreshRate = (frameCount / (elapsedTime / 1000)).toFixed(2) || "NaN"

      frameCount = 0;
      lastFrameTime = currentTime;
      refreshRateStartTime = currentTime;
    }

    const rectangleWidth = 255;
    const rectangleHeight = 100;
    
    // draw overlay
    canvasContext.fillStyle = 'rgba(255, 255, 255, 0.7)';
    canvasContext.fillRect(0, 0, rectangleWidth, rectangleHeight);
    canvasContext.fillStyle = 'rgba(0, 0, 0, 1.0)';
    canvasContext.font = '20px Arial';
    canvasContext.fillText(`CANVAS FPS: ${canvasFps}`, 10, 30);
    canvasContext.fillText(`RAW FPS: ${internalFps}`, 10, 60);
    canvasContext.fillText(`REFRESH RATE: ${refreshRate}Hz`, 10, 90);

  };
};

const setupStreamFromDevice = async () => {
  try {
    // get filtered device payload to pull video from
    const device = await getAvailableDevices();

    if (device === null) {
      return;
    }

    // setup raw input video and audio properties
    const rawMedia = await navigator.mediaDevices.getUserMedia({
      // NOTE: if device doesnt have support for any of these settings
      // it will use the respective setting internal default/ideal value
      video: {
        // TODO: make different video modes (1080p30, 1080p60, 720p30, 720p60)
        deviceId: { exact: device.video.id },
        width: 1280,
        height: 720,
        frameRate: 60,
        aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN,
      },
      // TODO: add an option to only passthrough audio, to make it easier
      // to integrate the capture device audio with an audio interface
      // or if the user just want to play while listening to music on PC for example
      audio: {
        deviceId: { exact: device.audio.id },
        sampleRate: 96000,
        sampleSize: 16,
        channelCount: 1,
      },
    });

    // DEBUG PURPOSES ONLY
    // console.log(
    //   "[fcapture] - renderer@setupStreamFromDevice capabilities:",
    //   rawMedia.getVideoTracks()[0].getCapabilities(),
    //   rawMedia.getAudioTracks()[0].getCapabilities()
    // );
    // console.log("[fcapture] renderer@setupStreamFromDevice raw:", rawMedia);

    if (!rawMedia) {
      console.log(
        "[fcapture] - renderer@setupStreamFromDevice: raw stream input not active, is your device initialized?"
      );
      return null;
    }

    return rawMedia;
  } catch (err) {
    console.error("[fcapture] - renderer@setupStreamFromDevice:", err);
  }
};

export const renderRawFrameOnCanvas = async (canvasElement, canvasContext) => {
  const temporaryVideoElement = document.createElement("video");
  const rawStreamData = await setupStreamFromDevice();

  if (temporaryVideoElement === null) {
    console.error(
      "[fcapture] - renderer@renderRawFrameOnCanvas: failed to create temporary video element."
    );
    return { undefined, undefined };
  }

  // setup overlay
  const drawOverlay = setupOverlay(false);

  // assign raw stream data to this temporary player
  temporaryVideoElement.srcObject = rawStreamData;

  // start video playback muted
  // (to avoid duplicated sound)
  await temporaryVideoElement
    .play()
    .then(() => (temporaryVideoElement.muted = true));

  // TODO: add an option to only passthrough audio, to make it easier
  // to integrate the capture device audio with an audio interface
  // or if the user just want to play while listening to music on PC for example
  // make sure to clear rawStreamData.video too if the option is enabled

  const drawFrameOnScreen = async () => {
    if (
      temporaryVideoElement.readyState ===
      temporaryVideoElement.HAVE_ENOUGH_DATA
    ) {
      // setup canvas element using the data pulled
      // from the rawStream object
      canvasElement.width = temporaryVideoElement.videoWidth;
      canvasElement.height = temporaryVideoElement.videoHeight;

      if (canvasContext.isContextLost() || !canvasContext) {
        return;
      }

      // clean old frames
      canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // image smoothing when resizing
      canvasContext.imageSmoothingEnabled = true;
      canvasContext.imageSmoothingQuality = "high";

      // apply temporary image filters
      canvasContext.filter = "brightness(1.0) contrast(0.8) saturate(1.0)";

      // generate a bitmap from the current video frame
      const bitmap = await createImageBitmap(temporaryVideoElement);

      // draw new frame
      canvasContext.drawImage(
        bitmap,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );

      // draw overlay
      drawOverlay(canvasContext, rawStreamData);
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

  return { rawStreamData, gainNode };
};
