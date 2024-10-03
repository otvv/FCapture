/*

FCapture Preview

- github@otvv
- 09/25/2024

*/

const ASPECT_RATIO_TABLE = Object.freeze({
  STANDARD: (4 / 3),
  WIDESCREEN: (16 / 9),
  ULTRAWIDE: (21 / 9),
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
    const deviceInfoPayload = { video: { id: '', label: '' }, audio: { id: '', label: ''} };

    devices.forEach((device) => {
      // console.log(`[fcapture-preview] - renderer@getAvailableDevices: ${device.kind}\nlabel: ${device.label}\ndeviceId: ${device.deviceId}`);

      // ignore OBS related virtual devices
      if (device.label.includes("OBS Virtual Camera")) {
        return;
      }

      // filter each device for a specific type
      // TODO: improve this method later to handle more types of devices and/in other systems
      // where they might be handled differently (Windows)
      if (device.kind === "videoinput" && device.label.includes("USB Video")) {
        deviceInfoPayload.video.id = device.deviceId;
        deviceInfoPayload.video.label = device.label;
        usbVideoFound = true;
      }

      if (
        device.kind === "audioinput" &&
        device.label.includes("USB Digital Audio")
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
      // NOTE: if device doesnt have support for any of these settings
      // it will use the respective setting internal default/ideal value
      video: {
        // TODO: make different video modes (1080p30, 1080p60, 720p30, 720p60)
        deviceId: { exact: device.video.id },
        width: { exact: 1920 },
        height: { exact: 1080 },
        frameRate: { min: 30, ideal: 60, max: 60 },
        aspectRatio: { exact: ASPECT_RATIO_TABLE.WIDESCREEN },
      },
      // TODO: add an option to only passthrough audio, to make it easier
      // to integrate the capture device audio with an audio interface
      // or if the user just want to play while listening to music on PC for example
      audio: {
        deviceId: { exact: device.audio.id },
        sampleRate: 192000,
        sampleSize: 24,
        channelCount: 2, // stereo = 2, mono = 1
      },
    });

    // DEBUG PURPOSES ONLY
    // console.log(
    //   "[fcapture-preview] - renderer@setupStreamFromDevice capabilities:",
    //   rawMedia.getVideoTracks()[0].getCapabilities()
    // );
    // console.log("[fcapture-preview] renderer@setupStreamFromDevice rawMedia:", rawMedia);

    
    if (!rawMedia) {
      console.log(
        "[fcapture-preview] - renderer@setupStreamFromDevice: raw stream input not active, is your device initialized?"
      );
      return null;
    }

    return rawMedia;
  } catch (err) {
    console.error("[fcapture-preview] - renderer@setupStreamFromDevice:", err);
  }
};
