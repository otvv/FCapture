/*

FCapture Preview

- github@otvv
- 09/25/2024

*/

const ASPECT_RATIO_TABLE = Object.freeze({
  STANDARD: 4 / 3,
  WIDESCREEN: 16 / 9,
  ULTRAWIDE: 21 / 9,
});

const getAvailableDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    // dummy
    const devicesPayload = { video: { id: '', name: '' }, audio: { id: '', name: ''} };

    let usbVideoFound = false;

    devices.forEach((device) => {
      console.log(
        `[fcapture-preview] - renderer@getAvailableDevices: ${device.kind}\nlabel: ${device.label}\ndeviceId: ${device.deviceId}`
      );

      // ignore OBS related devices
      if (device.label.includes("OBS Virtual Camera")) {
        return;
      }

      // filter each device for a specific type
      // TODO: improve this method later to handle more types of devices and other systems
      // where this is handled differently (Windows)
      if (device.kind === "videoinput" && device.label.includes("USB Video")) {
        devicesPayload.video.id = device.deviceId; // assign device id
        devicesPayload.video.name = device.label;
        usbVideoFound = true;
      }

      if (
        device.kind === "audioinput" &&
        device.label.includes("USB Digital Audio")
      ) {
        devicesPayload.audio.id = device.deviceId; // assign device id
        devicesPayload.audio.name = device.label;
      }
    });

    if (!usbVideoFound) {
      return null;
    }

    // return payload
    return devicesPayload;
  } catch (err) {
    console.error("[fcapture-preview] - renderer@getAvailableDevices:", err);
  }
};

export const setupStreamFromDevice = async () => {
  try {
    // get filtered device payload to pull video from
    const device = await getAvailableDevices();

    if (device === null) {
      return;
    }

    // setup raw input video and audio properties
    const rawMedia = await navigator.mediaDevices.getUserMedia({
      video: {
        // TODO: make different video modes (1080p30, 1080p60, 720p30, 720p60 and so on)
        deviceId: { exact: device.video.id },
        width: { min: 1280, ideal: 2560, max: 3840 },
        height: { min: 720, ideal: 1440, max: 2160 },
        frameRate: { min: 30, ideal: 60, max: 120 },
        aspectRatio: {
          min: ASPECT_RATIO_TABLE.STANDARD,
          ideal: ASPECT_RATIO_TABLE.WIDESCREEN,
          max: ASPECT_RATIO_TABLE.ULTRAWIDE,
        },
      },
      audio: {
        deviceId: { exact: device.audio.id },
        sampleRate: { min: 44100, ideal: 192000, max: 198000 },
        sampleSize: 24,
        channelCount: 2, // stereo = 2, mono = 1
      },
    });

    return rawMedia;
  } catch (err) {
    console.error("[fcapture-preview] - renderer@setupStreamFromDevice:", err);
  }
};
