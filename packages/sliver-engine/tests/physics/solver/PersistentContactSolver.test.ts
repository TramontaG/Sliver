import { describe, expect, test } from "bun:test";
import {
	CircleShape,
	ConvexPolygonShape,
	type ContactManifold,
	type PersistentContactSolverOptions,
	type PersistentContactSolverState,
	PhysicsBody,
	buildPersistentContactConstraints,
	computeCircleMassProperties,
	computePolygonMassProperties,
	createContactProxy,
	createPersistentContactSolverState,
	createSolverBodyMap,
	generateContactManifold,
	integrateBody,
	stepPersistentContacts,
} from "../../../src/Physics";
import { Vector } from "../../../src/Lib/Vector";
import { runFixedStepsMutable } from "../FixedStep";
import { expectCloseToNumber, expectCloseToVector } from "../TestAssertions";

type TestCollider = {
	bodyId: string;
	shapeId: string;
	body: PhysicsBody;
	shape: CircleShape | ConvexPolygonShape;
};

const SOLVER_EPSILON = 1e-6;

const collectBodies = (
	colliders: readonly TestCollider[]
): Map<string, PhysicsBody> => {
	const bodies = new Map<string, PhysicsBody>();

	for (const collider of colliders) {
		if (!bodies.has(collider.bodyId)) {
			bodies.set(collider.bodyId, collider.body);
		}
	}

	return bodies;
};

const collectManifolds = (
	colliders: readonly TestCollider[]
): ContactManifold[] => {
	const manifolds: ContactManifold[] = [];

	for (let indexA = 0; indexA < colliders.length; indexA++) {
		for (let indexB = indexA + 1; indexB < colliders.length; indexB++) {
			const colliderA = colliders[indexA]!;
			const colliderB = colliders[indexB]!;
			if (colliderA.bodyId === colliderB.bodyId) {
				continue;
			}
			const manifold = generateContactManifold(
				createContactProxy({
					bodyId: colliderA.bodyId,
					shapeId: colliderA.shapeId,
					shape: colliderA.shape,
					transform: {
						position: colliderA.body.position,
						angle: colliderA.body.angle,
					},
				}),
				createContactProxy({
					bodyId: colliderB.bodyId,
					shapeId: colliderB.shapeId,
					shape: colliderB.shape,
					transform: {
						position: colliderB.body.position,
						angle: colliderB.body.angle,
					},
				})
			);

			if (manifold !== null) {
				manifolds.push(manifold);
			}
		}
	}

	return manifolds;
};

const stepBodiesWithPersistentSolver = (
	colliders: readonly TestCollider[],
	gravity: Vector,
	dt: number,
	state: PersistentContactSolverState,
	solverOptions: Required<PersistentContactSolverOptions>
): void => {
	const bodies = collectBodies(colliders);

	for (const body of bodies.values()) {
		integrateBody(body, gravity, dt);
	}

	const manifolds = collectManifolds(colliders);
	stepPersistentContacts(state, bodies, manifolds, dt, solverOptions);
};

const cloneBody = (body: PhysicsBody): PhysicsBody => {
	return new PhysicsBody({
		position: body.position.clone(),
		angle: body.angle,
		linearVelocity: body.linearVelocity.clone(),
		angularVelocity: body.angularVelocity,
		force: body.force.clone(),
		torque: body.torque,
		massProperties: body.getMassProperties(),
		linearDamping: body.linearDamping,
		angularDamping: body.angularDamping,
		staticFriction: body.staticFriction,
		dynamicFriction: body.dynamicFriction,
		restitution: body.restitution,
		bodyType: body.bodyType,
		filter: {
			category: body.filter.category,
			mask: body.filter.mask,
		},
		sleep: {
			canSleep: body.sleep.canSleep,
			isSleeping: body.sleep.isSleeping,
			sleepTime: body.sleep.sleepTime,
		},
	});
};

const cloneColliders = (colliders: readonly TestCollider[]): TestCollider[] => {
	return colliders.map((collider) => ({
		bodyId: collider.bodyId,
		shapeId: collider.shapeId,
		body: cloneBody(collider.body),
		shape: collider.shape,
	}));
};

const clonePersistentState = (
	state: PersistentContactSolverState
): PersistentContactSolverState => {
	return {
		contactImpulses: new Map(
			Array.from(state.contactImpulses.entries(), ([key, value]) => [
				key,
				{
					normalImpulse: value.normalImpulse,
					tangentImpulse: value.tangentImpulse,
				},
			])
		),
	};
};

const createStackSetup = (): {
	colliders: TestCollider[];
	floor: PhysicsBody;
	bottomBox: PhysicsBody;
	topBox: PhysicsBody;
} => {
	const floorShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
	const boxShape = ConvexPolygonShape.fromRectangle(new Vector(2, 2));
	const floor = new PhysicsBody({
		bodyType: "static",
		position: new Vector(0, -0.5),
		massProperties: computePolygonMassProperties(floorShape, 1),
	});
	const bottomBox = new PhysicsBody({
		bodyType: "dynamic",
		position: new Vector(0, 1),
		massProperties: computePolygonMassProperties(boxShape, 1),
	});
	const topBox = new PhysicsBody({
		bodyType: "dynamic",
		position: new Vector(0, 3),
		massProperties: computePolygonMassProperties(boxShape, 1),
	});

	return {
		colliders: [
			{
				bodyId: "floor",
				shapeId: "floor-shape",
				body: floor,
				shape: floorShape,
			},
			{
				bodyId: "bottom",
				shapeId: "bottom-shape",
				body: bottomBox,
				shape: boxShape,
			},
			{
				bodyId: "top",
				shapeId: "top-shape",
				body: topBox,
				shape: boxShape,
			},
		],
		floor,
		bottomBox,
		topBox,
	};
};

const createRestingCircleSetup = (): {
	colliders: TestCollider[];
	circle: PhysicsBody;
} => {
	const floorShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
	const circleShape = new CircleShape(Vector.zero(), 0.5);
	const floor = new PhysicsBody({
		bodyType: "static",
		position: new Vector(0, -0.5),
		massProperties: computePolygonMassProperties(floorShape, 1),
	});
	const circle = new PhysicsBody({
		bodyType: "dynamic",
		position: new Vector(0, 0.45),
		linearVelocity: new Vector(0, -0.25),
		massProperties: computeCircleMassProperties(circleShape, 1),
	});

	return {
		colliders: [
			{
				bodyId: "floor",
				shapeId: "floor-shape",
				body: floor,
				shape: floorShape,
			},
			{
				bodyId: "circle",
				shapeId: "circle-shape",
				body: circle,
				shape: circleShape,
			},
		],
		circle,
	};
};

const computeStackResidual = (
	bottomBox: PhysicsBody,
	topBox: PhysicsBody
): number => {
	return (
		Math.abs(bottomBox.position.y - 1) +
		Math.abs(topBox.position.y - 3) +
		Math.abs(bottomBox.linearVelocity.y) +
		Math.abs(topBox.linearVelocity.y)
	);
};

describe("Persistent contact solver", () => {
	test("warm-started resting stack converges faster than a cold-started stack", () => {
		const populateOptions: Required<PersistentContactSolverOptions> = {
			iterations: 12,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.01,
			angularSleepTolerance: 0.01,
			timeToSleep: 10,
		};
		const compareOptions: Required<PersistentContactSolverOptions> = {
			...populateOptions,
			iterations: 1,
		};
		const populateSetup = createStackSetup();
		const populateState = createPersistentContactSolverState();

		runFixedStepsMutable(
			populateSetup.colliders,
			(currentColliders, dt) => {
				stepBodiesWithPersistentSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					populateState,
					populateOptions
				);
			},
			{ steps: 20, dt: 1 / 60 }
		);

		const warmColliders = cloneColliders(populateSetup.colliders);
		const coldColliders = cloneColliders(populateSetup.colliders);
		const warmState = clonePersistentState(populateState);
		const coldState = createPersistentContactSolverState();

		runFixedStepsMutable(
			warmColliders,
			(currentColliders, dt) => {
				stepBodiesWithPersistentSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					warmState,
					compareOptions
				);
			},
			{ steps: 8, dt: 1 / 60 }
		);

		runFixedStepsMutable(
			coldColliders,
			(currentColliders, dt) => {
				stepBodiesWithPersistentSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					coldState,
					compareOptions
				);
			},
			{ steps: 8, dt: 1 / 60 }
		);

		const warmBottom = collectBodies(warmColliders).get("bottom")!;
		const warmTop = collectBodies(warmColliders).get("top")!;
		const coldBottom = collectBodies(coldColliders).get("bottom")!;
		const coldTop = collectBodies(coldColliders).get("top")!;

		expect(
			computeStackResidual(warmBottom, warmTop)
		).toBeLessThan(computeStackResidual(coldBottom, coldTop));
	});

	test("keeps cached impulses alive across a small contact-preserving motion", () => {
		const solverOptions: Required<PersistentContactSolverOptions> = {
			iterations: 12,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.01,
			angularSleepTolerance: 0.01,
			timeToSleep: 10,
		};
		const setup = createRestingCircleSetup();
		const state = createPersistentContactSolverState();

		stepBodiesWithPersistentSolver(
			setup.colliders,
			new Vector(0, -10),
			1 / 60,
			state,
			solverOptions
		);

		expect(state.contactImpulses.size).toBeGreaterThan(0);

		setup.circle.position.add(new Vector(0.05, 0));

		const bodies = collectBodies(setup.colliders);
		const solverBodies = createSolverBodyMap(bodies);
		const constraints = buildPersistentContactConstraints(
			state,
			bodies,
			solverBodies,
			collectManifolds(setup.colliders),
			1 / 60,
			solverOptions
		);

		expect(constraints.length).toBeGreaterThan(0);
		expect(
			constraints.some((constraint) =>
				constraint.points.some(
					(point) => point.accumulatedNormalImpulse > SOLVER_EPSILON
				)
			)
		).toBe(true);
	});

	test("keeps a sleeping stack still across many subsequent steps", () => {
		const solverOptions: Required<PersistentContactSolverOptions> = {
			iterations: 10,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.2,
			angularSleepTolerance: 0.2,
			timeToSleep: 0.2,
		};
		const setup = createStackSetup();
		const state = createPersistentContactSolverState();

		runFixedStepsMutable(
			setup.colliders,
			(currentColliders, dt) => {
				stepBodiesWithPersistentSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					state,
					solverOptions
				);
			},
			{ steps: 120, dt: 1 / 60 }
		);

		expect(setup.bottomBox.sleep.isSleeping).toBe(true);
		expect(setup.topBox.sleep.isSleeping).toBe(true);

		const bottomPosition = setup.bottomBox.position.clone();
		const topPosition = setup.topBox.position.clone();

		runFixedStepsMutable(
			setup.colliders,
			(currentColliders, dt) => {
				stepBodiesWithPersistentSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					state,
					solverOptions
				);
			},
			{ steps: 120, dt: 1 / 60 }
		);

		expect(setup.bottomBox.sleep.isSleeping).toBe(true);
		expect(setup.topBox.sleep.isSleeping).toBe(true);
		expectCloseToVector(
			setup.bottomBox.position,
			bottomPosition,
			SOLVER_EPSILON,
			"bottom sleeping position"
		);
		expectCloseToVector(
			setup.topBox.position,
			topPosition,
			SOLVER_EPSILON,
			"top sleeping position"
		);
		expectCloseToVector(
			setup.bottomBox.linearVelocity,
			Vector.zero(),
			SOLVER_EPSILON,
			"bottom sleeping velocity"
		);
		expectCloseToVector(
			setup.topBox.linearVelocity,
			Vector.zero(),
			SOLVER_EPSILON,
			"top sleeping velocity"
		);
	});

	test("wakes a sleeping body when it is hit by an awake dynamic body", () => {
		const solverOptions: Required<PersistentContactSolverOptions> = {
			iterations: 10,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.2,
			angularSleepTolerance: 0.2,
			timeToSleep: 0.2,
		};
		const floorShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
		const boxShape = ConvexPolygonShape.fromRectangle(new Vector(2, 2));
		const floor = new PhysicsBody({
			bodyType: "static",
			position: new Vector(0, -0.5),
			massProperties: computePolygonMassProperties(floorShape, 1),
		});
		const bottomBox = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 1),
			massProperties: computePolygonMassProperties(boxShape, 1),
		});
		const restingColliders: TestCollider[] = [
			{
				bodyId: "floor",
				shapeId: "floor-shape",
				body: floor,
				shape: floorShape,
			},
			{
				bodyId: "bottom",
				shapeId: "bottom-shape",
				body: bottomBox,
				shape: boxShape,
			},
		];
		const state = createPersistentContactSolverState();

		runFixedStepsMutable(
			restingColliders,
			(currentColliders, dt) => {
				stepBodiesWithPersistentSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					state,
					solverOptions
				);
			},
			{ steps: 120, dt: 1 / 60 }
		);

		expect(bottomBox.sleep.isSleeping).toBe(true);

		const impactBox = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 6),
			linearVelocity: new Vector(0, -6),
			massProperties: computePolygonMassProperties(boxShape, 1),
		});
		const impactColliders: TestCollider[] = [
			...restingColliders,
			{
				bodyId: "impact",
				shapeId: "impact-shape",
				body: impactBox,
				shape: boxShape,
			},
		];
		let didWake = false;

		runFixedStepsMutable(
			impactColliders,
			(currentColliders, dt) => {
				stepBodiesWithPersistentSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					state,
					solverOptions
				);
				if (!bottomBox.sleep.isSleeping) {
					didWake = true;
				}
			},
			{ steps: 120, dt: 1 / 60 }
		);

		expect(didWake).toBe(true);
	});

	test("clears the contact cache and leaves bodies untouched when there are no manifolds", () => {
		const solverOptions: Required<PersistentContactSolverOptions> = {
			iterations: 10,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.05,
			angularSleepTolerance: 0.05,
			timeToSleep: 10,
		};
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const circle = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 5),
			linearVelocity: new Vector(1, 0),
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const bodies = new Map([["circle", circle]]);

		// Pre-populate the cache with a fake entry so we can confirm it is cleared.
		const state = createPersistentContactSolverState();
		state.contactImpulses.set("a|s1|b|s2|p0", {
			normalImpulse: 5,
			tangentImpulse: 1,
		});
		expect(state.contactImpulses.size).toBe(1);

		const positionBefore = circle.position.clone();
		const velocityBefore = circle.linearVelocity.clone();

		// Empty manifold list — the cache should be cleared.
		stepPersistentContacts(state, bodies, [], 1 / 60, solverOptions);

		expect(state.contactImpulses.size).toBe(0);
		// The body state must not have been mutated by the solver itself
		// (integration was not called here, so position/velocity must be unchanged).
		expectCloseToVector(circle.position, positionBefore, SOLVER_EPSILON, "position unchanged");
		expectCloseToVector(circle.linearVelocity, velocityBefore, SOLVER_EPSILON, "velocity unchanged");
	});

	test("rejects invalid dt and bad option values", () => {
		const validOptions: Required<PersistentContactSolverOptions> = {
			iterations: 10,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.05,
			angularSleepTolerance: 0.05,
			timeToSleep: 0.5,
		};
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const circle = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 5),
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const bodies = new Map([["circle", circle]]);
		const state = createPersistentContactSolverState();

		// dt = 0
		expect(() =>
			stepPersistentContacts(state, bodies, [], 0, validOptions)
		).toThrow();

		// dt < 0
		expect(() =>
			stepPersistentContacts(state, bodies, [], -1 / 60, validOptions)
		).toThrow();

		// dt = NaN
		expect(() =>
			stepPersistentContacts(state, bodies, [], NaN, validOptions)
		).toThrow();

		// dt = Infinity
		expect(() =>
			stepPersistentContacts(state, bodies, [], Infinity, validOptions)
		).toThrow();

		// iterations = 0
		expect(() =>
			stepPersistentContacts(state, bodies, [], 1 / 60, {
				...validOptions,
				iterations: 0,
			})
		).toThrow();

		// iterations = -1
		expect(() =>
			stepPersistentContacts(state, bodies, [], 1 / 60, {
				...validOptions,
				iterations: -1,
			})
		).toThrow();

		// iterations = 1.5 (non-integer)
		expect(() =>
			stepPersistentContacts(state, bodies, [], 1 / 60, {
				...validOptions,
				iterations: 1.5,
			})
		).toThrow();

		// baumgarte < 0
		expect(() =>
			stepPersistentContacts(state, bodies, [], 1 / 60, {
				...validOptions,
				baumgarte: -0.1,
			})
		).toThrow();

		// warmStartScale < 0
		expect(() =>
			stepPersistentContacts(state, bodies, [], 1 / 60, {
				...validOptions,
				warmStartScale: -0.5,
			})
		).toThrow();

		// linearSleepTolerance < 0
		expect(() =>
			stepPersistentContacts(state, bodies, [], 1 / 60, {
				...validOptions,
				linearSleepTolerance: -1,
			})
		).toThrow();

		// timeToSleep < 0
		expect(() =>
			stepPersistentContacts(state, bodies, [], 1 / 60, {
				...validOptions,
				timeToSleep: -1,
			})
		).toThrow();
	});

	test("does not warm-start constraints when enableWarmStarting is false, even if cache is populated", () => {
		const populateOptions: Required<PersistentContactSolverOptions> = {
			iterations: 12,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.01,
			angularSleepTolerance: 0.01,
			timeToSleep: 10,
		};
		const setup = createRestingCircleSetup();
		const state = createPersistentContactSolverState();

		// Populate the cache with a single warm step.
		stepBodiesWithPersistentSolver(
			setup.colliders,
			new Vector(0, -10),
			1 / 60,
			state,
			populateOptions
		);

		expect(state.contactImpulses.size).toBeGreaterThan(0);

		// Now build constraints with warm-starting disabled — accumulated impulses must remain 0.
		const bodies = collectBodies(setup.colliders);
		const solverBodies = createSolverBodyMap(bodies);
		const coldOptions: Required<PersistentContactSolverOptions> = {
			...populateOptions,
			enableWarmStarting: false,
		};
		const constraints = buildPersistentContactConstraints(
			state,
			bodies,
			solverBodies,
			collectManifolds(setup.colliders),
			1 / 60,
			coldOptions
		);

		expect(constraints.length).toBeGreaterThan(0);
		for (const constraint of constraints) {
			for (const point of constraint.points) {
				expect(point.accumulatedNormalImpulse).toBe(0);
				expect(point.accumulatedTangentImpulse).toBe(0);
			}
		}
	});

	test("does not put a body to sleep while it is still moving meaningfully", () => {
		const solverOptions: Required<PersistentContactSolverOptions> = {
			iterations: 10,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.05,
			angularSleepTolerance: 0.05,
			timeToSleep: 0.2,
		};
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const circle = new PhysicsBody({
			bodyType: "dynamic",
			linearVelocity: new Vector(1, 0),
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const colliders: TestCollider[] = [
			{
				bodyId: "circle",
				shapeId: "circle-shape",
				body: circle,
				shape: circleShape,
			},
		];
		const state = createPersistentContactSolverState();

		runFixedStepsMutable(
			colliders,
			(currentColliders, dt) => {
				stepBodiesWithPersistentSolver(
					currentColliders,
					Vector.zero(),
					dt,
					state,
					solverOptions
				);
			},
			{ steps: 120, dt: 1 / 60 }
		);

		expect(circle.sleep.isSleeping).toBe(false);
		expectCloseToNumber(circle.sleep.sleepTime, 0, SOLVER_EPSILON);
		expect(circle.position.x).toBeGreaterThan(1.5);
	});

	test("produces distinct cache entries for different shape pairs on the same body pair", () => {
		// Two shapes on body A contact two shapes on body B.
		// Each shape-pair contact must land under a different cache key.
		const solverOptions: Required<PersistentContactSolverOptions> = {
			iterations: 12,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.01,
			angularSleepTolerance: 0.01,
			timeToSleep: 10,
		};

		// Represent a "compound" body as two separate colliders sharing the same bodyId.
		// Shape A1 and A2 both belong to body "A"; shape B1 belongs to body "B" (a wide floor).
		const floorShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
		const boxShapeLeft = ConvexPolygonShape.fromRectangle(new Vector(1, 1));
		const boxShapeRight = ConvexPolygonShape.fromRectangle(new Vector(1, 1));
		const floor = new PhysicsBody({
			bodyType: "static",
			position: new Vector(0, -0.5),
			massProperties: computePolygonMassProperties(floorShape, 1),
		});
		const body = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 0.5),
			massProperties: computePolygonMassProperties(boxShapeLeft, 1),
		});

		// Both colliders share bodyId "body" but have distinct shapeIds.
		const colliders: TestCollider[] = [
			{
				bodyId: "floor",
				shapeId: "floor-shape",
				body: floor,
				shape: floorShape,
			},
			{
				bodyId: "body",
				shapeId: "shape-left",
				body: body,
				shape: boxShapeLeft,
			},
			{
				bodyId: "body",
				shapeId: "shape-right",
				body: body,
				shape: boxShapeRight,
			},
		];
		const state = createPersistentContactSolverState();

		stepBodiesWithPersistentSolver(
			colliders,
			new Vector(0, -10),
			1 / 60,
			state,
			solverOptions
		);

		// If any cache entries were written they must differ by at least the shapeId segment.
		// Gather all shapeId pairs encoded in the cache keys.
		const shapeIdPairs = new Set<string>();
		for (const key of state.contactImpulses.keys()) {
			const parts = JSON.parse(key) as string[];
			expect(parts).toHaveLength(5);
			shapeIdPairs.add(`${parts[1]}|${parts[3]}`);
		}

		expect(shapeIdPairs.has("floor-shape|shape-left")).toBe(true);
		expect(shapeIdPairs.has("floor-shape|shape-right")).toBe(true);
	});

	test("woken sleeping body has visibly moved after impact", () => {
		const solverOptions: Required<PersistentContactSolverOptions> = {
			iterations: 10,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.2,
			angularSleepTolerance: 0.2,
			timeToSleep: 0.2,
		};
		const floorShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
		const boxShape = ConvexPolygonShape.fromRectangle(new Vector(2, 2));
		const floor = new PhysicsBody({
			bodyType: "static",
			position: new Vector(0, -0.5),
			massProperties: computePolygonMassProperties(floorShape, 1),
		});
		const restingBox = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 1),
			massProperties: computePolygonMassProperties(boxShape, 1),
		});
		const restingColliders: TestCollider[] = [
			{ bodyId: "floor", shapeId: "floor-shape", body: floor, shape: floorShape },
			{ bodyId: "resting", shapeId: "resting-shape", body: restingBox, shape: boxShape },
		];
		const state = createPersistentContactSolverState();

		// Let the resting box fall asleep.
		runFixedStepsMutable(
			restingColliders,
			(currentColliders, dt) => {
				stepBodiesWithPersistentSolver(currentColliders, new Vector(0, -10), dt, state, solverOptions);
			},
			{ steps: 120, dt: 1 / 60 }
		);
		expect(restingBox.sleep.isSleeping).toBe(true);
		const sleepingPosition = restingBox.position.clone();

		// Drop an impactor on top.
		const impactBox = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 6),
			linearVelocity: new Vector(0, -8),
			massProperties: computePolygonMassProperties(boxShape, 1),
		});
		const allColliders: TestCollider[] = [
			...restingColliders,
			{ bodyId: "impact", shapeId: "impact-shape", body: impactBox, shape: boxShape },
		];
		let maxDisplacement = 0;

		runFixedStepsMutable(
			allColliders,
			(currentColliders, dt) => {
				stepBodiesWithPersistentSolver(currentColliders, new Vector(0, -10), dt, state, solverOptions);
				maxDisplacement = Math.max(
					maxDisplacement,
					restingBox.position.toSubtracted(sleepingPosition).magnitude()
				);
			},
			{ steps: 60, dt: 1 / 60 }
		);

		// The previously-sleeping body must have moved at least a little during
		// the impact window, even if it later settles close to the same pose.
		expect(maxDisplacement).toBeGreaterThan(0.01);
	});

	test("warmStartScale=0 produces cold-start constraints despite a populated cache", () => {
		const baseOptions: Required<PersistentContactSolverOptions> = {
			iterations: 12,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.01,
			angularSleepTolerance: 0.01,
			timeToSleep: 10,
		};
		const setup = createRestingCircleSetup();
		const state = createPersistentContactSolverState();

		// Populate cache.
		stepBodiesWithPersistentSolver(setup.colliders, new Vector(0, -10), 1 / 60, state, baseOptions);
		expect(state.contactImpulses.size).toBeGreaterThan(0);

		// Build constraints with scale=0 — warm-start values must all be zeroed out.
		const zeroScaleOptions: Required<PersistentContactSolverOptions> = {
			...baseOptions,
			warmStartScale: 0,
		};
		const bodies = collectBodies(setup.colliders);
		const solverBodies = createSolverBodyMap(bodies);
		const constraints = buildPersistentContactConstraints(
			state,
			bodies,
			solverBodies,
			collectManifolds(setup.colliders),
			1 / 60,
			zeroScaleOptions
		);

		expect(constraints.length).toBeGreaterThan(0);
		for (const constraint of constraints) {
			for (const point of constraint.points) {
				expect(point.accumulatedNormalImpulse).toBe(0);
				expect(point.accumulatedTangentImpulse).toBe(0);
			}
		}
	});

	test("warmStartScale=0.5 produces intermediate warm-start values between cold and full", () => {
		const baseOptions: Required<PersistentContactSolverOptions> = {
			iterations: 12,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.01,
			angularSleepTolerance: 0.01,
			timeToSleep: 10,
		};
		const setup = createRestingCircleSetup();
		const state = createPersistentContactSolverState();

		// Populate cache with scale=1.
		stepBodiesWithPersistentSolver(setup.colliders, new Vector(0, -10), 1 / 60, state, baseOptions);
		expect(state.contactImpulses.size).toBeGreaterThan(0);

		const getMaxNormalImpulse = (constraints: ReturnType<typeof buildPersistentContactConstraints>): number => {
			let max = 0;
			for (const c of constraints) {
				for (const p of c.points) {
					if (p.accumulatedNormalImpulse > max) max = p.accumulatedNormalImpulse;
				}
			}
			return max;
		};

		const bodies = collectBodies(setup.colliders);

		// Full warm-start (scale=1).
		const fullConstraints = buildPersistentContactConstraints(
			state,
			bodies,
			createSolverBodyMap(bodies),
			collectManifolds(setup.colliders),
			1 / 60,
			{ ...baseOptions, warmStartScale: 1 }
		);
		const fullMax = getMaxNormalImpulse(fullConstraints);

		// Half warm-start (scale=0.5).
		const halfConstraints = buildPersistentContactConstraints(
			state,
			bodies,
			createSolverBodyMap(bodies),
			collectManifolds(setup.colliders),
			1 / 60,
			{ ...baseOptions, warmStartScale: 0.5 }
		);
		const halfMax = getMaxNormalImpulse(halfConstraints);

		// Half must be strictly between 0 (cold) and full.
		expect(halfMax).toBeGreaterThan(0);
		expect(halfMax).toBeLessThan(fullMax - SOLVER_EPSILON);
	});

	test("sleeping body sleepTime never exceeds timeToSleep", () => {
		const timeToSleep = 0.2;
		const solverOptions: Required<PersistentContactSolverOptions> = {
			iterations: 10,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
			enableWarmStarting: true,
			warmStartScale: 1,
			linearSleepTolerance: 0.2,
			angularSleepTolerance: 0.2,
			timeToSleep,
		};
		const setup = createStackSetup();
		const state = createPersistentContactSolverState();

		// Run well past the sleep threshold.
		runFixedStepsMutable(
			setup.colliders,
			(currentColliders, dt) => {
				stepBodiesWithPersistentSolver(currentColliders, new Vector(0, -10), dt, state, solverOptions);
			},
			{ steps: 300, dt: 1 / 60 }
		);

		// Both boxes must be sleeping and their sleepTime must be clamped to timeToSleep.
		expect(setup.bottomBox.sleep.isSleeping).toBe(true);
		expect(setup.topBox.sleep.isSleeping).toBe(true);
		expect(setup.bottomBox.sleep.sleepTime).toBeLessThanOrEqual(timeToSleep + SOLVER_EPSILON);
		expect(setup.topBox.sleep.sleepTime).toBeLessThanOrEqual(timeToSleep + SOLVER_EPSILON);
	});
});
