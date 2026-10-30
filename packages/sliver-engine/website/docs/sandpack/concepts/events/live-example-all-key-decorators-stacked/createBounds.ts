import { GameObject, SquareHitbox, Vector } from "sliver-engine";

type BoundConfig = {
  name: string;
  position: Vector;
  size: Vector;
  color: string;
};

const BOUNDS: BoundConfig[] = [
  {
    name: "ceiling",
    position: new Vector(20, 20),
    size: new Vector(440, 16),
    color: "#334155",
  },
  {
    name: "floor",
    position: new Vector(20, 228),
    size: new Vector(440, 16),
    color: "#334155",
  },
  {
    name: "left-wall",
    position: new Vector(20, 36),
    size: new Vector(16, 192),
    color: "#334155",
  },
  {
    name: "right-wall",
    position: new Vector(444, 36),
    size: new Vector(16, 192),
    color: "#334155",
  },
];

class Bound extends GameObject {
  constructor(config: BoundConfig) {
    super(config.name, config.position.clone());
    this.addHitbox(
      new SquareHitbox(Vector.zero(), config.size.clone(), this, {
        solid: true,
        debug: false,
      }),
    );
    this.setPhisics({
      immovable: true,
    });
    this.setRenderFunction((obj, canvas) => {
      const pos = obj.getPosition();
      canvas
        .getShapeDrawer()
        .drawRectangle(
          pos.x,
          pos.y,
          config.size.x,
          config.size.y,
          config.color,
          true,
        );
    });
  }
}

export const createBounds = (): Bound[] => {
  return BOUNDS.map((config) => new Bound(config));
};
