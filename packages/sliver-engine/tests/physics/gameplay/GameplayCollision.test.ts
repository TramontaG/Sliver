import { describe, expect, test } from "bun:test";
import { GameObject } from "../../../src/GameObject";
import { CircleHitbox, SquareHitbox } from "../../../src/GameObject/Hitboxes";
import { Vector } from "../../../src/Lib/Vector";
import {
	CircleShape,
	PhysicsBody,
	type GameplayCollisionParticipant,
	type PersistentContactSolverOptions,
	type PersistentContactSolverState,
	computeCircleMassProperties,
	computeCompoundMassProperties,
	computePolygonMassProperties,
	createGameplayCollisionParticipantsFromGameObject,
	createPersistentContactSolverState,
	createPhysicsShapeFromHitbox,
	integrateBody,
	stepGameplayCollisions,
} from "../../../src/Physics";
import { expectCloseToVector } from "../TestAssertions";

const GAMEPLAY_EPSILON = 1e-6;

class CollisionProbe extends GameObject {
	public beforeCollisionCalls = 0;
	public collisionCalls = 0;
	public lastPenetration: Vector | null = null;
	public collidedWith: string[] = [];
	public allowCollision = true;

	constructor(name: string, position: Vector) {
		super(name, position);
		this.id = name;
	}

	beforeColision(otherGO: GameObject): boolean {
		this.beforeCollisionCalls++;
		return this.allowCollision;
	}

	onColision(otherGO: GameObject, penetration: Vector): void {
		this.collisionCalls++;
		this.collidedWith.push(otherGO.name);
		this.lastPenetration = penetration.clone();
	}
}

type BodyParticipantBundle = {
	body: PhysicsBody;
	participants: GameplayCollisionParticipant[];
};

const DEFAULT_STEP_OPTIONS: Required<PersistentContactSolverOptions> = {
	iterations: 10,
	positionIterations: 3,
	baumgarte: 0.2,
	penetrationSlop: 0.005,
	restitutionThreshold: 1,
	enableWarmStarting: true,
	warmStartScale: 1,
	linearSleepTolerance: 0.2,
	angularSleepTolerance: 0.2,
	timeToSleep: 10,
};

const computeMassPropertiesFromGameObject = (
	gameObject: GameObject
) => {
	const hitboxes = gameObject.getHitboxes();
	if (hitboxes.length === 0) {
		throw new Error("GameObject must have at least one hitbox.");
	}

	const contributions = hitboxes.map((hitbox) => {
		const shape = createPhysicsShapeFromHitbox(hitbox);
		if (shape instanceof CircleShape) {
			return computeCircleMassProperties(shape, 1);
		}

		return computePolygonMassProperties(shape, 1);
	});

	if (contributions.length === 1) {
		return contributions[0]!;
	}

	return computeCompoundMassProperties(contributions);
};

const computeBodyPivotPosition = (gameObject: GameObject): Vector => {
	const localRotationOffset = gameObject
		.getRotationCenter()
		.toSubtracted(gameObject.getPosition());

	return gameObject.getScenePosition().toAdded(localRotationOffset);
};

const createBodyAndParticipants = (
	gameObject: GameObject,
	options: {
		bodyType?: "static" | "dynamic" | "kinematic";
		linearVelocity?: Vector;
		angularVelocity?: number;
		filter?: { category: number; mask: number };
		restitution?: number;
		staticFriction?: number;
		dynamicFriction?: number;
	}
): BodyParticipantBundle => {
	const body = new PhysicsBody({
		bodyType: options.bodyType ?? "dynamic",
		position: computeBodyPivotPosition(gameObject),
		angle: gameObject.rotation,
		linearVelocity: options.linearVelocity,
		angularVelocity: options.angularVelocity,
		filter: options.filter,
		restitution: options.restitution,
		staticFriction: options.staticFriction,
		dynamicFriction: options.dynamicFriction,
		massProperties: computeMassPropertiesFromGameObject(gameObject),
	});

	return {
		body,
		participants: createGameplayCollisionParticipantsFromGameObject(
			gameObject,
			body,
			{
				bodyId: gameObject.id,
				filter: options.filter,
			}
		),
	};
};

const collectBodies = (
	participants: readonly GameplayCollisionParticipant[]
): Map<string, PhysicsBody> => {
	const bodies = new Map<string, PhysicsBody>();

	for (const participant of participants) {
		if (!bodies.has(participant.bodyId)) {
			bodies.set(participant.bodyId, participant.body);
		}
	}

	return bodies;
};

const stepParticipants = (
	participants: readonly GameplayCollisionParticipant[],
	gravity: Vector,
	dt: number,
	state: PersistentContactSolverState,
	options: Required<PersistentContactSolverOptions>
) => {
	const bodies = collectBodies(participants);

	for (const body of bodies.values()) {
		integrateBody(body, gravity, dt);
	}

	return stepGameplayCollisions(state, participants, dt, options);
};

const createFloorObject = (): CollisionProbe => {
	const floor = new CollisionProbe("floor", new Vector(-10, -1));
	floor.addHitbox(
		new SquareHitbox(Vector.zero(), new Vector(20, 1), floor, {
			solid: true,
		})
	);
	return floor;
};

describe("Gameplay collision bridge", () => {
	test("sensor overlaps trigger callbacks but do not change velocities", () => {
		const floorObject = createFloorObject();
		const sensorObject = new CollisionProbe("sensor", new Vector(0, 0.45));
		sensorObject.addHitbox(
			new CircleHitbox(Vector.zero(), 0.5, sensorObject, {
				solid: false,
			})
		);

		const floorBundle = createBodyAndParticipants(floorObject, {
			bodyType: "static",
		});
		const sensorBundle = createBodyAndParticipants(sensorObject, {
			bodyType: "dynamic",
			linearVelocity: new Vector(0, -1),
		});
		const participants = [
			...floorBundle.participants,
			...sensorBundle.participants,
		];
		const state = createPersistentContactSolverState();

		const result = stepParticipants(
			participants,
			Vector.zero(),
			1 / 60,
			state,
			DEFAULT_STEP_OPTIONS
		);

		expect(result.overlapManifolds).toHaveLength(1);
		expect(result.sensorManifolds).toHaveLength(1);
		expect(result.solidManifolds).toHaveLength(0);
		expect(sensorObject.beforeCollisionCalls).toBe(1);
		expect(floorObject.beforeCollisionCalls).toBe(1);
		expect(sensorObject.collisionCalls).toBe(1);
		expect(floorObject.collisionCalls).toBe(1);
		expect(sensorObject.collidedWith).toEqual(["floor"]);
		expect(floorObject.collidedWith).toEqual(["sensor"]);
		expectCloseToVector(
			sensorBundle.body.linearVelocity,
			new Vector(0, -1),
			GAMEPLAY_EPSILON,
			"sensor linear velocity"
		);
		expectCloseToVector(
			floorBundle.body.linearVelocity,
			Vector.zero(),
			GAMEPLAY_EPSILON,
			"sensor floor linear velocity"
		);
	});

	test("sensor-vs-sensor overlaps trigger callbacks without creating solid manifolds", () => {
		const sensorA = new CollisionProbe("sensor-a", new Vector(0, 0));
		const sensorB = new CollisionProbe("sensor-b", new Vector(0.75, 0));
		sensorA.addHitbox(
			new CircleHitbox(Vector.zero(), 0.5, sensorA, { solid: false })
		);
		sensorB.addHitbox(
			new CircleHitbox(Vector.zero(), 0.5, sensorB, { solid: false })
		);

		const bundleA = createBodyAndParticipants(sensorA, {
			bodyType: "dynamic",
			linearVelocity: new Vector(1, 0),
		});
		const bundleB = createBodyAndParticipants(sensorB, {
			bodyType: "dynamic",
			linearVelocity: new Vector(-1, 0),
		});
		const state = createPersistentContactSolverState();

		const result = stepParticipants(
			[...bundleA.participants, ...bundleB.participants],
			Vector.zero(),
			1 / 60,
			state,
			DEFAULT_STEP_OPTIONS
		);

		expect(result.overlapManifolds).toHaveLength(1);
		expect(result.sensorManifolds).toHaveLength(1);
		expect(result.solidManifolds).toHaveLength(0);
		expect(sensorA.beforeCollisionCalls).toBe(1);
		expect(sensorB.beforeCollisionCalls).toBe(1);
		expect(sensorA.collisionCalls).toBe(1);
		expect(sensorB.collisionCalls).toBe(1);
		expect(sensorA.collidedWith).toEqual(["sensor-b"]);
		expect(sensorB.collidedWith).toEqual(["sensor-a"]);
		expectCloseToVector(
			bundleA.body.linearVelocity,
			new Vector(1, 0),
			GAMEPLAY_EPSILON,
			"sensor-a linear velocity"
		);
		expectCloseToVector(
			bundleB.body.linearVelocity,
			new Vector(-1, 0),
			GAMEPLAY_EPSILON,
			"sensor-b linear velocity"
		);
	});

	test("solid overlaps trigger callbacks and physical response", () => {
		const floorObject = createFloorObject();
		const ballObject = new CollisionProbe("ball", new Vector(0, 0.45));
		ballObject.addHitbox(
			new CircleHitbox(Vector.zero(), 0.5, ballObject, { solid: true })
		);

		const floorBundle = createBodyAndParticipants(floorObject, {
			bodyType: "static",
		});
		const ballBundle = createBodyAndParticipants(ballObject, {
			bodyType: "dynamic",
			linearVelocity: new Vector(0, -1),
		});
		const state = createPersistentContactSolverState();

		const result = stepParticipants(
			[...floorBundle.participants, ...ballBundle.participants],
			Vector.zero(),
			1 / 60,
			state,
			DEFAULT_STEP_OPTIONS
		);

		expect(result.overlapManifolds).toHaveLength(1);
		expect(result.sensorManifolds).toHaveLength(0);
		expect(result.solidManifolds).toHaveLength(1);
		expect(ballObject.beforeCollisionCalls).toBe(1);
		expect(floorObject.beforeCollisionCalls).toBe(1);
		expect(ballObject.collisionCalls).toBe(1);
		expect(floorObject.collisionCalls).toBe(1);
		expect(ballObject.collidedWith).toEqual(["floor"]);
		expect(floorObject.collidedWith).toEqual(["ball"]);
		expect(ballBundle.body.linearVelocity.y).toBeGreaterThanOrEqual(
			-GAMEPLAY_EPSILON
		);
		expectCloseToVector(
			floorBundle.body.linearVelocity,
			Vector.zero(),
			GAMEPLAY_EPSILON,
			"solid floor linear velocity"
		);
		expect(ballObject.lastPenetration).not.toBeNull();
		expect(floorObject.lastPenetration).not.toBeNull();
		expectCloseToVector(
			ballObject.lastPenetration!,
			result.solidManifolds[0]!.normal.toMultiplied(
				result.solidManifolds[0]!.penetration
			),
			GAMEPLAY_EPSILON,
			"ball callback penetration"
		);
		expectCloseToVector(
			floorObject.lastPenetration!,
			ballObject.lastPenetration!.toMultiplied(-1),
			GAMEPLAY_EPSILON,
			"floor callback penetration"
		);
	});

	test("beforeColision can suppress callbacks and physical response", () => {
		const floorObject = createFloorObject();
		const blockedObject = new CollisionProbe("blocked", new Vector(0, 0.45));
		blockedObject.allowCollision = false;
		blockedObject.addHitbox(
			new CircleHitbox(Vector.zero(), 0.5, blockedObject, { solid: true })
		);

		const floorBundle = createBodyAndParticipants(floorObject, {
			bodyType: "static",
		});
		const blockedBundle = createBodyAndParticipants(blockedObject, {
			bodyType: "dynamic",
			linearVelocity: new Vector(0, -1),
		});
		const state = createPersistentContactSolverState();

		const result = stepParticipants(
			[...floorBundle.participants, ...blockedBundle.participants],
			Vector.zero(),
			1 / 60,
			state,
			DEFAULT_STEP_OPTIONS
		);

		expect(result.overlapManifolds).toHaveLength(1);
		expect(result.suppressedPairIds).toEqual(["blocked|floor"]);
		expect(result.solidManifolds).toHaveLength(0);
		expect(blockedObject.beforeCollisionCalls).toBe(1);
		expect(floorObject.beforeCollisionCalls).toBe(0);
		expect(blockedObject.collisionCalls).toBe(0);
		expect(floorObject.collisionCalls).toBe(0);
		expectCloseToVector(
			blockedBundle.body.linearVelocity,
			new Vector(0, -1),
			GAMEPLAY_EPSILON,
			"suppressed linear velocity"
		);
	});

	test("beforeColision suppression works when only the other side rejects the pair", () => {
		const floorObject = createFloorObject();
		floorObject.allowCollision = false;
		const ballObject = new CollisionProbe("ball", new Vector(0, 0.45));
		ballObject.addHitbox(
			new CircleHitbox(Vector.zero(), 0.5, ballObject, { solid: true })
		);

		const floorBundle = createBodyAndParticipants(floorObject, {
			bodyType: "static",
		});
		const ballBundle = createBodyAndParticipants(ballObject, {
			bodyType: "dynamic",
			linearVelocity: new Vector(0, -1),
		});
		const state = createPersistentContactSolverState();

		const result = stepParticipants(
			[...floorBundle.participants, ...ballBundle.participants],
			Vector.zero(),
			1 / 60,
			state,
			DEFAULT_STEP_OPTIONS
		);

		expect(result.overlapManifolds).toHaveLength(1);
		expect(result.suppressedPairIds).toEqual(["ball|floor"]);
		expect(result.sensorManifolds).toHaveLength(0);
		expect(result.solidManifolds).toHaveLength(0);
		expect(ballObject.beforeCollisionCalls).toBe(1);
		expect(floorObject.beforeCollisionCalls).toBe(1);
		expect(ballObject.collisionCalls).toBe(0);
		expect(floorObject.collisionCalls).toBe(0);
		expectCloseToVector(
			ballBundle.body.linearVelocity,
			new Vector(0, -1),
			GAMEPLAY_EPSILON,
			"other-side suppressed linear velocity"
		);
	});

	test("non-overlapping sensors do not produce callbacks or manifolds", () => {
		const sensorA = new CollisionProbe("sensor-a", new Vector(0, 0));
		const sensorB = new CollisionProbe("sensor-b", new Vector(5, 0));
		sensorA.addHitbox(
			new CircleHitbox(Vector.zero(), 0.5, sensorA, { solid: false })
		);
		sensorB.addHitbox(
			new CircleHitbox(Vector.zero(), 0.5, sensorB, { solid: false })
		);

		const bundleA = createBodyAndParticipants(sensorA, {
			bodyType: "dynamic",
			linearVelocity: Vector.zero(),
		});
		const bundleB = createBodyAndParticipants(sensorB, {
			bodyType: "dynamic",
			linearVelocity: Vector.zero(),
		});
		const state = createPersistentContactSolverState();

		const result = stepParticipants(
			[...bundleA.participants, ...bundleB.participants],
			Vector.zero(),
			1 / 60,
			state,
			DEFAULT_STEP_OPTIONS
		);

		expect(result.candidatePairs).toHaveLength(0);
		expect(result.overlapManifolds).toHaveLength(0);
		expect(result.sensorManifolds).toHaveLength(0);
		expect(result.solidManifolds).toHaveLength(0);
		expect(sensorA.beforeCollisionCalls).toBe(0);
		expect(sensorB.beforeCollisionCalls).toBe(0);
		expect(sensorA.collisionCalls).toBe(0);
		expect(sensorB.collisionCalls).toBe(0);
	});

	test("compound hitboxes on the same body do not self-collide", () => {
		const compoundObject = new CollisionProbe("compound", new Vector(0, 0));
		compoundObject.addHitbox(
			new SquareHitbox(new Vector(0, 0), new Vector(1, 1), compoundObject)
		);
		compoundObject.addHitbox(
			new SquareHitbox(new Vector(0, 0), new Vector(1, 1), compoundObject)
		);

		const compoundBundle = createBodyAndParticipants(compoundObject, {
			bodyType: "dynamic",
			linearVelocity: Vector.zero(),
		});
		const state = createPersistentContactSolverState();

		const result = stepParticipants(
			compoundBundle.participants,
			Vector.zero(),
			1 / 60,
			state,
			DEFAULT_STEP_OPTIONS
		);

		expect(result.candidatePairs).toHaveLength(0);
		expect(result.overlapManifolds).toHaveLength(0);
		expect(compoundObject.beforeCollisionCalls).toBe(0);
		expect(compoundObject.collisionCalls).toBe(0);
		expectCloseToVector(
			compoundBundle.body.linearVelocity,
			Vector.zero(),
			GAMEPLAY_EPSILON,
			"self-collision velocity"
		);
	});

	test("multiple hitboxes on one object generate one coherent body response", () => {
		const floorObject = createFloorObject();
		const crateObject = new CollisionProbe("crate", new Vector(0, -0.05));
		crateObject.addHitbox(
			new SquareHitbox(new Vector(-1, 0), new Vector(1, 1), crateObject)
		);
		crateObject.addHitbox(
			new SquareHitbox(new Vector(0, 0), new Vector(1, 1), crateObject)
		);

		const floorBundle = createBodyAndParticipants(floorObject, {
			bodyType: "static",
		});
		const crateBundle = createBodyAndParticipants(crateObject, {
			bodyType: "dynamic",
			linearVelocity: new Vector(0, -1),
		});
		const state = createPersistentContactSolverState();

		const result = stepParticipants(
			[...floorBundle.participants, ...crateBundle.participants],
			Vector.zero(),
			1 / 60,
			state,
			DEFAULT_STEP_OPTIONS
		);

		expect(result.overlapManifolds).toHaveLength(2);
		expect(result.solidManifolds).toHaveLength(2);
		expect(result.notifiedPairIds).toEqual(["crate|floor"]);
		expect(crateObject.beforeCollisionCalls).toBe(1);
		expect(floorObject.beforeCollisionCalls).toBe(1);
		expect(crateObject.collisionCalls).toBe(1);
		expect(floorObject.collisionCalls).toBe(1);
		expect(crateObject.collidedWith).toEqual(["floor"]);
		expect(floorObject.collidedWith).toEqual(["crate"]);
		expect(crateBundle.body.linearVelocity.y).toBeGreaterThanOrEqual(
			-GAMEPLAY_EPSILON
		);
	});

	test("filtering rules exclude and include overlaps predictably", () => {
		const excludedFloorObject = createFloorObject();
		const excludedBallObject = new CollisionProbe(
			"excluded-ball",
			new Vector(0, 0.45)
		);
		excludedBallObject.addHitbox(
			new CircleHitbox(Vector.zero(), 0.5, excludedBallObject, {
				solid: true,
			})
		);

		const excludedFloorBundle = createBodyAndParticipants(excludedFloorObject, {
			bodyType: "static",
			filter: { category: 0x0002, mask: 0x0002 },
		});
		const excludedBallBundle = createBodyAndParticipants(excludedBallObject, {
			bodyType: "dynamic",
			linearVelocity: new Vector(0, -1),
			filter: { category: 0x0001, mask: 0x0001 },
		});
		const excludedState = createPersistentContactSolverState();

		const excludedResult = stepParticipants(
			[
				...excludedFloorBundle.participants,
				...excludedBallBundle.participants,
			],
			Vector.zero(),
			1 / 60,
			excludedState,
			DEFAULT_STEP_OPTIONS
		);

		expect(excludedResult.candidatePairs).toHaveLength(0);
		expect(excludedResult.overlapManifolds).toHaveLength(0);
		expect(excludedBallObject.collisionCalls).toBe(0);
		expectCloseToVector(
			excludedBallBundle.body.linearVelocity,
			new Vector(0, -1),
			GAMEPLAY_EPSILON,
			"excluded velocity"
		);

		const includedFloorObject = createFloorObject();
		const includedBallObject = new CollisionProbe(
			"included-ball",
			new Vector(0, 0.45)
		);
		includedBallObject.addHitbox(
			new CircleHitbox(Vector.zero(), 0.5, includedBallObject, {
				solid: true,
			})
		);

		const includedFloorBundle = createBodyAndParticipants(includedFloorObject, {
			bodyType: "static",
			filter: { category: 0x0002, mask: 0x0001 },
		});
		const includedBallBundle = createBodyAndParticipants(includedBallObject, {
			bodyType: "dynamic",
			linearVelocity: new Vector(0, -1),
			filter: { category: 0x0001, mask: 0x0002 },
		});
		const includedState = createPersistentContactSolverState();

		const includedResult = stepParticipants(
			[
				...includedFloorBundle.participants,
				...includedBallBundle.participants,
			],
			Vector.zero(),
			1 / 60,
			includedState,
			DEFAULT_STEP_OPTIONS
		);

		expect(includedResult.candidatePairs).toHaveLength(1);
		expect(includedResult.overlapManifolds).toHaveLength(1);
		expect(includedResult.solidManifolds).toHaveLength(1);
		expect(includedBallObject.collisionCalls).toBe(1);
		expect(includedBallBundle.body.linearVelocity.y).toBeGreaterThanOrEqual(
			-GAMEPLAY_EPSILON
		);
	});
});
