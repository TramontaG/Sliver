import {
  SquareHitbox,
  Vector,
  Walker,
  type GameEvent,
  type GameContext,
  type Scene,
} from "sliver-engine";
import { gridCellSize } from "../../Definitions/Grid";
import { Human } from "../Human";

class Hero extends Human {
  public walker: Walker | null = null;
  private onMoveComplete: (() => void) | null = null;

  constructor(position: Vector) {
    super("Hero", position, "Hero", 2, new Vector(16, 54));
    this.zIndex = 1;
    const hitboxSize = new Vector(16, 16).toMultiplied(0.95);
    this.addHitbox(
      new SquareHitbox(hitboxSize.toMultiplied(-0.5), hitboxSize, this, {
        solid: true,
      })
    );
  }

  override onAddedToScene(scene: Scene, context: GameContext): void {
    super.onAddedToScene(scene, context);
    if (!this.walker) {
      this.walker = new Walker(this, [], 2, false, false, {
        avoidObstacles: true,
        gridCellSize,
        pathNotFoundBehavior: "stop",
        recalculateEveryTicks: 9999,
      });
      this.walker.setOnComplete(() => {
        const callback = this.onMoveComplete;
        this.onMoveComplete = null;
        callback?.();
      });
      this.setWalker(this.walker);
    }
  }

  override handleEvent(event: GameEvent): void {
    if (event.type === "mouseButtonPressed" && event.button === 0) {
      const offset = this.scene?.getOffset() ?? Vector.zero();
      const worldX = event.x - offset.x;
      const worldY = event.y - offset.y;
      this.moveTo(new Vector(worldX, worldY));
    }
    super.handleEvent(event);
  }

  moveTo(target: Vector, onComplete?: () => void): void {
    const snapped = new Vector(
      Math.floor(target.x / gridCellSize) * gridCellSize + gridCellSize / 2,
      Math.floor(target.y / gridCellSize) * gridCellSize + gridCellSize / 2
    );
    this.onMoveComplete = onComplete ?? null;
    this.walker?.setWaypoints([snapped], false);
    this.walker?.start();
  }
}

export { Hero };
