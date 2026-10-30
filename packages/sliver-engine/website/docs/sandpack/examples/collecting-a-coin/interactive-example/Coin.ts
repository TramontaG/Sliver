import { CircleHitbox, GameObject, SquareHitbox, Vector } from "sliver-engine";
const COIN_SIZE = 8;

export class Coin extends GameObject {
  constructor(position: Vector) {
    super("coin", position.clone());
    this.addHitbox(
      new CircleHitbox(Vector.zero(), COIN_SIZE, this, {
        solid: false,
      }),
    );
    this.setRenderFunction((obj, canvas) => {
      const pos = obj.getPosition();
      canvas
        .getShapeDrawer()
        .drawCircle(pos.x, pos.y, COIN_SIZE, "#facc15", true, false);
    });
  }

  override onColision(other: GameObject): void {
    if (other.name !== "player") return; //Unnecessary but good to have

    // Play coin collect sound
    this.getContext()?.getSoundManager().playSound("coin_pickup", {
      volume: 0.1,
    });
    // Notify the HUD that a coin is collected
    this.sendMessage("score:coin_collected", { amount: 1 });

    this.destroy();
  }
}
