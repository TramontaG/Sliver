import {
	GameObject,
	Vector,
	onKeyHold,
	renderSpriteAnimation,
	type CanvasController,
	type GameEvent,
	type Scene,
} from "sliver-engine";
import {
	CANVAS_HEIGHT,
	CANVAS_WIDTH,
	HERO_PADDING,
	HERO_SCALE,
	HERO_SPEED,
	HERO_SPRITE_SIZE,
	HERO_WALK_DOWN_FRAMES,
	HERO_WALK_LEFT_FRAMES,
	HERO_WALK_UP_FRAMES,
} from "./constants";

const HERO_WIDTH = HERO_SPRITE_SIZE.x * HERO_SCALE;
const HERO_HEIGHT = HERO_SPRITE_SIZE.y * HERO_SCALE;
const MIN_X = HERO_PADDING;
const MAX_X = CANVAS_WIDTH - HERO_WIDTH - HERO_PADDING;
const MIN_Y = HERO_PADDING;
const MAX_Y = CANVAS_HEIGHT - HERO_HEIGHT - HERO_PADDING;

type Direction = "down" | "up" | "left" | "right";

export class SpriteHero extends GameObject {
	private moving = false;
	private facing: Direction = "down";
	private pendingVelocity = Vector.zero();

	constructor(position: Vector) {
		super("hero", position.clone());
		this.setPhisics({
			immovable: false,
			affectedByGravity: false,
			friction: 0,
			restitution: 0,
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
		this.moving = false;
		super.tick();
		this.speed = this.pendingVelocity.clone();
		this.moving = this.pendingVelocity.squaredMagnitude() > 0;
	}

	@onKeyHold<SpriteHero>("ArrowLeft", (obj) =>
		obj.queueVelocity(new Vector(-HERO_SPEED, 0), "left"),
	)
	@onKeyHold<SpriteHero>("ArrowRight", (obj) =>
		obj.queueVelocity(new Vector(HERO_SPEED, 0), "right"),
	)
	@onKeyHold<SpriteHero>("ArrowUp", (obj) =>
		obj.queueVelocity(new Vector(0, -HERO_SPEED), "up"),
	)
	@onKeyHold<SpriteHero>("ArrowDown", (obj) =>
		obj.queueVelocity(new Vector(0, HERO_SPEED), "down"),
	)
	@onKeyHold<SpriteHero>("a", (obj) =>
		obj.queueVelocity(new Vector(-HERO_SPEED, 0), "left"),
	)
	@onKeyHold<SpriteHero>("d", (obj) =>
		obj.queueVelocity(new Vector(HERO_SPEED, 0), "right"),
	)
	@onKeyHold<SpriteHero>("w", (obj) => obj.queueVelocity(new Vector(0, -HERO_SPEED), "up"))
	@onKeyHold<SpriteHero>("s", (obj) => obj.queueVelocity(new Vector(0, HERO_SPEED), "down"))
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}

	@renderSpriteAnimation<SpriteHero>(
		(obj) => {
			const frames = obj.getActiveFrames();
			return obj.moving ? frames : [frames[0] ?? HERO_WALK_DOWN_FRAMES[0]!];
		},
		{
			ticksPerFrame: 8,
			scale: HERO_SCALE,
			mirroring: (obj) => (obj.facing === "right" ? "horizontal" : null),
		},
	)
	override render(canvas: CanvasController, scene: Scene): void {
		super.render(canvas, scene);
	}

	private queueVelocity(delta: Vector, facing: Direction): void {
		this.pendingVelocity.add(delta);
		this.facing = facing;
	}

	private getActiveFrames(): string[] {
		if (this.facing === "up") {
			return HERO_WALK_UP_FRAMES;
		}

		if (this.facing === "left" || this.facing === "right") {
			return HERO_WALK_LEFT_FRAMES;
		}

		return HERO_WALK_DOWN_FRAMES;
	}
}
