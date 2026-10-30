import { GameObject } from "..";
import type { ShapeRendererFn } from "../../Assets/Shapes";
import type { CanvasController } from "../../CanvasController";
import type { GameEvent } from "../../Events";
import { onClick, onHover, onStopHovering } from "../../Events/decorators";
import { Vector } from "../../Lib/Vector";
import { SquareHitbox } from "../Hitboxes";

class HoverableShape extends GameObject {
  constructor(
    position: Vector,
    private size: Vector,
    private shapeRenderFn: ShapeRendererFn,
    private onHover?: (obj: HoverableShape) => void,
    private onStopHover?: (obj: HoverableShape) => void
  ) {
    super("ClickableShape", position);
    this.setRenderFunction(this.renderShape);
    this.addHitbox(new SquareHitbox(Vector.zero(), this.size, this));
  }

  private renderShape(obj: GameObject, canvas: CanvasController): void {
    const context = canvas.getContext();
    const pos = obj.getPosition();
    this.shapeRenderFn(context, pos, this.size);
  }

  @onHover<HoverableShape>((obj, event) => {
    obj.onHover ? obj.onHover(obj) : null;
  })
  @onStopHovering<HoverableShape>((obj, event) => {
    obj.onStopHover ? obj.onStopHover(obj) : null;
  })
  override handleEvent(event: GameEvent): void {}
}

export { HoverableShape };
