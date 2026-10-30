import { GameObject, SquareHitbox, Vector } from "sliver-engine";
import {
	mapEnclosurePoint,
	scaleEnclosureSize,
	scaleEnclosureVector,
} from "./enclosureDimensions";

const BOX_SIZE = scaleEnclosureSize(24, 24);
export const MOVING_BOX_START = mapEnclosurePoint(56, 126);
const FIXED_SPEED = scaleEnclosureVector(120, 0);
const TELEPORT_COOLDOWN_TICKS = 30;

export class MovingBoxBase extends GameObject {
	protected pendingTeleportTo: Vector | null = null;
	protected teleportCooldown: number = 0;

	constructor(name: string = "moving-box") {
		super(name, MOVING_BOX_START.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), BOX_SIZE.clone(), this, {
				solid: true,
				debug: false,
			}),
		);
		this.setPhisics({
			immovable: false,
			affectedByGravity: false,
			restitution: 0,
			friction: 0,
			mass: 1,
		});
		this.setTickFunction(() => {
			if (this.pendingTeleportTo) {
				this.setPosition(this.pendingTeleportTo.clone());
				this.speed = Vector.zero();
				this.pendingTeleportTo = null;
				this.teleportCooldown = TELEPORT_COOLDOWN_TICKS;
			}
			if (this.teleportCooldown > 0) {
				this.teleportCooldown--;
			}
			this.speed = FIXED_SPEED.clone();
		});
		this.setRenderFunction((obj, canvas) => {
			const pos = obj.getPosition();
			canvas
				.getShapeDrawer()
				.drawRectangle(
					pos.x,
					pos.y,
					BOX_SIZE.x,
					BOX_SIZE.y,
					"#f59e0b",
					true,
				);
		});
	}
}
