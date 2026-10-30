import {
	GameObject,
	SquareHitbox,
	Vector,
	onClick,
	onKeyHold,
	type GameEvent,
} from "sliver-engine";
import { HealthBar } from "./HealthBar";

const PLAYER_SIZE = 40;
const PLAYER_SPEED = 120;
const CANVAS_WIDTH = 956;
const CANVAS_HEIGHT = 380;
const MIN_X = 0;
const MAX_X = CANVAS_WIDTH - PLAYER_SIZE;
const MIN_Y = 0;
const MAX_Y = CANVAS_HEIGHT - PLAYER_SIZE;

export class Player extends GameObject {
	public hp = 10;
	public maxHp = 10;
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
				.drawRectangle(
					pos.x,
					pos.y,
					PLAYER_SIZE,
					PLAYER_SIZE,
						this.hp <= 3 ? "#ef4444" : "#38bdf8",
						true,
					);
			});
		this.addChild(new HealthBar());
	}

	damage(amount: number): void {
		this.hp = Math.max(0, this.hp - amount);
	}

	heal(amount: number): void {
		this.hp = Math.min(this.maxHp, this.hp + amount);
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

	@onKeyHold<Player>("w", (obj) => obj.queueVelocity(new Vector(0, -PLAYER_SPEED)))
	@onKeyHold<Player>("a", (obj) => obj.queueVelocity(new Vector(-PLAYER_SPEED, 0)))
	@onKeyHold<Player>("s", (obj) => obj.queueVelocity(new Vector(0, PLAYER_SPEED)))
	@onKeyHold<Player>("d", (obj) => obj.queueVelocity(new Vector(PLAYER_SPEED, 0)))
	@onClick<Player>((obj) => {
		obj.damage(1);
	})
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}

	private queueVelocity(delta: Vector): void {
		this.pendingVelocity.add(delta);
	}
}
