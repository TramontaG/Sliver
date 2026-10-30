import {
	CanvasController,
	Game,
	SceneManager,
	SoundManager,
} from "sliver-engine";
import {
	CANVAS_HEIGHT,
	CANVAS_WIDTH,
	createWalkerDebugScene,
} from "./scene";

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
document.body.style.background = "#0f172a";

const syncCanvasSize = (): void => {
	const scale = Math.min(
		(window.innerWidth || CANVAS_WIDTH) / CANVAS_WIDTH,
		(window.innerHeight || CANVAS_HEIGHT) / CANVAS_HEIGHT,
	);

	canvasElement.style.display = "block";
	canvasElement.style.width = CANVAS_WIDTH * scale + "px";
	canvasElement.style.height = CANVAS_HEIGHT * scale + "px";
	canvasElement.style.background = "#0f172a";
};

syncCanvasSize();
window.addEventListener("resize", syncCanvasSize);

const scene = createWalkerDebugScene();
const scenes = new SceneManager({ main: scene }, scene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
