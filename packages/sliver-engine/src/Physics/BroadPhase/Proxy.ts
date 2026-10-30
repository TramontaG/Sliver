import { Vector } from "../../Lib/Vector";
import { CircleShape, ConvexPolygonShape } from "../Shapes";
import type { Aabb, PhysicsTransform } from "../Shapes";

type PhysicsShape = CircleShape | ConvexPolygonShape;

type BroadPhaseFilter = {
	category: number;
	mask: number;
};

type BroadPhaseProxy = {
	proxyId: string;
	bodyId: string;
	shapeId: string;
	aabb: Aabb;
	filter: BroadPhaseFilter;
	isSensor: boolean;
};

type BroadPhaseProxyOptions = {
	proxyId: string;
	bodyId: string;
	shapeId: string;
	shape: PhysicsShape;
	transform: PhysicsTransform;
	filter?: Partial<BroadPhaseFilter>;
	isSensor?: boolean;
};

type BroadPhasePair = {
	proxyA: BroadPhaseProxy;
	proxyB: BroadPhaseProxy;
};

const DEFAULT_BROAD_PHASE_FILTER: BroadPhaseFilter = {
	category: 0xffffffff,
	mask: 0xffffffff,
};

const resolveBroadPhaseFilter = (
	filter?: Partial<BroadPhaseFilter>
): BroadPhaseFilter => {
	return {
		category: (filter?.category ?? DEFAULT_BROAD_PHASE_FILTER.category) >>> 0,
		mask: (filter?.mask ?? DEFAULT_BROAD_PHASE_FILTER.mask) >>> 0,
	};
};

const cloneAabb = (aabb: Aabb): Aabb => {
	return {
		min: aabb.min.clone(),
		max: aabb.max.clone(),
	};
};

const cloneBroadPhaseProxy = (proxy: BroadPhaseProxy): BroadPhaseProxy => {
	return {
		proxyId: proxy.proxyId,
		bodyId: proxy.bodyId,
		shapeId: proxy.shapeId,
		aabb: cloneAabb(proxy.aabb),
		filter: resolveBroadPhaseFilter(proxy.filter),
		isSensor: proxy.isSensor,
	};
};

const createBroadPhaseProxy = (
	options: BroadPhaseProxyOptions
): BroadPhaseProxy => {
	return {
		proxyId: options.proxyId,
		bodyId: options.bodyId,
		shapeId: options.shapeId,
		aabb: options.shape.getAabb(options.transform),
		filter: resolveBroadPhaseFilter(options.filter),
		isSensor: options.isSensor ?? false,
	};
};

const aabbsOverlap = (a: Aabb, b: Aabb): boolean => {
	return !(
		a.max.x < b.min.x ||
		b.max.x < a.min.x ||
		a.max.y < b.min.y ||
		b.max.y < a.min.y
	);
};

const filtersAllowCandidatePair = (
	proxyA: BroadPhaseProxy,
	proxyB: BroadPhaseProxy
): boolean => {
	return (
		(proxyA.filter.mask & proxyB.filter.category) !== 0 &&
		(proxyB.filter.mask & proxyA.filter.category) !== 0
	);
};

const shouldEmitCandidatePair = (
	proxyA: BroadPhaseProxy,
	proxyB: BroadPhaseProxy
): boolean => {
	if (proxyA.bodyId === proxyB.bodyId) {
		return false;
	}

	return filtersAllowCandidatePair(proxyA, proxyB);
};

const createBroadPhasePair = (
	proxyA: BroadPhaseProxy,
	proxyB: BroadPhaseProxy
): BroadPhasePair => {
	if (proxyA.proxyId <= proxyB.proxyId) {
		return { proxyA, proxyB };
	}

	return {
		proxyA: proxyB,
		proxyB: proxyA,
	};
};

const expandAabb = (aabb: Aabb, margin: Vector): Aabb => {
	return {
		min: aabb.min.toSubtracted(margin),
		max: aabb.max.toAdded(margin),
	};
};

export {
	DEFAULT_BROAD_PHASE_FILTER,
	aabbsOverlap,
	cloneAabb,
	cloneBroadPhaseProxy,
	createBroadPhasePair,
	createBroadPhaseProxy,
	expandAabb,
	filtersAllowCandidatePair,
	resolveBroadPhaseFilter,
	shouldEmitCandidatePair,
};

export type {
	BroadPhaseFilter,
	BroadPhasePair,
	BroadPhaseProxy,
	BroadPhaseProxyOptions,
	PhysicsShape,
};
