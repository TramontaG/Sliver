import {
	GameObject,
	SquareHitbox,
	Vector,
	type CanvasController,
} from "sliver-engine";

export type MessageObjectBaseOptions = {
	id: string;
	label: string;
	position: Vector;
	colorA: string;
	colorB: string;
};

const BOX_SIZE = new Vector(180, 120);
const DEFAULT_BORDER_COLOR = "#0f172a";

export class MessageObjectBase extends GameObject {
	private readonly label: string;
	private readonly colors: [string, string];
	private colorIndex = 0;
	private borderColor = DEFAULT_BORDER_COLOR;

	constructor(options: MessageObjectBaseOptions) {
		super(options.id, options.position.clone());
		this.label = options.label;
		this.colors = [options.colorA, options.colorB];
		this.setPhisics({ immovable: true, affectedByGravity: false });
		this.addHitbox(
			new SquareHitbox(Vector.zero(), BOX_SIZE.clone(), this, {
				solid: false,
				debug: false,
			}),
		);
	}

	public setBorderColor(color: string): void {
		this.borderColor = color;
	}

	protected toggleColor(): void {
		this.colorIndex = (this.colorIndex + 1) % this.colors.length;
	}

	override render(canvas: CanvasController): void {
		const draw = canvas.getShapeDrawer();
		const pos = this.getPosition();
		draw.drawRectangle(
			pos.x,
			pos.y,
			BOX_SIZE.x,
			BOX_SIZE.y,
			this.colors[this.colorIndex],
			true,
		);
		draw.drawRectangle(
			pos.x,
			pos.y,
			BOX_SIZE.x,
			BOX_SIZE.y,
			this.borderColor,
			false,
		);
		draw.drawText(
			this.label,
			pos.x + BOX_SIZE.x / 2,
			pos.y + BOX_SIZE.y / 2 + 8,
			"white",
			"24px",
			"center",
		);
	}
}
