import { GameObject, Vector, type CanvasController, type Scene } from "sliver-engine";

export class HealthBar extends GameObject {
	constructor() {
		super("ui:health", new Vector(-6, -16));
		this.setPositionRelativeToMotherShip(true);
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		type PlayerWithHealth = GameObject & { hp: number; maxHp: number };
		const player = this.getMotherShip<PlayerWithHealth>();
		if (!player) return;

		const draw = canvas.getShapeDrawer();
		const pos = this.getPosition();
		const pct = player.maxHp > 0 ? player.hp / player.maxHp : 0;
		const width = 52;
		const height = 10;

		draw.drawRectangle(pos.x, pos.y, width, height, "#334155", true);
		draw.drawRectangle(pos.x, pos.y, width * pct, height, "#22c55e", true);
	}
}
