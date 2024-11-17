/*

FCapture

- github@otvv
- 09/25/2024

*/

// overlay constraints
const overlaySettings = Object.freeze({
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  borderColor: "rgba(215, 215, 215, 0.2)",
  fontTitleColor: "rgba(255, 215, 215, 1.0)",
  fontValueColor: "rgba(215, 215, 215, 1.0)",

  width: 450,
  height: 50,
  radius: 25,

  fontFamily: "bold 15px Arial",
});

const getTextSize = (canvasContext, textString) => {
  const textMetrics = canvasContext.measureText(textString);
  const textWidth = textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft;
  const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

  return [+textWidth, +textHeight];
};

const drawText = (canvasContext, textString, x, y, color) => {
  canvasContext.fillStyle = color;
  canvasContext.fillText(textString, x, y);
};

const calculateFPS = (() => {
  let frameCount = 0;
  let lastTime = Date.now();
  let fps = 0;

  return () => {
    frameCount++;
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;

    if (deltaTime >= 1000) {
      // calculate FPS every second
      fps = (frameCount / deltaTime) * 1000; // FPS per second
      frameCount = 0; // reset the frame count
      lastTime = currentTime; // reset the time
    }
    return fps;
  };
})();

const calculateRefreshRate = (() => {
  let frameCount = 0;
  let lastTime = Date.now();
  let refreshRate = 0;

  return () => {
    frameCount++;
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;

    // calculate refresh rate every second
    if (deltaTime >= 1000) {
      // calculate refresh rate every second
      refreshRate = frameCount; // refresh rate is the number of frames per second
      frameCount = 0; // reset the frame count
      lastTime = currentTime; // reset the time
    }

    return refreshRate;
  };
})();

const calculateFrameTime = (() => {
  let lastFrameTime = Date.now();
  let frameTime = 0;

  return () => {
    const currentTime = Date.now();
    frameTime = currentTime - lastFrameTime; // time difference between the last frame and the current frame
    lastFrameTime = currentTime; // update the last frame time
    return frameTime; // return the frame time in milliseconds
  };
})();

export const drawCapsuleOverlay = (canvasElement, canvasContext) => {
  // capsule properties
  const capsuleWidth = overlaySettings.width;
  const capsuleHeight = overlaySettings.height;
  const capsuleTop = 10;
  const capsuleLeft = canvasElement.width / 2 - capsuleWidth / 2;
  const capsuleRadius = overlaySettings.radius;

  // performance metrics
  const fpsValue = calculateFPS().toFixed(0);
  const refreshRateValue = calculateRefreshRate().toFixed(0);
  const frameTimeValue = calculateFrameTime().toFixed(2);

  // overlay settings constraints
  const { backgroundColor, borderColor, fontTitleColor, fontValueColor, fontFamily } = overlaySettings;

  // set capsule overlay properties
  canvasContext.fillStyle = backgroundColor;
  canvasContext.strokeStyle = borderColor;
  canvasContext.font = fontFamily;
  canvasContext.lineWidth = 2;

  // draw capsule
  canvasContext.beginPath();
  canvasContext.moveTo(capsuleLeft + capsuleRadius, capsuleTop);
  canvasContext.lineTo(capsuleLeft + capsuleWidth - capsuleRadius, capsuleTop);
  canvasContext.arcTo(
    capsuleLeft + capsuleWidth,
    capsuleTop,
    capsuleLeft + capsuleWidth,
    capsuleTop + capsuleRadius,
    capsuleRadius
  );
  canvasContext.lineTo(capsuleLeft + capsuleWidth, capsuleTop + capsuleHeight - capsuleRadius);
  canvasContext.arcTo(
    capsuleLeft + capsuleWidth,
    capsuleTop + capsuleHeight,
    capsuleLeft + capsuleWidth - capsuleRadius,
    capsuleTop + capsuleHeight,
    capsuleRadius
  );
  canvasContext.lineTo(capsuleLeft + capsuleRadius, capsuleTop + capsuleHeight);
  canvasContext.arcTo(
    capsuleLeft,
    capsuleTop + capsuleHeight,
    capsuleLeft,
    capsuleTop + capsuleHeight - capsuleRadius,
    capsuleRadius
  );
  canvasContext.lineTo(capsuleLeft, capsuleTop + capsuleRadius);
  canvasContext.arcTo(capsuleLeft, capsuleTop, capsuleLeft + capsuleRadius, capsuleTop, capsuleRadius);
  canvasContext.closePath();
  canvasContext.fill();
  canvasContext.stroke();

  let currentX = capsuleLeft + 25;

  // draw FPS
  const fpsTextSize = getTextSize(canvasContext, "FPS:");
  const fpsTextBaseline = capsuleTop + capsuleHeight / 2 + fpsTextSize[1] / 2; // center text vertically
  drawText(canvasContext, "FPS:", currentX, fpsTextBaseline, fontTitleColor);
  currentX += fpsTextSize[0] + 5;
  drawText(canvasContext, `${fpsValue}`, currentX, fpsTextBaseline, fontValueColor);

  currentX += getTextSize(canvasContext, `${fpsValue}`)[0] + 15; // padding between FPS and FRAMETIME

  // draw FRAMETIME
  const frameTimeTextSize = getTextSize(canvasContext, "FRAMETIME:");
  const frameTimeTextBaseline = capsuleTop + capsuleHeight / 2 + frameTimeTextSize[1] / 2; // center text vertically
  drawText(canvasContext, "FRAMETIME:", currentX, frameTimeTextBaseline, fontTitleColor);
  currentX += frameTimeTextSize[0] + 5;
  drawText(canvasContext, `${frameTimeValue}ms`, currentX, frameTimeTextBaseline, fontValueColor);

  currentX += getTextSize(canvasContext, `${frameTimeValue}ms`)[0] + 15; // padding between FRAMETIME and REFRESHRATE

  // draw REFRESHRATE
  const refreshRateTextSize = getTextSize(canvasContext, "REFRESHRATE:");
  const refreshRateTextBaseline = capsuleTop + capsuleHeight / 2 + refreshRateTextSize[1] / 2; // center text vertically
  drawText(canvasContext, "REFRESHRATE:", currentX, refreshRateTextBaseline, fontTitleColor);
  currentX += refreshRateTextSize[0] + 5;
  drawText(canvasContext, `${refreshRateValue}hz`, currentX, refreshRateTextBaseline, fontValueColor);
};
