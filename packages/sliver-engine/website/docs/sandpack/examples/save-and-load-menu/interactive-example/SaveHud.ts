import {
	GameObject,
	Vector,
	type CanvasController,
	type GameContext,
	type Scene,
} from "sliver-engine";
import type { PlayerState } from "./PlayerState";

const STATUS_CHANNEL = "save:status";

export class SaveHud extends GameObject {
	private status = "Press Save to create a save file.";

	constructor(private player: PlayerState) {
		super("save-hud", Vector.zero());
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	override onAddedToScene(_scene: Scene, _context: GameContext): void {
		this.onMessage<string>(STATUS_CHANNEL, (message) => {
			this.status = message;
		});
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const draw = canvas.getShapeDrawer();
		draw.drawText("Level: " + this.player.level, 24, 220, "#e2e8f0", "16px", "left");
		draw.drawText("HP: " + this.player.hp, 24, 244, "#e2e8f0", "16px", "left");
		draw.drawText("Status: " + this.status, 24, 278, "#94a3b8", "13px", "left");
	}
}
