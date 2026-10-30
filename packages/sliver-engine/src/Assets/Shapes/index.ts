import type { Vector } from "../../Lib/Vector";

export type ShapeRendererFn = (
  context: CanvasRenderingContext2D,
  position: Vector,
  size: Vector
) => void;

export * from "./Arrow";
