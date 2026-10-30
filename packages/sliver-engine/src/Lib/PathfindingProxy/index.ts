import { CircleHitbox, type SquareHitbox } from "../../GameObject/Hitboxes";
import { Vector } from "../Vector";

class PathfindingProxy {
  public speed: Vector = Vector.zero();
  public rotation: number = 0;
  public angularVelocity: number = 0;
  public hitboxes: Array<SquareHitbox | CircleHitbox> = [];

  constructor(private position: Vector) {}

  public setPosition(position: Vector): void {
    this.position = position;
  }

  public getPosition(): Vector {
    return this.position;
  }

  public getIntendedNextPosition(): Vector {
    return this.getPosition().toAdded(this.speed);
  }

  public getRotationCenter(): Vector {
    if (this.hitboxes.length === 0) {
      return this.getPosition();
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const hitbox of this.hitboxes) {
      if (hitbox instanceof CircleHitbox) {
        const center = hitbox.getAbsolutePosition();
        minX = Math.min(minX, center.x - hitbox.radius);
        maxX = Math.max(maxX, center.x + hitbox.radius);
        minY = Math.min(minY, center.y - hitbox.radius);
        maxY = Math.max(maxY, center.y + hitbox.radius);
        continue;
      }

      const topLeft = hitbox.getAbsolutePosition();
      minX = Math.min(minX, topLeft.x);
      maxX = Math.max(maxX, topLeft.x + hitbox.size.x);
      minY = Math.min(minY, topLeft.y);
      maxY = Math.max(maxY, topLeft.y + hitbox.size.y);
    }

    return new Vector((minX + maxX) / 2, (minY + maxY) / 2);
  }
}

export { PathfindingProxy };
