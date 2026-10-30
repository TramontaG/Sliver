import {
	Button,
	GameObject,
	Scene,
	Vector,
	type CanvasController,
} from "sliver-engine";
import {
	TRANSITION_A_TO_B,
	TRANSITION_B_TO_A,
	TRANSITION_POP_C,
	TRANSITION_PUSH_C,
} from "./transitions";

const CANVAS_WIDTH = 956;
const CANVAS_HEIGHT = 380;

const BUTTON_SIZE = new Vector(280, 52);
const LEFT_BUTTON_X = 120;
const RIGHT_BUTTON_X = 556;
const BUTTON_Y = 168;

const SCENE_A = "scene-a";
const SCENE_B = "scene-b";
const SCENE_C = "scene-c";

class SceneTitle extends GameObject {
	constructor(private label: string) {
		super("scene-title-" + label, new Vector(CANVAS_WIDTH / 2, 70));
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	override render(canvas: CanvasController): void {
		const draw = canvas.getShapeDrawer();
		const pos = this.getPosition();
		draw.drawText(this.label, pos.x, pos.y, "white", "28px", "center");
		draw.drawText(
			"Edit transitions.ts and press Run",
			pos.x,
			pos.y + 28,
			"#94a3b8",
			"14px",
			"center",
		);
	}
}

const createBaseScene = (name: string, color: string, title: string): Scene => {
	const scene = new Scene(name, color);
	scene.setOpacity(1);
	scene.setGravity(Vector.zero());
	scene.addGameObject(new SceneTitle(title));
	return scene;
};

export const createSceneA = (): Scene => {
	const scene = createBaseScene(SCENE_A, "#0f172a", "Scene A");

	scene.addGameObject([
		new Button(
			"a-replace-b",
			new Vector(LEFT_BUTTON_X, BUTTON_Y),
			BUTTON_SIZE.clone(),
			"Replace -> Scene B",
			"#2563eb",
			"white",
			(btn) => {
				const ctx = btn.getContext();
				if (!ctx) return;
				void ctx.transitionToScene(SCENE_B, TRANSITION_A_TO_B, "replace");
			},
		),
		new Button(
			"a-push-c",
			new Vector(RIGHT_BUTTON_X, BUTTON_Y),
			BUTTON_SIZE.clone(),
			"Push -> Scene C",
			"#7c3aed",
			"white",
			(btn) => {
				const ctx = btn.getContext();
				if (!ctx) return;
				void ctx.transitionToScene(SCENE_C, TRANSITION_PUSH_C, "push");
			},
		),
	]);

	return scene;
};

export const createSceneB = (): Scene => {
	const scene = createBaseScene(SCENE_B, "#1f2937", "Scene B");

	scene.addGameObject([
		new Button(
			"b-replace-a",
			new Vector(LEFT_BUTTON_X, BUTTON_Y),
			BUTTON_SIZE.clone(),
			"Replace -> Scene A",
			"#0891b2",
			"white",
			(btn) => {
				const ctx = btn.getContext();
				if (!ctx) return;
				void ctx.transitionToScene(SCENE_A, TRANSITION_B_TO_A, "replace");
			},
		),
		new Button(
			"b-push-c",
			new Vector(RIGHT_BUTTON_X, BUTTON_Y),
			BUTTON_SIZE.clone(),
			"Push -> Scene C",
			"#7c3aed",
			"white",
			(btn) => {
				const ctx = btn.getContext();
				if (!ctx) return;
				void ctx.transitionToScene(SCENE_C, TRANSITION_PUSH_C, "push");
			},
		),
	]);

	return scene;
};

export const createSceneC = (): Scene => {
	const scene = createBaseScene(SCENE_C, "rgba(15, 23, 42, 0.55)", "Scene C");

	scene.addGameObject(
		new Button(
			"c-pop",
			new Vector(338, 168),
			new Vector(280, 52),
			"Pop scene",
			"#eab308",
			"#111827",
			(btn) => {
				const ctx = btn.getContext();
				if (!ctx) return;

				const activeScenes = ctx.getActiveScenes();
				const previousScene = activeScenes[activeScenes.length - 2];
				if (!previousScene) {
					ctx.popScene();
					return;
				}

				const sceneA = ctx.getSceneManager().getScene(SCENE_A);
				const sceneB = ctx.getSceneManager().getScene(SCENE_B);

				if (previousScene === sceneA) {
					void ctx.transitionToScene(SCENE_A, TRANSITION_POP_C, "replace");
					return;
				}

				if (previousScene === sceneB) {
					void ctx.transitionToScene(SCENE_B, TRANSITION_POP_C, "replace");
					return;
				}

				ctx.popScene();
			},
		),
	);

	return scene;
};
