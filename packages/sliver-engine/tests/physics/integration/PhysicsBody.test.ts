import { describe, expect, test } from "bun:test";
import {
	CircleShape,
	DEFAULT_ANGULAR_DAMPING,
	DEFAULT_BODY_MASS_PROPERTIES,
	DEFAULT_COLLISION_FILTER,
	DEFAULT_DYNAMIC_FRICTION,
	DEFAULT_LINEAR_DAMPING,
	DEFAULT_RESTITUTION,
	DEFAULT_SLEEP_STATE,
	DEFAULT_STATIC_FRICTION,
	PhysicsBody,
	computeCircleMassProperties,
	mixFriction,
	mixRestitution,
} from "../../../src/Physics";
import { Vector } from "../../../src/Lib/Vector";
import {
	expectCloseToNumber,
	expectCloseToVector,
} from "../TestAssertions";

describe("Physics body model", () => {
	test("defaults a dynamic body with explicit standalone state", () => {
		const body = new PhysicsBody();

		expect(DEFAULT_COLLISION_FILTER).toEqual({
			category: 0x0001,
			mask: 0xffffffff,
		});
		expectCloseToNumber(DEFAULT_LINEAR_DAMPING, 0);
		expectCloseToNumber(DEFAULT_ANGULAR_DAMPING, 0);
		expect(body.bodyType).toBe("dynamic");
		expectCloseToVector(body.position, Vector.zero());
		expectCloseToNumber(body.angle, 0);
		expectCloseToVector(body.linearVelocity, Vector.zero());
		expectCloseToNumber(body.angularVelocity, 0);
		expectCloseToVector(body.force, Vector.zero());
		expectCloseToNumber(body.torque, 0);
		expectCloseToVector(body.localCenter, DEFAULT_BODY_MASS_PROPERTIES.centroid);
		expectCloseToNumber(body.mass, DEFAULT_BODY_MASS_PROPERTIES.mass);
		expectCloseToNumber(body.invMass, DEFAULT_BODY_MASS_PROPERTIES.invMass);
		expectCloseToNumber(body.inertia, DEFAULT_BODY_MASS_PROPERTIES.inertia);
		expectCloseToNumber(body.invInertia, DEFAULT_BODY_MASS_PROPERTIES.invInertia);
		expectCloseToNumber(body.linearDamping, DEFAULT_LINEAR_DAMPING);
		expectCloseToNumber(body.angularDamping, DEFAULT_ANGULAR_DAMPING);
		expectCloseToNumber(body.staticFriction, DEFAULT_STATIC_FRICTION);
		expectCloseToNumber(body.dynamicFriction, DEFAULT_DYNAMIC_FRICTION);
		expectCloseToNumber(body.restitution, DEFAULT_RESTITUTION);
		expect(body.filter.category).toBe(0x0001);
		expect(body.filter.mask).toBe(0xffffffff);
		expect(body.filter).toEqual(DEFAULT_COLLISION_FILTER);
		expect(body.sleep).toEqual(DEFAULT_SLEEP_STATE);
	});

	test("keeps dynamic inverse mass and inverse inertia from supplied mass properties", () => {
		const massProperties = computeCircleMassProperties(
			new CircleShape(new Vector(2, -1), 3),
			2
		);
		const body = new PhysicsBody({
			bodyType: "dynamic",
			massProperties,
		});

		expectCloseToVector(body.localCenter, massProperties.centroid);
		expectCloseToNumber(body.mass, massProperties.mass);
		expectCloseToNumber(body.invMass, massProperties.invMass);
		expectCloseToNumber(body.inertia, massProperties.inertia);
		expectCloseToNumber(body.invInertia, massProperties.invInertia);
	});

	test("treats static bodies as infinite-mass bodies from the solver perspective", () => {
		const massProperties = computeCircleMassProperties(
			new CircleShape(new Vector(1, 0), 2),
			1.5
		);
		const body = new PhysicsBody({
			bodyType: "static",
			massProperties,
		});

		expect(body.bodyType).toBe("static");
		expectCloseToVector(body.localCenter, massProperties.centroid);
		expectCloseToNumber(body.mass, massProperties.mass);
		expectCloseToNumber(body.inertia, massProperties.inertia);
		expectCloseToNumber(body.invMass, 0);
		expectCloseToNumber(body.invInertia, 0);
	});

	test("supports kinematic bodies with authored velocities and zero inverse mass", () => {
		const body = new PhysicsBody({
			bodyType: "kinematic",
			position: new Vector(10, -2),
			linearVelocity: new Vector(3, 4),
			angularVelocity: 2,
		});

		expect(body.bodyType).toBe("kinematic");
		expectCloseToVector(body.position, new Vector(10, -2));
		expectCloseToVector(body.linearVelocity, new Vector(3, 4));
		expectCloseToNumber(body.angularVelocity, 2);
		expectCloseToVector(body.force, Vector.zero());
		expectCloseToNumber(body.torque, 0);
		expectCloseToNumber(body.invMass, 0);
		expectCloseToNumber(body.invInertia, 0);
	});

	test("applies damping and filtering defaults and overrides explicitly", () => {
		const body = new PhysicsBody({
			linearDamping: 0.2,
			angularDamping: 0.35,
			filter: {
				category: 0x0002,
				mask: 0x0004,
			},
			sleep: {
				canSleep: false,
				isSleeping: false,
				sleepTime: 0.5,
			},
		});

		expectCloseToNumber(body.linearDamping, 0.2);
		expectCloseToNumber(body.angularDamping, 0.35);
		expect(body.filter).toEqual({
			category: 0x0002,
			mask: 0x0004,
		});
		expect(body.sleep).toEqual({
			canSleep: false,
			isSleeping: false,
			sleepTime: 0.5,
		});
	});

	test("updates inverse mass semantics when the body type changes", () => {
		const massProperties = computeCircleMassProperties(
			new CircleShape(Vector.zero(), 2),
			1
		);
		const body = new PhysicsBody({
			bodyType: "dynamic",
			massProperties,
		});

		body.setBodyType("static");
		expectCloseToNumber(body.invMass, 0);
		expectCloseToNumber(body.invInertia, 0);

		body.setBodyType("kinematic");
		expectCloseToNumber(body.invMass, 0);
		expectCloseToNumber(body.invInertia, 0);

		body.setBodyType("dynamic");
		expectCloseToNumber(body.invMass, massProperties.invMass);
		expectCloseToNumber(body.invInertia, massProperties.invInertia);
	});

	test("preserves non-mass state across body-type changes", () => {
		const massProperties = computeCircleMassProperties(
			new CircleShape(new Vector(1, -1), 2),
			1
		);
		const body = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(3, -4),
			angle: 0.75,
			linearVelocity: new Vector(5, -6),
			angularVelocity: 1.25,
			force: new Vector(-2, 7),
			torque: -3,
			massProperties,
			linearDamping: 0.2,
			angularDamping: 0.35,
			staticFriction: 0.9,
			dynamicFriction: 0.45,
			restitution: 0.15,
			filter: {
				category: 0x0008,
				mask: 0x0010,
			},
			sleep: {
				canSleep: false,
				isSleeping: false,
				sleepTime: 0.25,
			},
		});

		const assertPreservedState = (): void => {
			expectCloseToVector(body.position, new Vector(3, -4));
			expectCloseToNumber(body.angle, 0.75);
			expectCloseToVector(body.linearVelocity, new Vector(5, -6));
			expectCloseToNumber(body.angularVelocity, 1.25);
			expectCloseToVector(body.force, new Vector(-2, 7));
			expectCloseToNumber(body.torque, -3);
			expectCloseToVector(body.localCenter, massProperties.centroid);
			expectCloseToNumber(body.mass, massProperties.mass);
			expectCloseToNumber(body.inertia, massProperties.inertia);
			expectCloseToNumber(body.linearDamping, 0.2);
			expectCloseToNumber(body.angularDamping, 0.35);
			expectCloseToNumber(body.staticFriction, 0.9);
			expectCloseToNumber(body.dynamicFriction, 0.45);
			expectCloseToNumber(body.restitution, 0.15);
			expect(body.filter).toEqual({
				category: 0x0008,
				mask: 0x0010,
			});
			expect(body.sleep).toEqual({
				canSleep: false,
				isSleeping: false,
				sleepTime: 0.25,
			});
		};

		body.setBodyType("static");
		assertPreservedState();
		expectCloseToNumber(body.invMass, 0);
		expectCloseToNumber(body.invInertia, 0);

		body.setBodyType("dynamic");
		assertPreservedState();
		expectCloseToNumber(body.invMass, massProperties.invMass);
		expectCloseToNumber(body.invInertia, massProperties.invInertia);

		body.setBodyType("kinematic");
		assertPreservedState();
		expectCloseToNumber(body.invMass, 0);
		expectCloseToNumber(body.invInertia, 0);
	});

	test("uses explicit default material mixing rules", () => {
		expectCloseToNumber(mixFriction(0.25, 1), 0.5);
		expectCloseToNumber(mixFriction(0.36, 0.81), 0.54);
		expectCloseToNumber(mixFriction(0, 1), 0);
		expectCloseToNumber(mixFriction(1, 1), 1);
		expectCloseToNumber(mixRestitution(0.2, 0.7), 0.7);
		expectCloseToNumber(mixRestitution(0.9, 0.1), 0.9);
		expectCloseToNumber(mixRestitution(0.5, 0.5), 0.5);
		expectCloseToNumber(mixRestitution(0, 0), 0);
	});
});
