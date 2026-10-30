import {
	GameObject,
	SquareHitbox,
	Vector,
	type CanvasController,
	type Scene,
} from "sliver-engine";

const CHARACTER_START = new Vector(56, 56);
const CHARACTER_SIZE = 20;

export class Character extends GameObject {
	constructor() {
		super("walker-agent", CHARACTER_START.clone());
		this.addHitbox(
			new SquareHitbox(
				Vector.zero(),
				new Vector(CHARACTER_SIZE, CHARACTER_SIZE),
				this,
				{
					solid: true,
					debug: false,
				},
			),
		);
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const pos = this.getPosition();
		canvas
			.getShapeDrawer()
			.drawRectangle(pos.x, pos.y, CHARACTER_SIZE, CHARACTER_SIZE, "#fbbf24", true);
	}
}
