import {
	GameObject,
	Vector,
	type CanvasController,
	type Scene,
} from "sliver-engine";
import type { CutsceneActor } from "./CutsceneActor";
import type { CutsceneRunner } from "./CutsceneRunner";

const HUD_WIDTH = 228;

export class CutsceneHud extends GameObject {
	constructor(
		private elder: CutsceneActor,
		private hero: CutsceneActor,
		private runner: CutsceneRunner,
	) {
		super("cutscene-hud", Vector.zero());
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const draw = canvas.getShapeDrawer();
		const elderPos = this.elder.getPosition();

		draw.drawRectangle(12, 12, HUD_WIDTH, 78, "rgba(15, 23, 42, 0.78)", true);
		draw.drawText("Elder coins: " + this.elder.coins, 24, 26, "#fde68a", "14px", "left");
		draw.drawText("Hero coins: " + this.hero.coins, 24, 46, "#bae6fd", "14px", "left");
		draw.drawText(this.runner.getStatus(), 24, 66, "#e2e8f0", "13px", "left");
		draw.drawText(this.runner.getDetail(), 24, 82, "#94a3b8", "11px", "left");

		if (!this.runner.isCutsceneActive() && !this.runner.isComplete() && this.runner.isHeroNearElder()) {
			draw.drawText("E talk", elderPos.x + 10, elderPos.y - 18, "#fef08a", "12px");
		}

		if (!this.runner.isChoiceActive()) {
			return;
		}

		draw.drawRectangle(72, 102, 376, 92, "rgba(2, 6, 23, 0.88)", true);
		draw.drawRectangle(72, 102, 376, 92, "#334155", false);
		draw.drawText(
			this.runner.getChoicePrompt() ?? "Choose an answer.",
			260,
			124,
			"#f8fafc",
			"16px",
		);

		this.runner.getChoices().forEach((choice, index) => {
			draw.drawText(
				choice.key + " " + choice.label,
				92,
				148 + index * 18,
				"#cbd5e1",
				"13px",
				"left",
			);
		});
	}
}
