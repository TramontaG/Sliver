import { describe, expect, test } from "bun:test";
import {
	PhysicsBody,
	integrateBody,
} from "../../../src/Physics";
import { Vector } from "../../../src/Lib/Vector";
import { runFixedStepsMutable } from "../FixedStep";
import {
	expectCloseToNumber,
	expectCloseToVector,
} from "../TestAssertions";

const INTEGRATION_EPSILON = 1e-9;

describe("Physics body integration", () => {
	test("integrates dynamic-body force and gravity into velocity and position", () => {
		const body = new PhysicsBody({
			bodyType: "dynamic",
			position: Vector.zero(),
			linearVelocity: new Vector(1, 2),
			force: new Vector(4, -2),
		});
		const gravity = new Vector(0, -10);

		runFixedStepsMutable(
			body,
			(currentBody, dt) => {
				integrateBody(currentBody, gravity, dt);
			},
			{ steps: 1, dt: 0.25 }
		);

		expectCloseToVector(body.linearVelocity, new Vector(2, -1), INTEGRATION_EPSILON);
		expectCloseToVector(body.position, new Vector(0.5, -0.25), INTEGRATION_EPSILON);
		expectCloseToVector(body.force, Vector.zero(), INTEGRATION_EPSILON);
		expectCloseToNumber(body.torque, 0, INTEGRATION_EPSILON);
	});

	test("integrates torque into angular velocity and angle using semi-implicit Euler", () => {
		const body = new PhysicsBody({
			bodyType: "dynamic",
			angle: 0.25,
			angularVelocity: 1,
			torque: 4,
			massProperties: {
				area: 1,
				mass: 1,
				invMass: 1,
				centroid: Vector.zero(),
				inertia: 2,
				invInertia: 0.5,
			},
		});

		runFixedStepsMutable(
			body,
			(currentBody, dt) => {
				integrateBody(currentBody, Vector.zero(), dt);
			},
			{ steps: 1, dt: 0.5 }
		);

		expectCloseToNumber(body.angularVelocity, 2, INTEGRATION_EPSILON);
		expectCloseToNumber(body.angle, 1.25, INTEGRATION_EPSILON);
		expectCloseToNumber(body.torque, 0, INTEGRATION_EPSILON);
	});

	test("applies gravity only to dynamic bodies", () => {
		const dynamicBody = new PhysicsBody({
			bodyType: "dynamic",
		});
		const kinematicBody = new PhysicsBody({
			bodyType: "kinematic",
			position: new Vector(5, 0),
			linearVelocity: new Vector(2, -1),
			angularVelocity: 3,
			force: new Vector(100, 100),
			torque: 50,
		});
		const staticBody = new PhysicsBody({
			bodyType: "static",
			position: new Vector(-5, 0),
			linearVelocity: new Vector(7, 8),
			angularVelocity: 2,
			force: new Vector(100, 100),
			torque: 25,
		});
		const gravity = new Vector(0, -9.8);

		runFixedStepsMutable(
			dynamicBody,
			(body, dt) => {
				integrateBody(body, gravity, dt);
			},
			{ steps: 1, dt: 1 }
		);
		runFixedStepsMutable(
			kinematicBody,
			(body, dt) => {
				integrateBody(body, gravity, dt);
			},
			{ steps: 1, dt: 1 }
		);
		runFixedStepsMutable(
			staticBody,
			(body, dt) => {
				integrateBody(body, gravity, dt);
			},
			{ steps: 1, dt: 1 }
		);

		expectCloseToVector(
			dynamicBody.linearVelocity,
			new Vector(0, -9.8),
			INTEGRATION_EPSILON
		);
		expectCloseToVector(
			dynamicBody.position,
			new Vector(0, -9.8),
			INTEGRATION_EPSILON
		);

		expectCloseToVector(
			kinematicBody.linearVelocity,
			new Vector(2, -1),
			INTEGRATION_EPSILON
		);
		expectCloseToNumber(kinematicBody.angularVelocity, 3, INTEGRATION_EPSILON);
		expectCloseToVector(
			kinematicBody.position,
			new Vector(7, -1),
			INTEGRATION_EPSILON
		);
		expectCloseToNumber(kinematicBody.angle, 3, INTEGRATION_EPSILON);

		expectCloseToVector(staticBody.linearVelocity, Vector.zero(), INTEGRATION_EPSILON);
		expectCloseToNumber(staticBody.angularVelocity, 0, INTEGRATION_EPSILON);
		expectCloseToVector(staticBody.position, new Vector(-5, 0), INTEGRATION_EPSILON);
		expectCloseToNumber(staticBody.angle, 0, INTEGRATION_EPSILON);
	});

	test("ignores damping on kinematic bodies driven by authored velocity", () => {
		const body = new PhysicsBody({
			bodyType: "kinematic",
			position: new Vector(1, -2),
			angle: 0.5,
			linearVelocity: new Vector(6, -3),
			angularVelocity: 4,
			linearDamping: 10,
			angularDamping: 12,
		});

		runFixedStepsMutable(
			body,
			(currentBody, dt) => {
				integrateBody(currentBody, new Vector(0, -50), dt);
			},
			{ steps: 1, dt: 0.25 }
		);

		expectCloseToVector(body.linearVelocity, new Vector(6, -3), INTEGRATION_EPSILON);
		expectCloseToNumber(body.angularVelocity, 4, INTEGRATION_EPSILON);
		expectCloseToVector(body.position, new Vector(2.5, -2.75), INTEGRATION_EPSILON);
		expectCloseToNumber(body.angle, 1.5, INTEGRATION_EPSILON);
	});

	test("applies gravity as mass-independent acceleration on dynamic bodies", () => {
		const body = new PhysicsBody({
			bodyType: "dynamic",
			massProperties: {
				area: 1,
				mass: 2,
				invMass: 0.5,
				centroid: Vector.zero(),
				inertia: 4,
				invInertia: 0.25,
			},
		});
		const gravity = new Vector(0, -10);

		runFixedStepsMutable(
			body,
			(currentBody, dt) => {
				integrateBody(currentBody, gravity, dt);
			},
			{ steps: 1, dt: 0.5 }
		);

		expectCloseToVector(body.linearVelocity, new Vector(0, -5), INTEGRATION_EPSILON);
		expectCloseToVector(body.position, new Vector(0, -2.5), INTEGRATION_EPSILON);
	});

	test("applies Box2D-style damping to dynamic velocity before position integration", () => {
		const body = new PhysicsBody({
			bodyType: "dynamic",
			position: Vector.zero(),
			angle: 0,
			linearVelocity: new Vector(10, 0),
			angularVelocity: 12,
			linearDamping: 1,
			angularDamping: 2,
		});

		runFixedStepsMutable(
			body,
			(currentBody, dt) => {
				integrateBody(currentBody, Vector.zero(), dt);
			},
			{ steps: 1, dt: 0.5 }
		);

		expectCloseToVector(
			body.linearVelocity,
			new Vector(10 / 1.5, 0),
			INTEGRATION_EPSILON
		);
		expectCloseToNumber(body.angularVelocity, 6, INTEGRATION_EPSILON);
		expectCloseToVector(
			body.position,
			new Vector((10 / 1.5) * 0.5, 0),
			INTEGRATION_EPSILON
		);
		expectCloseToNumber(body.angle, 3, INTEGRATION_EPSILON);
	});

	test("uses semi-implicit Euler ordering for position integration", () => {
		const body = new PhysicsBody({
			bodyType: "dynamic",
			position: Vector.zero(),
			linearVelocity: Vector.zero(),
			force: new Vector(2, 0),
		});

		runFixedStepsMutable(
			body,
			(currentBody, dt) => {
				integrateBody(currentBody, Vector.zero(), dt);
			},
			{ steps: 1, dt: 1 }
		);

		expectCloseToVector(body.linearVelocity, new Vector(2, 0), INTEGRATION_EPSILON);
		expectCloseToVector(body.position, new Vector(2, 0), INTEGRATION_EPSILON);
	});

	test("integrates pure ballistic motion without force or gravity", () => {
		const body = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(-3, 4),
			linearVelocity: new Vector(2, -5),
			angularVelocity: 1.5,
		});

		runFixedStepsMutable(
			body,
			(currentBody, dt) => {
				integrateBody(currentBody, Vector.zero(), dt);
			},
			{ steps: 3, dt: 0.25 }
		);

		expectCloseToVector(body.linearVelocity, new Vector(2, -5), INTEGRATION_EPSILON);
		expectCloseToNumber(body.angularVelocity, 1.5, INTEGRATION_EPSILON);
		expectCloseToVector(body.position, new Vector(-1.5, 0.25), INTEGRATION_EPSILON);
		expectCloseToNumber(body.angle, 1.125, INTEGRATION_EPSILON);
	});

	test("matches the discrete semi-implicit Euler trajectory over many fixed steps", () => {
		const body = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(3, 1),
			linearVelocity: new Vector(2, 0),
		});
		const gravity = new Vector(0, -9.8);
		const steps = 120;
		const dt = 1 / 60;

		runFixedStepsMutable(
			body,
			(currentBody, stepDt) => {
				integrateBody(currentBody, gravity, stepDt);
			},
			{ steps, dt }
		);

		const totalTime = steps * dt;
		const expectedVelocity = new Vector(2, gravity.y * totalTime);
		const expectedPosition = new Vector(
			3 + 2 * totalTime,
			1 + gravity.y * dt * dt * ((steps * (steps + 1)) / 2)
		);

		expectCloseToVector(body.linearVelocity, expectedVelocity, INTEGRATION_EPSILON);
		expectCloseToVector(body.position, expectedPosition, INTEGRATION_EPSILON);
	});

	test("clears force and torque accumulators after every integration step", () => {
		const body = new PhysicsBody({
			bodyType: "dynamic",
			force: new Vector(3, -2),
			torque: 5,
		});

		runFixedStepsMutable(
			body,
			(currentBody, dt, stepIndex) => {
				// Step 1 assertions prove the previous integration cleared the accumulators.
				if (stepIndex === 1) {
					expectCloseToVector(currentBody.force, Vector.zero(), INTEGRATION_EPSILON);
					expectCloseToNumber(currentBody.torque, 0, INTEGRATION_EPSILON);
					currentBody.force = new Vector(1, 0);
					currentBody.torque = 2;
				}

				integrateBody(currentBody, Vector.zero(), dt);
			},
			{ steps: 2, dt: 1 }
		);

		expectCloseToVector(body.force, Vector.zero(), INTEGRATION_EPSILON);
		expectCloseToNumber(body.torque, 0, INTEGRATION_EPSILON);
		expectCloseToVector(body.linearVelocity, new Vector(4, -2), INTEGRATION_EPSILON);
		expectCloseToNumber(body.angularVelocity, 7, INTEGRATION_EPSILON);
	});

	test("rejects non-positive integration time steps", () => {
		const body = new PhysicsBody();

		expect(() => integrateBody(body, Vector.zero(), 0)).toThrow();
		expect(() => integrateBody(body, Vector.zero(), -1 / 60)).toThrow();
	});
});
