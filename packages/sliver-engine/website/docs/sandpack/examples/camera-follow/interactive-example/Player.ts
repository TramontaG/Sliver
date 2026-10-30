import { GameObject, SquareHitbox, Vector } from "sliver-engine";

const PLAYER_SIZE = 24;
const WORLD_MIN_X = 80;
const WORLD_MAX_X = 920;
const SPEED_X = 120;

export class Player extends GameObject {
	private direction = 1;

	constructor(start: Vector) {
		super("player", start.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), new Vector(PLAYER_SIZE, PLAYER_SIZE), this, {
				solid: false,
				debug: false,
			}),
		);
		this.setPhisics({ immovable: false, affectedByGravity: false, friction: 0 });
		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			canvas
				.getShapeDrawer()
				.drawRectangle(pos.x, pos.y, PLAYER_SIZE, PLAYER_SIZE, "#f59e0b", true);
		});
	}

	override tick(): void {
		const x = this.getScenePosition().x;
		if (x <= WORLD_MIN_X) this.direction = 1;
		if (x >= WORLD_MAX_X) this.direction = -1;
		this.speed = new Vector(SPEED_X * this.direction, 0);
		super.tick();
	}
}
