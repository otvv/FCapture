/*

FCapture

- github@otvv
- 09/25/2024

*/

export const getTextSize = (canvasContext: CanvasRenderingContext2D, textString: string) => {
  const textMetrics = canvasContext.measureText(textString);
  const textWidth = textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft;
  const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

  return [+textWidth, +textHeight];
};

export const drawText = (
  canvasContext: CanvasRenderingContext2D,
  textString: string,
  x: number,
  y: number,
  color: string
): void => {
  canvasContext.fillStyle = color;
  canvasContext.fillText(textString, x, y);
};

export const drawRect = (
  canvasContext: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
): void => {
  canvasContext.fillStyle = color;
  canvasContext.fillRect(x, y, width, height);
};

export const drawRoundRect = (
  canvasContext: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string
): void => {
  canvasContext.fillStyle = color;
  canvasContext.roundRect(x, y, width, height, radius);
};

export const drawCapsule = (
  canvasContext: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string
): void => {
  canvasContext.fillStyle = color;
  canvasContext.beginPath();
  canvasContext.moveTo(x + radius, y);
  canvasContext.lineTo(x + width - radius, y);
  canvasContext.arcTo(x + width, y, x + width, y + radius, radius);
  canvasContext.lineTo(x + width, y + height - radius);
  canvasContext.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  canvasContext.lineTo(x + radius, y + height);
  canvasContext.arcTo(x, y + height, x, y + height - radius, radius);
  canvasContext.lineTo(x, y + radius);
  canvasContext.arcTo(x, y, x + radius, y, radius);
  canvasContext.closePath();
  canvasContext.fill();
};
