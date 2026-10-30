import {
	GameObject,
	SquareHitbox,
	Vector,
	onKeyHold,
	type GameEvent,
} from "sliver-engine";

const PLAYER_SIZE = 20;
const PLAYER_SPEED = 120;
const CANVAS_WIDTH = 956;
const CANVAS_HEIGHT = 380;
const MIN_X = 36;
const MAX_X = CANVAS_WIDTH - PLAYER_SIZE - 36;
const MIN_Y = 36;
const MAX_Y = CANVAS_HEIGHT - PLAYER_SIZE - 36;

export class WalkerPlayer extends GameObject {
	private pendingVelocity = Vector.zero();

	constructor(position: Vector) {
		super("player", position.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), new Vector(PLAYER_SIZE, PLAYER_SIZE), this, {
				solid: false,
				debug: false,
			}),
		);
		this.setPhisics({
			immovable: false,
			affectedByGravity: false,
			friction: 0,
			restitution: 0,
		});
		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			canvas
				.getShapeDrawer()
				.drawRectangle(pos.x, pos.y, PLAYER_SIZE, PLAYER_SIZE, "#38bdf8", true);
		});
	}

	override tick(): void {
		const pos = this.getPosition();
		this.setPosition(
			new Vector(
				Math.max(MIN_X, Math.min(MAX_X, pos.x)),
				Math.max(MIN_Y, Math.min(MAX_Y, pos.y)),
			),
		);
		this.pendingVelocity = Vector.zero();
		super.tick();
		this.speed = this.pendingVelocity.clone();
	}

	@onKeyHold<WalkerPlayer>("w", (obj) => obj.queueVelocity(new Vector(0, -PLAYER_SPEED)))
	@onKeyHold<WalkerPlayer>("a", (obj) => obj.queueVelocity(new Vector(-PLAYER_SPEED, 0)))
	@onKeyHold<WalkerPlayer>("s", (obj) => obj.queueVelocity(new Vector(0, PLAYER_SPEED)))
	@onKeyHold<WalkerPlayer>("d", (obj) => obj.queueVelocity(new Vector(PLAYER_SPEED, 0)))
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}

	private queueVelocity(delta: Vector): void {
		this.pendingVelocity.add(delta);
	}
}
