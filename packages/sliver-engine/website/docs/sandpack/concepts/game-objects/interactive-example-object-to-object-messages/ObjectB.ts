import {
	Vector,
	onClick,
	onHover,
	onStopHovering,
	type GameContext,
	type GameEvent,
	type Scene,
} from "sliver-engine";
import { MessageObjectBase } from "./MessageObjectBase";

const MESSAGE_TO_A = "messages:to-a";
const MESSAGE_TO_B = "messages:to-b";

const HOVER_BORDER_COLOR = "#facc15";
const DEFAULT_BORDER_COLOR = "#0f172a";

export class ObjectB extends MessageObjectBase {
	constructor() {
		super({
			id: "object-b",
			label: "Object B",
			position: new Vector(600, 160),
			colorA: "#16a34a",
			colorB: "#22c55e",
		});
	}

	override onAddedToScene(_scene: Scene, _context: GameContext): void {
		this.onMessage(MESSAGE_TO_B, () => {
			this.toggleColor();
		});
	}

	@onHover<ObjectB>((obj) => {
		obj.setBorderColor(HOVER_BORDER_COLOR);
	})
	@onStopHovering<ObjectB>((obj) => {
		obj.setBorderColor(DEFAULT_BORDER_COLOR);
	})
	@onClick<ObjectB>((obj) => {
		obj.sendMessage(MESSAGE_TO_A, { requestedBy: obj.name });
	})
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}
}
