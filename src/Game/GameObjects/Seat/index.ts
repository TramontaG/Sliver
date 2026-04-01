import { GameObject, SquareHitbox, Vector } from "sliver-engine";
import { gridCellSize } from "../../Definitions/Grid";

class Seat extends GameObject {
  constructor(relativePosition: Vector) {
    super("Seat", relativePosition.clone());
    const size = new Vector(gridCellSize, gridCellSize);
    this.addHitbox(
      new SquareHitbox(size.toMultiplied(-0.5), size, this, {
        solid: false,
        // debug: true,
      })
    );

    this.setRenderFunction((seat, canvas) => {
      const hitbox = seat
        .getHitboxes()
        .find((currentHitbox): currentHitbox is SquareHitbox => {
          return currentHitbox instanceof SquareHitbox;
        });

      if (!hitbox) {
        return;
      }

      const topLeft = seat.getPosition().toAdded(hitbox.offset);
      const drawer = canvas.getShapeDrawer();

      drawer.drawRectangle(
        topLeft.x,
        topLeft.y,
        hitbox.size.x,
        hitbox.size.y,
        "rgba(90, 62, 45, 0.24)",
        true
      );
      drawer.drawRectangle(
        topLeft.x,
        topLeft.y,
        hitbox.size.x,
        hitbox.size.y,
        "#5a3e2d",
        false
      );
      drawer.drawRectangle(
        topLeft.x + 4,
        topLeft.y + 4,
        Math.max(6, hitbox.size.x - 8),
        Math.max(6, hitbox.size.y - 8),
        "rgba(255, 240, 214, 0.14)",
        false
      );
    });
  }
}

export { Seat };
