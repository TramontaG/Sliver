import {
	GameObject,
	SquareHitbox,
	Vector,
	type CanvasController,
	type GameContext,
	type Scene,
} from "sliver-engine";

const SIZE = new Vector(16, 64);
const OPEN_PROGRESS_SPEED = 3;
const OPEN_PASSABLE_AT = 0.5;
const OPEN_ANGLE_RADIANS = -Math.PI / 2;

export class Door extends GameObject {
	public open = false;
	private opening = false;
	private openProgress = 0;

	constructor(position: Vector) {
		super("door", position.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), SIZE.clone(), this, {
				solid: true,
				debug: false,
			}),
		);
		this.setPhisics({ immovable: true });
	}

	override onAddedToScene(_scene: Scene, _context: GameContext): void {
		this.onceOnMessage<{ id: string }>("player:key_obtained", ({ id }) => {
			if (id !== "gold") return;
			this.opening = true;
		});
	}

	override tick(): void {
		super.tick();

		if (!this.opening || this.open) return;

		const dt = 1 / (this.getContext()?.getTickRate() ?? 60);
		this.openProgress = Math.min(1, this.openProgress + OPEN_PROGRESS_SPEED * dt);

		if (this.openProgress >= OPEN_PASSABLE_AT) {
			this.getHitboxes().forEach((hitbox) => {
				hitbox.solid = false;
			});
		}

		if (this.openProgress >= 1) {
			this.open = true;
		}
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const pos = this.getPosition();
		const drawer = canvas.getShapeDrawer();
		const angle = OPEN_ANGLE_RADIANS * this.openProgress;
		const status = this.open ? "door open" : this.opening ? "door opening" : "door locked";

		drawer.drawRectangle(pos.x - 2, pos.y - 2, SIZE.x + 4, SIZE.y + 4, "#64748b", false);
		drawer.withRotation(pos.x, pos.y, angle, () => {
			drawer.drawRectangle(
				pos.x,
				pos.y,
				SIZE.x,
				SIZE.y,
				this.open ? "#22c55e" : "#ef4444",
				true,
			);
			drawer.drawRectangle(pos.x + 4, pos.y + 8, 8, 18, "#fecaca", true);
			drawer.drawCircle(pos.x + SIZE.x - 4, pos.y + SIZE.y / 2, 2, "#f8fafc", true, false);
		});
		drawer.drawCircle(pos.x + 1, pos.y + 1, 3, "#f8fafc", true, false);
		drawer.drawText(status, pos.x + SIZE.x / 2, pos.y + SIZE.y + 16, "#cbd5e1", "12px");
	}
}
