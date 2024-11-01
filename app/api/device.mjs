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
  USB_VIDEO: "USB Video", // macOS and Linux
  USB_AUDIO: "USB Digital Audio", // macOS
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
      return;
    }

    // dummy
    let usbDeviceFound = false;

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
        usbDeviceFound = true;
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
    // in case the desired device has not been found or initialized yet
    if (!usbDeviceFound) {
      return;
    }

    return deviceInfoPayload;
  } catch (err) {
    console.error("[fcapture] - renderer@getAvailableDevices:", err);
  }
};

export const setupStreamFromDevice = async () => {
  try {
    // get filtered device payload to pull video from
    const device = await getAvailableDevices();

    if (!device) {
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
        width: { ideal: 99999999 }, 
        height: { ideal: 99999999 },
        frameRate: { ideal: 99999999 },
        bitrate: { ideal: 99999999 },
        // TODO: make different video modes (1080p30, 1080p60, 720p30, 720p60)
        aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN,
      },
      audio: {
        deviceId: { exact: device.audio.id },
        
        // wacky way to get the highest possible 
        // audio quality from the device
        sampleRate: { ideal: 99999999 },
        sampleSize: { ideal: 99999999 },
        channelCount: { ideal: 99999999 },
        // TODO: add an option to only passthrough audio
        echoCancellation: false,
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
      console.log(
        "[fcapture] - renderer@setupStreamFromDevice: raw stream input not active, is your device initialized?"
      );
    }

    return rawMedia;
  } catch (err) {
    console.error("[fcapture] - renderer@setupStreamFromDevice:", err);
  }
};
