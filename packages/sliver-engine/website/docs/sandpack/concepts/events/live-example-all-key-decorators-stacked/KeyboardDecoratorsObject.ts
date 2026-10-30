import {
	onKeyComboHold,
	onKeyComboPressed,
	onKeyHold,
	onKeyPressed,
	Vector,
	type GameEvent,
} from "sliver-engine";
import { KeyboardDecoratorsObjectBase } from "./KeyboardDecoratorsObject.base";

const HOLD_SPEED = 120;
const SPACE_KEY = " ";

export class KeyboardDecoratorsObject extends KeyboardDecoratorsObjectBase {
	private pendingVelocity = Vector.zero();

	constructor() {
		super("keyboard-decorators-demo");
	}

	override tick(): void {
		this.pendingVelocity = Vector.zero();
		super.tick();
		this.speed = this.pendingVelocity.clone();
	}

	@onKeyComboHold<KeyboardDecoratorsObject>(["Shift", "A"], (obj) => {
		obj.rotation -= 0.08;
	})
	@onKeyComboHold<KeyboardDecoratorsObject>(["Shift", "D"], (obj) => {
		obj.rotation += 0.08;
	})
	@onKeyHold<KeyboardDecoratorsObject>("w", (obj) => {
		obj.queueVelocity(new Vector(0, -HOLD_SPEED));
	})
	@onKeyHold<KeyboardDecoratorsObject>("a", (obj) => {
		obj.queueVelocity(new Vector(-HOLD_SPEED, 0));
	})
	@onKeyHold<KeyboardDecoratorsObject>("s", (obj) => {
		obj.queueVelocity(new Vector(0, HOLD_SPEED));
	})
	@onKeyHold<KeyboardDecoratorsObject>("d", (obj) => {
		obj.queueVelocity(new Vector(HOLD_SPEED, 0));
	})
	@onKeyComboPressed<KeyboardDecoratorsObject>(["Shift", SPACE_KEY], (obj) => {
		obj.rotation = 0;
	})
	@onKeyPressed<KeyboardDecoratorsObject>(SPACE_KEY, (obj) => {
		obj.setOpacity(Math.random());
	})
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}

	private queueVelocity(delta: Vector): void {
		this.pendingVelocity.add(delta);
	}
}
