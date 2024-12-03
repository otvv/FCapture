/*

FCapture

- github@otvv
- 09/25/2024

*/

// TODO import module instead of individual functions
import { getTextSize, drawText, drawCapsule } from "../utils/surface.ts";

const UPDATE_INTERVAL = 1000; // 1 second in ms

// interfaces
interface IOverlayStructure {
  backgroundColor: string;
  fontTitleColor: string;
  fontValueColor: string;
  width: number;
  height: number;
  radius: number;
  fontFamily: string;
}

interface IMetrics {
  label: string;
  value: string;
}

// overlay constraints object
const overlaySettings: Readonly<IOverlayStructure> = {
  backgroundColor: "rgba(35, 35, 35, 0.5)",
  fontTitleColor: "rgba(194, 94, 94, 1.0)",
  fontValueColor: "rgba(194, 194, 194, 1.0)",

  width: 450,
  height: 50,
  radius: 25,

  fontFamily: "bold 17px system-ui",
};



export const setupCapsuleOverlay = () => {
  let calculateMetrics: (() => { frameRate: number; frameTime: number }) | null = null;

  const calculateOverlayMetrics = (updateInterval: number = UPDATE_INTERVAL) => {
    let frameCount = 0;
    let lastTime = performance.now();
    let lastFrameTime = performance.now();
    let frameRate = 0;
    let frameTime = 0;

    return () => {
      const currentTime = performance.now();
      frameTime = currentTime - lastFrameTime; // calculate frame time
      lastFrameTime = currentTime;

      frameCount++;
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= updateInterval) {
        frameRate = (frameCount / deltaTime) * 1000; // calculate FPS
        frameCount = 0; // reset frame count
        lastTime = currentTime; // reset time
      }

      return { frameRate, frameTime };
    };
  };

  return (canvasContext: CanvasRenderingContext2D): void => {
    if (!canvasContext) {
      return;
    }

    // initialize metrics calculator
    if (!calculateMetrics) {
      calculateMetrics = calculateOverlayMetrics();
    }

    // capsule properties
    const capsuleWidth = overlaySettings.width;
    const capsuleHeight = overlaySettings.height;
    const capsuleTop = 10;
    const capsuleLeft = canvasContext.canvas.width / 2 - capsuleWidth / 2;
    const capsuleRadius = overlaySettings.radius;

    // extract calculated performance metrics
    const { frameRate, frameTime } = calculateMetrics();

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

    const metrics: IMetrics[] = [
      { label: "FPS:", value: frameRate.toFixed(0) },
      { label: "FRAMETIME:", value: `${frameTime.toFixed(2)}ms` },
    ];

    let totalTextWidth = 0;
    
    metrics.forEach(({ label, value }: IMetrics): void => {
      totalTextWidth += getTextSize(canvasContext, label)[0];
      totalTextWidth += getTextSize(canvasContext, value)[0];
    });

    const textPadding = 15;
    totalTextWidth += textPadding;

    // calculate starting x position for centering
    const capsuleCenterX = capsuleLeft + capsuleWidth / 2;
    let currentX = capsuleCenterX - totalTextWidth / 2;

    // draw metrics
    metrics.forEach(({ label, value }: IMetrics): void => {
      const labelSize = getTextSize(canvasContext, label);
      const valueSize = getTextSize(canvasContext, value);
      const baseline = capsuleTop + capsuleHeight / 2 + labelSize[1] / 2;

      drawText(canvasContext, label, currentX, baseline, fontTitleColor);
      currentX += labelSize[0] + 5;
      drawText(canvasContext, value, currentX, baseline, fontValueColor);
      currentX += valueSize[0] + textPadding;
    });
  };
};
