import { GameObject } from "..";
import type { CanvasController } from "../../CanvasController";
import type { Scene } from "../../Scenes";
import type { GameContext } from "../../Context";
import { Vector } from "../../Lib/Vector";
import { SquareHitbox } from "../Hitboxes";

class ShowOnHover extends GameObject {
  private child: GameObject;

  constructor(child: GameObject, size: Vector, position?: Vector) {
    const anchor = position ? position.clone() : child.getPosition().clone();
    super("ShowOnHover", anchor);
    this.child = child;

    // Keep the child positioned relative to this anchor so it moves along with scroll views.
    const relativeChildPosition = child
      .getPosition()
      .clone()
      .toSubtracted(anchor);
    this.child.setPosition(relativeChildPosition);
    this.child.setPositionRelativeToMotherShip(true);
    this.child.setMotherShip(this);
    this.addChild(this.child);

    this.addHitbox(new SquareHitbox(Vector.zero(), size, this));
  }

  override setContext(context: GameContext | null): void {
    super.setContext(context);
    this.child.setContext(context);
    this.child.scene = this.scene;
  }

  override render(canvas: CanvasController, scene: Scene): void {
    if (!this.hovering) return;
    this.child.render(canvas, scene);
  }
}

export { ShowOnHover };
