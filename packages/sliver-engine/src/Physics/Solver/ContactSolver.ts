import { Vector } from "../../Lib/Vector";
import {
	mixFriction,
	mixRestitution,
	type PhysicsBody,
} from "../Body";
import type { ContactManifold } from "../Contacts";
import type { SolverBodyState } from "./NormalContactSolver";
import {
	createSolverBodyMap,
	writeBackSolverBodies,
} from "./NormalContactSolver";

type ContactSolverOptions = {
	iterations?: number;
	positionIterations?: number;
	baumgarte?: number;
	penetrationSlop?: number;
	restitutionThreshold?: number;
};

type ContactConstraintPoint = {
	id: string;
	position: Vector;
	penetration: number;
	ra: Vector;
	rb: Vector;
	normalMass: number;
	tangentMass: number;
	velocityBias: number;
	accumulatedNormalImpulse: number;
	accumulatedTangentImpulse: number;
};

type ContactConstraint = {
	bodyIdA: string;
	bodyIdB: string;
	shapeIdA: string;
	shapeIdB: string;
	normal: Vector;
	tangent: Vector;
	staticFriction: number;
	dynamicFriction: number;
	points: ContactConstraintPoint[];
};

const DEFAULT_CONTACT_SOLVER_OPTIONS: Required<ContactSolverOptions> = {
	iterations: 10,
	positionIterations: 3,
	baumgarte: 0.2,
	penetrationSlop: 0.005,
	restitutionThreshold: 1,
};

const assertFiniteNumber = (value: number, label: string): void => {
	if (!Number.isFinite(value)) {
		throw new Error(`${label} must be a finite number.`);
	}
};

const assertNonNegativeNumber = (value: number, label: string): void => {
	assertFiniteNumber(value, label);
	if (value < 0) {
		throw new Error(`${label} must be non-negative.`);
	}
};

const assertPositiveTimeStep = (dt: number): void => {
	assertFiniteNumber(dt, "Time step");
	if (dt <= 0) {
		throw new Error("Time step must be positive.");
	}
};

const resolveContactSolverOptions = (
	options: ContactSolverOptions | undefined
): Required<ContactSolverOptions> => {
	const iterations =
		options?.iterations ?? DEFAULT_CONTACT_SOLVER_OPTIONS.iterations;
	assertFiniteNumber(iterations, "Solver iterations");
	if (!Number.isInteger(iterations) || iterations <= 0) {
		throw new Error("Solver iterations must be a positive integer.");
	}

	const positionIterations =
		options?.positionIterations ?? DEFAULT_CONTACT_SOLVER_OPTIONS.positionIterations;
	assertFiniteNumber(positionIterations, "Position solver iterations");
	if (!Number.isInteger(positionIterations) || positionIterations <= 0) {
		throw new Error("Position solver iterations must be a positive integer.");
	}

	const baumgarte =
		options?.baumgarte ?? DEFAULT_CONTACT_SOLVER_OPTIONS.baumgarte;
	assertNonNegativeNumber(baumgarte, "Baumgarte factor");

	const penetrationSlop =
		options?.penetrationSlop ?? DEFAULT_CONTACT_SOLVER_OPTIONS.penetrationSlop;
	assertNonNegativeNumber(penetrationSlop, "Penetration slop");

	const restitutionThreshold =
		options?.restitutionThreshold ??
		DEFAULT_CONTACT_SOLVER_OPTIONS.restitutionThreshold;
	assertNonNegativeNumber(restitutionThreshold, "Restitution threshold");

	return {
		iterations,
		positionIterations,
		baumgarte,
		penetrationSlop,
		restitutionThreshold,
	};
};

const scalarCrossVector = (scalar: number, vector: Vector): Vector => {
	return new Vector(-scalar * vector.y, scalar * vector.x);
};

const cross = (a: Vector, b: Vector): number => {
	return a.crossProduct(b);
};

const rotateLocalCenter = (localCenter: Vector, angle: number): Vector => {
	return localCenter.toRotated(angle);
};

const updateWorldCenter = (body: SolverBodyState): void => {
	body.worldCenter = body.position.toAdded(
		rotateLocalCenter(body.localCenter, body.angle)
	);
};

const getVelocityAtPoint = (
	body: SolverBodyState,
	contactOffset: Vector
): Vector => {
	return body.linearVelocity.toAdded(
		scalarCrossVector(body.angularVelocity, contactOffset)
	);
};

const applyVelocityImpulse = (
	body: SolverBodyState,
	impulse: Vector,
	contactOffset: Vector,
	sign: number
): void => {
	if (body.invMass <= 0 && body.invInertia <= 0) {
		return;
	}

	body.linearVelocity.add(impulse.toMultiplied(body.invMass * sign));
	body.angularVelocity += body.invInertia * cross(contactOffset, impulse) * sign;
};

const applyPositionImpulse = (
	body: SolverBodyState,
	impulse: Vector,
	contactOffset: Vector,
	sign: number
): void => {
	if (body.invMass <= 0 && body.invInertia <= 0) {
		return;
	}

	body.position.add(impulse.toMultiplied(body.invMass * sign));
	body.angle += body.invInertia * cross(contactOffset, impulse) * sign;
	updateWorldCenter(body);
};

const buildContactConstraints = (
	bodies: ReadonlyMap<string, PhysicsBody>,
	solverBodies: ReadonlyMap<string, SolverBodyState>,
	manifolds: readonly ContactManifold[],
	dt: number,
	options: ContactSolverOptions | undefined
): ContactConstraint[] => {
	const resolvedOptions = resolveContactSolverOptions(options);
	assertPositiveTimeStep(dt);
	const constraints: ContactConstraint[] = [];

	for (const manifold of manifolds) {
		const bodyA = bodies.get(manifold.bodyIdA);
		const bodyB = bodies.get(manifold.bodyIdB);
		const solverBodyA = solverBodies.get(manifold.bodyIdA);
		const solverBodyB = solverBodies.get(manifold.bodyIdB);

		if (!bodyA || !bodyB || !solverBodyA || !solverBodyB) {
			continue;
		}

		const tangent = manifold.normal.toLeftPerpendicular();
		const staticFriction = mixFriction(
			bodyA.staticFriction,
			bodyB.staticFriction
		);
		const dynamicFriction = mixFriction(
			bodyA.dynamicFriction,
			bodyB.dynamicFriction
		);
		const restitution = mixRestitution(bodyA.restitution, bodyB.restitution);

		const points = manifold.points
			.map((point) => {
				const ra = point.position.toSubtracted(solverBodyA.worldCenter);
				const rb = point.position.toSubtracted(solverBodyB.worldCenter);
				const raCrossN = cross(ra, manifold.normal);
				const rbCrossN = cross(rb, manifold.normal);
				const normalMassDenominator =
					solverBodyA.invMass +
					solverBodyB.invMass +
					raCrossN * raCrossN * solverBodyA.invInertia +
					rbCrossN * rbCrossN * solverBodyB.invInertia;

				if (normalMassDenominator <= 0) {
					return null;
				}

				const raCrossT = cross(ra, tangent);
				const rbCrossT = cross(rb, tangent);
				const tangentMassDenominator =
					solverBodyA.invMass +
					solverBodyB.invMass +
					raCrossT * raCrossT * solverBodyA.invInertia +
					rbCrossT * rbCrossT * solverBodyB.invInertia;

				if (tangentMassDenominator <= 0) {
					return null;
				}

				const velocityA = getVelocityAtPoint(solverBodyA, ra);
				const velocityB = getVelocityAtPoint(solverBodyB, rb);
				const normalVelocity = velocityB
					.toSubtracted(velocityA)
					.dotProduct(manifold.normal);
				const velocityBias =
					restitution > 0 &&
						normalVelocity < -resolvedOptions.restitutionThreshold
						? -restitution * normalVelocity
						: 0;

				return {
					id: point.id,
					position: point.position.clone(),
					penetration: point.penetration,
					ra,
					rb,
					normalMass: 1 / normalMassDenominator,
					tangentMass: 1 / tangentMassDenominator,
					velocityBias,
					accumulatedNormalImpulse: 0,
					accumulatedTangentImpulse: 0,
				};
			})
			.filter((point): point is ContactConstraintPoint => point !== null);

		if (points.length === 0) {
			continue;
		}

		constraints.push({
			bodyIdA: manifold.bodyIdA,
			bodyIdB: manifold.bodyIdB,
			shapeIdA: manifold.shapeIdA,
			shapeIdB: manifold.shapeIdB,
			normal: manifold.normal.clone(),
			tangent,
			staticFriction,
			dynamicFriction,
			points,
		});
	}

	return constraints;
};

const solveContactConstraints = (
	solverBodies: Map<string, SolverBodyState>,
	constraints: readonly ContactConstraint[],
	options: ContactSolverOptions | undefined
): void => {
	const resolvedOptions = resolveContactSolverOptions(options);

	for (let iteration = 0; iteration < resolvedOptions.iterations; iteration++) {
		for (const constraint of constraints) {
			const bodyA = solverBodies.get(constraint.bodyIdA);
			const bodyB = solverBodies.get(constraint.bodyIdB);

			if (!bodyA || !bodyB) {
				continue;
			}

			for (const point of constraint.points) {
				const normalVelocity = getVelocityAtPoint(bodyB, point.rb)
					.toSubtracted(getVelocityAtPoint(bodyA, point.ra))
					.dotProduct(constraint.normal);
				const normalImpulseDelta =
					-(normalVelocity - point.velocityBias) * point.normalMass;
				const nextNormalImpulse = Math.max(
					point.accumulatedNormalImpulse + normalImpulseDelta,
					0
				);
				const appliedNormalImpulse =
					nextNormalImpulse - point.accumulatedNormalImpulse;

				point.accumulatedNormalImpulse = nextNormalImpulse;

				if (appliedNormalImpulse !== 0) {
					const normalImpulse = constraint.normal.toMultiplied(
						appliedNormalImpulse
					);
					applyVelocityImpulse(bodyA, normalImpulse, point.ra, -1);
					applyVelocityImpulse(bodyB, normalImpulse, point.rb, 1);
				}

				const tangentVelocity = getVelocityAtPoint(bodyB, point.rb)
					.toSubtracted(getVelocityAtPoint(bodyA, point.ra))
					.dotProduct(constraint.tangent);
				const tangentImpulseDelta = -tangentVelocity * point.tangentMass;
				const tangentCandidate =
					point.accumulatedTangentImpulse + tangentImpulseDelta;
				const maxStaticImpulse =
					constraint.staticFriction * point.accumulatedNormalImpulse;
				const maxDynamicImpulse =
					constraint.dynamicFriction * point.accumulatedNormalImpulse;
				const nextTangentImpulse =
					Math.abs(tangentCandidate) <= maxStaticImpulse
						? tangentCandidate
						: Math.max(
							-maxDynamicImpulse,
							Math.min(tangentCandidate, maxDynamicImpulse)
						);
				const appliedTangentImpulse =
					nextTangentImpulse - point.accumulatedTangentImpulse;

				point.accumulatedTangentImpulse = nextTangentImpulse;

				if (appliedTangentImpulse !== 0) {
					const tangentImpulse = constraint.tangent.toMultiplied(
						appliedTangentImpulse
					);
					applyVelocityImpulse(bodyA, tangentImpulse, point.ra, -1);
					applyVelocityImpulse(bodyB, tangentImpulse, point.rb, 1);
				}
			}
		}
	}
};

const solveContactPositions = (
	solverBodies: Map<string, SolverBodyState>,
	constraints: readonly ContactConstraint[],
	options: ContactSolverOptions | undefined
): void => {
	const resolvedOptions = resolveContactSolverOptions(options);

	// Run a small number of position correction iterations (separate from
	// velocity iterations) — typically 3 vs 10 velocity iterations, matching
	// the Box2D approach to avoid over-correction jitter.
	for (let iteration = 0; iteration < resolvedOptions.positionIterations; iteration++) {
		for (const constraint of constraints) {
			const bodyA = solverBodies.get(constraint.bodyIdA);
			const bodyB = solverBodies.get(constraint.bodyIdB);

			if (!bodyA || !bodyB) {
				continue;
			}

			for (const point of constraint.points) {
				const correction = Math.max(
					point.penetration - resolvedOptions.penetrationSlop,
					0
				);
				if (correction <= 0) {
					continue;
				}

				const impulseMagnitude =
					resolvedOptions.baumgarte * correction * point.normalMass;
				const impulse = constraint.normal.toMultiplied(impulseMagnitude);

				applyPositionImpulse(bodyA, impulse, point.ra, -1);
				applyPositionImpulse(bodyB, impulse, point.rb, 1);
			}
		}
	}
};

const solveContacts = (
	bodies: ReadonlyMap<string, PhysicsBody>,
	manifolds: readonly ContactManifold[],
	dt: number,
	options: ContactSolverOptions | undefined
): void => {
	assertPositiveTimeStep(dt);
	const solverBodies = createSolverBodyMap(bodies);
	const constraints = buildContactConstraints(
		bodies,
		solverBodies,
		manifolds,
		dt,
		options
	);

	solveContactConstraints(solverBodies, constraints, options);
	solveContactPositions(solverBodies, constraints, options);
	writeBackSolverBodies(bodies, solverBodies);
};

export {
	DEFAULT_CONTACT_SOLVER_OPTIONS,
	buildContactConstraints,
	solveContactConstraints,
	solveContactPositions,
	solveContacts,
};

export type {
	ContactConstraint,
	ContactConstraintPoint,
	ContactSolverOptions,
};
