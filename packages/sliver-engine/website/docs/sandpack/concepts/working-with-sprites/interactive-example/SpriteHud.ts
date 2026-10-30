import { GameObject, Vector, type CanvasController, type Scene } from "sliver-engine";

export class SpriteHud extends GameObject {
	constructor() {
		super("hud", Vector.zero(), true, true);
		this.zIndex = 1;
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const draw = canvas.getShapeDrawer();

		draw.drawText(
			"Move with Arrow Keys or WASD",
			16,
			24,
			"#e2e8f0",
			"14px",
			"left",
		);
		draw.drawText(
			"Uses down/up/left frames from docs; right is mirrored left",
			16,
			44,
			"#94a3b8",
			"12px",
			"left",
		);
	}
}
