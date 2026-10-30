import { GameObject, SquareHitbox, Vector } from "sliver-engine";

type BoundDef = { name: string; position: Vector; size: Vector };

const BOUNDS: BoundDef[] = [
	{ name: "ceiling", position: new Vector(20, 20), size: new Vector(440, 16) },
	{ name: "floor", position: new Vector(20, 284), size: new Vector(440, 16) },
	{ name: "left-wall", position: new Vector(20, 36), size: new Vector(16, 248) },
	{ name: "right-wall", position: new Vector(444, 36), size: new Vector(16, 248) },
	{ name: "door-frame-top", position: new Vector(332, 36), size: new Vector(16, 80) },
	{ name: "door-frame-bottom", position: new Vector(332, 180), size: new Vector(16, 104) },
];

class Bound extends GameObject {
	constructor(def: BoundDef) {
		super(def.name, def.position.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), def.size.clone(), this, {
				solid: true,
				debug: false,
			}),
		);
		this.setPhisics({ immovable: true });
		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			canvas
				.getShapeDrawer()
				.drawRectangle(pos.x, pos.y, def.size.x, def.size.y, "#334155", true);
		});
	}
}

export const createBounds = (): Bound[] => BOUNDS.map((def) => new Bound(def));
