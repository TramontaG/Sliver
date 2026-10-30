import { describe, expect, test } from "bun:test";
import {
	CircleShape,
	ConvexPolygonShape,
	type ContactManifold,
	type NormalSolverOptions,
	PhysicsBody,
	buildNormalContactConstraints,
	computeCircleMassProperties,
	computePolygonMassProperties,
	createContactProxy,
	createSolverBodyMap,
	generateContactManifold,
	integrateBody,
	solveNormalContactConstraints,
	solveNormalContacts,
	writeBackSolverBodies,
} from "../../../src/Physics";
import { Vector } from "../../../src/Lib/Vector";
import { runFixedStepsMutable } from "../FixedStep";
import { expectCloseToNumber, expectCloseToVector } from "../TestAssertions";

const SOLVER_EPSILON = 1e-6;

type TestCollider = {
	bodyId: string;
	shapeId: string;
	body: PhysicsBody;
	shape: CircleShape | ConvexPolygonShape;
};

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

const stepBodiesWithNormalSolver = (
	colliders: readonly TestCollider[],
	gravity: Vector,
	dt: number,
	solverOptions: Required<NormalSolverOptions>
): void => {
	const bodies = collectBodies(colliders);

	for (const body of bodies.values()) {
		integrateBody(body, gravity, dt);
	}

	const manifolds = collectManifolds(colliders);
	solveNormalContacts(bodies, manifolds, dt, solverOptions);
};

describe("Normal contact solver", () => {
	test("keeps a dynamic body resting on a static floor without sinking", () => {
		const solverOptions: Required<NormalSolverOptions> = {
			iterations: 20,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
		};
		const floorShape = ConvexPolygonShape.fromRectangle(new Vector(20, 1));
		const boxShape = ConvexPolygonShape.fromRectangle(new Vector(2, 2));
		const floor = new PhysicsBody({
			bodyType: "static",
			position: new Vector(0, -0.5),
			massProperties: computePolygonMassProperties(floorShape, 1),
		});
		const box = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 5),
			massProperties: computePolygonMassProperties(boxShape, 1),
		});
		const colliders: TestCollider[] = [
			{
				bodyId: "floor",
				shapeId: "floor-shape",
				body: floor,
				shape: floorShape,
			},
			{
				bodyId: "box",
				shapeId: "box-shape",
				body: box,
				shape: boxShape,
			},
		];

		runFixedStepsMutable(
			colliders,
			(currentColliders, dt) => {
				stepBodiesWithNormalSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					solverOptions
				);
			},
			{ steps: 240, dt: 1 / 60 }
		);

		expect(box.position.y).toBeGreaterThan(0.9);
		expect(box.position.y).toBeLessThan(1.15);
		expect(Math.abs(box.linearVelocity.y)).toBeLessThan(0.05);
		expectCloseToVector(floor.position, new Vector(0, -0.5), SOLVER_EPSILON);
	});

	test("resolves a head-on dynamic collision without moving bodies through each other", () => {
		const solverOptions: Required<NormalSolverOptions> = {
			iterations: 20,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
		};
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const bodyA = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(-1.1, 0),
			linearVelocity: new Vector(2, 0),
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const bodyB = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(1.1, 0),
			linearVelocity: new Vector(-2, 0),
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const colliders: TestCollider[] = [
			{ bodyId: "a", shapeId: "shape-a", body: bodyA, shape: circleShape },
			{ bodyId: "b", shapeId: "shape-b", body: bodyB, shape: circleShape },
		];

		runFixedStepsMutable(
			colliders,
			(currentColliders, dt) => {
				stepBodiesWithNormalSolver(
					currentColliders,
					Vector.zero(),
					dt,
					solverOptions
				);
			},
			{ steps: 30, dt: 1 / 60 }
		);

		expect(Math.abs(bodyA.linearVelocity.x)).toBeLessThan(0.05);
		expect(Math.abs(bodyB.linearVelocity.x)).toBeLessThan(0.05);
		expect(bodyA.position.x).toBeLessThanOrEqual(0);
		expect(bodyB.position.x).toBeGreaterThanOrEqual(0);
		expect(bodyB.position.x - bodyA.position.x).toBeGreaterThan(0.9);
		expect(bodyB.position.x - bodyA.position.x).toBeLessThan(1.1);
		expectCloseToNumber(
			bodyA.position.x + bodyB.position.x,
			0,
			0.1
		);
	});

	test("does not move a static body when resolving dynamic contact", () => {
		const solverOptions: Required<NormalSolverOptions> = {
			iterations: 20,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
		};
		const wallShape = ConvexPolygonShape.fromRectangle(new Vector(1, 6));
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const wall = new PhysicsBody({
			bodyType: "static",
			position: new Vector(0.5, 0),
			massProperties: computePolygonMassProperties(wallShape, 1),
		});
		const circle = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(-3, 0),
			linearVelocity: new Vector(8, 0),
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const colliders: TestCollider[] = [
			{ bodyId: "wall", shapeId: "wall-shape", body: wall, shape: wallShape },
			{ bodyId: "circle", shapeId: "circle-shape", body: circle, shape: circleShape },
		];

		runFixedStepsMutable(
			colliders,
			(currentColliders, dt) => {
				stepBodiesWithNormalSolver(
					currentColliders,
					Vector.zero(),
					dt,
					solverOptions
				);
			},
			{ steps: 60, dt: 1 / 60 }
		);

		expectCloseToVector(wall.position, new Vector(0.5, 0), SOLVER_EPSILON);
		expectCloseToVector(wall.linearVelocity, Vector.zero(), SOLVER_EPSILON);
		expect(circle.position.x).toBeLessThan(0);
	});

	test("keeps a simple box stack stable across many steps", () => {
		const solverOptions: Required<NormalSolverOptions> = {
			iterations: 25,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
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
			position: new Vector(0, 3),
			massProperties: computePolygonMassProperties(boxShape, 1),
		});
		const topBox = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 6),
			massProperties: computePolygonMassProperties(boxShape, 1),
		});
		const colliders: TestCollider[] = [
			{ bodyId: "floor", shapeId: "floor-shape", body: floor, shape: floorShape },
			{ bodyId: "bottom", shapeId: "bottom-shape", body: bottomBox, shape: boxShape },
			{ bodyId: "top", shapeId: "top-shape", body: topBox, shape: boxShape },
		];

		runFixedStepsMutable(
			colliders,
			(currentColliders, dt) => {
				stepBodiesWithNormalSolver(
					currentColliders,
					new Vector(0, -10),
					dt,
					solverOptions
				);
			},
			{ steps: 360, dt: 1 / 60 }
		);

		expect(bottomBox.position.y).toBeGreaterThan(0.85);
		expect(bottomBox.position.y).toBeLessThan(1.25);
		expect(topBox.position.y).toBeGreaterThan(2.8);
		expect(topBox.position.y).toBeLessThan(3.25);
		expect(topBox.position.y - bottomBox.position.y).toBeGreaterThan(1.8);
		expect(Math.abs(bottomBox.linearVelocity.y)).toBeLessThan(0.08);
		expect(Math.abs(topBox.linearVelocity.y)).toBeLessThan(0.08);
	});

	test("writes body state back once after solving instead of mutating bodies per contact iteration", () => {
		const solverOptions: Required<NormalSolverOptions> = {
			iterations: 20,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
		};
		const circleShape = new CircleShape(Vector.zero(), 1);
		const bodyA = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0, 0),
			linearVelocity: new Vector(1, 0),
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const bodyB = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(1.5, 0),
			linearVelocity: new Vector(-1, 0),
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const bodies = new Map<string, PhysicsBody>([
			["a", bodyA],
			["b", bodyB],
		]);
		const manifolds = [
			generateContactManifold(
				createContactProxy({
					bodyId: "a",
					shapeId: "shape-a",
					shape: circleShape,
					transform: {
						position: bodyA.position,
						angle: bodyA.angle,
					},
				}),
				createContactProxy({
					bodyId: "b",
					shapeId: "shape-b",
					shape: circleShape,
					transform: {
						position: bodyB.position,
						angle: bodyB.angle,
					},
				})
			),
		].filter((manifold): manifold is ContactManifold => manifold !== null);

		const solverBodies = createSolverBodyMap(bodies);
		const constraints = buildNormalContactConstraints(
			solverBodies,
			manifolds,
			1 / 60,
			solverOptions
		);

		solveNormalContactConstraints(
			solverBodies,
			constraints,
			solverOptions
		);

		expectCloseToVector(bodyA.linearVelocity, new Vector(1, 0), SOLVER_EPSILON);
		expectCloseToVector(bodyB.linearVelocity, new Vector(-1, 0), SOLVER_EPSILON);

		writeBackSolverBodies(bodies, solverBodies);

		expect(Math.abs(bodyA.linearVelocity.x)).toBeLessThan(0.05);
		expect(Math.abs(bodyB.linearVelocity.x)).toBeLessThan(0.05);
	});

	test("rejects non-positive solver time steps", () => {
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const body = new PhysicsBody({
			bodyType: "dynamic",
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const bodies = new Map<string, PhysicsBody>([["body", body]]);
		const solverOptions: Required<NormalSolverOptions> = {
			iterations: 20,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
		};

		expect(() => {
			solveNormalContacts(bodies, [], 0, solverOptions);
		}).toThrow("Time step must be positive.");

		expect(() => {
			solveNormalContacts(bodies, [], -1 / 60, solverOptions);
		}).toThrow("Time step must be positive.");
	});

	test("lets a kinematic body push a dynamic body without being moved by impulses", () => {
		const solverOptions: Required<NormalSolverOptions> = {
			iterations: 20,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
		};
		const wallShape = ConvexPolygonShape.fromRectangle(new Vector(1, 6));
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const wall = new PhysicsBody({
			bodyType: "kinematic",
			position: new Vector(-3, 0),
			linearVelocity: new Vector(4, 0),
			massProperties: computePolygonMassProperties(wallShape, 1),
		});
		const circle = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(0.5, 0),
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const colliders: TestCollider[] = [
			{ bodyId: "wall", shapeId: "wall-shape", body: wall, shape: wallShape },
			{ bodyId: "circle", shapeId: "circle-shape", body: circle, shape: circleShape },
		];

		runFixedStepsMutable(
			colliders,
			(currentColliders, dt) => {
				stepBodiesWithNormalSolver(
					currentColliders,
					Vector.zero(),
					dt,
					solverOptions
				);
			},
			{ steps: 60, dt: 1 / 60 }
		);

		expectCloseToVector(wall.linearVelocity, new Vector(4, 0), SOLVER_EPSILON);
		expectCloseToNumber(wall.position.x, 1, 0.1);
		expect(circle.position.x).toBeGreaterThan(1.1);
		expect(circle.linearVelocity.x).toBeGreaterThan(0);
	});

	test("treats an empty manifold list as a no-op", () => {
		const solverOptions: Required<NormalSolverOptions> = {
			iterations: 20,
			baumgarte: 0.2,
			penetrationSlop: 0.005,
		};
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const body = new PhysicsBody({
			bodyType: "dynamic",
			position: new Vector(2, -1),
			angle: 0.5,
			linearVelocity: new Vector(3, -4),
			angularVelocity: 1.25,
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const bodies = new Map<string, PhysicsBody>([["body", body]]);

		solveNormalContacts(bodies, [], 1 / 60, solverOptions);

		expectCloseToVector(body.position, new Vector(2, -1), SOLVER_EPSILON);
		expectCloseToNumber(body.angle, 0.5, SOLVER_EPSILON);
		expectCloseToVector(body.linearVelocity, new Vector(3, -4), SOLVER_EPSILON);
		expectCloseToNumber(body.angularVelocity, 1.25, SOLVER_EPSILON);
	});

	test("rejects non-positive solver iteration counts", () => {
		const circleShape = new CircleShape(Vector.zero(), 0.5);
		const body = new PhysicsBody({
			bodyType: "dynamic",
			massProperties: computeCircleMassProperties(circleShape, 1),
		});
		const bodies = new Map<string, PhysicsBody>([["body", body]]);

		expect(() => {
			solveNormalContacts(bodies, [], 1 / 60, {
				iterations: 0,
				baumgarte: 0.2,
				penetrationSlop: 0.005,
			});
		}).toThrow("Solver iterations must be a positive integer.");

		expect(() => {
			solveNormalContacts(bodies, [], 1 / 60, {
				iterations: -1,
				baumgarte: 0.2,
				penetrationSlop: 0.005,
			});
		}).toThrow("Solver iterations must be a positive integer.");
	});

	test("uses explicit baumgarte and penetration slop values to control correction strength", () => {
		const circleShape = new CircleShape(Vector.zero(), 1);
		const createBodyPair = () => {
			return {
				bodyA: new PhysicsBody({
					bodyType: "dynamic",
					position: new Vector(0, 0),
					massProperties: computeCircleMassProperties(circleShape, 1),
				}),
				bodyB: new PhysicsBody({
					bodyType: "dynamic",
					position: new Vector(1.5, 0),
					massProperties: computeCircleMassProperties(circleShape, 1),
				}),
			};
		};

		const weakBodies = createBodyPair();
		const strongBodies = createBodyPair();
		const highSlopBodies = createBodyPair();

		solveNormalContacts(
			new Map<string, PhysicsBody>([
				["a", weakBodies.bodyA],
				["b", weakBodies.bodyB],
			]),
			collectManifolds([
				{
					bodyId: "a",
					shapeId: "shape-a",
					body: weakBodies.bodyA,
					shape: circleShape,
				},
				{
					bodyId: "b",
					shapeId: "shape-b",
					body: weakBodies.bodyB,
					shape: circleShape,
				},
			]),
			1 / 60,
			{
				iterations: 20,
				baumgarte: 0.1,
				penetrationSlop: 0,
			}
		);

		solveNormalContacts(
			new Map<string, PhysicsBody>([
				["a", strongBodies.bodyA],
				["b", strongBodies.bodyB],
			]),
			collectManifolds([
				{
					bodyId: "a",
					shapeId: "shape-a",
					body: strongBodies.bodyA,
					shape: circleShape,
				},
				{
					bodyId: "b",
					shapeId: "shape-b",
					body: strongBodies.bodyB,
					shape: circleShape,
				},
			]),
			1 / 60,
			{
				iterations: 20,
				baumgarte: 1,
				penetrationSlop: 0,
			}
		);

		solveNormalContacts(
			new Map<string, PhysicsBody>([
				["a", highSlopBodies.bodyA],
				["b", highSlopBodies.bodyB],
			]),
			collectManifolds([
				{
					bodyId: "a",
					shapeId: "shape-a",
					body: highSlopBodies.bodyA,
					shape: circleShape,
				},
				{
					bodyId: "b",
					shapeId: "shape-b",
					body: highSlopBodies.bodyB,
					shape: circleShape,
				},
			]),
			1 / 60,
			{
				iterations: 20,
				baumgarte: 1,
				penetrationSlop: 0.4,
			}
		);

		const weakSeparation = weakBodies.bodyB.position.x - weakBodies.bodyA.position.x;
		const strongSeparation =
			strongBodies.bodyB.position.x - strongBodies.bodyA.position.x;
		const highSlopSeparation =
			highSlopBodies.bodyB.position.x - highSlopBodies.bodyA.position.x;

		expect(strongSeparation).toBeGreaterThan(weakSeparation);
		expect(highSlopSeparation).toBeLessThan(strongSeparation);
	});
});
