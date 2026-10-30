import type { ShapeRendererFn } from "../Assets/Shapes";
import type { Vector } from "../Lib/Vector";

export const withRotation = (
  angle: number,
  shape: ShapeRendererFn
): ShapeRendererFn => {
  return (ctx, position, size) => {
    ctx.save();
    ctx.translate(position.x + size.x / 2, position.y + size.y / 2);
    ctx.rotate(angle);
    ctx.translate(-(position.x + size.x / 2), -(position.y + size.y / 2));
    shape(ctx, position, size);
    ctx.restore();
  };
};

export const withTranslation = (
  translationVector: Vector,
  shape: ShapeRendererFn
): ShapeRendererFn => {
  return (ctx, position, size) => {
    ctx.save();
    ctx.translate(translationVector.x, translationVector.y);
    shape(ctx, position, size);
    ctx.restore();
  };
};
