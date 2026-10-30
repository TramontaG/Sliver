import {
	CanvasController,
	Game,
	SceneManager,
	SoundManager,
} from "sliver-engine";
import { createSceneA, createSceneB, createSceneC } from "./createScenes";

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

const sceneA = createSceneA();
const sceneB = createSceneB();
const sceneC = createSceneC();

const scenes = new SceneManager(
	{
		"scene-a": sceneA,
		"scene-b": sceneB,
		"scene-c": sceneC,
	},
	sceneA,
);

const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
