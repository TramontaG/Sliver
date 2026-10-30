import type { ShapeRendererFn } from ".";
import type { Vector } from "../../Lib/Vector";

export const renderArrow = (
  context: CanvasRenderingContext2D,
  position: Vector,
  size: Vector
) => {
  const centerX = position.x + size.x / 2;
  const centerY = position.y + size.y / 2;

  context.beginPath();
  context.moveTo(centerX - size.x / 2, centerY);
  context.lineTo(centerX + size.x / 2, centerY);
  context.lineTo(centerX + size.x / 2 - size.x * 0.1, centerY - size.y * 0.1);
  context.moveTo(centerX + size.x / 2, centerY);
  context.lineTo(centerX + size.x / 2 - size.x * 0.1, centerY + size.y * 0.1);
  context.stroke();
  context.closePath();
};

export const renderChevron = (
  context: CanvasRenderingContext2D,
  position: Vector,
  size: Vector
) => {
  const centerX = position.x + size.x / 2;
  const centerY = position.y + size.y / 2;

  context.beginPath();
  context.moveTo(centerX - size.x / 2, centerY - size.y / 2);
  context.lineTo(centerX, centerY);
  context.lineTo(centerX - size.x / 2, centerY + size.y / 2);
  context.stroke();
  context.closePath();
};

export type ShapeRenderOptions = {
  strokeWidth?: number;
  color?: string;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
};

export const shapeWithParams =
  (shape: ShapeRendererFn, options: ShapeRenderOptions = {}): ShapeRendererFn =>
  (context, position, size) => {
    context.save();
    context.lineWidth = options.strokeWidth || 2;
    context.strokeStyle = options.color || "black";
    context.lineCap = options.lineCap || "round";
    context.lineJoin = options.lineJoin || "round";
    shape(context, position, size);
    context.restore();
  };
