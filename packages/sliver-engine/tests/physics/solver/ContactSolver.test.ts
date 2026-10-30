import { describe, expect, test } from "bun:test";
import {
	CircleShape,
	ConvexPolygonShape,
	type ContactConstraint,
	type ContactManifold,
	type ContactSolverOptions,
	PhysicsBody,
	buildContactConstraints,
	computeCircleMassProperties,
	computePolygonMassProperties,
	createContactProxy,
	createSolverBodyMap,
	generateContactManifold,
	integrateBody,
	solveContactConstraints,
	solveContacts,
} from "../../../src/Physics";
import { Vector } from "../../../src/Lib/Vector";
import { runFixedStepsMutable } from "../FixedStep";
import { expectCloseToNumber } from "../TestAssertions";

type TestCollider = {
	bodyId: string;
	shapeId: string;
	body: PhysicsBody;
	shape: CircleShape | ConvexPolygonShape;
};

const SOLVER_EPSILON = 1e-6;
const SLOPE_ANGLE = Math.PI / 6;

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

const stepBodiesWithContactSolver = (
	colliders: readonly TestCollider[],
	gravity: Vector,
	dt: number,
	solverOptions: Required<ContactSolverOptions>
): void => {
	const bodies = collectBodies(colliders);

	for (const body of bodies.values()) {
		integrateBody(body, gravity, dt);
	}

	const manifolds = collectManifolds(colliders);
	solveContacts(bodies, manifolds, dt, solverOptions);
};

const createSlopeSetup = (
	boxFriction: { staticFriction: number; dynamicFriction: number }
): {
	colliders: TestCollider[];
	box: PhysicsBody;
} => {
	const slopeShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
	const boxShape = ConvexPolygonShape.fromRectangle(new Vector(2, 1));
	const slopeNormal = new Vector(0, 1).toRotated(SLOPE_ANGLE);
	const boxStartPosition = slopeNormal.toMultiplied(1);

	const slope = new PhysicsBody({
		bodyType: "static",
		angle: SLOPE_ANGLE,
		massProperties: computePolygonMassProperties(slopeShape, 1),
	});
	const box = new PhysicsBody({
		bodyType: "dynamic",
		position: boxStartPosition,
		angle: SLOPE_ANGLE,
		staticFriction: boxFriction.staticFriction,
		dynamicFriction: boxFriction.dynamicFriction,
		restitution: 0,
		massProperties: computePolygonMassProperties(boxShape, 1),
	});

	return {
		colliders: [
			{
				bodyId: "slope",
				shapeId: "slope-shape",
				body: slope,
				shape: slopeShape,
			},
			{
				bodyId: "box",
				shapeId: "box-shape",
				body: box,
				shape: boxShape,
			},
		],
		box,
	};
};

describe("Contact solver", () => {
	test("applies restitution for a high-speed bouncy collision", () => {
		const solverOptions: Required<ContactSolverOptions> = {
			iterations: 20,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
		};
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const bodyA = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(-0.45, 0),
			linearVelocity: new Vector(2, 0),
			restitution: 1,
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const bodyB = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0.45, 0),
			linearVelocity: new Vector(-2, 0),
			restitution: 1,
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const bodies = new Map<string, PhysicsBody>([
			["a", bodyA],
			["b", bodyB],
		]);

		solveContacts(
			bodies,
			collectManifolds([
				{
					bodyId: "a",
					shapeId: "shape-a",
					body: bodyA,
					shape: circleShape,
				},
				{
					bodyId: "b",
					shapeId: "shape-b",
					body: bodyB,
					shape: circleShape,
				},
			]),
			1 / 60,
			solverOptions
		);

		expect(bodyA.linearVelocity.x).toBeLessThan(-1.8);
		expect(bodyB.linearVelocity.x).toBeGreaterThan(1.8);
		expectCloseToNumber(
			bodyA.linearVelocity.x + bodyB.linearVelocity.x,
			0,
			0.05
		);
	});

	test("suppresses restitution below the low-speed threshold to avoid micro-bounce", () => {
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const floorShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
		const createBodies = () => {
			const floor = new PhysicsBody({
				bodyType: "static",
				position: new Vector(0, -0.5),
				restitution: 1,
				massProperties: computePolygonMassProperties(floorShape, 1),
			});
			const circle = new PhysicsBody({
				bodyType: "dynamic",
				position: new Vector(0, 0.45),
				linearVelocity: new Vector(0, -0.2),
				restitution: 1,
				massProperties: computeCircleMassProperties(circleShape, 1),
			});

			return { floor, circle };
		};

		const thresholdBodies = createBodies();
		const bounceBodies = createBodies();

		solveContacts(
			new Map<string, PhysicsBody>([
				["floor", thresholdBodies.floor],
				["circle", thresholdBodies.circle],
			]),
			collectManifolds([
				{
					bodyId: "floor",
					shapeId: "floor-shape",
					body: thresholdBodies.floor,
					shape: floorShape,
				},
				{
					bodyId: "circle",
					shapeId: "circle-shape",
					body: thresholdBodies.circle,
					shape: circleShape,
				},
			]),
			1 / 60,
			{
				iterations: 20,
				baumgarte: 0.2,
				penetrationSlop: 0.005,
				restitutionThreshold: 1,
			}
		);

		solveContacts(
			new Map<string, PhysicsBody>([
				["floor", bounceBodies.floor],
				["circle", bounceBodies.circle],
			]),
			collectManifolds([
				{
					bodyId: "floor",
					shapeId: "floor-shape",
					body: bounceBodies.floor,
					shape: floorShape,
				},
				{
					bodyId: "circle",
					shapeId: "circle-shape",
					body: bounceBodies.circle,
					shape: circleShape,
				},
			]),
			1 / 60,
			{
				iterations: 20,
				baumgarte: 0.2,
				penetrationSlop: 0.005,
				restitutionThreshold: 0,
			}
		);

		expect(Math.abs(thresholdBodies.circle.linearVelocity.y)).toBeLessThan(0.05);
		expect(bounceBodies.circle.linearVelocity.y).toBeGreaterThan(0.1);
	});

	test("suppresses restitution when the closing speed equals the threshold", () => {
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const floorShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
		const createBodies = () => {
			const floor = new PhysicsBody({
				bodyType: "static",
				position: new Vector(0, -0.5),
				restitution: 1,
				massProperties: computePolygonMassProperties(floorShape, 1),
			});
			const circle = new PhysicsBody({
				bodyType: "dynamic",
				position: new Vector(0, 0.45),
				linearVelocity: new Vector(0, -0.2),
				restitution: 1,
				massProperties: computeCircleMassProperties(circleShape, 1),
			});

			return { floor, circle };
		};

		const boundaryBodies = createBodies();
		const belowBoundaryBodies = createBodies();

		solveContacts(
			new Map<string, PhysicsBody>([
				["floor", boundaryBodies.floor],
				["circle", boundaryBodies.circle],
			]),
			collectManifolds([
				{
					bodyId: "floor",
					shapeId: "floor-shape",
					body: boundaryBodies.floor,
					shape: floorShape,
				},
				{
					bodyId: "circle",
					shapeId: "circle-shape",
					body: boundaryBodies.circle,
					shape: circleShape,
				},
			]),
			1 / 60,
			{
				iterations: 20,
				baumgarte: 0.2,
				penetrationSlop: 0.005,
				restitutionThreshold: 0.2,
			}
		);

		solveContacts(
			new Map<string, PhysicsBody>([
				["floor", belowBoundaryBodies.floor],
				["circle", belowBoundaryBodies.circle],
			]),
			collectManifolds([
				{
					bodyId: "floor",
					shapeId: "floor-shape",
					body: belowBoundaryBodies.floor,
					shape: floorShape,
				},
				{
					bodyId: "circle",
					shapeId: "circle-shape",
					body: belowBoundaryBodies.circle,
					shape: circleShape,
				},
			]),
			1 / 60,
			{
				iterations: 20,
				baumgarte: 0.2,
				penetrationSlop: 0.005,
				restitutionThreshold: 0.199,
			}
		);

		expect(Math.abs(boundaryBodies.circle.linearVelocity.y)).toBeLessThan(0.05);
		expect(belowBoundaryBodies.circle.linearVelocity.y).toBeGreaterThan(0.1);
	});

	test("keeps a high-friction body settled on a slope", () => {
		const solverOptions: Required<ContactSolverOptions> = {
			iterations: 20,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
		};
		const { colliders, box } = createSlopeSetup({
			staticFriction: 4,
			dynamicFriction: 3,
		});

		runFixedStepsMutable(
			colliders,
			(currentColliders, dt, stepIndex) => {
				stepBodiesWithContactSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					solverOptions
				);

				if (stepIndex === 5) {
					expect(collectManifolds(currentColliders).length).toBeGreaterThan(0);
				}
			},
			{ steps: 240, dt: 1 / 60 }
		);

		expect(box.position.x).toBeGreaterThan(-1.1);
		expect(box.position.x).toBeLessThan(0.1);
		expect(Math.abs(box.linearVelocity.x)).toBeLessThan(0.2);
	});

	test("lets a low-friction body slide on a slope", () => {
		const solverOptions: Required<ContactSolverOptions> = {
			iterations: 20,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
		};
		const { colliders, box } = createSlopeSetup({
			staticFriction: 0,
			dynamicFriction: 0,
		});

		runFixedStepsMutable(
			colliders,
			(currentColliders, dt, stepIndex) => {
				stepBodiesWithContactSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					solverOptions
				);

				if (stepIndex === 5) {
					expect(collectManifolds(currentColliders).length).toBeGreaterThan(0);
				}
			},
			{ steps: 240, dt: 1 / 60 }
		);

		expect(box.position.x).toBeLessThan(-1.5);
		expect(box.linearVelocity.x).toBeLessThan(-0.1);
	});

	test("uses static friction inside the cone and clamps to dynamic friction outside it", () => {
		const solverOptions: Required<ContactSolverOptions> = {
			iterations: 20,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
		};
		const floorShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
		const circleShape = new CircleShape(Vector.zero(), 0.5);

		// High static friction, zero dynamic friction: the solver must use static
		// friction to produce a nonzero tangent impulse that stays inside the cone.
		// A solver that fell through to dynamic friction would produce zero impulse
		// (dynamicFriction = 0), so the nonzero-impulse assertion isolates the branch.
		const stickingFloor = new PhysicsBody({
			bodyType: "static",
			position: new Vector(0, -0.5),
			staticFriction: 2,
			dynamicFriction: 0,
			massProperties: computePolygonMassProperties(floorShape, 1),
		});
		const stickingCircle = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 0.45),
			linearVelocity: new Vector(0.5, -1),
			staticFriction: 2,
			dynamicFriction: 0,
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const stickingBodies = new Map<string, PhysicsBody>([
			["floor", stickingFloor],
			["circle", stickingCircle],
		]);
		const stickingColliders: TestCollider[] = [
			{ bodyId: "floor", shapeId: "floor-shape", body: stickingFloor, shape: floorShape },
			{ bodyId: "circle", shapeId: "circle-shape", body: stickingCircle, shape: circleShape },
		];
		const stickingSolverBodies = createSolverBodyMap(stickingBodies);
		const stickingConstraints = buildContactConstraints(
			stickingBodies,
			stickingSolverBodies,
			collectManifolds(stickingColliders),
			1 / 60,
			solverOptions
		);
		expect(stickingConstraints.length).toBeGreaterThan(0);
		solveContactConstraints(stickingSolverBodies, stickingConstraints, solverOptions);

		const stickingConstraint = stickingConstraints[0]!;
		const stickingPoint = stickingConstraint.points[0]!;

		// Static branch fired: impulse is nonzero (dynamicFriction = 0, so only the
		// static path could have produced a tangent impulse) and stays strictly inside
		// the static friction cone.
		expect(Math.abs(stickingPoint.accumulatedTangentImpulse)).toBeGreaterThan(1e-4);
		expect(Math.abs(stickingPoint.accumulatedTangentImpulse)).toBeLessThan(
			stickingConstraint.staticFriction * stickingPoint.accumulatedNormalImpulse - 1e-4
		);
		// Tangential velocity is meaningfully reduced (sticking, not sliding).
		const stickingVx = stickingSolverBodies.get("circle")!.linearVelocity.x;
		expect(Math.abs(stickingVx)).toBeLessThan(0.4);

		// Low static friction: the tangent candidate exceeds the static cone, so the
		// solver clamps to the dynamic friction limit.
		const slidingFloor = new PhysicsBody({
			bodyType: "static",
			position: new Vector(0, -0.5),
			staticFriction: 0.05,
			dynamicFriction: 0.05,
			massProperties: computePolygonMassProperties(floorShape, 1),
		});
		const slidingCircle = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 0.45),
			linearVelocity: new Vector(0.5, -1),
			staticFriction: 0.05,
			dynamicFriction: 0.05,
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const slidingBodies = new Map<string, PhysicsBody>([
			["floor", slidingFloor],
			["circle", slidingCircle],
		]);
		const slidingColliders: TestCollider[] = [
			{ bodyId: "floor", shapeId: "floor-shape", body: slidingFloor, shape: floorShape },
			{ bodyId: "circle", shapeId: "circle-shape", body: slidingCircle, shape: circleShape },
		];
		const slidingSolverBodies = createSolverBodyMap(slidingBodies);
		const slidingConstraints = buildContactConstraints(
			slidingBodies,
			slidingSolverBodies,
			collectManifolds(slidingColliders),
			1 / 60,
			solverOptions
		);
		expect(slidingConstraints.length).toBeGreaterThan(0);
		solveContactConstraints(slidingSolverBodies, slidingConstraints, solverOptions);

		const slidingConstraint = slidingConstraints[0]!;
		const slidingPoint = slidingConstraint.points[0]!;

		// Outside the static cone: the solver must have clamped to the dynamic limit.
		expectCloseToNumber(
			Math.abs(slidingPoint.accumulatedTangentImpulse),
			slidingConstraint.dynamicFriction * slidingPoint.accumulatedNormalImpulse,
			1e-5
		);
		// Tangential velocity remains substantially non-zero after the solve.
		const slidingVx = slidingSolverBodies.get("circle")!.linearVelocity.x;
		expect(Math.abs(slidingVx)).toBeGreaterThan(0.2);
	});

	test("settles on a slope when static friction exceeds the slope tangent and slides when it does not", () => {
		// For a slope at angle θ, a resting body requires μ_s >= tan(θ).
		// At θ = π/6, tan(π/6) ≈ 0.577.
		// Settled case:  μ_s = 0.7 > 0.577, μ_d = 0.65 > 0.577.
		//   Both coefficients exceed the slope tangent so neither static slip
		//   nor transient dynamic slip can grow into a sustained slide.
		// Sliding case:  μ_s = 0.4 < 0.577, μ_d = 0.3 < 0.577.
		//   Both are below the slope tangent so the body slides.
		const solverOptions: Required<ContactSolverOptions> = {
			iterations: 20,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
		};

		const settledSetup = createSlopeSetup({ staticFriction: 0.7, dynamicFriction: 0.65 });
		runFixedStepsMutable(
			settledSetup.colliders,
			(currentColliders, dt, stepIndex) => {
				stepBodiesWithContactSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					solverOptions
				);

				if (stepIndex === 5) {
					expect(collectManifolds(currentColliders).length).toBeGreaterThan(0);
				}
			},
			{ steps: 240, dt: 1 / 60 }
		);
		// The box should not have travelled far down the slope.
		expect(settledSetup.box.position.x).toBeGreaterThan(-1.5);
		expect(Math.abs(settledSetup.box.linearVelocity.x)).toBeLessThan(0.3);

		const slidingSetup = createSlopeSetup({ staticFriction: 0.4, dynamicFriction: 0.3 });
		runFixedStepsMutable(
			slidingSetup.colliders,
			(currentColliders, dt, stepIndex) => {
				stepBodiesWithContactSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					solverOptions
				);

				if (stepIndex === 5) {
					expect(collectManifolds(currentColliders).length).toBeGreaterThan(0);
				}
			},
			{ steps: 240, dt: 1 / 60 }
		);
		// The box should have slid noticeably down the slope.
		expect(slidingSetup.box.position.x).toBeLessThan(-1.5);
		expect(slidingSetup.box.linearVelocity.x).toBeLessThan(-0.1);
	});

	test("limits the friction impulse relative to the solved normal impulse", () => {
		const solverOptions: Required<ContactSolverOptions> = {
			iterations: 20,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
		};
		const floorShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const floor = new PhysicsBody({
			bodyType: "static",
			position: new Vector(0, -0.5),
			staticFriction: 0.81,
			dynamicFriction: 0.25,
			massProperties: computePolygonMassProperties(floorShape, 1),
		});
		const circle = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 0.45),
			linearVelocity: new Vector(50, -10),
			staticFriction: 0.64,
			dynamicFriction: 0.81,
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const bodies = new Map<string, PhysicsBody>([
			["floor", floor],
			["circle", circle],
		]);
		const colliders: TestCollider[] = [
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
		];
		const solverBodies = createSolverBodyMap(bodies);
		const constraints = buildContactConstraints(
			bodies,
			solverBodies,
			collectManifolds(colliders),
			1 / 60,
			solverOptions
		);

		solveContactConstraints(solverBodies, constraints, solverOptions);

		const constraint = constraints[0] as ContactConstraint;
		const point = constraint.points[0]!;
		const expectedStaticFriction = Math.sqrt(0.81 * 0.64);
		const expectedDynamicFriction = Math.sqrt(0.25 * 0.81);

		expectCloseToNumber(
			constraint.staticFriction,
			expectedStaticFriction,
			SOLVER_EPSILON
		);
		expectCloseToNumber(
			constraint.dynamicFriction,
			expectedDynamicFriction,
			SOLVER_EPSILON
		);
		expect(Math.abs(point.accumulatedTangentImpulse)).toBeGreaterThan(0);
		expectCloseToNumber(
			Math.abs(point.accumulatedTangentImpulse),
			expectedDynamicFriction * point.accumulatedNormalImpulse,
			1e-5
		);
	});

	test("lets a kinematic surface transfer tangential motion through friction", () => {
		const solverOptions: Required<ContactSolverOptions> = {
			iterations: 20,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
		};
		const platformShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const platform = new PhysicsBody({
			bodyType: "kinematic",
			position: new Vector(0, -0.5),
			linearVelocity: new Vector(2, 0),
			staticFriction: 1,
			dynamicFriction: 1,
			massProperties: computePolygonMassProperties(platformShape, 1),
		});
		const circle = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 0.45),
			staticFriction: 1,
			dynamicFriction: 1,
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const colliders: TestCollider[] = [
			{
				bodyId: "platform",
				shapeId: "platform-shape",
				body: platform,
				shape: platformShape,
			},
			{
				bodyId: "circle",
				shapeId: "circle-shape",
				body: circle,
				shape: circleShape,
			},
		];

		expect(collectManifolds(colliders).length).toBeGreaterThan(0);

		stepBodiesWithContactSolver(
			colliders,
			new Vector(0, -10),
			1 / 60,
			solverOptions
		);

		expectCloseToNumber(platform.linearVelocity.x, 2, SOLVER_EPSILON);
		expect(circle.linearVelocity.x).toBeGreaterThan(0.05);
	});

	test("treats an empty manifold list as a no-op", () => {
		const body = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(2, -1),
			angle: 0.25,
			linearVelocity: new Vector(3, -4),
			angularVelocity: 1.5,
			massProperties: computeCircleMassProperties(
				new CircleShape(Vector.zero(), 0.5),
				1
			),
		});
		const bodies = new Map<string, PhysicsBody>([["body", body]]);
		const solverOptions: Required<ContactSolverOptions> = {
			iterations: 20,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
		};

		solveContacts(bodies, [], 1 / 60, solverOptions);

		expectCloseToNumber(body.position.x, 2, SOLVER_EPSILON);
		expectCloseToNumber(body.position.y, -1, SOLVER_EPSILON);
		expectCloseToNumber(body.angle, 0.25, SOLVER_EPSILON);
		expectCloseToNumber(body.linearVelocity.x, 3, SOLVER_EPSILON);
		expectCloseToNumber(body.linearVelocity.y, -4, SOLVER_EPSILON);
		expectCloseToNumber(body.angularVelocity, 1.5, SOLVER_EPSILON);
	});

	test("rejects non-positive contact solver time steps", () => {
		const bodies = new Map<string, PhysicsBody>([
			[
				"body",
				new PhysicsBody({
					bodyType: "dynamic",
					massProperties: computeCircleMassProperties(
						new CircleShape(Vector.zero(), 0.5),
						1
					),
				}),
			],
		]);
		const solverOptions: Required<ContactSolverOptions> = {
			iterations: 20,
			positionIterations: 3,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
			restitutionThreshold: 1,
		};

		expect(() => {
			solveContacts(bodies, [], 0, solverOptions);
		}).toThrow("Time step must be positive.");

		expect(() => {
			solveContacts(bodies, [], -1 / 60, solverOptions);
		}).toThrow("Time step must be positive.");
	});

	test("rejects non-positive contact solver iteration counts", () => {
		const bodies = new Map<string, PhysicsBody>([
			[
				"body",
				new PhysicsBody({
					bodyType: "dynamic",
					massProperties: computeCircleMassProperties(
						new CircleShape(Vector.zero(), 0.5),
						1
					),
				}),
			],
		]);

		expect(() => {
			solveContacts(bodies, [], 1 / 60, {
				iterations: 0,
				baumgarte: 0.2,
				penetrationSlop: 0.005,
				restitutionThreshold: 1,
			});
		}).toThrow("Solver iterations must be a positive integer.");

		expect(() => {
			solveContacts(bodies, [], 1 / 60, {
				iterations: -1,
				baumgarte: 0.2,
				penetrationSlop: 0.005,
				restitutionThreshold: 1,
			});
		}).toThrow("Solver iterations must be a positive integer.");
	});
});
