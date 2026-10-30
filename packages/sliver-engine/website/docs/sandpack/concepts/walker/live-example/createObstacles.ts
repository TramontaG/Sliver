import {
	GameObject,
	SquareHitbox,
	Vector,
	type CanvasController,
	type Scene,
} from "sliver-engine";

const OBSTACLE_LAYOUT = [
	{
		position: new Vector(182, 88),
		size: new Vector(54, 148),
		color: "#334155",
	},
	{
		position: new Vector(302, 88),
		size: new Vector(54, 148),
		color: "#334155",
	},
] as const;

class Obstacle extends GameObject {
	constructor(name: string, position: Vector, size: Vector, private readonly color: string) {
		super(name, position);
		this.addHitbox(
			new SquareHitbox(Vector.zero(), size, this, {
				solid: true,
				debug: false,
			}),
		);
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const pos = this.getPosition();
		canvas
			.getShapeDrawer()
			.drawRectangle(pos.x, pos.y, this.getSize().x, this.getSize().y, this.color, true);
	}

	private getSize(): Vector {
		return (this.getHitboxes()[0] as SquareHitbox).size;
	}
}

export const createObstacles = (): Obstacle[] => {
	return OBSTACLE_LAYOUT.map((item, index) => {
		return new Obstacle(
			"walker-wall-" + String(index),
			item.position.clone(),
			item.size.clone(),
			item.color,
		);
	});
};
