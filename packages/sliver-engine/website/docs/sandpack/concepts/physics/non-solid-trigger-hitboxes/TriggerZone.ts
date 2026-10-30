import { GameObject, SquareHitbox, Vector } from "sliver-engine";
import {
	mapEnclosurePoint,
	scaleEnclosureSize,
} from "./enclosureDimensions";

export const TELEPORT_TRIGGER_NAME = "teleport-trigger";

const TRIGGER_SIZE = scaleEnclosureSize(64, 128);
const TRIGGER_POSITION = mapEnclosurePoint(368, 68);

class TriggerZone extends GameObject {
	constructor() {
		super(TELEPORT_TRIGGER_NAME, TRIGGER_POSITION.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), TRIGGER_SIZE.clone(), this, {
				solid: false,
				debug: true,
			}),
		);
		this.setPhisics({
			immovable: true,
		});
		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			canvas
				.getShapeDrawer()
				.drawRectangle(
					pos.x,
					pos.y,
					TRIGGER_SIZE.x,
					TRIGGER_SIZE.y,
					"rgba(16, 185, 129, 0.28)",
					true,
				);
		});
	}
}

export const createTriggerZone = (): TriggerZone => {
	return new TriggerZone();
};
