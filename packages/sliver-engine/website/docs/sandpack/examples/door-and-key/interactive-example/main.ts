import {
	CanvasController,
	Game,
	Scene,
	SceneManager,
	SoundManager,
	Vector,
} from "sliver-engine";
import { createBounds } from "./createBounds";
import { Door } from "./Door";
import { KeyPickup } from "./KeyPickup";
import { Player } from "./Player";

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

const scene = new Scene("door-key-demo", BACKGROUND_COLOR);
scene.setGravity(Vector.zero());

scene.addGameObject([
	...createBounds(),
	new Player(new Vector(72, 150)),
	new KeyPickup(new Vector(188, 150)),
	new Door(new Vector(332, 116)),
]);

const scenes = new SceneManager({ main: scene }, scene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
