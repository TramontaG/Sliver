import {
	CanvasController,
	Game,
	Scene,
	SceneManager,
	SoundManager,
	Vector,
} from "sliver-engine";
import { CoinCounter } from "./Hud";
import { CoinSpawner } from "./CoinSpawner";
import { WalkerPlayer } from "./WalkerPlayer";
import { COIN_MP3_DATA_URL } from "./coinSound";

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

const scene = new Scene("coin-demo", "#0f172a");
scene.setGravity(Vector.zero());

scene.addGameObject([
	new WalkerPlayer(new Vector(120, 150)),
	new CoinCounter(),
	new CoinSpawner(),
]);

const scenes = new SceneManager({ main: scene }, scene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

const boot = async (): Promise<void> => {
	const ctx = game.getContext();

	try {
		await ctx.getSoundManager().loadSound(
			"coin_pickup",
			new URL(COIN_MP3_DATA_URL),
			["sfx"],
		);
	} catch (error) {
		console.warn("Could not load coin pickup sound in this runtime", error);
	}

	const unlockAudio = () => {
		void ctx.getSoundManager().unlock();
	};
	window.addEventListener("pointerdown", unlockAudio, { once: true });
	window.addEventListener("keydown", unlockAudio, { once: true });

	game.start();
};

void boot();
