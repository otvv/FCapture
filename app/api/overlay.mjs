/*

FCapture

- github@otvv
- 09/25/2024

*/

const UPDATE_INTERVAL = 1000; // in ms

// overlay constraints
const overlaySettings = Object.freeze({
  overlayWidth: 280,
  overlayHeight: 170,
  font: "bold 20px Arial",
  textColor: "rgb(0, 0, 0)",
  valueColor: "rgb(255, 0, 0)",
  outlineColor: "rgba(0, 0, 0, 0.9)",
  backgroundColor: "rgba(235, 235, 235, 0.5)"
});

export const setupOverlay = () => {
  // enable the overlay only when in debug mode
  if (!window.ipcRenderer.isInDebugMode()) {
    return false;
  }

  // state variables
  let lastFrameTime = performance.now();
  let refreshRateStartTime = performance.now();
  let frameCount = 0;
  let outputFps = 0;
  let refreshRate = 0;

  // static overlay geometry 
  const drawStaticOverlay = (canvasContext, constraints) => {
    canvasContext.fillStyle = constraints.backgroundColor;
    canvasContext.fillRect(2, 2, constraints.overlayWidth, constraints.overlayHeight);
    //
    canvasContext.strokeStyle = constraints.outlineColor;
    canvasContext.lineWidth = 1;
    canvasContext.strokeRect(2, 2, constraints.overlayWidth, constraints.overlayHeight);
    //
    canvasContext.font = constraints.font;
    canvasContext.fillStyle = constraints.textColor;
    canvasContext.fillText("OUTPUT FPS:", 15, 30);
    canvasContext.fillText("TARGET FPS:", 15, 60);
    canvasContext.fillText("OUTPUT RES:", 15, 90);
    canvasContext.fillText("DEVICE RES:", 15, 120);
    canvasContext.fillText("REFRESH RATE:", 15, 150);
  };

  // dynamic overlay geometry
  const drawDynamicOverlay = (
    canvasContext,
    constraints,
    {
      outputFps,
      targetFps,
      refreshRate,
      outputWidth,
      outputHeight,
      targetWidth,
      targetHeight,
    }
  ) => {
    canvasContext.fillStyle = constraints.valueColor;
    canvasContext.fillText(`${outputFps}`, 155, 30);
    canvasContext.fillText(`${targetFps}`, 155, 60);
    canvasContext.fillText(`${outputWidth}x${outputHeight}`, 160, 90);
    canvasContext.fillText(`${targetWidth}x${targetHeight}`, 155, 120);
    canvasContext.fillText(`${refreshRate}hz`, 185, 150);
  };

  return (canvasContext, canvasElement, rawStreamData) => {
    if (!canvasContext || !canvasElement || !rawStreamData) {
      return;
    }

    const currentTime = performance.now();
    frameCount++;

    // update output (canvas) FPS and refresh rate at the defined interval (per second)
    if (currentTime - lastFrameTime >= UPDATE_INTERVAL) {
      outputFps = frameCount;

      const elapsedTime = currentTime - refreshRateStartTime;
      refreshRate = (frameCount / (elapsedTime / UPDATE_INTERVAL)).toFixed(1);

      // update fps alongside the refresh rate
      frameCount = 0;
      lastFrameTime = currentTime;
      refreshRateStartTime = currentTime;
    }

    // get some more additional info
    const outputWidth = canvasElement.width || "0";
    const outputHeight = canvasElement.height || "0";
    const targetWidth = rawStreamData.getVideoTracks()[0].getSettings().width || "0";
    const targetHeight = rawStreamData.getVideoTracks()[0].getSettings().height || "0";
    const targetFps = rawStreamData.getVideoTracks()[0].getSettings().frameRate || "0";

    // draw overlay
    drawStaticOverlay(canvasContext, overlaySettings);
    drawDynamicOverlay(canvasContext, overlaySettings, {
      outputFps,
      targetFps,
      refreshRate,
      outputWidth,
      outputHeight,
      targetWidth,
      targetHeight,
    });
  };
};
