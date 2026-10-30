import {
	CanvasController,
	Game,
	Scene,
	SceneManager,
	SoundManager,
	Vector,
} from "sliver-engine";
import { createBounds } from "./createBounds";
import { KeyboardDecoratorsObject } from "./KeyboardDecoratorsObject";

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

const mainScene = new Scene("keyboard-decorators-demo", "#0f172a");
mainScene.setGravity(Vector.zero());

const bounds = createBounds();
const demoObject = new KeyboardDecoratorsObject();

mainScene.addGameObject([...bounds, demoObject]);

const scenes = new SceneManager({ main: mainScene }, mainScene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
