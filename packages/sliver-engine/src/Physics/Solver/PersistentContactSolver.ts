import { Vector } from "../../Lib/Vector";
import type { PhysicsBody } from "../Body";
import type { ContactManifold } from "../Contacts";
import type {
	ContactConstraint,
	ContactConstraintPoint,
	ContactSolverOptions,
} from "./ContactSolver";
import {
	DEFAULT_CONTACT_SOLVER_OPTIONS,
	buildContactConstraints,
	solveContactConstraints,
	solveContactPositions,
} from "./ContactSolver";
import type { SolverBodyState } from "./NormalContactSolver";
import {
	createSolverBodyMap,
	writeBackSolverBodies,
} from "./NormalContactSolver";

type CachedContactImpulse = {
	normalImpulse: number;
	tangentImpulse: number;
};

type PersistentContactSolverState = {
	contactImpulses: Map<string, CachedContactImpulse>;
};

type PersistentContactSolverOptions = ContactSolverOptions & {
	enableWarmStarting?: boolean;
	warmStartScale?: number;
	linearSleepTolerance?: number;
	angularSleepTolerance?: number;
	timeToSleep?: number;
};

const DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS: Required<PersistentContactSolverOptions> =
{
	...DEFAULT_CONTACT_SOLVER_OPTIONS,
	enableWarmStarting: true,
	warmStartScale: 1,
	linearSleepTolerance: 0.05,
	angularSleepTolerance: 0.05,
	timeToSleep: 0.5,
};

const EXTERNAL_WAKE_EPSILON = 1e-8;

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

const resolvePersistentContactSolverOptions = (
	options: PersistentContactSolverOptions | undefined
): Required<PersistentContactSolverOptions> => {
	const iterations =
		options?.iterations ?? DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS.iterations;
	assertFiniteNumber(iterations, "Solver iterations");
	if (!Number.isInteger(iterations) || iterations <= 0) {
		throw new Error("Solver iterations must be a positive integer.");
	}

	const positionIterations =
		options?.positionIterations ?? DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS.positionIterations;
	assertFiniteNumber(positionIterations, "Position solver iterations");
	if (!Number.isInteger(positionIterations) || positionIterations <= 0) {
		throw new Error("Position solver iterations must be a positive integer.");
	}

	const baumgarte =
		options?.baumgarte ?? DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS.baumgarte;
	assertNonNegativeNumber(baumgarte, "Baumgarte factor");

	const penetrationSlop =
		options?.penetrationSlop ??
		DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS.penetrationSlop;
	assertNonNegativeNumber(penetrationSlop, "Penetration slop");

	const restitutionThreshold =
		options?.restitutionThreshold ??
		DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS.restitutionThreshold;
	assertNonNegativeNumber(restitutionThreshold, "Restitution threshold");

	const warmStartScale =
		options?.warmStartScale ??
		DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS.warmStartScale;
	assertNonNegativeNumber(warmStartScale, "Warm-start scale");

	const linearSleepTolerance =
		options?.linearSleepTolerance ??
		DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS.linearSleepTolerance;
	assertNonNegativeNumber(linearSleepTolerance, "Linear sleep tolerance");

	const angularSleepTolerance =
		options?.angularSleepTolerance ??
		DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS.angularSleepTolerance;
	assertNonNegativeNumber(angularSleepTolerance, "Angular sleep tolerance");

	const timeToSleep =
		options?.timeToSleep ??
		DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS.timeToSleep;
	assertNonNegativeNumber(timeToSleep, "Time to sleep");

	return {
		iterations,
		positionIterations,
		baumgarte,
		penetrationSlop,
		restitutionThreshold,
		enableWarmStarting:
			options?.enableWarmStarting ??
			DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS.enableWarmStarting,
		warmStartScale,
		linearSleepTolerance,
		angularSleepTolerance,
		timeToSleep,
	};
};

const cross = (a: Vector, b: Vector): number => {
	return a.crossProduct(b);
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

const createPersistentContactSolverState = (): PersistentContactSolverState => {
	return {
		contactImpulses: new Map<string, CachedContactImpulse>(),
	};
};

const createContactCacheKey = (
	constraint: Pick<ContactConstraint, "bodyIdA" | "bodyIdB" | "shapeIdA" | "shapeIdB">,
	point: Pick<ContactConstraintPoint, "id">
): string => {
	return JSON.stringify([
		constraint.bodyIdA,
		constraint.shapeIdA,
		constraint.bodyIdB,
		constraint.shapeIdB,
		point.id,
	]);
};

const buildPersistentContactConstraints = (
	state: PersistentContactSolverState,
	bodies: ReadonlyMap<string, PhysicsBody>,
	solverBodies: ReadonlyMap<string, SolverBodyState>,
	manifolds: readonly ContactManifold[],
	dt: number,
	options: PersistentContactSolverOptions | undefined
): ContactConstraint[] => {
	const resolvedOptions = resolvePersistentContactSolverOptions(options);
	const constraints = buildContactConstraints(
		bodies,
		solverBodies,
		manifolds,
		dt,
		resolvedOptions
	);

	if (!resolvedOptions.enableWarmStarting) {
		return constraints;
	}

	for (const constraint of constraints) {
		for (const point of constraint.points) {
			const cachedImpulse = state.contactImpulses.get(
				createContactCacheKey(constraint, point)
			);

			if (!cachedImpulse) {
				continue;
			}

			point.accumulatedNormalImpulse =
				cachedImpulse.normalImpulse * resolvedOptions.warmStartScale;
			point.accumulatedTangentImpulse =
				cachedImpulse.tangentImpulse * resolvedOptions.warmStartScale;
		}
	}

	return constraints;
};

const warmStartContactConstraints = (
	solverBodies: Map<string, SolverBodyState>,
	constraints: readonly ContactConstraint[]
): void => {
	for (const constraint of constraints) {
		const bodyA = solverBodies.get(constraint.bodyIdA);
		const bodyB = solverBodies.get(constraint.bodyIdB);

		if (!bodyA || !bodyB) {
			continue;
		}

		for (const point of constraint.points) {
			if (
				point.accumulatedNormalImpulse === 0 &&
				point.accumulatedTangentImpulse === 0
			) {
				continue;
			}

			const totalImpulse = constraint.normal
				.toMultiplied(point.accumulatedNormalImpulse)
				.toAdded(
					constraint.tangent.toMultiplied(point.accumulatedTangentImpulse)
				);

			applyVelocityImpulse(bodyA, totalImpulse, point.ra, -1);
			applyVelocityImpulse(bodyB, totalImpulse, point.rb, 1);
		}
	}
};

const cacheSolvedContactImpulses = (
	state: PersistentContactSolverState,
	constraints: readonly ContactConstraint[]
): void => {
	const nextContactImpulses = new Map<string, CachedContactImpulse>();

	for (const constraint of constraints) {
		for (const point of constraint.points) {
			if (
				point.accumulatedNormalImpulse === 0 &&
				point.accumulatedTangentImpulse === 0
			) {
				continue;
			}

			nextContactImpulses.set(createContactCacheKey(constraint, point), {
				normalImpulse: point.accumulatedNormalImpulse,
				tangentImpulse: point.accumulatedTangentImpulse,
			});
		}
	}

	state.contactImpulses = nextContactImpulses;
};

const wakeBody = (body: PhysicsBody): void => {
	if (body.bodyType !== "dynamic") {
		return;
	}

	body.sleep.isSleeping = false;
	body.sleep.sleepTime = 0;
};

const wakeBodiesForExternalMotion = (
	bodies: ReadonlyMap<string, PhysicsBody>
): void => {
	for (const body of bodies.values()) {
		if (body.bodyType !== "dynamic" || !body.sleep.isSleeping) {
			continue;
		}

		if (
			body.force.squaredMagnitude() >
			EXTERNAL_WAKE_EPSILON * EXTERNAL_WAKE_EPSILON ||
			Math.abs(body.torque) > EXTERNAL_WAKE_EPSILON ||
			body.linearVelocity.squaredMagnitude() >
			EXTERNAL_WAKE_EPSILON * EXTERNAL_WAKE_EPSILON ||
			Math.abs(body.angularVelocity) > EXTERNAL_WAKE_EPSILON
		) {
			wakeBody(body);
		}
	}
};

const wakeBodiesFromManifolds = (
	bodies: ReadonlyMap<string, PhysicsBody>,
	manifolds: readonly Pick<ContactManifold, "bodyIdA" | "bodyIdB">[]
): void => {
	const adjacency = new Map<string, Set<string>>();

	for (const manifold of manifolds) {
		if (!adjacency.has(manifold.bodyIdA)) {
			adjacency.set(manifold.bodyIdA, new Set<string>());
		}
		if (!adjacency.has(manifold.bodyIdB)) {
			adjacency.set(manifold.bodyIdB, new Set<string>());
		}

		adjacency.get(manifold.bodyIdA)!.add(manifold.bodyIdB);
		adjacency.get(manifold.bodyIdB)!.add(manifold.bodyIdA);
	}

	const queue: string[] = [];
	const visited = new Set<string>();

	for (const [bodyId, body] of bodies.entries()) {
		if (
			body.bodyType === "kinematic" ||
			(body.bodyType === "dynamic" && !body.sleep.isSleeping)
		) {
			queue.push(bodyId);
			visited.add(bodyId);
		}
	}

	while (queue.length > 0) {
		const bodyId = queue.shift()!;
		const neighbors = adjacency.get(bodyId);

		if (!neighbors) {
			continue;
		}

		for (const neighborId of neighbors) {
			if (visited.has(neighborId)) {
				continue;
			}

			visited.add(neighborId);
			const neighbor = bodies.get(neighborId);
			if (!neighbor || neighbor.bodyType === "static") {
				continue;
			}

			if (neighbor.bodyType === "dynamic" && neighbor.sleep.isSleeping) {
				wakeBody(neighbor);
			}

			queue.push(neighborId);
		}
	}
};

const freezeSleepingSolverBodies = (
	bodies: ReadonlyMap<string, PhysicsBody>,
	solverBodies: Map<string, SolverBodyState>
): void => {
	for (const [bodyId, body] of bodies.entries()) {
		if (body.bodyType !== "dynamic" || !body.sleep.isSleeping) {
			continue;
		}

		const solverBody = solverBodies.get(bodyId);
		if (!solverBody) {
			continue;
		}

		solverBody.linearVelocity = Vector.zero();
		solverBody.angularVelocity = 0;
		solverBody.invMass = 0;
		solverBody.invInertia = 0;
	}
};

const updateBodySleepStates = (
	bodies: ReadonlyMap<string, PhysicsBody>,
	dt: number,
	options: PersistentContactSolverOptions | undefined
): void => {
	const resolvedOptions = resolvePersistentContactSolverOptions(options);
	const linearSleepToleranceSquared =
		resolvedOptions.linearSleepTolerance *
		resolvedOptions.linearSleepTolerance;

	for (const body of bodies.values()) {
		if (body.bodyType !== "dynamic" || !body.sleep.canSleep) {
			body.sleep.isSleeping = false;
			body.sleep.sleepTime = 0;
			continue;
		}

		if (body.sleep.isSleeping) {
			body.sleep.sleepTime = resolvedOptions.timeToSleep;
			body.linearVelocity = Vector.zero();
			body.angularVelocity = 0;
			continue;
		}

		const isSlowEnough =
			body.linearVelocity.squaredMagnitude() <= linearSleepToleranceSquared &&
			Math.abs(body.angularVelocity) <= resolvedOptions.angularSleepTolerance;

		if (!isSlowEnough) {
			body.sleep.isSleeping = false;
			body.sleep.sleepTime = 0;
			continue;
		}

		body.sleep.sleepTime += dt;
		if (body.sleep.sleepTime < resolvedOptions.timeToSleep) {
			continue;
		}

		body.sleep.isSleeping = true;
		body.sleep.sleepTime = resolvedOptions.timeToSleep;
		body.linearVelocity = Vector.zero();
		body.angularVelocity = 0;
	}
};

const stepPersistentContacts = (
	state: PersistentContactSolverState,
	bodies: ReadonlyMap<string, PhysicsBody>,
	manifolds: readonly ContactManifold[],
	dt: number,
	options: PersistentContactSolverOptions | undefined
): void => {
	const resolvedOptions = resolvePersistentContactSolverOptions(options);
	assertPositiveTimeStep(dt);

	wakeBodiesForExternalMotion(bodies);
	wakeBodiesFromManifolds(bodies, manifolds);

	if (manifolds.length === 0) {
		state.contactImpulses.clear();
		updateBodySleepStates(bodies, dt, resolvedOptions);
		return;
	}

	const solverBodies = createSolverBodyMap(bodies);
	freezeSleepingSolverBodies(bodies, solverBodies);

	const constraints = buildPersistentContactConstraints(
		state,
		bodies,
		solverBodies,
		manifolds,
		dt,
		resolvedOptions
	);

	if (resolvedOptions.enableWarmStarting) {
		warmStartContactConstraints(solverBodies, constraints);
	}

	solveContactConstraints(solverBodies, constraints, resolvedOptions);
	solveContactPositions(solverBodies, constraints, resolvedOptions);
	writeBackSolverBodies(bodies, solverBodies);
	cacheSolvedContactImpulses(state, constraints);
	updateBodySleepStates(bodies, dt, resolvedOptions);
};

export {
	DEFAULT_PERSISTENT_CONTACT_SOLVER_OPTIONS,
	buildPersistentContactConstraints,
	cacheSolvedContactImpulses,
	createPersistentContactSolverState,
	stepPersistentContacts,
	updateBodySleepStates,
	wakeBodiesForExternalMotion,
	wakeBodiesFromManifolds,
	wakeBody,
	warmStartContactConstraints,
};

export type {
	CachedContactImpulse,
	PersistentContactSolverOptions,
	PersistentContactSolverState,
};
