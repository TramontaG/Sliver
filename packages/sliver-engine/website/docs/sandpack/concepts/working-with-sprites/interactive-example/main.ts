import {
	CanvasController,
	Game,
	Scene,
	SceneManager,
	SoundManager,
	Vector,
} from "sliver-engine";
import {
	CANVAS_HEIGHT,
	CANVAS_WIDTH,
	HERO_SCALE,
	HERO_SPRITE_SIZE,
} from "./constants";
import { SpriteHero } from "./SpriteHero";
import { SpriteHud } from "./SpriteHud";
import { loadDemoHeroSprites } from "./spriteSetup";

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

const scene = new Scene("sprite-demo", BACKGROUND_COLOR);
scene.setGravity(Vector.zero());

const hero = new SpriteHero(
	new Vector(
		(CANVAS_WIDTH - HERO_SPRITE_SIZE.x * HERO_SCALE) / 2,
		(CANVAS_HEIGHT - HERO_SPRITE_SIZE.y * HERO_SCALE) / 2,
	),
);
const hud = new SpriteHud();

scene.addGameObject([hero, hud]);

const scenes = new SceneManager({ main: scene }, scene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

const boot = async (): Promise<void> => {
	try {
		await loadDemoHeroSprites(canvas);
		game.start();
	} catch (error) {
		console.warn("Could not load demo sprite sheet in this runtime", error);
	}
};

void boot();
