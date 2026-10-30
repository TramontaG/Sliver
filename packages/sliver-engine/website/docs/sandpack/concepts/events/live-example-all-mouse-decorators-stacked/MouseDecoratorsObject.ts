import {
	onClick,
	onClickAnywhere,
	onHover,
	onMouseMoved,
	onMouseRelease,
	onMouseWheel,
	onMouseWheelOverHitbox,
	onStopHovering,
	Vector,
	type GameEvent,
} from "sliver-engine";
import { MouseDecoratorsObjectBase } from "./MouseDecoratorsObject.base";

const BOX_STEP_X = 8;
const BOX_MIN_X = 40;
const BOX_MAX_X = 520 - 64 - 40;

export class MouseDecoratorsObject extends MouseDecoratorsObjectBase {
	constructor() {
		super("mouse-decorators-demo");
	}

	@onClick<MouseDecoratorsObject>((obj) => {
		obj.decoratorCounters.onClick += 1;
		obj.fillColor = "#f97316";
		const pos = obj.getPosition();
		obj.setPosition(
			new Vector(Math.max(BOX_MIN_X, Math.min(BOX_MAX_X, pos.x + BOX_STEP_X)), pos.y),
		);
	})
	@onClickAnywhere<MouseDecoratorsObject>((obj) => {
		obj.decoratorCounters.onClickAnywhere += 1;
		obj.outlineColor = obj.outlineColor === "#e2e8f0" ? "#22d3ee" : "#e2e8f0";
	})
	@onMouseRelease<MouseDecoratorsObject>((obj) => {
		obj.decoratorCounters.onMouseRelease += 1;
		obj.fillColor = "#f59e0b";
	})
	@onHover<MouseDecoratorsObject>((obj) => {
		obj.decoratorCounters.onHover += 1;
		obj.setOpacity(0.84);
	})
	@onStopHovering<MouseDecoratorsObject>((obj) => {
		obj.decoratorCounters.onStopHovering += 1;
		obj.setOpacity(1);
	})
	@onMouseMoved<MouseDecoratorsObject>((obj, event) => {
		obj.decoratorCounters.onMouseMoved += 1;
		obj.lastMousePosition = new Vector(event.x, event.y);
	})
	@onMouseWheel<MouseDecoratorsObject>((obj, event) => {
		obj.decoratorCounters.onMouseWheel += 1;
		obj.lastWheelDeltaY = event.deltaY;
	})
	@onMouseWheelOverHitbox<MouseDecoratorsObject>((obj, event) => {
		obj.decoratorCounters.onMouseWheelOverHitbox += 1;
		const direction = event.deltaY === 0 ? 0 : Math.sign(event.deltaY);
		obj.rotation += direction * 0.08;
	})
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}
}
