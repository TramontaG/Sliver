import {
	Vector,
	onClick,
	type GameContext,
	type GameEvent,
	type Scene,
} from "sliver-engine";
import { MessageObjectBase } from "./MessageObjectBase";

const MESSAGE_TO_A = "messages:to-a";
const MESSAGE_TO_B = "messages:to-b";

export class ObjectA extends MessageObjectBase {
	constructor() {
		super({
			id: "object-a",
			label: "Object A",
			position: new Vector(176, 160),
			colorA: "#2563eb",
			colorB: "#0ea5e9",
		});
	}

	override onAddedToScene(_scene: Scene, _context: GameContext): void {
		this.onMessage(MESSAGE_TO_A, () => {
			this.toggleColor();
		});
	}

	@onClick<ObjectA>((obj) => {
		obj.sendMessage(MESSAGE_TO_B, { requestedBy: obj.name });
	})
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}
}
