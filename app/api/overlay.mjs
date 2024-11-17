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

  fontFamily: "bold 15px system-ui",
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

export const setupCapsuleOverlay = () => {
  let calculateMetrics;

  const createFrameMetricsCalculator = (updateInterval = 1000 /* 1 second in ms */) => {
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
        fps = (frameCount / deltaTime) * updateInterval; // calculate FPS
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
