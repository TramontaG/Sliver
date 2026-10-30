import {
	CanvasController,
	Game,
	GameObject,
	Scene,
	SceneManager,
	SoundManager,
	SquareHitbox,
	Vector,
} from "sliver-engine";
import { CutsceneActor } from "./CutsceneActor";
import { CutsceneHud } from "./CutsceneHud";
import { CutsceneRunner, ShrineGate } from "./CutsceneRunner";

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 320;
const BACKGROUND_COLOR = "#0f172a";

type BlockDef = {
	name: string;
	position: Vector;
	size: Vector;
	color: string;
};

const BLOCKS: BlockDef[] = [
	{ name: "top-wall", position: new Vector(28, 68), size: new Vector(464, 16), color: "#334155" },
	{ name: "bottom-wall", position: new Vector(28, 280), size: new Vector(464, 16), color: "#334155" },
	{ name: "left-wall", position: new Vector(28, 84), size: new Vector(16, 196), color: "#334155" },
	{ name: "right-wall-top", position: new Vector(476, 84), size: new Vector(16, 72), color: "#334155" },
	{ name: "right-wall-bottom", position: new Vector(476, 224), size: new Vector(16, 56), color: "#334155" },
];

class Backdrop extends GameObject {
	constructor() {
		super("cutscene-backdrop", Vector.zero());
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const draw = canvas.getShapeDrawer();

		draw.drawRectangle(0, 208, CANVAS_WIDTH, 112, "#1e293b", true);
		draw.drawRectangle(44, 116, 432, 136, "#111827", true);
		draw.drawRectangle(64, 132, 392, 104, "#0b1120", true);
	}
}

class SolidBlock extends GameObject {
	constructor(def: BlockDef) {
		super(def.name, def.position.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), def.size.clone(), this, {
				solid: true,
				debug: false,
			}),
		);
		this.setPhisics({ immovable: true, affectedByGravity: false });
		this.setRenderFunction((obj, canvasController) => {
			const pos = obj.getPosition();
			canvasController
				.getShapeDrawer()
				.drawRectangle(pos.x, pos.y, def.size.x, def.size.y, def.color, true);
		});
	}
}

const createBounds = (): SolidBlock[] => BLOCKS.map((block) => new SolidBlock(block));

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

const scene = new Scene("cutscene-demo", BACKGROUND_COLOR);
scene.setGravity(Vector.zero());

const hero = new CutsceneActor("hero", new Vector(86, 214), "#38bdf8", 2, true);
const elder = new CutsceneActor("elder", new Vector(344, 214), "#f97316", 18);
const gate = new ShrineGate(new Vector(460, 156));
const runner = new CutsceneRunner(elder, hero, gate);
const hud = new CutsceneHud(elder, hero, runner);

scene.addGameObject([
	new Backdrop(),
	...createBounds(),
	gate,
	elder,
	hero,
	hud,
	runner,
]);

const scenes = new SceneManager({ main: scene }, scene);
const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
