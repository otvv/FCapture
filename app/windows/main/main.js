/*

FCapture

- github@otvv
- 09/25/2024

*/

"use strict";

// element querying
const streamContainerElement = document.querySelector("#stream-container");
const canvasElement = document.querySelector("#canvas-element");
const noSignalContainerElement = document.querySelector("#no-signal-container");
const mutedIconElement = document.querySelector("#muted-icon");
const navbarContainerElement = document.querySelector("#navbar-container");
const tabsContainerElement = document.querySelector("#tabs-container");
const previewTabElement = tabsContainerElement.querySelector("#preview-tab");
const recordingsTabElement = tabsContainerElement.querySelector("#recordings-tab");
const printButtonElement = document.querySelector("#print-button");
const fullscreenButtonElement = document.querySelector("#fullscreen-button");
const settingsButtonElement = document.querySelector("#settings-button");
const muteButtonElement = document.querySelector("#mute-button");
const refreshButtonElement = document.querySelector("#refresh-button");

const configPayload = {};

const streamState = {
  canvas: null,
  canvasContext: null,
  audioContext: null,
  audioController: null,
  currentVolume: 0,
  previousVolume: 0,
  isStreamActive: false,
  isAudioTrackMuted: false,
  isFullScreen: false,
};

const cursorState = {
  lastX: -1,
  lastY: -1,
  shouldShow: false,
  hideThreshold: 3000,
};

const updateFullscreenIcon = (state) => {
  const icon = fullscreenButtonElement.querySelector(".fullscreen-icon");
  if (!icon) {
    return;
  }

  icon.classList.toggle("fa-expand", !state);
  icon.classList.toggle("fa-compress", state);
};

const updateWindowState = async () => {
  const template = await import("../../configTemplate.mjs");

  // Request the current config payload and wait for the reply before resolving.
  // This ensures callers (like handleStreamAction) observe the saved renderingMethod
  // and other settings before deciding whether to create a 2D context or a WebGL context.
  return new Promise((resolve) => {
    // request the current config payload from file
    window.ipcRenderer.send("request-config-info");

    // handle window state update when config info is received
    const onConfigLoaded = (configPayload) => {
      try {
        if (configPayload) {
          // update original config object template using the payload from the config file
          Object.assign(template.configObjectTemplate, configPayload);
        }
        // DEBUG PURPOSES ONLY
        // console.log("[fcapture] - main@updateWindowState: config payload received.");
      } finally {
        resolve();
      }
    };

    window.ipcRenderer.once("config-loaded", onConfigLoaded);

    // safety: resolve after a short timeout to avoid hanging if IPC fails
    // (keeps the app resilient; the timeout is short so we still prefer the IPC reply)
    const timeout = setTimeout(() => {
      // remove listener if still present
      try {
        window.ipcRenderer.removeListener("config-loaded", onConfigLoaded);
      } catch (e) {
        // ignore
      }
      resolve();
    }, 500);

    // Clear the timeout when config arrives
    const wrappedResolve = () => {
      clearTimeout(timeout);
      resolve();
    };

    // Replace the previous once listener with a wrapped one that clears timeout
    // window.ipcRenderer.removeAllListeners("config-loaded");
    window.ipcRenderer.once("config-loaded", (configPayload) => {
      if (configPayload) {
        Object.assign(template.configObjectTemplate, configPayload);
      }
      wrappedResolve();
    });
  });
};

const toggleStreamMute = (state) => {
  if (!streamState.audioController) {
    return;
  }

  if (state && !streamState.isAudioTrackMuted) {
    // save current volume and set gain to 0 for muting
    streamState.previousVolume = streamState.audioController.gain.value;
    streamState.audioController.gain.value = 0.0;
    streamState.isAudioTrackMuted = true;
    mutedIconElement.style.display = "block";
  } else {
    // restore previous volume after unmuting
    streamState.audioController.gain.value = streamState.previousVolume;
    streamState.isAudioTrackMuted = false;
    mutedIconElement.style.display = "none";
  }
};

const handleCursorOverStream = async (event) => {
  const template = await import("../../configTemplate.mjs");

  if (canvasElement === null || streamContainerElement === null) {
    console.error(
      `[fcapture] - main@handleCursorOverStream: canvas or stream container element not found.
       [fcapture] - main@handleCursorOverStream: please restart the window.`,
    );
  }

  if (!template) {
    return;
  }

  if (!template.configObjectTemplate.autoHideCursor) {
    cursorState.shouldShow = true;
    streamContainerElement.style.cursor = "default";
    return;
  }

  let hideCursorTimer = 0;

  const currentX = +event.clientX;
  const currentY = +event.clientY;

  if (cursorState.lastX !== -1 && cursorState.lastY !== -1) {
    if (currentX !== cursorState.lastX || currentY !== cursorState.lastY) {
      cursorState.shouldShow = true;
      streamContainerElement.style.cursor = "default";
    }
  }

  // handle position update
  cursorState.lastX = currentX;
  cursorState.lastY = currentY;

  event.target.addEventListener("mousemove", () => {
    // reset timer
    clearTimeout(hideCursorTimer);

    hideCursorTimer = setTimeout(() => {
      cursorState.shouldShow = false;
      streamContainerElement.style.cursor = "none";
    }, cursorState.hideThreshold);
  });
};

const handleStreamAction = async (action = "start") => {
  try {
    const renderer = await import("../../api/modules/renderer.mjs");

    if (canvasElement === null) {
      console.error(
        `[fcapture] - main@handleStreamAction: canvas element not found.
         [fcapture] - main@handleStreamAction: please restart the app.`,
      );
      return;
    }

    await updateWindowState();

    switch (action) {
      case "start":
        // dont do anything if the stream data is already pulled
        // in other words: if the stream is active
        if (streamState.canvas || streamState.isStreamActive) {
          console.warn(
            "[fcapture] - main@handleStreamAction: stream already active, skipping..",
          );
          return;
        }

        // initialize canvas and audio context based on
        // the desired rendering method (webgl or direct-draw)

        // TODO: clean this shit up
        const cfgModule = await import("../../configTemplate.mjs");
        const globalsModule = await import("../../globals.mjs");

        // fallback to direct-draw if the config is missing or somehow has an invalid value
        if (typeof cfgModule.configObjectTemplate.renderingMethod !== "number") {
          cfgModule.configObjectTemplate.renderingMethod =
            globalsModule.RENDERING_METHOD.DIRECTDRAW;
        }

        if (
          cfgModule.configObjectTemplate.renderingMethod ===
          globalsModule.RENDERING_METHOD.DIRECTDRAW
        ) {
          // create optimal 2d canvas for direct-draw
          streamState.canvasContext = canvasElement.getContext("2d", {
            desynchronized: true,
            willReadFrequently: false,
            alpha: false,
          });
        } else if (
          cfgModule.configObjectTemplate.renderingMethod ===
          globalsModule.RENDERING_METHOD.WEBGL
        ) {
          // remove 2d canvas when using WebGL
          streamState.canvasContext = null;
        }
        //
        streamState.audioContext = new AudioContext({ latencyHint: "interactive" });

        // render raw stream frames onto the canvas html element
        streamState.canvas = await renderer.renderRawFrameOnCanvas(
          canvasElement,
          streamState.canvasContext,
          streamState.audioContext,
        );

        // in case the user starts the app without any device connected
        // hide canvas and show the "no signal" screen
        if (!streamState.canvas) {
          if (streamState.canvasContext) {
            // clear 2d context from residual frames (if appliable)
            streamState.canvasContext.clearRect(
              0,
              0,
              canvasElement.width,
              canvasElement.height,
            );
          } else {
            // reset canvas pixel buffer if 2d canvas is unavailable
            canvasElement.width = canvasElement.width;
          }

          streamState.isStreamActive = false;
          canvasElement.style.display = "none";
          noSignalContainerElement.style.display = "flex";

          return;
        }

        // generate a simple object with the necessary canvas
        // info to populate the settings window description
        if (streamState.canvas.videoElement) {
          const canvasInfo = {
            width: streamState.canvas.videoElement.videoWidth || 0,
            height: streamState.canvas.videoElement.videoHeight || 0,
          };

          // ensure frame draws at native device resolution
          canvasElement.style.width = `${canvasInfo.width}px`;
          canvasElement.style.height = `${canvasInfo.height}px`;

          window.ipcRenderer.send("receive-canvas-info", canvasInfo);
        } else {
          window.ipcRenderer.send("receive-canvas-info", {});
        }

        // display video canvas and hide the "no signal" screen
        // if device is connected and stream feed is available
        noSignalContainerElement.style.display = "none";
        canvasElement.style.display = "block";

        // store gain node for volume control
        streamState.audioController = streamState.canvas.gainNode;

        if (streamState.audioController) {
          streamState.currentVolume = streamState.audioController.gain.value;
          streamState.isAudioTrackMuted = false;
        }

        streamState.isStreamActive = true;
        break;
      case "stop":
        if (
          !streamState.canvas ||
          !streamState.canvas.rawStreamData ||
          !streamState.canvas.videoElement ||
          !streamState.isStreamActive
        ) {
          return;
        }

        // clear canvas
        if (streamState.canvasContext) {
          streamState.canvasContext.clearRect(
            0,
            0,
            canvasElement.width,
            canvasElement.height,
          );
        } else {
          // reset canvas pixel buffer
          canvasElement.width = canvasElement.width;
        }

        // get all available tracks from the raw stream data
        const streamTracks = await streamState.canvas.rawStreamData.getTracks();

        if (!streamTracks) {
          return;
        }

        // stop all tracks from playing
        await streamTracks.forEach((track) => track.stop());
        streamState.isAudioTrackMuted = false;

        // close audio controller and context
        if (streamState.audioController) {
          streamState.audioController.disconnect();

          if (streamState.audioContext) {
            streamState.audioContext.close();
          }
        }

        // display the "no signal" screen
        mutedIconElement.style.display = "none";
        canvasElement.style.display = "none";
        noSignalContainerElement.style.display = "flex";

        // clear stream data
        {
          streamState.canvas.videoElement.srcObject = null;
          streamState.canvas = {
            rawStreamData: null,
            gainNode: null,
            videoElement: null,
          };
          streamState.canvas.videoElement = null; // just in case
          streamState.canvas = null;
          streamState.canvasContext = null;
          streamState.audioContext = null;
          streamState.audioController = null;

          //
          streamState.isStreamActive = false;
        }
        break;
      case "restart":
        if (!streamState.isStreamActive) {
          return;
        }

        await handleStreamAction("stop");
        await handleStreamAction("start");
        break;
      case "mute":
        if (!streamState.isStreamActive) {
          return;
        }

        toggleStreamMute(true);
        break;
      case "unmute":
        if (!streamState.isStreamActive) {
          return;
        }

        toggleStreamMute(false);
        break;
      default:
        await handleStreamAction("start");
        break;
    }
  } catch (err) {
    console.error("[fcapture] - main@handleStreamAction:", err);
  }
};

const handleWindowAction = async (action = "preview") => {
  try {
    if (!canvasElement) {
      return;
    }

    switch (action) {
      case "preview":
        await handleStreamAction("start");
        break;
      case "recordings":
        // TODO: handle tab switch logic here
        console.warn("[fcapture] - main@handleWindowAction: not implemented!");
        break;
      case "settings":
        window.ipcRenderer.send("open-settings");
        break;
      case "screenshot":
        if (!streamState.canvas || !streamState.isStreamActive) {
          return;
        }

        // get current frame image data
        // FIXME: this is broken when using webgl
        const dataUrl = streamState.canvasContext.canvas.toDataURL("image/png");

        // send the captured image data to the main process as an event
        // to be processed
        window.ipcRenderer.send("save-screenshot", dataUrl);
        break;
      case "fullscreen":
        if (!streamState.canvas) {
          return;
        }

        const icon = fullscreenButtonElement.querySelector(".fullscreen-icon");

        if (!icon) {
          return;
        }

        streamState.isFullScreen = !streamState.isFullScreen;

        // send event to toggle fullscreen
        window.ipcRenderer.send("toggle-fullscreen", streamState.isFullScreen);

        updateFullscreenIcon(streamState.isFullScreen);

        // DEBUG PURPOSES ONLY
        // console.log(
        //   `[fcapture] - main@handleWindowAction: ${
        //     streamState.isFullScreen
        //       ? "set main window to fullscreen."
        //       : "set main window size back to normal."
        //   }`
        // );
        break;
    }
  } catch (err) {
    console.error("[fcapture] - main@handleWindowAction:", err);
  }
};

const initializeEventHandler = async () => {
  try {
    await handleStreamAction();

    // event listeners
    window.ipcRenderer.on("start-stream", () => handleStreamAction("start"));
    window.ipcRenderer.on("stop-stream", () => handleStreamAction("stop"));
    window.ipcRenderer.on("restart-stream", () => handleStreamAction("restart"));
    window.ipcRenderer.on("mute-stream", () => handleStreamAction("mute"));
    window.ipcRenderer.on("unmute-stream", () => handleStreamAction("unmute"));

    // native DOM event listeners
    navigator.mediaDevices.ondevicechange = (_event) =>
      handleStreamAction("restart");
    mutedIconElement.addEventListener("click", () => handleStreamAction("unmute"));
    streamContainerElement.addEventListener(
      "mousemove",
      async (event) => await handleCursorOverStream(event),
    );

    if (navbarContainerElement) {
      previewTabElement.addEventListener("click", () =>
        handleWindowAction("preview"),
      );
      recordingsTabElement.addEventListener("click", () =>
        handleWindowAction("recordings"),
      );
      printButtonElement.addEventListener("click", () =>
        handleWindowAction("screenshot"),
      );
      muteButtonElement.addEventListener("click", () => {
        if (streamState.isAudioTrackMuted) {
          handleStreamAction("unmute");
        } else {
          handleStreamAction("mute");
        }
      });
      refreshButtonElement.addEventListener("click", () =>
        handleStreamAction("restart"),
      );
      fullscreenButtonElement.addEventListener("click", () =>
        handleWindowAction("fullscreen"),
      );
      settingsButtonElement.addEventListener("click", () =>
        handleWindowAction("settings"),
      );
    }
  } catch (err) {
    console.error("[fcapture] - main@initializeEventHandler:", err);
  }
};

initializeEventHandler()
  .then(() => {
    console.log(
      "[fcapture] - main@initializeEventHandlerPromise: event handler initialized.",
    );
  })
  .catch((err) => {
    console.error("[fcapture] - main@initializeEventHandlerPromise:", err);
  });
