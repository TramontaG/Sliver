import type { GameObject } from "sliver-engine";
import { MovingBoxBase, MOVING_BOX_START } from "./MovingBoxBase";
import { TELEPORT_TRIGGER_NAME } from "./TriggerZone";

export class TeleportingBox extends MovingBoxBase {
	constructor() {
		super("moving-box");
	}

	// Edit only this method.
	override onColision(otherGO: GameObject): void {
		if (otherGO.name === TELEPORT_TRIGGER_NAME && this.teleportCooldown === 0) {
			// Schedule the teleport for the next tick so it is not
			// overwritten by the physics write-back that happens after
			// onColision is called. The cooldown prevents re-triggering
			// immediately after teleporting back to the start.
			this.pendingTeleportTo = MOVING_BOX_START.clone();
		}
	}
}
