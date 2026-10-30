import {
	GameObject,
	SquareHitbox,
	Vector,
	onKeyHold,
	type CanvasController,
	type GameEvent,
	type Scene,
} from "sliver-engine";

const ACTOR_SIZE = new Vector(24, 30);
const MOVE_SPEED = 120;

type Facing = "left" | "right";

export class CutsceneActor extends GameObject {
	public coins: number;
	private pendingVelocity = Vector.zero();
	private facing: Facing = "right";
	private controlsEnabled: boolean;

	constructor(
		name: string,
		position: Vector,
		private color: string,
		initialCoins: number,
		private controllable: boolean = false,
	) {
		super(name, position.clone());
		this.coins = initialCoins;
		this.controlsEnabled = controllable;
		this.addHitbox(
			new SquareHitbox(Vector.zero(), ACTOR_SIZE.clone(), this, {
				solid: controllable,
				debug: false,
			}),
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
		if (this.controllable) {
			this.pendingVelocity = Vector.zero();
			super.tick();

			const nextVelocity = this.controlsEnabled
				? this.pendingVelocity.clone()
				: Vector.zero();

			if (nextVelocity.magnitude() > MOVE_SPEED) {
				nextVelocity.normalize().multiply(MOVE_SPEED);
			}

			if (!nextVelocity.isZero()) {
				this.updateFacing(nextVelocity);
			}

			this.speed = nextVelocity;
			return;
		}

		super.tick();

		if (!this.speed.isZero()) {
			this.updateFacing(this.speed);
		}
	}

	setControlsEnabled(enabled: boolean): void {
		this.controlsEnabled = enabled;
		if (!enabled) {
			this.pendingVelocity = Vector.zero();
			this.speed = Vector.zero();
		}
	}

	getControlsEnabled(): boolean {
		return this.controlsEnabled;
	}

	getCenter(): Vector {
		return this.getScenePosition().toAdded(ACTOR_SIZE.toMultiplied(0.5));
	}

	lookAt(target: Vector): void {
		if (target.x === this.getCenter().x) return;
		this.facing = target.x > this.getCenter().x ? "right" : "left";
	}

	private queueVelocity(delta: Vector): void {
		if (!this.controllable || !this.controlsEnabled) return;
		this.pendingVelocity.add(delta);
	}

	private updateFacing(velocity: Vector): void {
		if (Math.abs(velocity.x) < 0.001) return;
		this.facing = velocity.x > 0 ? "right" : "left";
	}

	@onKeyHold<CutsceneActor>("w", (obj) => obj.queueVelocity(new Vector(0, -MOVE_SPEED)))
	@onKeyHold<CutsceneActor>("a", (obj) => obj.queueVelocity(new Vector(-MOVE_SPEED, 0)))
	@onKeyHold<CutsceneActor>("s", (obj) => obj.queueVelocity(new Vector(0, MOVE_SPEED)))
	@onKeyHold<CutsceneActor>("d", (obj) => obj.queueVelocity(new Vector(MOVE_SPEED, 0)))
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const draw = canvas.getShapeDrawer();
		const pos = this.getPosition();
		const eyeOffset = this.facing === "right" ? 14 : 8;
		const eyeColor = this.name === "elder" ? "#7c2d12" : "#0f172a";
		const accent = this.name === "elder" ? "#fdba74" : "#bae6fd";

		draw.drawCircle(
			pos.x + ACTOR_SIZE.x / 2,
			pos.y + ACTOR_SIZE.y + 2,
			8,
			"rgba(15, 23, 42, 0.45)",
			true,
			false,
		);
		draw.drawRectangle(pos.x + 4, pos.y + 12, 16, 16, this.color, true);
		draw.drawRectangle(pos.x + 3, pos.y + 26, 6, 4, "#1e293b", true);
		draw.drawRectangle(pos.x + 15, pos.y + 26, 6, 4, "#1e293b", true);
		draw.drawCircle(pos.x + ACTOR_SIZE.x / 2, pos.y + 8, 7, "#f5d0b5", true, false);
		draw.drawRectangle(pos.x + 7, pos.y + 2, 10, 4, accent, true);
		draw.drawRectangle(pos.x + eyeOffset, pos.y + 8, 2, 2, eyeColor, true);
		draw.drawText(this.name, pos.x + ACTOR_SIZE.x / 2, pos.y - 10, "#cbd5e1", "11px");
	}
}
