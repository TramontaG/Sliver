import { describe, test } from "bun:test";
import type { GameEvent } from "../../../src/Events";
import { grabbable } from "../../../src/Events/decorators";
import { GameObject } from "../../../src/GameObject";
import { SquareHitbox } from "../../../src/GameObject/Hitboxes";
import { Vector } from "../../../src/Lib/Vector";
import { expectCloseToNumber } from "../TestAssertions";

const THROW_EPSILON = 1e-6;
const GRABBABLE_STATE = Symbol.for("sliver-engine.grabbableState");

class GrabbableProbe extends GameObject {
	constructor(name: string, position: Vector) {
		super(name, position);
		this.addHitbox(
			new SquareHitbox(Vector.zero(), new Vector(1, 1), this, {
				solid: true,
			})
		);
	}

	@grabbable()
	override handleEvent(_event: GameEvent): void { }
}

describe("Grabbable throw integration", () => {
	test("converts drag displacement into release velocity units", () => {
		const probe = new GrabbableProbe("probe", Vector.zero());
		probe.setContext({
			// Keep the release threshold comfortably above normal test execution
			// time so the stale-drag guard does not zero the throw.
			getTickRate: () => 2,
		} as any);

		probe.handleEvent({
			type: "mouseButtonPressed",
			button: 0,
			x: 0.5,
			y: 0.5,
		});
		probe.handleEvent({
			type: "mouseMoved",
			x: 6.5,
			y: 0.5,
		});

		// Sample one tick of held movement so the decorator records the recent drag.
		probe.tick();

		// Keep this assertion focused on unit conversion, not on the stale-drag
		// release timeout, which depends on wall-clock timing.
		(probe as any)[GRABBABLE_STATE].lastMouseMoveTimeMs = performance.now();

		probe.handleEvent({
			type: "mouseButtonReleased",
			button: 0,
			x: 6.5,
			y: 0.5,
		});

		// The drag moved the object 6 units in one 2 Hz tick. The decorator
		// accumulates samples in a circular buffer of size 10 and averages them,
		// so with a single sample the averaged per-tick delta is 6/10 = 0.6.
		// Multiplied by the tick rate (2 Hz) gives 0.6 * 2 = 1.2 units/s.
		expectCloseToNumber(probe.speed.x, 1.2, THROW_EPSILON, "throw speed x");
		expectCloseToNumber(probe.speed.y, 0, THROW_EPSILON, "throw speed y");
	});
});
