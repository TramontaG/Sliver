import {
	GameObject,
	SquareHitbox,
	Vector,
	onClickAnywhere,
	onKeyPressed,
	type CanvasController,
	type GameContext,
	type GameEvent,
	type Scene,
} from "sliver-engine";
import { BIRD_SIZE, BIRD_START, FLAP_VELOCITY } from "./constants";

const MAX_UP_TILT = -0.32;
const MAX_DOWN_TILT = 0.52;
const TILT_EASING = 0.18;

export class Bird extends GameObject {
	private frozen = false;
	private visualTilt = 0;

	constructor(position: Vector) {
		super("bird", position.clone());
		this.addHitbox(new SquareHitbox(Vector.zero(), BIRD_SIZE.clone(), this));
		this.setPhisics({
			immovable: false,
			affectedByGravity: true,
		});
	}

	override onAddedToScene(_scene: Scene, _context: GameContext): void {
		this.onMessage("game:over", () => this.freeze());
		this.onMessage("game:reset", () => this.resetBird());
	}

	override onColision(other: GameObject): void {
		if (this.frozen) return;
		if (other.name === "ceiling") return;
		this.sendMessage("game:over", null);
	}

	flap(): void {
		if (this.frozen) return;
		this.speed = new Vector(0, FLAP_VELOCITY);
	}

	private freeze(): void {
		this.frozen = true;
		this.speed = Vector.zero();
		this.angularVelocity = 0;
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	private unfreeze(): void {
		this.frozen = false;
		this.setPhisics({ immovable: false, affectedByGravity: true });
	}

	private resetBird(): void {
		this.setPosition(BIRD_START.clone());
		this.speed = Vector.zero();
		this.visualTilt = 0;
		this.unfreeze();
	}

	override tick(): void {
		super.tick();
		if (this.frozen) return;

		const targetTilt =
			this.speed.y < 0
				? Math.max(MAX_UP_TILT, this.speed.y / 1000)
				: Math.min(MAX_DOWN_TILT, this.speed.y / 700);

		this.visualTilt += (targetTilt - this.visualTilt) * TILT_EASING;
	}

	@onKeyPressed<Bird>(" ", (obj) => {
		obj.handleInput();
	})
	@onClickAnywhere<Bird>((obj) => {
		obj.handleInput();
	})
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}

	private handleInput(): void {
		if (this.frozen) {
			this.sendMessage("game:reset", null);
			return;
		}
		this.flap();
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const pos = this.getPosition();
		const draw = canvas.getShapeDrawer();
		const center = pos.toAdded(BIRD_SIZE.toMultiplied(0.5));

		draw.drawCircle(center.x, pos.y + BIRD_SIZE.y + 6, 9, "rgba(15, 23, 42, 0.25)", true, false);
		draw.withRotation(center.x, center.y, this.visualTilt, () => {
			draw.drawCircle(center.x - 1, center.y, 11, "#fbbf24", true, false);
			draw.drawCircle(center.x - 4, center.y - 2, 7, "#fde68a", true, false);
			draw.drawCircle(center.x - 2, center.y + 3, 6, "#f59e0b", true, false);
			draw.drawRectangle(pos.x + BIRD_SIZE.x - 2, pos.y + 7, 8, 5, "#fb923c", true);
			draw.drawRectangle(pos.x + BIRD_SIZE.x + 3, pos.y + 8, 3, 3, "#fdba74", true);
			draw.drawCircle(pos.x + 15, pos.y + 7, 4, "#ffffff", true, false);
			draw.drawCircle(pos.x + 16, pos.y + 7, 1.5, "#0f172a", true, false);
			draw.drawRectangle(pos.x + 3, pos.y + 10, 5, 3, "#ca8a04", true);
		});
	}
}
