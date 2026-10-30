import {
	CanvasController,
	Game,
	Scene,
	SceneManager,
	SoundManager,
	Vector,
} from "sliver-engine";
import { PlayerState } from "./PlayerState";
import { createSaveButtons } from "./SaveButtons";
import { SaveHud } from "./SaveHud";

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

const scene = new Scene("save-load-demo", "#0f172a");
scene.setGravity(Vector.zero());

const player = new PlayerState(new Vector(426, 130));
const hud = new SaveHud(player);
const buttons = createSaveButtons(player);

scene.addGameObject([player, ...buttons, hud]);

const scenes = new SceneManager({ main: scene }, scene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
	saveNamespace: "docs-save-load-menu-demo",
});

game.start();
