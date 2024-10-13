/*

FCapture

- github@otvv
- 09/25/2024

*/

const UPDATE_INTERVAL = 1000; // one second in ms

// overlay constraints
const overlaySettings = Object.freeze({
  overlayWidth: 280,
  overlayHeight: 170,
  font: "bold 20px Arial",
  textColor: "rgb(0, 0, 0)",
  valueColor: "rgb(255, 0, 0)",
  backgroundColor: "rgba(235, 235, 235, 0.5)",
});

// enable the overlay only when in debug mode
export const setupOverlay = () => {
  // DEBUR PURPOSES ONLY
  // console.log("[fcapture] - overlay@setupOverlay: DEBUG MODE", window.ipcRenderer.isInDebugMode());
  if (!window.ipcRenderer.isInDebugMode()) {
    return false;
  }

  // state variables
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let canvasFps = 0;
  let internalFps = 0;
  let refreshRate = 0;
  let refreshRateStartTime = performance.now();

  // static overlay geometry 
  const drawStaticOverlay = (canvasContext, constraints) => {
    canvasContext.fillStyle = constraints.backgroundColor;
    canvasContext.fillRect(0, 0, constraints.overlayWidth, constraints.overlayHeight);
    //
    canvasContext.font = constraints.font;
    canvasContext.fillStyle = constraints.textColor;
    canvasContext.fillText("OUTPUT FPS:", 10, 30);
    canvasContext.fillText("INPUT FPS:", 10, 60);
    canvasContext.fillText("REFRESH RATE:", 10, 90);
    canvasContext.fillText("OUTPUT RES:", 10, 120);
    canvasContext.fillText("INPUT RES:", 10, 150);
  };

  // dynamic overlay geometry
  const drawDynamicOverlay = (
    canvasContext,
    constraints,
    {
      canvasFps,
      internalFps,
      refreshRate,
      videoElementWidth,
      videoElementHeight,
      internalWidth,
      internalHeight,
    }
  ) => {
    canvasContext.fillStyle = constraints.valueColor;
    canvasContext.fillText(`${canvasFps}`, 145, 30);
    canvasContext.fillText(`${internalFps}`, 125, 60);
    canvasContext.fillText(`${refreshRate}hz`, 175, 90);
    canvasContext.fillText(`${videoElementWidth}x${videoElementHeight}`, 125, 150);
    canvasContext.fillText(`${internalWidth}x${internalHeight}`, 155, 120);
  };

  return (canvasContext, videoPlayerElement, rawStreamData) => {
    const currentTime = performance.now();
    frameCount++;

    // update FPS and refresh rate at the defined interval (each second)
    if (currentTime - lastFrameTime >= UPDATE_INTERVAL) {
      canvasFps = frameCount;
      internalFps =
        rawStreamData.getVideoTracks()[0].getSettings().frameRate || "NaN";

      const elapsedTime = currentTime - refreshRateStartTime;
      refreshRate = (frameCount / (elapsedTime / UPDATE_INTERVAL)).toFixed(2);

      // update fps values alongside the refresh rate
      frameCount = 0;
      lastFrameTime = currentTime;
      refreshRateStartTime = currentTime;
    }

    // get some more additional info
    const videoElementWidth = videoPlayerElement.videoWidth || "0x0";
    const videoElementHeight = videoPlayerElement.videoHeight || "0x0";
    const internalWidth = rawStreamData.getVideoTracks()[0].getSettings().width || "NaN";
    const internalHeight = rawStreamData.getVideoTracks()[0].getSettings().height || "NaN";

    // draw overlay
    drawStaticOverlay(canvasContext, overlaySettings);
    drawDynamicOverlay(canvasContext, overlaySettings, {
      canvasFps,
      internalFps,
      refreshRate,
      videoElementWidth,
      videoElementHeight,
      internalWidth,
      internalHeight,
    });
  };
};
