import { Vector } from "../../Lib/Vector";
import type { PhysicsBody } from "../Body";

const assertFiniteNumber = (value: number, label: string): void => {
	if (!Number.isFinite(value)) {
		throw new Error(`${label} must be a finite number.`);
	}
};

const assertFiniteVector = (value: Vector, label: string): void => {
	assertFiniteNumber(value.x, `${label}.x`);
	assertFiniteNumber(value.y, `${label}.y`);
};

const assertPositiveTimeStep = (dt: number): void => {
	assertFiniteNumber(dt, "Time step");
	if (dt <= 0) {
		throw new Error("Time step must be positive.");
	}
};

const BODY_WAKE_EPSILON = 1e-8;

const clearBodyAccumulators = (body: PhysicsBody): void => {
	body.force = Vector.zero();
	body.torque = 0;
};

const applyLinearDamping = (body: PhysicsBody, dt: number): void => {
	if (body.linearDamping <= 0) {
		return;
	}

	// Box2D-style Pade approximation for v(t + h) = v(t) * exp(-c h).
	body.linearVelocity.multiply(1 / (1 + body.linearDamping * dt));
};

const applyAngularDamping = (body: PhysicsBody, dt: number): void => {
	if (body.angularDamping <= 0) {
		return;
	}

	body.angularVelocity *= 1 / (1 + body.angularDamping * dt);
};

const integrateDynamicBody = (
	body: PhysicsBody,
	gravity: Vector,
	dt: number
): void => {
	const linearAcceleration = gravity.toAdded(body.force.toMultiplied(body.invMass));
	const angularAcceleration = body.torque * body.invInertia;

	body.linearVelocity.add(linearAcceleration.toMultiplied(dt));
	body.angularVelocity += angularAcceleration * dt;

	applyLinearDamping(body, dt);
	applyAngularDamping(body, dt);

	body.position.add(body.linearVelocity.toMultiplied(dt));
	body.angle += body.angularVelocity * dt;
};

const integrateKinematicBody = (body: PhysicsBody, dt: number): void => {
	body.position.add(body.linearVelocity.toMultiplied(dt));
	body.angle += body.angularVelocity * dt;
};

const integrateStaticBody = (body: PhysicsBody): void => {
	body.linearVelocity = Vector.zero();
	body.angularVelocity = 0;
};

const hasExternalWakeRequest = (body: PhysicsBody): boolean => {
	return (
		body.force.squaredMagnitude() > BODY_WAKE_EPSILON * BODY_WAKE_EPSILON ||
		Math.abs(body.torque) > BODY_WAKE_EPSILON ||
		body.linearVelocity.squaredMagnitude() >
			BODY_WAKE_EPSILON * BODY_WAKE_EPSILON ||
		Math.abs(body.angularVelocity) > BODY_WAKE_EPSILON
	);
};

const integrateBody = (body: PhysicsBody, gravity: Vector, dt: number): void => {
	assertFiniteVector(gravity, "Gravity");
	assertPositiveTimeStep(dt);

	if (body.bodyType === "dynamic" && body.sleep.isSleeping) {
		if (hasExternalWakeRequest(body)) {
			body.sleep.isSleeping = false;
			body.sleep.sleepTime = 0;
		} else {
			clearBodyAccumulators(body);
			return;
		}
	}

	switch (body.bodyType) {
		case "dynamic":
			integrateDynamicBody(body, gravity, dt);
			break;
		case "kinematic":
			integrateKinematicBody(body, dt);
			break;
		case "static":
			integrateStaticBody(body);
			break;
		default:
			throw new Error(`Unsupported body type: ${String(body.bodyType)}`);
	}

	clearBodyAccumulators(body);
};

export { clearBodyAccumulators, integrateBody };
