import { Vector } from "../../Lib/Vector";
import type { PhysicsBody } from "../Body";
import type { ContactManifold } from "../Contacts";

type NormalSolverOptions = {
	iterations?: number;
	positionIterations?: number;
	baumgarte?: number;
	penetrationSlop?: number;
};

type SolverBodyState = {
	bodyId: string;
	position: Vector;
	angle: number;
	localCenter: Vector;
	worldCenter: Vector;
	linearVelocity: Vector;
	angularVelocity: number;
	invMass: number;
	invInertia: number;
};

type NormalContactConstraintPoint = {
	id: string;
	position: Vector;
	penetration: number;
	ra: Vector;
	rb: Vector;
	normalMass: number;
	accumulatedImpulse: number;
};

type NormalContactConstraint = {
	bodyIdA: string;
	bodyIdB: string;
	normal: Vector;
	points: NormalContactConstraintPoint[];
};

const DEFAULT_NORMAL_SOLVER_OPTIONS: Required<NormalSolverOptions> = {
	iterations: 10,
	positionIterations: 3,
	baumgarte: 0.2,
	penetrationSlop: 0.005,
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

const resolveNormalSolverOptions = (
	options: NormalSolverOptions | undefined
): Required<NormalSolverOptions> => {
	const iterations =
		options?.iterations ?? DEFAULT_NORMAL_SOLVER_OPTIONS.iterations;
	assertFiniteNumber(iterations, "Solver iterations");
	if (!Number.isInteger(iterations) || iterations <= 0) {
		throw new Error("Solver iterations must be a positive integer.");
	}

	const positionIterations =
		options?.positionIterations ?? DEFAULT_NORMAL_SOLVER_OPTIONS.positionIterations;
	assertFiniteNumber(positionIterations, "Position solver iterations");
	if (!Number.isInteger(positionIterations) || positionIterations <= 0) {
		throw new Error("Position solver iterations must be a positive integer.");
	}

	const baumgarte =
		options?.baumgarte ?? DEFAULT_NORMAL_SOLVER_OPTIONS.baumgarte;
	assertNonNegativeNumber(baumgarte, "Baumgarte factor");

	const penetrationSlop =
		options?.penetrationSlop ?? DEFAULT_NORMAL_SOLVER_OPTIONS.penetrationSlop;
	assertNonNegativeNumber(penetrationSlop, "Penetration slop");

	return {
		iterations,
		positionIterations,
		baumgarte,
		penetrationSlop,
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

const createSolverBodyMap = (
	bodies: ReadonlyMap<string, PhysicsBody>
): Map<string, SolverBodyState> => {
	const solverBodies = new Map<string, SolverBodyState>();

	for (const [bodyId, body] of bodies.entries()) {
		const localCenter = body.localCenter.clone();
		const worldCenter = body.position.toAdded(
			rotateLocalCenter(localCenter, body.angle)
		);

		solverBodies.set(bodyId, {
			bodyId,
			position: body.position.clone(),
			angle: body.angle,
			localCenter,
			worldCenter,
			linearVelocity: body.linearVelocity.clone(),
			angularVelocity: body.angularVelocity,
			invMass: body.invMass,
			invInertia: body.invInertia,
		});
	}

	return solverBodies;
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

const applyImpulse = (
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

const buildNormalContactConstraints = (
	solverBodies: ReadonlyMap<string, SolverBodyState>,
	manifolds: readonly ContactManifold[],
	dt: number,
	options: NormalSolverOptions | undefined
): NormalContactConstraint[] => {
	resolveNormalSolverOptions(options);
	assertPositiveTimeStep(dt);
	const constraints: NormalContactConstraint[] = [];

	for (const manifold of manifolds) {
		const bodyA = solverBodies.get(manifold.bodyIdA);
		const bodyB = solverBodies.get(manifold.bodyIdB);

		if (!bodyA || !bodyB) {
			continue;
		}

		const points = manifold.points
			.map((point) => {
				const ra = point.position.toSubtracted(bodyA.worldCenter);
				const rb = point.position.toSubtracted(bodyB.worldCenter);
				const raCrossN = cross(ra, manifold.normal);
				const rbCrossN = cross(rb, manifold.normal);
				const normalMassDenominator =
					bodyA.invMass +
					bodyB.invMass +
					raCrossN * raCrossN * bodyA.invInertia +
					rbCrossN * rbCrossN * bodyB.invInertia;

				if (normalMassDenominator <= 0) {
					return null;
				}

				return {
					id: point.id,
					position: point.position.clone(),
					penetration: point.penetration,
					ra,
					rb,
					normalMass: 1 / normalMassDenominator,
					accumulatedImpulse: 0,
				};
			})
			.filter((point): point is NormalContactConstraintPoint => point !== null);

		if (points.length === 0) {
			continue;
		}

		constraints.push({
			bodyIdA: manifold.bodyIdA,
			bodyIdB: manifold.bodyIdB,
			normal: manifold.normal.clone(),
			points,
		});
	}

	return constraints;
};

const solveNormalContactConstraints = (
	solverBodies: Map<string, SolverBodyState>,
	constraints: NormalContactConstraint[],
	options: NormalSolverOptions | undefined
): void => {
	const resolvedOptions = resolveNormalSolverOptions(options);

	for (let iteration = 0; iteration < resolvedOptions.iterations; iteration++) {
		for (const constraint of constraints) {
			const bodyA = solverBodies.get(constraint.bodyIdA);
			const bodyB = solverBodies.get(constraint.bodyIdB);

			if (!bodyA || !bodyB) {
				continue;
			}

			for (const point of constraint.points) {
				const velocityA = getVelocityAtPoint(bodyA, point.ra);
				const velocityB = getVelocityAtPoint(bodyB, point.rb);
				const relativeVelocity = velocityB.toSubtracted(velocityA);
				const normalVelocity = relativeVelocity.dotProduct(constraint.normal);
				const impulseDelta = -normalVelocity * point.normalMass;
				const nextAccumulatedImpulse = Math.max(
					point.accumulatedImpulse + impulseDelta,
					0
				);
				const appliedImpulse =
					nextAccumulatedImpulse - point.accumulatedImpulse;

				if (appliedImpulse <= 0) {
					continue;
				}

				point.accumulatedImpulse = nextAccumulatedImpulse;
				const impulse = constraint.normal.toMultiplied(appliedImpulse);
				applyImpulse(bodyA, impulse, point.ra, -1);
				applyImpulse(bodyB, impulse, point.rb, 1);
			}
		}
	}
};

const solveNormalContactPositions = (
	solverBodies: Map<string, SolverBodyState>,
	constraints: readonly NormalContactConstraint[],
	options: NormalSolverOptions | undefined
): void => {
	const resolvedOptions = resolveNormalSolverOptions(options);

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

const writeBackSolverBodies = (
	bodies: ReadonlyMap<string, PhysicsBody>,
	solverBodies: ReadonlyMap<string, SolverBodyState>
): void => {
	for (const [bodyId, body] of bodies.entries()) {
		const solverBody = solverBodies.get(bodyId);

		if (!solverBody) {
			continue;
		}

		body.position = solverBody.position.clone();
		body.angle = solverBody.angle;
		body.linearVelocity = solverBody.linearVelocity.clone();
		body.angularVelocity = solverBody.angularVelocity;
	}
};

const solveNormalContacts = (
	bodies: ReadonlyMap<string, PhysicsBody>,
	manifolds: readonly ContactManifold[],
	dt: number,
	options: NormalSolverOptions | undefined
): void => {
	assertPositiveTimeStep(dt);
	const solverBodies = createSolverBodyMap(bodies);
	const constraints = buildNormalContactConstraints(
		solverBodies,
		manifolds,
		dt,
		options
	);

	solveNormalContactConstraints(solverBodies, constraints, options);
	solveNormalContactPositions(solverBodies, constraints, options);
	writeBackSolverBodies(bodies, solverBodies);
};

export {
	DEFAULT_NORMAL_SOLVER_OPTIONS,
	buildNormalContactConstraints,
	createSolverBodyMap,
	solveNormalContactConstraints,
	solveNormalContactPositions,
	solveNormalContacts,
	writeBackSolverBodies,
};

export type {
	NormalContactConstraint,
	NormalContactConstraintPoint,
	NormalSolverOptions,
	SolverBodyState,
};
