import {
	GameObject,
	SquareHitbox,
	Vector,
	grabbable,
	type GameEvent,
} from "sliver-engine";
import {
	mapEnclosurePoint,
	scaleEnclosureSize,
} from "./enclosureDimensions";

const BOX_SIZE = scaleEnclosureSize(24, 24);
const BOX_START = mapEnclosurePoint(228, 72);

export class GravityBox extends GameObject {
	constructor() {
		super("gravity-box", BOX_START.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), BOX_SIZE.clone(), this, {
				solid: true,
				debug: false,
			}),
		);
		this.setPhisics({
			immovable: false,
			affectedByGravity: true,
			restitution: 0.25,
			friction: 0.4,
			mass: 1,
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

	@grabbable()
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}
}
