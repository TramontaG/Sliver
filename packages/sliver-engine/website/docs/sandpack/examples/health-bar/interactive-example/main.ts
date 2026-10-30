import {
	CanvasController,
	Game,
	Scene,
	SceneManager,
	SoundManager,
	Vector,
} from "sliver-engine";
import { HealButton } from "./HealButton";
import { Player } from "./Player";

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

const scene = new Scene("health-bar-demo", "#0f172a");
scene.setGravity(Vector.zero());

const player = new Player(new Vector(456, 168));
const healButton = new HealButton(player);

scene.addGameObject([player, healButton]);

const scenes = new SceneManager({ main: scene }, scene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
