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
  USB_VIDEO: "USB Video", // macOS, Linux and Windows
  USB_AUDIO: "USB Digital Audio", // macOS and Windows
  USB_AUDIO_ALT: "USB Video", // Linux
  // semi-generic

  // branded

  // software based
  // (most likely to be ignored)
  OBS_VIRTUAL: "OBS Virtual Camera",
});

const getAvailableDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    if (!devices) {
      return null;
    }

    // store device payload info
    const deviceInfoPayload = {
      video: { id: "", label: "" },
      audio: { id: "", label: "" },
    };

    for (const device of devices) {
      // DEBUG PURPOSES ONLY
      // console.log(`[fcapture] - renderer@getAvailableDevices: ${device.kind}\nlabel: ${device.label}\ndeviceId: ${device.deviceId}`);

      // prevent the renderer from fallbacking to the default device
      // and ignore virtual devices (OBS, etc)
      if (device.label.includes(AVAILABLE_DEVICE_LABELS.OBS_VIRTUAL)) {
        continue;
      }

      // filter each device for a specific type
      if (device.kind === "videoinput" && device.label.includes(AVAILABLE_DEVICE_LABELS.USB_VIDEO)) {
        deviceInfoPayload.video.id = device.deviceId;
        deviceInfoPayload.video.label = device.label;
      }

      if (
        device.kind === "audioinput" &&
        (device.label.includes(AVAILABLE_DEVICE_LABELS.USB_AUDIO) ||
          device.label.includes(AVAILABLE_DEVICE_LABELS.USB_AUDIO_ALT))
      ) {
        deviceInfoPayload.audio.id = device.deviceId;
        deviceInfoPayload.audio.label = device.label;
      }
    }

    return deviceInfoPayload;
  } catch (err) {
    console.error("[fcapture] - renderer@getAvailableDevices:", err);
    return null;
  }
};

export const setupStreamFromDevice = async () => {
  try {
    // get filtered device payload to pull video from
    const device = await getAvailableDevices();

    if (!device) {
      console.warn("[fcapture] - renderer@setupStreamFromDevice: invalid device payload.");
      return null;
    }

    // setup raw input video and audio properties
    const rawMedia = await navigator.mediaDevices.getUserMedia({
      // NOTE: if device doesnt have support for any of these settings
      // it will use the respective setting internal default/ideal value
      video: {
        deviceId: { exact: device.video.id },

        // wacky way to get the highest possible
        // image quality from the device
        width: { ideal: 99999999 },
        height: { ideal: 99999999 },
        frameRate: { ideal: 99999999 },

        // TODO: make different video modes (1080p30, 1080p60, 720p30, 720p60)
        aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN,
      },
      audio: {
        deviceId: { exact: device.audio.id },
        sampleRate: { ideal: 99999999 },
        sampleSize: { ideal: 99999999 },
        channelCount: { ideal: 99999999 },

        // TODO: add an option to only passthrough audio
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        voiceIsolation: false,
        latency: 0,
      },
    });

    // DEBUG PURPOSES ONLY
    // console.log(
    //   "[fcapture] - renderer@setupStreamFromDevice:",
    //   rawMedia.getVideoTracks()[0].getCapabilities(),
    //   rawMedia.getAudioTracks()[0].getCapabilities()
    // );
    // console.log("[fcapture] renderer@setupStreamFromDevice raw:", rawMedia);

    if (!rawMedia) {
      console.warn(
        "[fcapture] - renderer@setupStreamFromDevice: raw stream input not active, is your device initialized?"
      );
      return null;
    }

    return rawMedia;
  } catch (err) {
    console.error("[fcapture] - renderer@setupStreamFromDevice:", err);
    return null;
  }
};
