/*

FCapture Preview

- github@otvv
- 09/25/2024

*/

const ASPECT_RATIO_TABLE = Object.freeze({
  WIDESCREEN: 1.777,
  STANDARD: 1.333,
  ULTRAWIDE: 2.333,
});

export const getAvailableDevices = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();

  if (devices === null) {
    // tanjun.print('there was a problem while attempting to enumerate devices.', 'fcapture-preview', 'error');
    return {};
  }

  const devicesPayload = { video: {}, audio: {}};
  
  devices.forEach((device) => {
    // tanjun.print(`kind: ${device.kind}\nlabel: ${device.label}\ndeviceId: ${device.deviceId}`, 'fcapture-preview', 'info');
    
    // filter each device for a specific type 
    // (TODO: improve this later to handle more types of devices and other systems)
    if (device.kind === 'videoinput' && device.label.includes("USB Video")) {
      devicesPayload.video.id = device.deviceId; // assign device id
      devicesPayload.video.name = device.label;
    }

    if (device.kind === 'audioinput' && device.label.includes("USB Digital Audio")) {
      devicesPayload.audio.id = device.deviceId; // assign device id
      devicesPayload.audio.name = device.label;
    }
  });

  // return payload
  return devicesPayload;
};

export const setupStreamFromDevice = async () => {
  // get filtered device payload to pull video from
  const device = await getAvailableDevices();

  if (device === null) {
    // tanjun.print('failed to read input device payload.', 'fcapture-preview', 'error');
    return;
  }

  // setup raw input video and audio properties
  const rawMedia = await navigator.mediaDevices.getUserMedia({
    video: { // TODO: make different video modes (1080p30, 1080p60, 720p30, 720p60 and so on)
      deviceId: { exact: device.video.id },
      width: { min: 1280, ideal: 1920, max: 2560 },
      height: { min: 720, ideal: 1080, max: 1440 },
      frameRate: { min: 30, ideal: 60, max: 120 },
      aspectRatio: {
        min: ASPECT_RATIO_TABLE.STANDARD,
        ideal: ASPECT_RATIO_TABLE.WIDESCREEN,
        max: ASPECT_RATIO_TABLE.ULTRAWIDE,
      },
    },
    audio: {
      deviceId: { exact: device.audio.id },
      sampleRate: 192000,
      sampleSize: 24,
      channelCount: 2, // stereo = 2 mono = 1
    }
  })

  return rawMedia;
};
