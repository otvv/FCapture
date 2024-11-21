/*

FCapture

- github@otvv
- 09/25/2024

*/

// TODO import module instead of individual functions
import { getTextSize, drawText, drawCapsule } from "../utils/surface.mjs";

const UPDATE_INTERVAL = 1000; // 1 second in ms

// overlay constraints
const overlaySettings = Object.freeze({
  backgroundColor: "rgba(35, 35, 35, 0.5)",
  fontTitleColor: "rgba(194, 94, 94, 1.0)",
  fontValueColor: "rgba(194, 194, 194, 1.0)",

  width: 450,
  height: 50,
  radius: 25,

  fontFamily: "bold 14px system-ui",
});

export const setupCapsuleOverlay = () => {
  let calculateMetrics = null;

  const createFrameMetricsCalculator = (updateInterval = UPDATE_INTERVAL) => {
    let frameCount = 0;
    let lastTime = performance.now();
    let lastFrameTime = performance.now();
    let fps = 0;
    let refreshRate = 0;
    let frameTime = 0;

    return () => {
      const currentTime = performance.now();
      frameTime = currentTime - lastFrameTime; // calculate frame time
      lastFrameTime = currentTime;

      frameCount++;
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= updateInterval) {
        fps = (frameCount / deltaTime) * 1000; // calculate FPS
        refreshRate = frameCount; // calculate refresh rate
        frameCount = 0; // reset frame count
        lastTime = currentTime; // reset time
      }

      return { fps, refreshRate, frameTime };
    };
  };

  return (canvasContext) => {
    if (!canvasContext) {
      return;
    }

    // initialize metrics calculator
    if (!calculateMetrics) {
      calculateMetrics = createFrameMetricsCalculator();
    }

    // capsule properties
    const capsuleWidth = overlaySettings.width;
    const capsuleHeight = overlaySettings.height;
    const capsuleTop = 10;
    const capsuleLeft = canvasContext.canvas.width / 2 - capsuleWidth / 2;
    const capsuleRadius = overlaySettings.radius;

    // performance metrics
    const { fps, refreshRate, frameTime } = calculateMetrics();

    // overlay settings constraints
    const { backgroundColor, fontTitleColor, fontValueColor, fontFamily } = overlaySettings;

    // set overlay font
    canvasContext.font = fontFamily;

    // draw capsule
    drawCapsule(
      canvasContext,
      capsuleLeft,
      capsuleTop,
      capsuleWidth,
      capsuleHeight,
      capsuleRadius,
      backgroundColor
    );

    let currentX = capsuleLeft + 55;

    const metrics = [
      { label: "FPS:", value: fps.toFixed(0) },
      { label: "FRAMETIME:", value: `${frameTime.toFixed(2)}ms` },
      { label: "REFRESHRATE:", value: `${refreshRate.toFixed(0)}hz` },
    ];

    // draw metrics
    metrics.forEach(({ label, value }) => {
      const labelSize = getTextSize(canvasContext, label);
      const valueSize = getTextSize(canvasContext, value);
      const baseline = capsuleTop + capsuleHeight / 2 + labelSize[1] / 2;

      drawText(canvasContext, label, currentX, baseline, fontTitleColor);
      currentX += labelSize[0] + 5;
      drawText(canvasContext, value, currentX, baseline, fontValueColor);
      currentX += valueSize[0] + 15;
    });
  };
};
