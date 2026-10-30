import { Vector } from "../../Lib/Vector";

type PhysicsTransform = {
	position: Vector;
	angle: number;
};

type Aabb = {
	min: Vector;
	max: Vector;
};

const transformPoint = (point: Vector, transform: PhysicsTransform): Vector => {
	return point.toWorldSpace(transform.position, transform.angle);
};

const inverseTransformPoint = (
	point: Vector,
	transform: PhysicsTransform
): Vector => {
	return point.toLocalSpace(transform.position, transform.angle);
};

const transformPoints = (
	points: readonly Vector[],
	transform: PhysicsTransform
): Vector[] => {
	return points.map((point) => transformPoint(point, transform));
};

const createAabbFromPoints = (points: readonly Vector[]): Aabb => {
	if (points.length === 0) {
		throw new Error("Cannot create an AABB from an empty point set.");
	}

	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const point of points) {
		minX = Math.min(minX, point.x);
		minY = Math.min(minY, point.y);
		maxX = Math.max(maxX, point.x);
		maxY = Math.max(maxY, point.y);
	}

	return {
		min: new Vector(minX, minY),
		max: new Vector(maxX, maxY),
	};
};

export {
	createAabbFromPoints,
	inverseTransformPoint,
	transformPoint,
	transformPoints,
};

export type { Aabb, PhysicsTransform };
