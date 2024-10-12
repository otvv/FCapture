/*

FCapture

- github@otvv
- 09/25/2024

*/

const UPDATE_INTERVAL = 1000; // one second in ms


// overlay constraints
const overlaySettings = Object.freeze({
  width: 280,
  height: 170,
  font: "bold 20px Arial",
  textColor: "rgb(0, 0, 0)",
  backgroundColor: "rgb(235, 235, 235)",
});

// enable the overlay only when in debug mode
export const setupOverlay = () => {
  console.log("[fcapture] - overlay@setupOverlay: DEBUG MODE", window.ipcRenderer.isInDebugMode());
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
    canvasContext.fillRect(0, 0, constraints.width, constraints.height);
    //
    canvasContext.font = constraints.font;
    canvasContext.fillStyle = constraints.textColor;
    canvasContext.fillText("CANVAS FPS:", 10, 30);
    canvasContext.fillText("INTERNAL FPS:", 10, 60);
    canvasContext.fillText("REFRESH RATE:", 10, 90);
    canvasContext.fillText("INTERNAL RES:", 10, 120);
    canvasContext.fillText("CANVAS RES:", 10, 150);
  };

  // dynamic overlay geometry
  const drawDynamicOverlay = (
    canvasContext,
    {
      canvasFps,
      internalFps,
      refreshRate,
      internalWidth,
      internalHeight,
      videoElementWidth,
      videoElementHeight,
    }
  ) => {
    canvasContext.fillText(`${canvasFps}`, 150, 30);
    canvasContext.fillText(`${internalFps}`, 180, 60);
    canvasContext.fillText(`${refreshRate}Hz`, 180, 90);
    canvasContext.fillText(`${internalWidth}x${internalHeight}`, 170, 120);
    canvasContext.fillText(
      `${videoElementWidth}x${videoElementHeight}`,
      150,
      150
    );
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
    const internalWidth =
      rawStreamData.getVideoTracks()[0].getSettings().width || "NaN";
    const internalHeight =
      rawStreamData.getVideoTracks()[0].getSettings().height || "NaN";
    const videoElementWidth = videoPlayerElement.videoWidth || "0x0";
    const videoElementHeight = videoPlayerElement.videoHeight || "0x0";

    // draw overlay
    drawStaticOverlay(canvasContext, overlaySettings);
    drawDynamicOverlay(canvasContext, {
      canvasFps,
      internalFps,
      refreshRate,
      internalWidth,
      internalHeight,
      videoElementWidth,
      videoElementHeight,
    });
  };
};
