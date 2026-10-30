import {
	CanvasController,
	Game,
	Scene,
	SceneManager,
	SoundManager,
	Vector,
} from "sliver-engine";
import { createCharacter } from "./createCharacter";
import { createObstacles } from "./createObstacles";

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

const mainScene = new Scene("walker-demo", BACKGROUND_COLOR);
mainScene.setGravity(Vector.zero());

const character = createCharacter();
const obstacles = createObstacles();

mainScene.addGameObject([character, ...obstacles]);

const scenes = new SceneManager({ main: mainScene }, mainScene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
character.walker?.start();
