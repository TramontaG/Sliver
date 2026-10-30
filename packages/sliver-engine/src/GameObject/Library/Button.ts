import { GameObject } from "..";
import type { CanvasController } from "../../CanvasController";
import type { GameEvent } from "../../Events";
import { onClick, onHover, onStopHovering } from "../../Events/decorators";
import { Vector } from "../../Lib/Vector";
import { SquareHitbox } from "../Hitboxes";

class Button extends GameObject {
  constructor(
    name: string,
    position: Vector,
    private size: Vector,
    private label: string,
    private color: string = "red",
    private textcolor: string = "black",
    private onClick: (obj: Button) => void = () => {}
  ) {
    super(name, position);
    this.setRenderFunction(this.renderButton);

    this.addHitbox(
      new SquareHitbox(Vector.zero(), this.size, this, { solid: false })
    );
  }

  private renderButton(obj: GameObject, canvas: CanvasController): void {
    const shapeDrawer = canvas.getShapeDrawer();
    const pos = obj.getPosition();
    shapeDrawer.drawRectangle(
      pos.x,
      pos.y,
      this.size.x,
      this.size.y,
      this.color
    );

    shapeDrawer.drawText(
      this.label,
      pos.x + this.size.x / 2,
      pos.y + this.size.y / 2,
      this.textcolor
    );
  }

  @onClick<Button>((obj) => {
    obj.onClick(obj);
  })
  @onHover<Button>(() => {})
  @onStopHovering<Button>(() => {})
  override handleEvent(event: GameEvent): void {
    super.handleEvent(event);
  }
}

export { Button };
