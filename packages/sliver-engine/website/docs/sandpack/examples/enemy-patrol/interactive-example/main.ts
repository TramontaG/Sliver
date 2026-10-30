import {
	CanvasController,
	Game,
	GameObject,
	Scene,
	SceneManager,
	SoundManager,
	Vector,
} from "sliver-engine";
import { createArena } from "./createArena";
import { PatrollingEnemy } from "./PatrollingEnemy";

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 320;
const BACKGROUND_COLOR = "#0f172a";

const canvas = new CanvasController(CANVAS_WIDTH, CANVAS_HEIGHT);
const canvasElement = canvas.getCanvas();

document.documentElement.style.width = "100%";
document.documentElement.style.height = "100%";
document.documentElement.style.overflow = "hidden";
document.body.style.margin = "0";
document.body.style.width = "100%";
document.body.style.height = "100%";
document.body.style.overflow = "hidden";
document.body.style.display = "flex";
document.body.style.alignItems = "center";
document.body.style.justifyContent = "center";
document.body.style.background = BACKGROUND_COLOR;

const syncCanvasSize = (): void => {
	const scale = Math.min(
		(window.innerWidth || CANVAS_WIDTH) / CANVAS_WIDTH,
		(window.innerHeight || CANVAS_HEIGHT) / CANVAS_HEIGHT,
	);

	canvasElement.style.display = "block";
	canvasElement.style.width = CANVAS_WIDTH * scale + "px";
	canvasElement.style.height = CANVAS_HEIGHT * scale + "px";
};

syncCanvasSize();
window.addEventListener("resize", syncCanvasSize);

const scene = new Scene("enemy-patrol-demo", BACKGROUND_COLOR);
scene.setGravity(Vector.zero());

const hud = new GameObject("enemy-patrol-hud", new Vector(CANVAS_WIDTH / 2, 18));
hud.setPhisics({ immovable: true, affectedByGravity: false });
hud.setRenderFunction((obj, canvasController) => {
	const pos = obj.getPosition();
	const drawer = canvasController.getShapeDrawer();
	drawer.drawText(
		"Drag the darker walls to invalidate the route",
		pos.x,
		pos.y,
		"#e2e8f0",
		"13px",
		"center",
	);
	drawer.drawText(
		"Edit PatrollingEnemy.ts to tweak waypoints and walker options",
		pos.x,
		pos.y + 16,
		"#94a3b8",
		"10px",
		"center",
	);
});

scene.addGameObject([
	hud,
	...createArena(),
	new PatrollingEnemy(new Vector(92, 72)),
]);

const scenes = new SceneManager({ main: scene }, scene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
