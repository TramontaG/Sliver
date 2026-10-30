import { GameObject } from "..";
import type { ShapeRendererFn } from "../../Assets/Shapes";
import type { CanvasController } from "../../CanvasController";
import type { GameEvent } from "../../Events";
import { onClick, onHover } from "../../Events/decorators";
import { Vector } from "../../Lib/Vector";
import { SquareHitbox } from "../Hitboxes";

class ClickableShape extends GameObject {
  constructor(
    position: Vector,
    private size: Vector,
    private shapeRenderFn: ShapeRendererFn,
    private onClick: (obj: ClickableShape) => void
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

  @onClick<ClickableShape>((obj, event) => {
    obj.onClick(obj);
  })
  override handleEvent(event: GameEvent): void {}
}

export { ClickableShape };
