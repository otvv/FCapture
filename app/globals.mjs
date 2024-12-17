/*

FCapture

- github@otvv
- 09/25/2024

*/

"use strict"

// global variables
export const __dirname = import.meta.dirname;
export const __filename = import.meta.filename;
export const UPDATE_INTERVAL = 1000; // 1 second in ms
export const BASS_BOOST_AMOUNT = 9;
export const BASS_BOOST_FREQUENCY = 100;
export const SURROUND_DELAY_TIME = 0.05;

// global objects/enums
export const ASPECT_RATIO_TABLE = Object.freeze({
  STANDARD: 4 / 3,
  WIDESCREEN: 16 / 9,
  WIDESCREEN_ALT: 16 / 10,
  ULTRAWIDE: 21 / 9,
  SUPER_ULTRAWIDE: 32 / 9
});

export const DEVICE_LABELS = Object.freeze({
  USB_VIDEO: "USB Video", // macOS, Linux and Windows
  USB_AUDIO: "USB Digital Audio", // macOS and Windows
  USB_AUDIO_ALT: "USB Video", // Linux

  // software based (most likely to be ignored)
  OBS_VIRTUAL: "OBS Virtual Camera",
});

// this will be used to store the different video modes
// available for the app 
// (some of these might not work on your device)
export const VIDEO_MODES = Object.freeze({
  "2160p60": { width: 3840, height: 2160, frameRate: 60, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "2160p30": { width: 3840, height: 2160, frameRate: 30, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "1440p60": { width: 2560, height: 1440, frameRate: 60, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "1440p30": { width: 2560, height: 1440, frameRate: 30, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "1080p60": { width: 1920, height: 1080, frameRate: 60, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "1080p30": { width: 1920, height: 1080, frameRate: 30, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "720p60": { width: 1280, height: 720, frameRate: 60, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "720p30": { width: 1280, height: 720, frameRate: 30, aspectRatio: ASPECT_RATIO_TABLE.WIDESCREEN },
  "480p60": { width: 640, height: 480, frameRate: 60, aspectRatio: ASPECT_RATIO_TABLE.STANDARD },
  "480p30": { width: 640, height: 480, frameRate: 30, aspectRatio: ASPECT_RATIO_TABLE.STANDARD },
});

export const AUDIO_MODES = Object.freeze({ 
  // sometimes your device migh ignore these constraints values
  // and use its own "default" values 
  "normalQuality": { sampleRate: 48000, sampleSize: 16, channelCount: 2 }, 
  // wacky way to get the highest audio quality
  // possible from the device
  "highQuality": { sampleRate: 99999999, sampleSize: 99999999, channelCount: 99999999 },
});
