import {
	GameObject,
	Scene,
	Vector,
	type CanvasController,
} from "sliver-engine";
import { PauseController } from "./PauseController";

const CANVAS_WIDTH = 520;
const BOX_SIZE = 30;
const MIN_X = 30;
const MAX_X = CANVAS_WIDTH - BOX_SIZE - 30;
const SPEED_X = 120;

class MovingBox extends GameObject {
	private direction = 1;

	constructor() {
		super("moving-box", new Vector(70, 156));
		this.setPhisics({ immovable: false, affectedByGravity: false, friction: 0 });
	}

	override tick(): void {
		const x = this.getScenePosition().x;
		if (x <= MIN_X) this.direction = 1;
		if (x >= MAX_X) this.direction = -1;
		this.speed = new Vector(SPEED_X * this.direction, 0);
		super.tick();
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const pos = this.getPosition();
		canvas
			.getShapeDrawer()
			.drawRectangle(pos.x, pos.y, BOX_SIZE, BOX_SIZE, "#38bdf8", true);
	}
}

class MainLabel extends GameObject {
	constructor() {
		super("main-label", Vector.zero());
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		canvas
			.getShapeDrawer()
			.drawText("Press Escape to pause", 16, 26, "#e2e8f0", "15px", "left");
	}
}

export const createMainScene = (): Scene => {
	const mainScene = new Scene("main", "#0f172a");
	mainScene.setGravity(Vector.zero());
	mainScene.addGameObject([
		new MovingBox(),
		new MainLabel(),
		new PauseController(),
	]);
	return mainScene;
};
