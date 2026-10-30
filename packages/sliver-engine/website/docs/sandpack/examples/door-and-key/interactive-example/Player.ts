import {
	GameObject,
	SquareHitbox,
	Vector,
	onKeyHold,
	type CanvasController,
	type GameEvent,
	type Scene,
} from "sliver-engine";

const SIZE = new Vector(20, 20);
const PLAYER_SPEED = 120;

export class Player extends GameObject {
	private pendingVelocity = Vector.zero();

	constructor(position: Vector) {
		super("player", position.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), SIZE.clone(), this, { solid: true, debug: false }),
		);
		this.setPhisics({
			immovable: false,
			affectedByGravity: false,
			mass: 1,
			friction: 0,
			restitution: 0,
		});
	}

	override tick(): void {
		this.pendingVelocity = Vector.zero();
		super.tick();
		this.speed = this.pendingVelocity.clone();
	}

	@onKeyHold<Player>("w", (obj) => obj.queueVelocity(new Vector(0, -PLAYER_SPEED)))
	@onKeyHold<Player>("a", (obj) => obj.queueVelocity(new Vector(-PLAYER_SPEED, 0)))
	@onKeyHold<Player>("s", (obj) => obj.queueVelocity(new Vector(0, PLAYER_SPEED)))
	@onKeyHold<Player>("d", (obj) => obj.queueVelocity(new Vector(PLAYER_SPEED, 0)))
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}

	private queueVelocity(delta: Vector): void {
		this.pendingVelocity.add(delta);
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const pos = this.getPosition();
		const drawer = canvas.getShapeDrawer();
		drawer.drawRectangle(pos.x, pos.y, SIZE.x, SIZE.y, "#38bdf8", true);
		drawer.drawRectangle(pos.x + 4, pos.y + 4, 4, 4, "#e0f2fe", true);
		drawer.drawRectangle(pos.x + 12, pos.y + 4, 4, 4, "#e0f2fe", true);
		drawer.drawText("player", pos.x + SIZE.x / 2, pos.y + SIZE.y + 16, "#cbd5e1", "12px");
	}
}
