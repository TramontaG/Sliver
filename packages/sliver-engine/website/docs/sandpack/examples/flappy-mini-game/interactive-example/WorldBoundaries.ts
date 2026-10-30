import {
  GameObject,
  SquareHitbox,
  Vector,
  type CanvasController,
  type Scene,
} from "sliver-engine";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CEILING_HEIGHT,
  GROUND_HEIGHT,
} from "./constants";

// A floor that is rendered but an invisible ceiling (only hitbox, no render)

export class Ground extends GameObject {
  constructor() {
    super("ground", new Vector(0, CANVAS_HEIGHT - GROUND_HEIGHT));
    this.addHitbox(
      new SquareHitbox(
        Vector.zero(),
        new Vector(CANVAS_WIDTH, GROUND_HEIGHT),
        this,
      ),
    );
  }

  override render(canvas: CanvasController, _scene: Scene): void {
    const pos = this.getPosition();
    canvas
      .getShapeDrawer()
      .drawRectangle(
        pos.x,
        pos.y,
        CANVAS_WIDTH,
        GROUND_HEIGHT,
        "#334155",
        true,
      );
  }
}

export class Ceiling extends GameObject {
  constructor() {
    super("ceiling", Vector.zero());
    this.addHitbox(
      new SquareHitbox(
        Vector.zero(),
        new Vector(CANVAS_WIDTH, CEILING_HEIGHT),
        this,
      ),
    );
  }
}
