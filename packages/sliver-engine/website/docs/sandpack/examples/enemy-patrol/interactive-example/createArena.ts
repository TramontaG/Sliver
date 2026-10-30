import { GameObject, SquareHitbox, Vector, grabbable, type GameEvent } from "sliver-engine";

type ObstacleDef = {
	name: string;
	position: Vector;
	size: Vector;
	color: string;
	draggable?: boolean;
};

const BOUNDS: ObstacleDef[] = [
	{ name: "ceiling", position: new Vector(20, 20), size: new Vector(440, 16), color: "#334155" },
	{ name: "floor", position: new Vector(20, 284), size: new Vector(440, 16), color: "#334155" },
	{ name: "left-wall", position: new Vector(20, 36), size: new Vector(16, 248), color: "#334155" },
	{ name: "right-wall", position: new Vector(444, 36), size: new Vector(16, 248), color: "#334155" },
	{
		name: "block-a",
		position: new Vector(196, 92),
		size: new Vector(28, 120),
		color: "#475569",
		draggable: true,
	},
	{
		name: "block-b",
		position: new Vector(298, 132),
		size: new Vector(28, 120),
		color: "#475569",
		draggable: true,
	},
];

class Obstacle extends GameObject {
	protected readonly def: ObstacleDef;

	constructor(def: ObstacleDef) {
		super(def.name, def.position.clone());
		this.def = def;
		this.addHitbox(
			new SquareHitbox(Vector.zero(), def.size.clone(), this, {
				solid: true,
				debug: false,
			}),
		);
		this.setPhisics({ immovable: true });
		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			const drawer = canvas.getShapeDrawer();
			const fillColor =
				this.def.draggable && obj.beingGrabbed ? "#64748b" : this.def.color;
			drawer.drawRectangle(
				pos.x,
				pos.y,
				this.def.size.x,
				this.def.size.y,
				fillColor,
				true,
			);
			drawer.drawRectangle(
				pos.x,
				pos.y,
				this.def.size.x,
				this.def.size.y,
				"rgba(15,23,42,0.45)",
				false,
			);

			if (this.def.draggable) {
				drawer.drawText(
					"drag",
					pos.x + this.def.size.x / 2,
					pos.y + this.def.size.y / 2 + 4,
					"#e2e8f0",
					"10px",
					"center",
				);
			}
		});
	}
}

class DraggableObstacle extends Obstacle {
	@grabbable<DraggableObstacle>()
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}
}

export const createArena = (): Obstacle[] => {
	return BOUNDS.map((def) => {
		if (def.draggable) {
			return new DraggableObstacle(def);
		}

		return new Obstacle(def);
	});
};
