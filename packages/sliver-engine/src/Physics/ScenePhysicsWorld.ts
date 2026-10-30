import type { GameObject } from "../GameObject";
import type { Hitbox } from "../GameObject/Hitboxes";
import { Vector } from "../Lib/Vector";
import { PhysicsBody } from "./Body";
import {
	computeCircleMassProperties,
	computeCompoundMassProperties,
	computePolygonMassProperties,
	type MassProperties,
} from "./MassProperties";
import {
	createGameplayCollisionParticipantsFromGameObject,
	createPhysicsShapeFromHitbox,
	stepGameplayCollisions,
	type GameplayCollisionParticipant,
	type GameplayCollisionStepResult,
} from "./Gameplay";
import { integrateBody } from "./Integration";
import {
	createPersistentContactSolverState,
	type PersistentContactSolverOptions,
	type PersistentContactSolverState,
} from "./Solver";
import { CircleShape } from "./Shapes";

const DEFAULT_SCENE_TICK_RATE = 60;
const DEFAULT_DYNAMIC_MASS = 1;
const DEFAULT_INERTIA_SCALE = 1;
const WAKE_EPSILON = 1e-8;

const EMPTY_GAMEPLAY_COLLISION_STEP_RESULT: GameplayCollisionStepResult = {
	candidatePairs: [],
	overlapManifolds: [],
	sensorManifolds: [],
	solidManifolds: [],
	notifiedPairIds: [],
	suppressedPairIds: [],
};

const resolveSceneTimeStep = (tickRate: number | undefined): number => {
	if (!Number.isFinite(tickRate) || !tickRate || tickRate <= 0) {
		return 1 / DEFAULT_SCENE_TICK_RATE;
	}

	return 1 / tickRate;
};

const resolveLegacyMass = (gameObject: GameObject): number => {
	const requestedMass = gameObject.phisics.mass ?? DEFAULT_DYNAMIC_MASS;

	if (!Number.isFinite(requestedMass) || requestedMass <= 0) {
		return DEFAULT_DYNAMIC_MASS;
	}

	return requestedMass;
};

const scaleMassProperties = (
	massProperties: MassProperties,
	targetMass: number,
	inertiaScale: number = DEFAULT_INERTIA_SCALE
): MassProperties => {
	if (!Number.isFinite(targetMass) || targetMass <= 0) {
		throw new Error("Target mass must be a finite positive number.");
	}
	if (!Number.isFinite(inertiaScale) || inertiaScale <= 0) {
		throw new Error("Inertia scale must be a finite positive number.");
	}

	const massScale = targetMass / massProperties.mass;
	const scaledInertia = massProperties.inertia * massScale * inertiaScale;

	return {
		area: massProperties.area,
		mass: targetMass,
		invMass: 1 / targetMass,
		centroid: massProperties.centroid.clone(),
		inertia: scaledInertia,
		invInertia: scaledInertia > 0 ? 1 / scaledInertia : 0,
	};
};

const resolveInertiaScale = (gameObject: GameObject): number => {
	const requestedInertiaScale =
		gameObject.phisics.inertiaScale ?? DEFAULT_INERTIA_SCALE;

	if (!Number.isFinite(requestedInertiaScale) || requestedInertiaScale <= 0) {
		return DEFAULT_INERTIA_SCALE;
	}

	return requestedInertiaScale;
};

const resolveStaticFriction = (gameObject: GameObject): number => {
	return gameObject.phisics.staticFriction ?? gameObject.phisics.friction ?? 0;
};

const resolveDynamicFriction = (gameObject: GameObject): number => {
	return gameObject.phisics.dynamicFriction ?? gameObject.phisics.friction ?? 0;
};

const computeMassPropertiesFromHitbox = (hitbox: Hitbox): MassProperties => {
	const shape = createPhysicsShapeFromHitbox(hitbox);

	if (shape instanceof CircleShape) {
		return computeCircleMassProperties(shape, 1);
	}

	return computePolygonMassProperties(shape, 1);
};

const computeLocalRotationOffset = (gameObject: GameObject): Vector => {
	// The renderer rotates around getRotationCenter() (the bounding-box center of
	// all hitboxes). We store body.position at that same pivot so physics and visual
	// rotation share one anchor point.
	return gameObject.getRotationCenter().toSubtracted(gameObject.getPosition());
};

const computeMassPropertiesFromGameObject = (
	gameObject: GameObject
): MassProperties => {
	const hitboxes = gameObject.getHitboxes();
	const requestedMass = resolveLegacyMass(gameObject);
	const inertiaScale = resolveInertiaScale(gameObject);

	if (hitboxes.length === 0) {
		const inertia = requestedMass * inertiaScale;
		return {
			area: 1,
			mass: requestedMass,
			invMass: 1 / requestedMass,
			centroid: Vector.zero(),
			inertia,
			invInertia: 1 / inertia,
		};
	}

	const contributions = hitboxes.map((hitbox) =>
		computeMassPropertiesFromHitbox(hitbox)
	);
	const combinedMassProperties =
		contributions.length === 1
			? contributions[0]!
			: computeCompoundMassProperties(contributions);

	return scaleMassProperties(
		combinedMassProperties,
		requestedMass,
		inertiaScale
	);
};

const shouldWakeForTransformChange = (
	body: PhysicsBody,
	gameObject: GameObject
): boolean => {
	if (body.bodyType !== "dynamic") {
		return false;
	}

	// body.position is the rotation-center pivot, so compare against that same point.
	const localRotationOffset = computeLocalRotationOffset(gameObject);
	const nextPosition = gameObject.getScenePosition().toAdded(localRotationOffset);
	return (
		body.position.toSubtracted(nextPosition).squaredMagnitude() >
		WAKE_EPSILON * WAKE_EPSILON ||
		Math.abs(body.angle - gameObject.rotation) > WAKE_EPSILON ||
		body.linearVelocity.toSubtracted(gameObject.speed).squaredMagnitude() >
		WAKE_EPSILON * WAKE_EPSILON ||
		Math.abs(body.angularVelocity - gameObject.angularVelocity) > WAKE_EPSILON
	);
};

const syncBodyFromGameObject = (
	body: PhysicsBody,
	gameObject: GameObject
): void => {
	if (shouldWakeForTransformChange(body, gameObject)) {
		body.sleep.isSleeping = false;
		body.sleep.sleepTime = 0;
	}

	body.setBodyType(gameObject.phisics.immovable ? "static" : "dynamic");
	body.setMassProperties(computeMassPropertiesFromGameObject(gameObject));

	// body.position is the rotation pivot (bounding-box center) so that physics
	// rotation and visual rotation share the same anchor point.
	const localRotationOffset = computeLocalRotationOffset(gameObject);
	body.position = gameObject.getScenePosition().toAdded(localRotationOffset);
	body.angle = gameObject.rotation;
	body.linearVelocity = gameObject.speed.clone();
	body.angularVelocity = gameObject.angularVelocity;
	body.staticFriction = resolveStaticFriction(gameObject);
	body.dynamicFriction = resolveDynamicFriction(gameObject);
	body.restitution = gameObject.phisics.restitution ?? 1;
};

const syncGameObjectFromBody = (
	gameObject: GameObject,
	body: PhysicsBody
): void => {
	const motherShip = gameObject.getMotherShip<GameObject>();

	// body.position is the rotation pivot; subtract the offset to get the
	// gameObject's top-left origin position.
	const localRotationOffset = computeLocalRotationOffset(gameObject);
	const worldPosition = body.position.toSubtracted(localRotationOffset);

	if (gameObject.isPositionRelativeToMotherShip() && motherShip) {
		gameObject.setPosition(worldPosition.toSubtracted(motherShip.getScenePosition()));
	} else {
		gameObject.setPosition(worldPosition);
	}

	gameObject.rotation = body.angle;
	gameObject.speed = body.linearVelocity.clone();
	gameObject.angularVelocity = body.angularVelocity;
};

class ScenePhysicsWorld {
	private bodies = new Map<string, PhysicsBody>();
	private state: PersistentContactSolverState =
		createPersistentContactSolverState();
	private lastStepResult: GameplayCollisionStepResult =
		EMPTY_GAMEPLAY_COLLISION_STEP_RESULT;

	getBody(gameObject: GameObject): PhysicsBody | undefined {
		return this.bodies.get(gameObject.id);
	}

	getLastStepResult(): GameplayCollisionStepResult {
		return this.lastStepResult;
	}

	reset(): void {
		this.bodies.clear();
		this.state = createPersistentContactSolverState();
		this.lastStepResult = EMPTY_GAMEPLAY_COLLISION_STEP_RESULT;
	}

	step(
		gameObjects: readonly GameObject[],
		gravity: Vector,
		dt: number,
		options?: PersistentContactSolverOptions
	): GameplayCollisionStepResult {
		const currentBodyIds = new Set(gameObjects.map((gameObject) => gameObject.id));
		for (const bodyId of this.bodies.keys()) {
			if (!currentBodyIds.has(bodyId)) {
				this.bodies.delete(bodyId);
			}
		}

		const activeParticipants: GameplayCollisionParticipant[] = [];
		const activeObjects: Array<{ gameObject: GameObject; body: PhysicsBody }> = [];

		for (const gameObject of gameObjects) {
			let body = this.bodies.get(gameObject.id);
			if (!body) {
				body = new PhysicsBody({
					bodyType: gameObject.phisics.immovable ? "static" : "dynamic",
					position: gameObject.getScenePosition(),
					angle: gameObject.rotation,
					linearVelocity: gameObject.speed,
					angularVelocity: gameObject.angularVelocity,
					staticFriction: resolveStaticFriction(gameObject),
					dynamicFriction: resolveDynamicFriction(gameObject),
					restitution: gameObject.phisics.restitution ?? 1,
					massProperties: computeMassPropertiesFromGameObject(gameObject),
				});
				this.bodies.set(gameObject.id, body);
			}

			syncBodyFromGameObject(body, gameObject);

			if (!gameObject.isActive()) {
				continue;
			}

			activeObjects.push({ gameObject, body });
			activeParticipants.push(
				...createGameplayCollisionParticipantsFromGameObject(gameObject, body, {
					bodyId: gameObject.id,
				})
			);
		}

		for (const { gameObject, body } of activeObjects) {
			integrateBody(
				body,
				gameObject.phisics.affectedByGravity && !gameObject.beingGrabbed
					? gravity
					: Vector.zero(),
				dt
			);
		}

		const stepResult = stepGameplayCollisions(
			this.state,
			activeParticipants,
			dt,
			options
		);

		for (const { gameObject, body } of activeObjects) {
			syncGameObjectFromBody(gameObject, body);
		}

		this.lastStepResult = stepResult;
		return stepResult;
	}
}

export {
	DEFAULT_SCENE_TICK_RATE,
	ScenePhysicsWorld,
	resolveSceneTimeStep,
};
