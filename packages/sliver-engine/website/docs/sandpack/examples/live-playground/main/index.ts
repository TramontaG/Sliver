import {
	CanvasController,
	Game,
	GameObject,
	Scene,
	SceneManager,
	SquareHitbox,
	SoundManager,
	Vector,
} from "sliver-engine";
import { BOX_SIZE, CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";

const BOX_SPEED = 120;

class BouncingBox extends GameObject {
	private direction = 1;

	constructor() {
		super("box", new Vector(40, CANVAS_HEIGHT / 2 - BOX_SIZE / 2));
		this.addHitbox(
			new SquareHitbox(Vector.zero(), new Vector(BOX_SIZE, BOX_SIZE), this, {
				solid: false,
				debug: false,
			}),
		);
		this.setPhisics({
			immovable: false,
			affectedByGravity: false,
			friction: 0,
			restitution: 0,
		});

		this.setTickFunction((obj) => {
			const pos = obj.getPosition();
			const nextX = Math.max(0, Math.min(CANVAS_WIDTH - BOX_SIZE, pos.x));
			obj.setPosition(new Vector(nextX, pos.y));

			if (nextX <= 0) {
				this.direction = 1;
			} else if (nextX + BOX_SIZE >= CANVAS_WIDTH) {
				this.direction = -1;
			}

			obj.speed = new Vector(BOX_SPEED * this.direction, 0);
		});

		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			const draw = canvas.getShapeDrawer();

			draw.drawRectangle(pos.x, pos.y, BOX_SIZE, BOX_SIZE, "#ffd166", true);
			draw.drawText(
				"Edit color/size in code, then click Run",
				12,
				24,
				"#f8fafc",
				"14px",
				"left",
			);
		});
	}
}

const canvas = new CanvasController(CANVAS_WIDTH, CANVAS_HEIGHT);
const canvasElement = canvas.getCanvas();

document.body.style.margin = "0";
document.body.style.overflow = "hidden";

canvasElement.style.width = `${CANVAS_WIDTH}px`;
canvasElement.style.height = `${CANVAS_HEIGHT}px`;
canvasElement.style.display = "block";
canvasElement.style.margin = "0 auto";

const mainScene = new Scene("main", "#111827");
mainScene.addGameObject(new BouncingBox());

const scenes = new SceneManager({ main: mainScene }, mainScene);

const game = new Game({
	canvas,
	scenes,
	soundManager: new SoundManager(),
	ticksPerSecond: 60,
});

game.start();
