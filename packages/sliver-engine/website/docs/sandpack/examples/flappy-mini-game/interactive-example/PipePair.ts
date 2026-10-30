import {
	GameObject,
	SquareHitbox,
	Vector,
	type CanvasController,
	type Scene,
} from "sliver-engine";
import {
	CANVAS_HEIGHT,
	GROUND_HEIGHT,
	PIPE_GAP,
	PIPE_SPEED,
	PIPE_WIDTH,
} from "./constants";
import type { Bird } from "./Bird";

const PIPE_BODY_COLOR = "#22c55e";
const PIPE_CAP_COLOR = "#4ade80";
const PIPE_HIGHLIGHT_COLOR = "#86efac";
const PIPE_SHADOW_COLOR = "#15803d";
const PIPE_OUTLINE_COLOR = "#14532d";
const PIPE_CAP_HEIGHT = 18;
const PIPE_CAP_OVERHANG = 6;

export class PipePair extends GameObject {
	private passed = false;
	private frozen = false;

	constructor(
		x: number,
		private gapTopHeight: number,
		private bird: Bird,
	) {
		super("pipe-pair", new Vector(x, 0));
		this.setPhisics({
			immovable: true,
			affectedByGravity: false,
		});

		const bottomHeight =
			CANVAS_HEIGHT - GROUND_HEIGHT - this.gapTopHeight - PIPE_GAP;

		this.addHitbox(
			new SquareHitbox(
				Vector.zero(),
				new Vector(PIPE_WIDTH, this.gapTopHeight),
				this,
			),
		);
		this.addHitbox(
			new SquareHitbox(
				new Vector(0, this.gapTopHeight + PIPE_GAP),
				new Vector(PIPE_WIDTH, bottomHeight),
				this,
			),
		);
	}

	setFrozen(frozen: boolean): void {
		this.frozen = frozen;
	}

	override tick(): void {
		super.tick();
		if (!this.frozen) {
			const dt = 1 / (this.getContext()?.getTickRate() ?? 60);
			this.translate(new Vector(PIPE_SPEED * dt, 0));
		}

		const pos = this.getScenePosition();

		if (pos.x + PIPE_WIDTH < 0) {
			this.destroy();
			return;
		}

		if (!this.passed && pos.x + PIPE_WIDTH < this.bird.getScenePosition().x) {
			this.passed = true;
			this.sendMessage("score:pipe", { amount: 1 });
		}
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const pos = this.getPosition();
		const bottomY = this.gapTopHeight + PIPE_GAP;
		const bottomHeight =
			CANVAS_HEIGHT - GROUND_HEIGHT - this.gapTopHeight - PIPE_GAP;

		this.drawPipeSegment(canvas, pos.x, pos.y, this.gapTopHeight, this.gapTopHeight - PIPE_CAP_HEIGHT);
		this.drawPipeSegment(canvas, pos.x, bottomY, bottomHeight, bottomY);
	}

	private drawPipeSegment(
		canvas: CanvasController,
		x: number,
		y: number,
		height: number,
		capY: number,
	): void {
		const draw = canvas.getShapeDrawer();
		draw.drawRectangle(x, y, PIPE_WIDTH, height, PIPE_BODY_COLOR, true);
		draw.drawRectangle(x + 5, y, 7, height, PIPE_HIGHLIGHT_COLOR, true);
		draw.drawRectangle(x + PIPE_WIDTH - 10, y, 10, height, PIPE_SHADOW_COLOR, true);
		draw.drawRectangle(x, y, PIPE_WIDTH, height, PIPE_OUTLINE_COLOR, false);

		draw.drawRectangle(
			x - PIPE_CAP_OVERHANG,
			capY,
			PIPE_WIDTH + PIPE_CAP_OVERHANG * 2,
			PIPE_CAP_HEIGHT,
			PIPE_CAP_COLOR,
			true,
		);
		draw.drawRectangle(
			x - PIPE_CAP_OVERHANG + 4,
			capY + 3,
			10,
			PIPE_CAP_HEIGHT - 6,
			PIPE_HIGHLIGHT_COLOR,
			true,
		);
		draw.drawRectangle(
			x + PIPE_WIDTH + PIPE_CAP_OVERHANG - 8,
			capY + 2,
			8,
			PIPE_CAP_HEIGHT - 4,
			PIPE_SHADOW_COLOR,
			true,
		);
		draw.drawRectangle(
			x - PIPE_CAP_OVERHANG,
			capY,
			PIPE_WIDTH + PIPE_CAP_OVERHANG * 2,
			PIPE_CAP_HEIGHT,
			PIPE_OUTLINE_COLOR,
			false,
		);
	}
}
