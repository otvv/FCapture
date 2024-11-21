/*

FCapture

- github@otvv
- 09/25/2024

*/

export const getTextSize = (canvasContext, textString) => {
  const textMetrics = canvasContext.measureText(textString);
  const textWidth = textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft;
  const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

  return [+textWidth, +textHeight];
};

export const drawText = (canvasContext, textString, x, y, color) => {
  canvasContext.fillStyle = color;
  canvasContext.fillText(textString, x, y);
};

export const drawRect = (canvasContext, x, y, width, height, color) => {
  canvasContext.fillStyle = color;
  canvasContext.fillRect(x, y, width, height);
}

export const drawRoundRect = (canvasContext, x, y, width, height, radius, color) => {
  canvasContext.fillStyle = color;
  canvasContext.roundRect(x, y, width, height, radius, color);
}

export const drawCapsule = (canvasContext, x, y, width, height, radius, color) => {
  canvasContext.fillStyle = color;
  canvasContext.beginPath();
  canvasContext.moveTo(x + radius, y);
  canvasContext.lineTo(x + width - radius, y);
  canvasContext.arcTo(
      x + width,
      y,
      x + width,
      y + radius,
      radius
  );
  canvasContext.lineTo(x + width, y + height - radius);
  canvasContext.arcTo(
      x + width,
      y + height,
      x + width - radius,
      y + height,
      radius
  );
  canvasContext.lineTo(x + radius, y + height);
  canvasContext.arcTo(
      x,
      y + height,
      x,
      y + height - radius,
      radius
  );
  canvasContext.lineTo(x, y + radius);
  canvasContext.arcTo(x, y, x + radius, y, radius);
  canvasContext.closePath();
  canvasContext.fill();
}
