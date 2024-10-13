/*

FCapture

- github@otvv
- 09/25/2024

*/

import { setupOverlay } from "./overlay.mjs";

const ASPECT_RATIO_TABLE = Object.freeze({
  STANDARD: 4 / 3,
  WIDESCREEN: 16 / 9,
  ULTRAWIDE: 21 / 9,
});

// this will be filled with more devices in the future
const AVAILABLE_DEVICE_LABELS = Object.freeze({
  // generic
  USB_VIDEO: "USB Video",
  USB_AUDIO: "USB Digital Audio", // macOS
  USB_AUDIO_ALT: "USB Video", // Linux
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
      // DEBUG PURPOSES ONLY
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
        (device.label.includes(AVAILABLE_DEVICE_LABELS.USB_AUDIO) ||
          device.label.includes(AVAILABLE_DEVICE_LABELS.USB_AUDIO_ALT))
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
        deviceId: { exact: device.video.id },
        
        // wacky way to get the highest possible 
        // image quality from the device
        // TODO: make different video modes (1080p30, 1080p60, 720p30, 720p60)
        width: { ideal: 99999999 }, 
        height: { ideal: 99999999 },
        frameRate: { ideal: 99999999 },
        bitrate: { ideal: 99999999 },
        //
        aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN,
      },
      audio: {
        deviceId: { exact: device.audio.id },
        
        // wacky way to get the highest possible 
        // audio quality from the device
        // TODO: add an option to only passthrough audio
        sampleRate: { ideal: 99999999 },
        sampleSize: { ideal: 99999999 },
        channelCount: { ideal: 99999999 },
        //
        echoCancellation: false,
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

  // assign raw stream data to this temporary player
  temporaryVideoElement.srcObject = rawStreamData;

  // start video playback muted
  // (to avoid duplicated sound)
  await temporaryVideoElement
    .play()
    .then(() => {
      temporaryVideoElement.muted = true;
      temporaryVideoElement.disablePictureInPicture = true;
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
      canvasElement.style.filter =
        "brightness(1.0) contrast(0.95) saturate(1.0)";

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
        drawOverlay(canvasContext, temporaryVideoElement, rawStreamData);
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

  return { rawStreamData, gainNode };
};
