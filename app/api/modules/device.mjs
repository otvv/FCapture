/*

FCapture

- github@otvv
- 09/25/2024

*/

import { configObjectTemplate } from "../../configTemplate.mjs";

const ASPECT_RATIO_TABLE = Object.freeze({
  STANDARD: 4 / 3,
  WIDESCREEN: 16 / 9,
  ULTRAWIDE: 21 / 9,
  SUPER_ULTRAWIDE: 32 / 9
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

// this will be used to store the different video modes
// available for the app 
// (some of these might not work on your device)
const VIDEO_MODES = {
  "2160p60": { width: 3840, height: 2160, frameRate: 60, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "2160p30": { width: 3840, height: 2160, frameRate: 30, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  //
  "1440p60": { width: 2560, height: 1440, frameRate: 60, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "1440p30": { width: 2560, height: 1440, frameRate: 30, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  //
  "1080p60": { width: 1920, height: 1080, frameRate: 60, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "1080p30": { width: 1920, height: 1080, frameRate: 30, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  //
  "720p60": { width: 1280, height: 720, frameRate: 60, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "720p30": { width: 1280, height: 720, frameRate: 30, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  //
  "480p60": { width: 640, height: 480, frameRate: 60, aspectRatio: ASPECT_RATIO_TABLE.STANDARD },
  "480p30": { width: 640, height: 480, frameRate: 30, aspectRatio: ASPECT_RATIO_TABLE.STANDARD },
};

const AUDIO_MODES = { 
  // sometimes your device migh ignore these constraints values
  // and use its own "default" values 
  "normalQuality": { sampleRate: 48000, sampleSize: 16, channelCount: 2 }, 

  // wacky way to get the highest audio quality
  // possible from the device
  "highQuality": { sampleRate: 99999999, sampleSize: 99999999, channelCount: 99999999 },
}

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
      // console.log(`[fcapture] - device@getAvailableDevices: ${device.kind}\nlabel: ${device.label}\ndeviceId: ${device.deviceId}`);

      // prevent the device enumerator from fallbacking to a virtual device (OBS, webcam software, etc)
      if (device.label.includes(AVAILABLE_DEVICE_LABELS.OBS_VIRTUAL) || !device) {
        continue;
      }

      // filter each usb device capable ofvideo input
      if (device.kind === "videoinput" && device.label.includes(AVAILABLE_DEVICE_LABELS.USB_VIDEO)) {
        deviceInfoPayload.video.id = device.deviceId;
        deviceInfoPayload.video.label = device.label;
      }
      
      // filter each device capable of audio input
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
    console.error("[fcapture] - device@getAvailableDevices:", err);
    return null;
  }
};

export const setupStreamFromDevice = async () => {
  try {
    // get filtered device info payload
    // so the renderer can pull the video stream
    const device = await getAvailableDevices();

    if (!device) {
      console.error("[fcapture] - device@setupStreamFromDevice: invalid device payload.");
      return null;
    }

    // get video and audio mode constraints
    const videoConstraints = VIDEO_MODES[configObjectTemplate.videoMode];
    const audioConstraints = AUDIO_MODES[configObjectTemplate.audioMode];

    // setup raw input video and audio properties
    const rawMedia = await navigator.mediaDevices.getUserMedia({
      // NOTE: if device doesnt have support for any of these settings
      // it will use it's respective internal default/ideal value
      video: {
        deviceId: { exact: device.video.id },

        // set desired video quality based on the video mode selected
        width: { ideal: videoConstraints.width },
        height: { ideal: videoConstraints.height },
        frameRate: { ideal: videoConstraints.frameRate },
        aspectRatio: { exact: videoConstraints.aspectRatio },
      },
      audio: {
        deviceId: { exact: device.audio.id },

        // set desired audio quality based on the audio mode selected
        sampleRate: { ideal: audioConstraints.sampleRate },
        sampleSize: { ideal: audioConstraints.sampleSize },
        channelCount: { ideal: audioConstraints.channelCount },

        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        voiceIsolation: false,
      },
    });

    // DEBUG PURPOSES ONLY
    // console.log(
    //   "[fcapture] - device@setupStreamFromDevice:",
    //   rawMedia.getVideoTracks()[0].getCapabilities(),
    //   rawMedia.getAudioTracks()[0].getCapabilities()
    // );
    // console.log("[fcapture] device@setupStreamFromDevice raw:", rawMedia);

    if (!rawMedia) {
      console.warn(
        "[fcapture] - device@setupStreamFromDevice: raw stream input not active, is your device initialized?"
      );
      return null;
    }

    const deviceVideoSettings = rawMedia.getVideoTracks()[0].getSettings();
    const deviceAudioSettings = rawMedia.getAudioTracks()[0].getSettings();

    if (!deviceVideoSettings || !deviceAudioSettings) {
      return null;
    }

    // generate a simple object with the necessary device
    // info to populate the settings window description
    const deviceInfo = {
      width: deviceVideoSettings.width,
      height: deviceVideoSettings.height,
      frameRate: deviceVideoSettings.frameRate,
      aspectRatio: deviceVideoSettings.aspectRatio,
      //
      sampleRate: deviceAudioSettings.sampleRate,
      sampleSize: deviceAudioSettings.sampleSize,
      channelCount: deviceAudioSettings.channelCount,
    };
    
    window.ipcRenderer.send("receive-device-info", deviceInfo);

    return rawMedia;
  } catch (err) {
    console.error("[fcapture] - device@setupStreamFromDevice:", err);
    return null;
  }
};
