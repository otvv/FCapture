/*

FCapture

- github@otvv
- 09/25/2024

*/

import * as globals from "../../globals.mjs";
import { configObjectTemplate } from "../../configTemplate.mjs";

const getAvailableDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    if (!devices) {
      return null;
    }

    const deviceInfoPayload = {
      video: { id: "", label: "" },
      audio: { id: "", label: "" },
    };

    for (const device of devices) {
      // DEBUG PURPOSES ONLY
      // console.log(`[fcapture] - device@getAvailableDevices: ${device.kind}\nlabel: ${device.label}\ndeviceId: ${device.deviceId}`);

      // prevent the device enumerator from fallbacking to a virtual devices (OBS, webcam softwares, etc)
      if (device.label.includes(globals.DEVICE_LABELS.OBS_VIRTUAL) || !device) {
        continue;
      }

      // filter devices capable of video input
      // and the ones that match our device dictionary
      if (
        device.kind === "videoinput" &&
        device.label.includes(globals.DEVICE_LABELS.USB_VIDEO)
      ) {
        deviceInfoPayload.video.id = device.deviceId;
        deviceInfoPayload.video.label = device.label;
      }

      // filter devices capable of audio input
      // and the ones that match our device dictionary
      if (
        device.kind === "audioinput" &&
        (device.label.includes(globals.DEVICE_LABELS.USB_AUDIO) ||
          device.label.includes(globals.DEVICE_LABELS.USB_AUDIO_ALT))
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
    // get filtered device info payload for the
    // renderer to pull the video stream data
    const device = await getAvailableDevices();

    if (!device) {
      console.error(
        "[fcapture] - device@setupStreamFromDevice: invalid device payload.",
      );
      return null;
    }

    // get video and audio mode constraints
    const videoConstraints = globals.VIDEO_MODES[configObjectTemplate.videoMode];
    const audioConstraints = globals.AUDIO_MODES[configObjectTemplate.audioMode];

    // setup raw video and audio input properties
    const rawMedia = await navigator.mediaDevices.getUserMedia({
      // if device doesnt have support for one of the settings
      // provided in the dictionary it will use it's internal
      // ideal/max possible value
      //
      // NOTE: on Windows the device might fail to initialize
      // the stream if an unsupported setting is choosen
      // so make sure to know what your device can and can't do
      video: {
        deviceId: { exact: device.video.id },

        // set desired video quality based on the video mode selected
        width: { ideal: videoConstraints.width },
        height: { ideal: videoConstraints.height },
        frameRate: { ideal: videoConstraints.frameRate },
        aspectRatio: { exact: videoConstraints.aspectRatio },
        latency: { ideal: 0 },
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
        latency: { ideal: 0 },
      },
    });

    // DEBUG PURPOSES ONLY
    // console.log(
    //   "[fcapture] - device@setupStreamFromDevice:",
    //   rawMedia.getVideoTracks()[0].getCapabilities(),
    //   rawMedia.getAudioTracks()[0].getCapabilities()
    // );

    if (!rawMedia) {
      console.warn(
        "[fcapture] - device@setupStreamFromDevice: raw stream input not active, is your device initialized?",
      );
      return null;
    }

    const deviceVideoSettings = rawMedia.getVideoTracks()[0].getSettings();
    const deviceAudioSettings = rawMedia.getAudioTracks()[0].getSettings();

    if (!deviceVideoSettings || !deviceAudioSettings) {
      return null;
    }

    // generate a simple object containing the necessary device
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
