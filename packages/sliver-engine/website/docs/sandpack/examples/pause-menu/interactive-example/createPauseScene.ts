import {
	Button,
	GameObject,
	Scene,
	Vector,
	fadeTransition,
	type CanvasController,
} from "sliver-engine";

const MAIN_SCENE = "main";
const TRANSITION_DURATION = 250;
const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 320;

class PauseLabel extends GameObject {
	constructor() {
		super("pause-label", Vector.zero());
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const draw = canvas.getShapeDrawer();
		draw.drawText("Paused", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 46, "#e2e8f0", "26px", "center");
		draw.drawText(
			"Press Escape in gameplay to pause.",
			CANVAS_WIDTH / 2,
			CANVAS_HEIGHT / 2 - 16,
			"#94a3b8",
			"13px",
			"center",
		);
	}
}

export const createPauseScene = (): Scene => {
	const pauseScene = new Scene("pause", "#0b1222");
	pauseScene.setGravity(Vector.zero());

	pauseScene.addGameObject(new PauseLabel());
	pauseScene.addGameObject(
		new Button(
			"resume",
			new Vector(190, 178),
			new Vector(140, 48),
			"Resume",
			"#4f46e5",
			"white",
			(btn) => {
				const ctx = btn.getContext();
				if (!ctx) return;
				void ctx.transitionToScene(
					MAIN_SCENE,
					fadeTransition(TRANSITION_DURATION),
					"replace",
				);
			},
		),
	);

	return pauseScene;
};
