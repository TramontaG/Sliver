import { GameObject } from "..";
import type { CanvasController } from "../../CanvasController";
import { Vector } from "../../Lib/Vector";

type FloatingViewOptions = {
  initialOpacity?: number;
  fadeStep?: number;
  riseSpeed?: number;
};

class FloatingView extends GameObject {
  private size: Vector;
  private color: string;
  private fadeStep: number;
  private riseSpeed: number;

  constructor(
    name: string,
    position: Vector,
    size: Vector,
    color: string,
    {
      initialOpacity = 1,
      fadeStep = 0.02,
      riseSpeed = 1,
    }: FloatingViewOptions = {}
  ) {
    super(name, position);

    this.size = size;
    this.color = color;
    this.setOpacity(Math.min(1, Math.max(0, initialOpacity)));
    this.fadeStep = fadeStep;
    this.riseSpeed = riseSpeed;

    this.setRenderFunction(this.renderView);
  }

  private renderView = (obj: GameObject, canvas: CanvasController): void => {
    const pos = obj.getPosition();
    canvas
      .getShapeDrawer()
      .drawRectangle(pos.x, pos.y, this.size.x, this.size.y, this.color, true);
  };

  override addChild(child: GameObject): void {
    super.addChild(child);
    child.setPositionRelativeToMotherShip(true);
  }

  override tick(): void {
    this.getPosition().add(new Vector(0, -this.riseSpeed));
    const nextOpacity = Math.max(0, this.getOpacity() - this.fadeStep);
    this.setOpacity(nextOpacity);

    if (nextOpacity <= 0) {
      this.destroy();
      return;
    }

    super.tick();
  }
}

export { FloatingView };
export type { FloatingViewOptions };
