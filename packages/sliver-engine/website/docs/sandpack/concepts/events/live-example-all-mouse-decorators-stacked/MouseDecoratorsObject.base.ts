import {
	GameObject,
	SquareHitbox,
	Vector,
} from "sliver-engine";

type MouseDecoratorCounterKey =
	| "onClick"
	| "onClickAnywhere"
	| "onMouseRelease"
	| "onHover"
	| "onStopHovering"
	| "onMouseMoved"
	| "onMouseWheel"
	| "onMouseWheelOverHitbox";

type MouseDecoratorCounters = Record<MouseDecoratorCounterKey, number>;

const BOX_SIZE = new Vector(64, 64);
const BOX_START = new Vector(208, 126);

const createInitialCounters = (): MouseDecoratorCounters => ({
	onClick: 0,
	onClickAnywhere: 0,
	onMouseRelease: 0,
	onHover: 0,
	onStopHovering: 0,
	onMouseMoved: 0,
	onMouseWheel: 0,
	onMouseWheelOverHitbox: 0,
});

export class MouseDecoratorsObjectBase extends GameObject {
	public decoratorCounters: MouseDecoratorCounters = createInitialCounters();
	public fillColor = "#f59e0b";
	public outlineColor = "#e2e8f0";
	public lastMousePosition = Vector.zero();
	public lastWheelDeltaY = 0;

	constructor(name: string = "mouse-decorators-demo") {
		super(name, BOX_START.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), BOX_SIZE.clone(), this, {
				solid: false,
				debug: false,
			}),
		);
		this.setPhisics({
			immovable: true,
			affectedByGravity: false,
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

	public getHudLines(): string[] {
		return [
			`onClick (hitbox): ${this.decoratorCounters.onClick}`,
			`onClickAnywhere: ${this.decoratorCounters.onClickAnywhere}`,
			`onMouseRelease (hitbox): ${this.decoratorCounters.onMouseRelease}`,
			`onHover: ${this.decoratorCounters.onHover} | onStopHovering: ${this.decoratorCounters.onStopHovering}`,
			`onMouseMoved (hitbox): ${this.decoratorCounters.onMouseMoved}`,
			`onMouseWheel: ${this.decoratorCounters.onMouseWheel}`,
			`onMouseWheelOverHitbox: ${this.decoratorCounters.onMouseWheelOverHitbox}`,
			`mouse: (${this.lastMousePosition.x.toFixed(0)}, ${this.lastMousePosition.y.toFixed(0)}) wheelY: ${this.lastWheelDeltaY.toFixed(1)}`,
		];
	}
}
