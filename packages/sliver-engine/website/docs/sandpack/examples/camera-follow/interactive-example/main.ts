import {
	CanvasController,
	Game,
	Scene,
	SceneManager,
	SoundManager,
	Vector,
} from "sliver-engine";
import { CameraFollower } from "./CameraFollower";
import { Player } from "./Player";
import { createWorldMarkers } from "./createWorldMarkers";

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

const mainScene = new Scene("camera-follow-demo", "#0f172a");
mainScene.setGravity(Vector.zero());

const player = new Player(new Vector(80, 160));
const follower = new CameraFollower(player);
const markers = createWorldMarkers();

mainScene.addGameObject([...markers, player, follower]);

const scenes = new SceneManager({ main: mainScene }, mainScene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
