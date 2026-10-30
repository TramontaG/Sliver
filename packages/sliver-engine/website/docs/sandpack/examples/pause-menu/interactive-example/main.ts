import {
	CanvasController,
	Game,
	SceneManager,
	SoundManager,
} from "sliver-engine";
import { createMainScene } from "./createMainScene";
import { createPauseScene } from "./createPauseScene";

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 320;

const canvas = new CanvasController(CANVAS_WIDTH, CANVAS_HEIGHT);
const canvasElement = canvas.getCanvas();
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
canvasElement.style.width = CANVAS_WIDTH + "px";
canvasElement.style.height = CANVAS_HEIGHT + "px";
canvasElement.style.display = "block";
canvasElement.style.margin = "0 auto";

const mainScene = createMainScene();
const pauseScene = createPauseScene();

const scenes = new SceneManager(
	{ main: mainScene, pause: pauseScene },
	mainScene,
);

const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
