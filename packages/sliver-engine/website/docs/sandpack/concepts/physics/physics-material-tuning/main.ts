import {
	CanvasController,
	Game,
	Scene,
	SceneManager,
	SoundManager,
	Vector,
} from "sliver-engine";
import { createBounds } from "./createBounds";
import { createExtraSquares } from "./createExtraSquares";
import { scaleEnclosureScalar } from "./enclosureDimensions";

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 320;

const canvas = new CanvasController(CANVAS_WIDTH, CANVAS_HEIGHT);
const canvasElement = canvas.getCanvas();

document.documentElement.style.width = "100%";
document.documentElement.style.height = "100%";
document.documentElement.style.overflow = "hidden";
document.body.style.margin = "0";
document.body.style.width = "100%";
document.body.style.height = "100%";
document.body.style.overflow = "hidden";

const syncCanvasSize = (): void => {
	canvasElement.width = window.innerWidth || CANVAS_WIDTH;
	canvasElement.height = window.innerHeight || CANVAS_HEIGHT;
	canvasElement.style.display = "block";
	canvasElement.style.width = "100%";
	canvasElement.style.height = "100%";
};

syncCanvasSize();
window.addEventListener("resize", syncCanvasSize);

const mainScene = new Scene("physics-options-demo", "#0f172a");
mainScene.setGravity(new Vector(0, scaleEnclosureScalar(1200)));

const bounds = createBounds();
const extraSquares = createExtraSquares();

mainScene.addGameObject([...bounds, ...extraSquares.cyan, ...extraSquares.rose]);

const scenes = new SceneManager({ main: mainScene }, mainScene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
