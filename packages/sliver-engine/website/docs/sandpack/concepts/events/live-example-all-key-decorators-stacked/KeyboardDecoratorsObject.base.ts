import { GameObject, SquareHitbox, Vector } from "sliver-engine";

type KeyDecoratorCounterKey =
	| "onKeyPressed"
	| "onKeyHold"
	| "onKeyComboPressed"
	| "onKeyComboHold";

type KeyDecoratorCounters = Record<KeyDecoratorCounterKey, number>;

const BOX_SIZE = new Vector(64, 64);
const BOX_START = new Vector(96, 126);

const createInitialCounters = (): KeyDecoratorCounters => ({
	onKeyPressed: 0,
	onKeyHold: 0,
	onKeyComboPressed: 0,
	onKeyComboHold: 0,
});

export class KeyboardDecoratorsObjectBase extends GameObject {
	public keyCounters: KeyDecoratorCounters = createInitialCounters();
	public fillColor = "#f59e0b";
	public outlineColor = "#e2e8f0";

	constructor(name: string = "keyboard-decorators-demo") {
		super(name, BOX_START.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), BOX_SIZE.clone(), this, {
				solid: true,
				debug: false,
			}),
		);
		this.setPhisics({
			immovable: false,
			affectedByGravity: false,
			friction: 0,
			restitution: 0,
		});
		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			const draw = canvas.getShapeDrawer();

			draw.drawRectangle(
				pos.x - 2,
				pos.y - 2,
				BOX_SIZE.x + 4,
				BOX_SIZE.y + 4,
				this.outlineColor,
				true,
				);
			draw.drawRectangle(pos.x, pos.y, BOX_SIZE.x, BOX_SIZE.y, this.fillColor, true);
		});
	}
}
