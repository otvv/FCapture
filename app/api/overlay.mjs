/*

FCapture

- github@otvv
- 09/25/2024

*/

  // fake mock data
const fps = 87;
const frameTime = 12;
const refreshRate = 60;

// overlay constraints
const overlaySettings = Object.freeze({
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  borderColor: "rgba(215, 215, 215, 0.2)",
  fontTitleColor: "rgba(255, 215, 215, 1.0)",
  fontValueColor: "rgba(215, 215, 215, 1.0)",

  top: 20,
  left: 20,

  width: 450,
  height: 50,
  radius: 25,

  fontFamily: "bold 16px Arial",
});

export const drawStaticCapsuleOverlay = (canvasContext) => {
  // capsule properties
  const backgroundColor = overlaySettings.backgroundColor;
  const borderColor = overlaySettings.borderColor;
  const fontTitleColor = overlaySettings.fontTitleColor;
  const fontValueColor = overlaySettings.fontValueColor;
  const width = overlaySettings.width;
  const height = overlaySettings.height;
  const capsuleRadius = overlaySettings.radius;
  const fontFamily = overlaySettings.fontFamily;

  // set overlay properties
  canvasContext.fillStyle = backgroundColor;
  canvasContext.strokeStyle = borderColor;
  canvasContext.font = fontFamily;
  canvasContext.lineWidth = 2;

  // draw phil
  canvasContext.beginPath();
  canvasContext.moveTo(capsuleRadius, 0);
  canvasContext.lineTo(width - capsuleRadius, 0);
  canvasContext.arcTo(width, 0, width, capsuleRadius, capsuleRadius);
  canvasContext.lineTo(width, height - capsuleRadius);
  canvasContext.arcTo(width, height, width - capsuleRadius, height, capsuleRadius);
  canvasContext.lineTo(capsuleRadius, height);
  canvasContext.arcTo(0, height, 0, height - capsuleRadius, capsuleRadius);
  canvasContext.lineTo(0, capsuleRadius);
  canvasContext.arcTo(0, 0, capsuleRadius, 0, capsuleRadius);
  canvasContext.closePath();
  canvasContext.fill();
  canvasContext.stroke();

  // draw device FPS
  canvasContext.fillStyle = fontTitleColor;
  canvasContext.fillText("FPS:", 30, (height / 2));
  canvasContext.fillStyle = fontValueColor;
  canvasContext.fillText(`${fps}`, 70, (height / 2));

  // draw device FRAMETIME
  canvasContext.fillStyle = fontTitleColor;
  canvasContext.fillText("FRAMETIME:", 100, (height / 2));
  canvasContext.fillStyle = fontValueColor;
  canvasContext.fillText(`${frameTime}ms`, 205, (height / 2));

  // draw REFRESH RATE
  canvasContext.fillStyle = fontTitleColor;
  canvasContext.fillText("REFRESHRATE:", 250, (height / 2));
  canvasContext.fillStyle = fontValueColor;
  canvasContext.fillText(`${refreshRate}hz`, 380, (height / 2));
}
