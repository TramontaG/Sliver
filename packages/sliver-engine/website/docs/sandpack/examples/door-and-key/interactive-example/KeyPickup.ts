import { GameObject, SquareHitbox, Vector, type CanvasController, type Scene } from "sliver-engine";

const SIZE = new Vector(18, 18);
const KEY_RING_RADIUS = 5;

export class KeyPickup extends GameObject {
	constructor(position: Vector) {
		super("item:key", position.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), SIZE.clone(), this, {
				solid: false,
				debug: false,
			}),
		);
		this.setPhisics({ immovable: true });
	}

	override onColision(other: GameObject): void {
		if (other.name !== "player") return;
		this.sendMessage("player:key_obtained", { id: "gold" });
		this.destroy();
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const pos = this.getPosition();
		const drawer = canvas.getShapeDrawer();
		drawer.drawCircle(
			pos.x + KEY_RING_RADIUS + 1,
			pos.y + KEY_RING_RADIUS + 4,
			KEY_RING_RADIUS,
			"#facc15",
			false,
			false,
		);
		drawer.drawRectangle(pos.x + 10, pos.y + 7, 10, 4, "#facc15", true);
		drawer.drawRectangle(pos.x + 16, pos.y + 7, 2, 8, "#facc15", true);
		drawer.drawRectangle(pos.x + 12, pos.y + 11, 2, 4, "#facc15", true);
		drawer.drawText("gold key", pos.x + SIZE.x / 2, pos.y + SIZE.y + 16, "#fde68a", "12px");
	}
}
