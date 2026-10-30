import type { GameObject } from "../../GameObject";
import {
	CircleHitbox,
	SquareHitbox,
	type Hitbox,
} from "../../GameObject/Hitboxes";
import type { PhysicsBody } from "../Body";
import {
	NaiveBroadPhase,
	createBroadPhaseProxy,
	type BroadPhaseFilter,
	type BroadPhasePair,
	type PhysicsShape,
} from "../BroadPhase";
import {
	createContactProxy,
	generateContactManifold,
	type ContactManifold,
} from "../Contacts";
import {
	stepPersistentContacts,
	type PersistentContactSolverOptions,
	type PersistentContactSolverState,
} from "../Solver";
import { CircleShape, ConvexPolygonShape } from "../Shapes";
import { Vector } from "../../Lib/Vector";

type GameplayCollisionParticipant = {
	proxyId: string;
	bodyId: string;
	shapeId: string;
	gameObject: GameObject;
	body: PhysicsBody;
	shape: PhysicsShape;
	solid: boolean;
	filter: BroadPhaseFilter;
};

type GameplayHitboxBindingOptions = {
	body: PhysicsBody;
	proxyId: string;
	shapeId: string;
	bodyId?: string;
	filter?: Partial<BroadPhaseFilter>;
};

type GameplayGameObjectBindingOptions = {
	bodyId?: string;
	proxyIdPrefix?: string;
	shapeIdPrefix?: string;
	filter?: Partial<BroadPhaseFilter>;
};

type GameplayCollisionStepResult = {
	candidatePairs: BroadPhasePair[];
	overlapManifolds: ContactManifold[];
	sensorManifolds: ContactManifold[];
	solidManifolds: ContactManifold[];
	notifiedPairIds: string[];
	suppressedPairIds: string[];
};

const resolveFilter = (
	body: PhysicsBody,
	filter: Partial<BroadPhaseFilter> | undefined
): BroadPhaseFilter => {
	return {
		category: (filter?.category ?? body.filter.category) >>> 0,
		mask: (filter?.mask ?? body.filter.mask) >>> 0,
	};
};

const computeHitboxLocalRotationOffset = (hitbox: Hitbox): Vector => {
	// body.position is the renderer's rotation pivot (bounding-box center of all
	// hitboxes on the game object). Local shape vertices must be expressed relative
	// to that same pivot so that physics rotation matches visual rotation.
	return hitbox.gameObject
		.getRotationCenter()
		.toSubtracted(hitbox.gameObject.getPosition());
};

const createPhysicsShapeFromHitbox = (hitbox: Hitbox): PhysicsShape => {
	// Shift all local coordinates so they are relative to the rotation pivot,
	// which is where body.position will be placed by ScenePhysicsWorld.
	const localRotationOffset = computeHitboxLocalRotationOffset(hitbox);

	if (hitbox instanceof CircleHitbox) {
		return new CircleShape(
			hitbox.offset.toSubtracted(localRotationOffset),
			hitbox.radius
		);
	}

	if (hitbox instanceof SquareHitbox) {
		const localCenter = hitbox.offset
			.toAdded(hitbox.size.toMultiplied(0.5))
			.toSubtracted(localRotationOffset);
		return ConvexPolygonShape.fromRectangle(hitbox.size.clone(), localCenter);
	}

	throw new Error("Unsupported hitbox type.");
};

const createGameplayCollisionParticipantFromHitbox = (
	hitbox: Hitbox,
	options: GameplayHitboxBindingOptions
): GameplayCollisionParticipant => {
	return {
		proxyId: options.proxyId,
		bodyId: options.bodyId ?? hitbox.gameObject.id,
		shapeId: options.shapeId,
		gameObject: hitbox.gameObject,
		body: options.body,
		shape: createPhysicsShapeFromHitbox(hitbox),
		solid: hitbox.solid,
		filter: resolveFilter(options.body, options.filter),
	};
};

const createGameplayCollisionParticipantsFromGameObject = (
	gameObject: GameObject,
	body: PhysicsBody,
	options: GameplayGameObjectBindingOptions = {}
): GameplayCollisionParticipant[] => {
	const bodyId = options.bodyId ?? gameObject.id;
	const proxyIdPrefix = options.proxyIdPrefix ?? `${bodyId}:hitbox`;
	const shapeIdPrefix = options.shapeIdPrefix ?? "hitbox";

	return gameObject.getHitboxes().map((hitbox, index) =>
		createGameplayCollisionParticipantFromHitbox(hitbox, {
			body,
			bodyId,
			proxyId: `${proxyIdPrefix}-${index}`,
			shapeId: `${shapeIdPrefix}-${index}`,
			filter: options.filter,
		})
	);
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

const createPairKey = (gameObjectA: GameObject, gameObjectB: GameObject): string => {
	return gameObjectA.id <= gameObjectB.id
		? `${gameObjectA.id}|${gameObjectB.id}`
		: `${gameObjectB.id}|${gameObjectA.id}`;
};

const createPenetrationVector = (manifold: ContactManifold): Vector => {
	return manifold.normal.toMultiplied(manifold.penetration);
};

const stepGameplayCollisions = (
	state: PersistentContactSolverState,
	participants: readonly GameplayCollisionParticipant[],
	dt: number,
	options: PersistentContactSolverOptions | undefined
): GameplayCollisionStepResult => {
	const broadPhase = new NaiveBroadPhase();
	const participantByProxyId = new Map<string, GameplayCollisionParticipant>();
	const proxies = participants.map((participant) => {
		participantByProxyId.set(participant.proxyId, participant);

		return createBroadPhaseProxy({
			proxyId: participant.proxyId,
			bodyId: participant.bodyId,
			shapeId: participant.shapeId,
			shape: participant.shape,
			transform: {
				position: participant.body.position,
				angle: participant.body.angle,
			},
			filter: participant.filter,
			isSensor: !participant.solid,
		});
	});

	broadPhase.updateProxies(proxies);

	const candidatePairs = broadPhase.getCandidatePairs();
	const overlapManifolds: ContactManifold[] = [];
	const sensorManifolds: ContactManifold[] = [];
	const solidManifolds: ContactManifold[] = [];
	const allowedPairs = new Map<string, boolean>();
	const notifiedPairs = new Set<string>();
	const suppressedPairs = new Set<string>();

	for (const pair of candidatePairs) {
		const participantA = participantByProxyId.get(pair.proxyA.proxyId);
		const participantB = participantByProxyId.get(pair.proxyB.proxyId);

		if (!participantA || !participantB) {
			continue;
		}

		const manifold = generateContactManifold(
			createContactProxy({
				bodyId: participantA.bodyId,
				shapeId: participantA.shapeId,
				shape: participantA.shape,
				transform: {
					position: participantA.body.position,
					angle: participantA.body.angle,
				},
			}),
			createContactProxy({
				bodyId: participantB.bodyId,
				shapeId: participantB.shapeId,
				shape: participantB.shape,
				transform: {
					position: participantB.body.position,
					angle: participantB.body.angle,
				},
			})
		);

		if (!manifold) {
			continue;
		}

		overlapManifolds.push(manifold);

		const pairKey = createPairKey(
			participantA.gameObject,
			participantB.gameObject
		);
		let isAllowed = allowedPairs.get(pairKey);

		if (isAllowed === undefined) {
			isAllowed =
				participantA.gameObject.beforeColision(participantB.gameObject) &&
				participantB.gameObject.beforeColision(participantA.gameObject);
			allowedPairs.set(pairKey, isAllowed);
		}

		if (!isAllowed) {
			suppressedPairs.add(pairKey);
			continue;
		}

		if (!notifiedPairs.has(pairKey)) {
			notifiedPairs.add(pairKey);
			const penetration = createPenetrationVector(manifold);
			participantA.gameObject.onColision(participantB.gameObject, penetration);
			participantB.gameObject.onColision(
				participantA.gameObject,
				penetration.toMultiplied(-1)
			);
		}

		if (participantA.solid && participantB.solid) {
			solidManifolds.push(manifold);
			continue;
		}

		sensorManifolds.push(manifold);
	}

	stepPersistentContacts(
		state,
		collectBodies(participants),
		solidManifolds,
		dt,
		options
	);

	return {
		candidatePairs,
		overlapManifolds,
		sensorManifolds,
		solidManifolds,
		notifiedPairIds: Array.from(notifiedPairs),
		suppressedPairIds: Array.from(suppressedPairs),
	};
};

export {
	createGameplayCollisionParticipantFromHitbox,
	createGameplayCollisionParticipantsFromGameObject,
	createPhysicsShapeFromHitbox,
	stepGameplayCollisions,
};

export type {
	GameplayCollisionParticipant,
	GameplayCollisionStepResult,
	GameplayGameObjectBindingOptions,
	GameplayHitboxBindingOptions,
};
