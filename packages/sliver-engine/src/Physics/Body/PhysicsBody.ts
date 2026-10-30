import { Vector } from "../../Lib/Vector";
import type { MassProperties } from "../MassProperties";

type PhysicsBodyType = "static" | "dynamic" | "kinematic";

type CollisionFilter = {
	category: number;
	mask: number;
};

type SleepState = {
	canSleep: boolean;
	isSleeping: boolean;
	sleepTime: number;
};

type PhysicsBodyOptions = {
	position?: Vector;
	angle?: number;
	linearVelocity?: Vector;
	angularVelocity?: number;
	force?: Vector;
	torque?: number;
	massProperties?: MassProperties;
	linearDamping?: number;
	angularDamping?: number;
	staticFriction?: number;
	dynamicFriction?: number;
	restitution?: number;
	bodyType?: PhysicsBodyType;
	filter?: Partial<CollisionFilter>;
	sleep?: Partial<SleepState>;
};

type ResolvedBodyMassProperties = {
	localCenter: Vector;
	mass: number;
	invMass: number;
	inertia: number;
	invInertia: number;
};

const DEFAULT_BODY_MASS_PROPERTIES: MassProperties = {
	area: 1,
	mass: 1,
	invMass: 1,
	centroid: Vector.zero(),
	inertia: 1,
	invInertia: 1,
};

const DEFAULT_LINEAR_DAMPING = 0;
const DEFAULT_ANGULAR_DAMPING = 0;
const DEFAULT_STATIC_FRICTION = 0.6;
const DEFAULT_DYNAMIC_FRICTION = 0.4;
const DEFAULT_RESTITUTION = 0;
const DEFAULT_COLLISION_FILTER: CollisionFilter = {
	category: 0x0001,
	mask: 0xffffffff,
};
const DEFAULT_SLEEP_STATE: SleepState = {
	canSleep: true,
	isSleeping: false,
	sleepTime: 0,
};

const assertFiniteNumber = (value: number, label: string): void => {
	if (!Number.isFinite(value)) {
		throw new Error(`${label} must be a finite number.`);
	}
};

const assertFiniteVector = (value: Vector, label: string): void => {
	assertFiniteNumber(value.x, `${label}.x`);
	assertFiniteNumber(value.y, `${label}.y`);
};

const assertNonNegativeNumber = (value: number, label: string): void => {
	assertFiniteNumber(value, label);
	if (value < 0) {
		throw new Error(`${label} must be non-negative.`);
	}
};

const cloneMassProperties = (massProperties: MassProperties): MassProperties => {
	return {
		area: massProperties.area,
		mass: massProperties.mass,
		invMass: massProperties.invMass,
		centroid: massProperties.centroid.clone(),
		inertia: massProperties.inertia,
		invInertia: massProperties.invInertia,
	};
};

const resolveCollisionFilter = (
	filter: Partial<CollisionFilter> | undefined
): CollisionFilter => {
	return {
		category: (filter?.category ?? DEFAULT_COLLISION_FILTER.category) >>> 0,
		mask: (filter?.mask ?? DEFAULT_COLLISION_FILTER.mask) >>> 0,
	};
};

const resolveSleepState = (
	sleep: Partial<SleepState> | undefined
): SleepState => {
	const sleepTime = sleep?.sleepTime ?? DEFAULT_SLEEP_STATE.sleepTime;
	assertNonNegativeNumber(sleepTime, "Sleep time");

	return {
		canSleep: sleep?.canSleep ?? DEFAULT_SLEEP_STATE.canSleep,
		isSleeping: sleep?.isSleeping ?? DEFAULT_SLEEP_STATE.isSleeping,
		sleepTime,
	};
};

const resolveBodyMassProperties = (
	bodyType: PhysicsBodyType,
	massProperties: MassProperties
): ResolvedBodyMassProperties => {
	return {
		localCenter: massProperties.centroid.clone(),
		mass: massProperties.mass,
		invMass: bodyType === "dynamic" ? massProperties.invMass : 0,
		inertia: massProperties.inertia,
		invInertia: bodyType === "dynamic" ? massProperties.invInertia : 0,
	};
};

const mixFriction = (frictionA: number, frictionB: number): number => {
	assertNonNegativeNumber(frictionA, "Friction");
	assertNonNegativeNumber(frictionB, "Friction");
	return Math.sqrt(frictionA * frictionB);
};

const mixRestitution = (
	restitutionA: number,
	restitutionB: number
): number => {
	assertNonNegativeNumber(restitutionA, "Restitution");
	assertNonNegativeNumber(restitutionB, "Restitution");
	return Math.max(restitutionA, restitutionB);
};

class PhysicsBody {
	public position: Vector;
	public angle: number;
	public linearVelocity: Vector;
	public angularVelocity: number;
	public force: Vector;
	public torque: number;
	public localCenter: Vector;
	public mass: number;
	public invMass: number;
	public inertia: number;
	public invInertia: number;
	public linearDamping: number;
	public angularDamping: number;
	public staticFriction: number;
	public dynamicFriction: number;
	public restitution: number;
	public bodyType: PhysicsBodyType;
	public filter: CollisionFilter;
	public sleep: SleepState;

	private massProperties: MassProperties;

	constructor(options: PhysicsBodyOptions = {}) {
		const bodyType = options.bodyType ?? "dynamic";
		const massProperties = cloneMassProperties(
			options.massProperties ?? DEFAULT_BODY_MASS_PROPERTIES
		);

		this.position = options.position?.clone() ?? Vector.zero();
		this.angle = options.angle ?? 0;
		this.linearVelocity = options.linearVelocity?.clone() ?? Vector.zero();
		this.angularVelocity = options.angularVelocity ?? 0;
		this.force = options.force?.clone() ?? Vector.zero();
		this.torque = options.torque ?? 0;
		this.linearDamping = options.linearDamping ?? DEFAULT_LINEAR_DAMPING;
		this.angularDamping = options.angularDamping ?? DEFAULT_ANGULAR_DAMPING;
		this.staticFriction = options.staticFriction ?? DEFAULT_STATIC_FRICTION;
		this.dynamicFriction = options.dynamicFriction ?? DEFAULT_DYNAMIC_FRICTION;
		this.restitution = options.restitution ?? DEFAULT_RESTITUTION;
		this.bodyType = bodyType;
		this.filter = resolveCollisionFilter(options.filter);
		this.sleep = resolveSleepState(options.sleep);
		this.massProperties = massProperties;

		assertFiniteVector(this.position, "Position");
		assertFiniteNumber(this.angle, "Angle");
		assertFiniteVector(this.linearVelocity, "Linear velocity");
		assertFiniteNumber(this.angularVelocity, "Angular velocity");
		assertFiniteVector(this.force, "Force");
		assertFiniteNumber(this.torque, "Torque");
		assertNonNegativeNumber(this.linearDamping, "Linear damping");
		assertNonNegativeNumber(this.angularDamping, "Angular damping");
		assertNonNegativeNumber(this.staticFriction, "Static friction");
		assertNonNegativeNumber(this.dynamicFriction, "Dynamic friction");
		assertNonNegativeNumber(this.restitution, "Restitution");

		const resolvedMassProperties = resolveBodyMassProperties(
			this.bodyType,
			this.massProperties
		);
		this.localCenter = resolvedMassProperties.localCenter;
		this.mass = resolvedMassProperties.mass;
		this.invMass = resolvedMassProperties.invMass;
		this.inertia = resolvedMassProperties.inertia;
		this.invInertia = resolvedMassProperties.invInertia;
	}

	setBodyType(bodyType: PhysicsBodyType): void {
		this.bodyType = bodyType;

		const resolvedMassProperties = resolveBodyMassProperties(
			bodyType,
			this.massProperties
		);
		this.localCenter = resolvedMassProperties.localCenter;
		this.mass = resolvedMassProperties.mass;
		this.invMass = resolvedMassProperties.invMass;
		this.inertia = resolvedMassProperties.inertia;
		this.invInertia = resolvedMassProperties.invInertia;
	}

	setMassProperties(massProperties: MassProperties): void {
		this.massProperties = cloneMassProperties(massProperties);

		const resolvedMassProperties = resolveBodyMassProperties(
			this.bodyType,
			this.massProperties
		);
		this.localCenter = resolvedMassProperties.localCenter;
		this.mass = resolvedMassProperties.mass;
		this.invMass = resolvedMassProperties.invMass;
		this.inertia = resolvedMassProperties.inertia;
		this.invInertia = resolvedMassProperties.invInertia;
	}

	getMassProperties(): MassProperties {
		return cloneMassProperties(this.massProperties);
	}
}

export {
	DEFAULT_ANGULAR_DAMPING,
	DEFAULT_BODY_MASS_PROPERTIES,
	DEFAULT_COLLISION_FILTER,
	DEFAULT_DYNAMIC_FRICTION,
	DEFAULT_LINEAR_DAMPING,
	DEFAULT_RESTITUTION,
	DEFAULT_SLEEP_STATE,
	DEFAULT_STATIC_FRICTION,
	PhysicsBody,
	mixFriction,
	mixRestitution,
};

export type {
	CollisionFilter,
	PhysicsBodyOptions,
	PhysicsBodyType,
	SleepState,
};
