import {
	CanvasController,
	Game,
	GameObject,
	Scene,
	SceneManager,
	SoundManager,
	Vector,
} from "sliver-engine";
import { ObjectA } from "./ObjectA";
import { ObjectB } from "./ObjectB";

const CANVAS_WIDTH = 956;
const CANVAS_HEIGHT = 380;

const canvas = new CanvasController(CANVAS_WIDTH, CANVAS_HEIGHT);
const canvasElement = canvas.getCanvas();
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
canvasElement.style.width = CANVAS_WIDTH + "px";
canvasElement.style.height = CANVAS_HEIGHT + "px";
canvasElement.style.display = "block";
canvasElement.style.margin = "0 auto";

const scene = new Scene("messages-demo", "#0f172a");
scene.setGravity(Vector.zero());

const hint = new GameObject("hint", new Vector(CANVAS_WIDTH / 2, 80));
hint.setPhisics({ immovable: true, affectedByGravity: false });
hint.setRenderFunction((obj, renderer) => {
	const pos = obj.getPosition();
	const draw = renderer.getShapeDrawer();
	draw.drawText(
		"Click either object to send a message to the other one",
		pos.x,
		pos.y,
		"#e2e8f0",
		"20px",
		"center",
	);
	draw.drawText(
		"Object B also changes border color when hovered",
		pos.x,
		pos.y + 28,
		"#94a3b8",
		"14px",
		"center",
	);
});

scene.addGameObject([hint, new ObjectA(), new ObjectB()]);

const sceneManager = new SceneManager({ messages: scene }, scene);
const game = new Game({
	canvas,
	scenes: sceneManager,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
